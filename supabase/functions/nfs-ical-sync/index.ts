import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

// Only import dates within this future horizon. Past dates and dates beyond
// this horizon are discarded to keep nfs_blocked_dates lean.
// 18 months covers Airbnb (up to 540 days) + buffer for Booking.com and others.
const FUTURE_HORIZON_MONTHS = 18;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// ── Feed state (persisted per-feed inside nfs_properties.ical_feeds jsonb) ──
interface IcalFeed {
  name: string;
  url: string;
  last_synced?: string | null;
  last_error?: string | null;
  /** Consecutive failures — reset to 0 on a successful fetch+parse */
  consecutive_failures?: number;
  /** ISO timestamp — if > now(), skip this feed (backoff) */
  skip_until?: string | null;
}

// ── Parser (unchanged from v1) ───────────────────────────────────────────

/** Parse YYYYMMDD or YYYYMMDDTHHmmssZ → "YYYY-MM-DD" */
function parseIcalDate(val: string): string | null {
  const clean = val.replace(/;.*$/, "").trim();
  const digits = clean.replace(/[^0-9]/g, "");
  if (digits.length < 8) return null;
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  return `${y}-${m}-${d}`;
}

/**
 * Minimal RFC 5545 parser — extracts VEVENT blocks, returns
 * { start, end } date ranges (end inclusive). Skips CANCELLED events.
 */
function parseIcal(text: string): { start: string; end: string }[] {
  const results: { start: string; end: string }[] = [];
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const eventBlocks = unfolded.split("BEGIN:VEVENT").slice(1);

  for (const block of eventBlocks) {
    const end = block.indexOf("END:VEVENT");
    const body = end >= 0 ? block.slice(0, end) : block;

    const statusMatch = body.match(/^STATUS:(.+)$/m);
    if (statusMatch && statusMatch[1].trim().toUpperCase() === "CANCELLED") continue;

    const startMatch = body.match(/^DTSTART(?:[^:]*):(.+)$/m);
    const endMatch = body.match(/^DTEND(?:[^:]*):(.+)$/m);
    if (!startMatch) continue;

    const startDate = parseIcalDate(startMatch[1].trim());
    if (!startDate) continue;

    let endDate: string;
    if (endMatch) {
      const parsed = parseIcalDate(endMatch[1].trim());
      if (!parsed) continue;
      // DTEND for all-day events is exclusive per RFC 5545 — subtract 1 day
      const d = new Date(parsed + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() - 1);
      endDate = d.toISOString().slice(0, 10);
    } else {
      endDate = startDate;
    }
    if (endDate < startDate) endDate = startDate;

    results.push({ start: startDate, end: endDate });
  }
  return results;
}

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

// ── Concurrency helper ───────────────────────────────────────────────────

async function parallelMap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

// ── Sync a single feed — fetch-first, delete only on success ─────────────

interface FeedResult {
  feed: IcalFeed;
  imported: number;
  error: string | null;
}

async function syncOneFeed(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
  feed: IcalFeed,
): Promise<FeedResult> {
  // Honour backoff
  if (feed.skip_until && new Date(feed.skip_until) > new Date()) {
    return { feed, imported: 0, error: null }; // skipped silently
  }

  let icalText: string;
  try {
    // Step 1: FETCH — if this fails, DB is untouched
    const resp = await fetch(feed.url, {
      headers: {
        "User-Agent": "NFStay-CalendarSync/1.0",
        Accept: "text/calendar, */*",
      },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });

    if (!resp.ok) {
      return { feed: bumpFailure(feed, `HTTP ${resp.status}`), imported: 0, error: `${feed.name}: HTTP ${resp.status}` };
    }
    icalText = await resp.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { feed: bumpFailure(feed, `fetch: ${msg}`), imported: 0, error: `${feed.name}: ${msg}` };
  }

  // Step 2: PARSE — if this fails, DB is untouched
  let ranges: { start: string; end: string }[];
  try {
    ranges = parseIcal(icalText);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { feed: bumpFailure(feed, `parse: ${msg}`), imported: 0, error: `${feed.name}: ${msg}` };
  }

  const allDates = ranges.flatMap((r) => expandRange(r.start, r.end));
  const uniqueDatesAll = [...new Set(allDates)];

  // Filter to [today, today + FUTURE_HORIZON_MONTHS].
  // Drops past dates (they can't be booked anyway) and far-future dates
  // (e.g. recurring Google Calendar events with no end date) to keep
  // the blocked_dates table lean and queries fast.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setUTCMonth(horizon.getUTCMonth() + FUTURE_HORIZON_MONTHS);
  const todayStr = today.toISOString().slice(0, 10);
  const horizonStr = horizon.toISOString().slice(0, 10);
  const uniqueDates = uniqueDatesAll.filter(
    (d) => d >= todayStr && d <= horizonStr,
  );

  const source = `ical:${feed.name}`;

  // Step 3: WRITE — only now that we have valid data, replace old.
  // If the feed is legitimately empty (operator cleared calendar) we still
  // delete old rows so dates unblock. Empty feed with successful HTTP 200
  // is a valid state — reset failures.
  try {
    await supabase
      .from("nfs_blocked_dates")
      .delete()
      .eq("property_id", propertyId)
      .eq("source", source);

    if (uniqueDates.length > 0) {
      const rows = uniqueDates.map((date) => ({ property_id: propertyId, date, source }));
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error: upsertErr } = await supabase
          .from("nfs_blocked_dates")
          .upsert(batch, { onConflict: "property_id,date" });
        if (upsertErr) throw upsertErr;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { feed: bumpFailure(feed, `db: ${msg}`), imported: 0, error: `${feed.name}: db: ${msg}` };
  }

  // Success — reset failure counter
  return {
    feed: {
      ...feed,
      last_synced: new Date().toISOString(),
      last_error: null,
      consecutive_failures: 0,
      skip_until: null,
    },
    imported: uniqueDates.length,
    error: null,
  };
}

function bumpFailure(feed: IcalFeed, message: string): IcalFeed {
  const failures = (feed.consecutive_failures ?? 0) + 1;
  const now = Date.now();
  let skip_until: string | null = null;
  if (failures >= 20) {
    skip_until = new Date(now + 24 * 60 * 60 * 1000).toISOString(); // 24h
  } else if (failures >= 5) {
    skip_until = new Date(now + 60 * 60 * 1000).toISOString(); // 1h
  }
  return {
    ...feed,
    last_error: message.slice(0, 500),
    consecutive_failures: failures,
    skip_until,
  };
}

// ── Sync all feeds for a single property (parallel within property) ──────

interface PropertyResult {
  property_id: string;
  imported: number;
  errors: string[];
}

async function syncOneProperty(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
  feeds: IcalFeed[],
): Promise<PropertyResult> {
  if (feeds.length === 0) {
    await supabase
      .from("nfs_properties")
      .update({ ical_last_sync_at: new Date().toISOString() })
      .eq("id", propertyId);
    return { property_id: propertyId, imported: 0, errors: [] };
  }

  // Parallelize feeds within this property (cap 3 — gentle on shared hosts)
  const results = await parallelMap(feeds, 3, (feed) => syncOneFeed(supabase, propertyId, feed));

  const updatedFeeds = results.map((r) => r.feed);
  const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
  const errors = results.filter((r) => r.error).map((r) => r.error as string);

  await supabase
    .from("nfs_properties")
    .update({
      ical_feeds: updatedFeeds,
      ical_last_sync_at: new Date().toISOString(),
    })
    .eq("id", propertyId);

  return { property_id: propertyId, imported: totalImported, errors };
}

// ── HTTP handler ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ══ sync_batch — called by cron (every 1 min) ══
    if (body.action === "sync_batch") {
      // Auth: require CRON_SECRET header
      const provided = req.headers.get("x-cron-secret") || "";
      if (!CRON_SECRET || provided !== CRON_SECRET) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const batchSize = Math.max(1, Math.min(200, Number(body.batch_size ?? 50)));

      // Query oldest-synced listed properties with feeds.
      // Uses partial index idx_nfs_properties_ical_sync_queue.
      // Fetch 2x batch_size to allow jitter/shuffle.
      const { data: candidates, error: queryErr } = await supabase
        .from("nfs_properties")
        .select("id, ical_feeds")
        .eq("listing_status", "listed")
        .not("ical_feeds", "is", null)
        .order("ical_last_sync_at", { ascending: true, nullsFirst: true })
        .limit(batchSize * 2);

      if (queryErr) {
        return new Response(
          JSON.stringify({ error: "Query failed", detail: queryErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Filter properties with non-empty feeds
      const eligible = (candidates ?? []).filter((p) => {
        const feeds = Array.isArray(p.ical_feeds) ? p.ical_feeds : [];
        return feeds.length > 0;
      });

      // Jitter: shuffle within the 2x pool, then take batchSize.
      // Prevents thundering-herd when many operators added feeds at the same time.
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, batchSize);

      // Parallelize across properties (cap 10)
      const results = await parallelMap(picked, 10, (prop) =>
        syncOneProperty(supabase, prop.id as string, prop.ical_feeds as IcalFeed[]),
      );

      const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
      const errorCount = results.reduce((sum, r) => sum + r.errors.length, 0);

      return new Response(
        JSON.stringify({
          success: true,
          processed: results.length,
          total_imported: totalImported,
          error_count: errorCount,
          // Only return first 10 errors to keep payload small
          sample_errors: results.flatMap((r) => r.errors).slice(0, 10),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ══ sync_one — per-property manual button (existing behavior) ══
    // Accepts either { property_id } (legacy) or { action: 'sync_one', property_id }
    const propertyId = body.property_id;
    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: "property_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: prop } = await supabase
      .from("nfs_properties")
      .select("id, ical_feeds")
      .eq("id", propertyId)
      .maybeSingle();

    if (!prop) {
      return new Response(
        JSON.stringify({ error: "Property not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const feeds: IcalFeed[] = Array.isArray(prop.ical_feeds) ? prop.ical_feeds : [];
    const result = await syncOneProperty(supabase, propertyId, feeds);

    return new Response(
      JSON.stringify({ imported: result.imported, errors: result.errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
