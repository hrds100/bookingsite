import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Format a Date as iCal DATE string: YYYYMMDD */
function toICalDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** Escape special chars in iCal text values */
function escapeIcal(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Fold long lines per RFC 5545 (max 75 octets, continuation starts with space) */
function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let pos = 0;
  let first = true;
  while (pos < bytes.length) {
    const limit = first ? 75 : 74;
    first = false;
    // Find safe UTF-8 boundary
    let end = Math.min(pos + limit, bytes.length);
    while (end > pos && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(new TextDecoder().decode(bytes.slice(pos, end)));
    pos = end;
  }
  return parts.join("\r\n ");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Accept /nfs-ical-export/{propertyId}.ics?token=XXX
    // or    /nfs-ical-export?property_id=XXX&token=XXX
    let propertyId = url.searchParams.get("property_id");
    const token = url.searchParams.get("token");

    if (!propertyId) {
      const pathPart = url.pathname.split("/").pop() ?? "";
      propertyId = pathPart.replace(/\.ics$/, "");
    }

    if (!propertyId || !token) {
      return new Response(
        JSON.stringify({ error: "property_id and token are required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify token + enforce listing_status guard:
    // Only published (listed) properties publish their iCal feed.
    // Prevents draft/archived URLs from leaking empty or stale calendars
    // to third-party platforms (which can cache & misreport availability).
    const { data: prop } = await supabase
      .from("nfs_properties")
      .select("id, public_title, ical_token, operator_id, listing_status")
      .eq("id", propertyId)
      .eq("ical_token", token)
      .maybeSingle();

    if (!prop) {
      return new Response(
        JSON.stringify({ error: "Property not found or invalid token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (prop.listing_status !== "listed") {
      return new Response(
        JSON.stringify({ error: "This calendar is not published" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch confirmed/pending reservations
    const { data: reservations } = await supabase
      .from("nfs_reservations")
      .select("id, check_in, check_out, guest_name, guest_email, status")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "pending_approval"]);

    // Fetch manually blocked dates
    const { data: blockedDates } = await supabase
      .from("nfs_blocked_dates")
      .select("id, date, source")
      .eq("property_id", propertyId);

    const now = new Date();
    const dtStamp = now.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
    const calName = escapeIcal(prop.public_title || "NFStay Property");

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//NFStay//NFStay Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${calName}`,
      "X-WR-TIMEZONE:UTC",
    ];

    // Reservation events
    for (const res of reservations ?? []) {
      const checkIn = new Date(res.check_in + "T00:00:00Z");
      const checkOut = new Date(res.check_out + "T00:00:00Z");
      // DTEND is exclusive for all-day events — add 1 day
      const dtEnd = new Date(checkOut.getTime() + 86400000);
      const guestLabel = res.guest_name ? escapeIcal(res.guest_name) : "Guest";
      const summary = `Reserved - ${guestLabel}`;

      lines.push("BEGIN:VEVENT");
      lines.push(foldLine(`UID:reservation-${res.id}@nfstay.app`));
      lines.push(`DTSTAMP:${dtStamp}`);
      lines.push(`DTSTART;VALUE=DATE:${toICalDate(checkIn)}`);
      lines.push(`DTEND;VALUE=DATE:${toICalDate(dtEnd)}`);
      lines.push(foldLine(`SUMMARY:${summary}`));
      lines.push(`STATUS:CONFIRMED`);
      lines.push("END:VEVENT");
    }

    // Blocked date events — group consecutive days into ranges for cleanliness
    const sorted = (blockedDates ?? [])
      .map((b) => b.date as string)
      .sort();

    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (
        j + 1 < sorted.length &&
        new Date(sorted[j + 1]).getTime() - new Date(sorted[j]).getTime() === 86400000
      ) {
        j++;
      }
      const start = new Date(sorted[i] + "T00:00:00Z");
      const endExclusive = new Date(new Date(sorted[j] + "T00:00:00Z").getTime() + 86400000);
      const uid = `blocked-${sorted[i]}-${sorted[j]}@nfstay.app`;

      lines.push("BEGIN:VEVENT");
      lines.push(foldLine(`UID:${uid}`));
      lines.push(`DTSTAMP:${dtStamp}`);
      lines.push(`DTSTART;VALUE=DATE:${toICalDate(start)}`);
      lines.push(`DTEND;VALUE=DATE:${toICalDate(endExclusive)}`);
      lines.push("SUMMARY:Blocked");
      lines.push("STATUS:CONFIRMED");
      lines.push("END:VEVENT");

      i = j + 1;
    }

    lines.push("END:VCALENDAR");

    const icsBody = lines.map((l) => foldLine(l)).join("\r\n") + "\r\n";

    return new Response(icsBody, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="nfstay-${propertyId}.ics"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
