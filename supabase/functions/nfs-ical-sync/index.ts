import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IcalFeed {
  name: string;
  url: string;
  last_synced: string | null;
}

/** Parse YYYYMMDD or YYYYMMDDTHHmmssZ → "YYYY-MM-DD" */
function parseIcalDate(val: string): string | null {
  const clean = val.replace(/;.*$/, "").trim(); // strip VALUE=DATE etc
  const digits = clean.replace(/[^0-9]/g, "");
  if (digits.length < 8) return null;
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  return `${y}-${m}-${d}`;
}

/**
 * Minimal iCal parser — extracts VEVENT blocks and returns
 * arrays of { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } (end inclusive).
 * Skips CANCELLED events.
 */
function parseIcal(text: string): { start: string; end: string }[] {
  const results: { start: string; end: string }[] = [];

  // Unfold continuation lines (CRLF + space/tab)
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");

  const eventBlocks = unfolded.split("BEGIN:VEVENT").slice(1);
  for (const block of eventBlocks) {
    const end = block.indexOf("END:VEVENT");
    const body = end >= 0 ? block.slice(0, end) : block;

    // Check status — skip CANCELLED
    const statusMatch = body.match(/^STATUS:(.+)$/m);
    if (statusMatch && statusMatch[1].trim().toUpperCase() === "CANCELLED") continue;

    // Extract DTSTART — handle VALUE=DATE and TZID variants
    const startMatch = body.match(/^DTSTART(?:[^:]*):(.+)$/m);
    const endMatch = body.match(/^DTEND(?:[^:]*):(.+)$/m);

    if (!startMatch) continue;

    const startDate = parseIcalDate(startMatch[1].trim());
    if (!startDate) continue;

    let endDate: string;
    if (endMatch) {
      const parsed = parseIcalDate(endMatch[1].trim());
      if (!parsed) continue;
      // iCal DTEND for all-day events is exclusive — subtract 1 day
      const d = new Date(parsed + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() - 1);
      endDate = d.toISOString().slice(0, 10);
    } else {
      // No DTEND — single day
      endDate = startDate;
    }

    // Guard: end must be >= start
    if (endDate < startDate) endDate = startDate;

    results.push({ start: startDate, end: endDate });
  }

  return results;
}

/** Expand {start, end} ranges into individual "YYYY-MM-DD" strings */
function expandRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00Z");
  const last = new Date(end + "T00:00:00Z");
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { property_id } = await req.json();

    if (!property_id) {
      return new Response(
        JSON.stringify({ error: "property_id is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch property + feeds
    const { data: prop } = await supabase
      .from("nfs_properties")
      .select("id, ical_feeds")
      .eq("id", property_id)
      .maybeSingle();

    if (!prop) {
      return new Response(
        JSON.stringify({ error: "Property not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const feeds: IcalFeed[] = Array.isArray(prop.ical_feeds) ? prop.ical_feeds : [];

    if (feeds.length === 0) {
      return new Response(
        JSON.stringify({ imported: 0, errors: [], message: "No feeds configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let totalImported = 0;
    const errors: string[] = [];
    const updatedFeeds: IcalFeed[] = [];

    for (const feed of feeds) {
      try {
        // Fetch the iCal URL
        const resp = await fetch(feed.url, {
          headers: {
            "User-Agent": "NFStay-CalendarSync/1.0",
            Accept: "text/calendar, */*",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!resp.ok) {
          errors.push(`${feed.name}: HTTP ${resp.status}`);
          updatedFeeds.push(feed);
          continue;
        }

        const icalText = await resp.text();
        const ranges = parseIcal(icalText);

        // Expand ranges into individual dates
        const allDates = ranges.flatMap((r) => expandRange(r.start, r.end));
        const uniqueDates = [...new Set(allDates)];

        if (uniqueDates.length > 0) {
          // Remove old ical-sourced dates for this feed, then insert fresh
          const source = `ical:${feed.name}`;

          await supabase
            .from("nfs_blocked_dates")
            .delete()
            .eq("property_id", property_id)
            .eq("source", source);

          const rows = uniqueDates.map((date) => ({
            property_id,
            date,
            source,
          }));

          // Batch upsert (max 500 at a time)
          for (let i = 0; i < rows.length; i += 500) {
            const batch = rows.slice(i, i + 500);
            await supabase
              .from("nfs_blocked_dates")
              .upsert(batch, { onConflict: "property_id,date" });
          }

          totalImported += uniqueDates.length;
        }

        updatedFeeds.push({
          ...feed,
          last_synced: new Date().toISOString(),
        });
      } catch (err) {
        errors.push(`${feed.name}: ${String(err)}`);
        updatedFeeds.push(feed);
      }
    }

    // Persist updated last_synced timestamps
    await supabase
      .from("nfs_properties")
      .update({ ical_feeds: updatedFeeds })
      .eq("id", property_id);

    return new Response(
      JSON.stringify({ imported: totalImported, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
