// nfs-import-listing — Supabase Edge Function
// POST /functions/v1/nfs-import-listing
// Body: { url: string }
// Returns: ImportedListing (normalised property data)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export interface ImportedListing {
  public_title?: string;
  description?: string;
  property_type?: string;
  rental_type?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  lat?: number;
  lng?: number;
  max_guests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  base_rate_amount?: number;
  base_rate_currency?: string;
  amenities?: Record<string, boolean>;
  images?: { url: string; caption: string; order: number }[];
  minimum_stay?: number;
  cancellation_policy?: string;
  check_in_time?: string;
  check_out_time?: string;
  rules?: string;
  source_url?: string;
  _debug?: string; // removed before returning to client in production, useful for diagnosis
}

const AMENITY_MAP: Record<string, string> = {
  "wifi": "wifi", "wireless internet": "wifi", "pocket wifi": "wifi",
  "free parking on premises": "parking", "free street parking": "parking",
  "paid parking on premises": "parking", "parking": "parking",
  "air conditioning": "ac", "central air conditioning": "ac",
  "heating": "heating", "central heating": "heating",
  "washing machine": "washer", "washer": "washer",
  "dryer": "dryer", "tumble dryer": "dryer",
  "kitchen": "kitchen", "kitchenette": "kitchen", "full kitchen": "kitchen",
  "smoke alarm": "smoke_alarm", "smoke detector": "smoke_alarm",
  "fire extinguisher": "fire_extinguisher", "first aid kit": "first_aid",
  "pool": "pool", "private pool": "pool", "shared pool": "pool",
  "hot tub": "hot_tub", "jacuzzi": "hot_tub",
  "garden": "garden", "private garden": "garden",
  "bbq grill": "bbq", "barbecue grill": "bbq", "bbq": "bbq",
  "tv": "tv", "hdtv": "tv", "cable tv": "tv", "smart tv": "tv",
  "gym": "gym", "gym access": "gym", "fitness centre": "gym", "fitness center": "gym",
  "game room": "game_room", "games room": "game_room",
  "elevator": "elevator", "lift": "elevator",
  "wheelchair accessible": "wheelchair_access", "wheelchair-accessible": "wheelchair_access",
  "ev charger": "ev_charger", "electric vehicle charger": "ev_charger",
};

function mapAmenities(names: string[]): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const name of names) {
    const key = AMENITY_MAP[name.toLowerCase().trim()];
    if (key) result[key] = true;
  }
  return result;
}

const PROPERTY_TYPE_MAP: Record<string, string> = {
  "apartment": "apartment", "flat": "apartment", "house": "house", "villa": "villa",
  "studio": "studio", "cabin": "cabin", "cottage": "cottage", "townhouse": "townhouse",
  "condo": "condo", "condominium": "condo", "loft": "loft", "bungalow": "house",
  "chalet": "villa", "guesthouse": "house", "guest suite": "apartment",
};

function mapPropertyType(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return PROPERTY_TYPE_MAP[raw.toLowerCase().trim()] ?? "other";
}

function deepFind(obj: unknown, key: string, maxDepth = 10): unknown {
  if (maxDepth <= 0 || obj === null || typeof obj !== "object") return undefined;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = deepFind(item, key, maxDepth - 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const rec = obj as Record<string, unknown>;
  if (key in rec) return rec[key];
  for (const v of Object.values(rec)) {
    const found = deepFind(v, key, maxDepth - 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function deepFindAll(obj: unknown, key: string, maxDepth = 10): unknown[] {
  const results: unknown[] = [];
  function walk(o: unknown, depth: number) {
    if (depth <= 0 || o === null || typeof o !== "object") return;
    if (Array.isArray(o)) { for (const item of o) walk(item, depth - 1); return; }
    const rec = o as Record<string, unknown>;
    if (key in rec) results.push(rec[key]);
    for (const v of Object.values(rec)) walk(v, depth - 1);
  }
  walk(obj, maxDepth);
  return results;
}

function extractImages(obj: unknown, maxDepth = 12): string[] {
  const urls = new Set<string>();
  function scanStrings(o: unknown, depth: number) {
    if (depth <= 0 || o === null) return;
    if (typeof o === "string") {
      const matches = o.match(/https?:\/\/[^\s"'<>]*muscache\.com[^\s"'<>]*/g);
      if (matches) matches.forEach((u) => urls.add(u));
      return;
    }
    if (typeof o !== "object") return;
    if (Array.isArray(o)) { for (const i of o) scanStrings(i, depth - 1); return; }
    for (const v of Object.values(o as Record<string, unknown>)) scanStrings(v, depth - 1);
  }
  scanStrings(obj, maxDepth);
  return Array.from(urls)
    .filter((u) => /\.(jpg|jpeg|png|webp)/i.test(u) || u.includes("/im/"))
    .slice(0, 20);
}

// ---------------------------------------------------------------------------
// Airbnb API — tries mobile endpoint first, then www
// ---------------------------------------------------------------------------

function extractAirbnbListingId(pathname: string): string | null {
  const match = pathname.match(/\/rooms\/(\d+)/);
  return match ? match[1] : null;
}

function mapApiListing(l: Record<string, unknown>, currency: string): ImportedListing {
  const listing: ImportedListing = {};

  if (typeof l.name === "string") listing.public_title = l.name.trim();

  for (const f of ["description", "summary", "space", "access", "neighborhood_overview", "transit", "notes"]) {
    if (typeof l[f] === "string" && (l[f] as string).trim()) {
      listing.description = (l[f] as string).trim();
      break;
    }
  }

  if (typeof l.person_capacity === "number") listing.max_guests = l.person_capacity;
  if (typeof l.bedrooms === "number") listing.bedrooms = l.bedrooms;
  if (typeof l.beds === "number") listing.beds = l.beds;
  if (typeof l.bathrooms === "number") listing.bathrooms = l.bathrooms;
  if (typeof l.city === "string") listing.city = l.city;
  if (typeof l.state === "string") listing.state = l.state;
  if (typeof l.country === "string") listing.country = l.country;
  if (typeof l.country_code === "string" && !listing.country) listing.country = l.country_code;
  if (typeof l.lat === "number") listing.lat = l.lat;
  if (typeof l.lng === "number") listing.lng = l.lng;
  if (typeof l.address === "string") listing.address = l.address;
  if (typeof l.property_type === "string") listing.property_type = mapPropertyType(l.property_type);

  if (typeof l.room_type === "string") {
    const rt = (l.room_type as string).toLowerCase();
    if (rt.includes("entire") || rt.includes("whole")) listing.rental_type = "entire_place";
    else if (rt.includes("private")) listing.rental_type = "private_room";
    else if (rt.includes("shared") || rt.includes("hotel")) listing.rental_type = "shared_room";
  }

  // Price — various shapes
  const priceFields = [l.price, l.listing_price, l.price_rate];
  for (const pf of priceFields) {
    if (typeof pf === "number") { listing.base_rate_amount = pf; listing.base_rate_currency = currency; break; }
    if (pf && typeof pf === "object") {
      const p = pf as Record<string, unknown>;
      const amount = p.amount ?? p.rate ?? p.nightly_price ?? p.price;
      if (typeof amount === "number") { listing.base_rate_amount = amount; listing.base_rate_currency = (p.currency as string) ?? currency; break; }
    }
  }

  // Amenities
  const rawAmenities = l.amenities ?? l.listing_amenities;
  if (Array.isArray(rawAmenities)) {
    const names: string[] = [];
    for (const a of rawAmenities) {
      if (typeof a === "string") names.push(a);
      else if (a && typeof a === "object") {
        const name = (a as Record<string, unknown>).name ?? (a as Record<string, unknown>).tag;
        if (typeof name === "string") names.push(name);
      }
    }
    if (names.length > 0) listing.amenities = mapAmenities(names);
  }

  // Images
  const photos = l.photos ?? l.listing_photos ?? l.picture_urls;
  if (Array.isArray(photos)) {
    const imageUrls: string[] = [];
    for (const p of photos) {
      if (typeof p === "string") imageUrls.push(p);
      else if (p && typeof p === "object") {
        const u = (p as Record<string, unknown>).x_large_url
          ?? (p as Record<string, unknown>).large
          ?? (p as Record<string, unknown>).url
          ?? (p as Record<string, unknown>).picture;
        if (typeof u === "string") imageUrls.push(u);
      }
    }
    if (imageUrls.length > 0) listing.images = imageUrls.slice(0, 20).map((url, i) => ({ url, caption: "", order: i }));
  }

  if (typeof l.min_nights === "number") listing.minimum_stay = l.min_nights;
  if (typeof l.check_in_time === "string") listing.check_in_time = l.check_in_time;
  if (typeof l.check_out_time === "string") listing.check_out_time = l.check_out_time;
  if (typeof l.house_rules === "string") listing.rules = l.house_rules;

  return listing;
}

async function fetchAirbnbApi(listingId: string, isUk: boolean): Promise<{ listing: ImportedListing | null; debugLog: string[] }> {
  const currency = isUk ? "GBP" : "USD";
  const debugLog: string[] = [];

  const attempts = [
    {
      url: `https://api.airbnb.com/v2/listings/${listingId}?_format=for_rooms_show&key=d306zoyjsyarp7uqwjaufrqo&currency=${currency}&locale=en-US`,
      headers: {
        "User-Agent": "Airbnb/22.50 iPhone/16.0 Type/Phone",
        "Accept": "application/json",
        "X-Airbnb-API-Key": "d306zoyjsyarp7uqwjaufrqo",
        "Accept-Language": "en-US",
      },
    },
    {
      url: `https://www.airbnb.com/api/v2/listings/${listingId}?_format=for_rooms_show&key=d306zoyjsyarp7uqwjaufrqo&currency=${currency}&locale=en-US`,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "X-Airbnb-API-Key": "d306zoyjsyarp7uqwjaufrqo",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": `https://www.airbnb.com/rooms/${listingId}`,
      },
    },
  ];

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, { headers: attempt.headers });
      debugLog.push(`API ${new URL(attempt.url).hostname}: HTTP ${res.status}`);
      if (!res.ok) continue;
      const text = await res.text();
      debugLog.push(`API response length: ${text.length}`);
      let json: Record<string, unknown>;
      try { json = JSON.parse(text); } catch { debugLog.push("JSON parse failed"); continue; }

      // The listing may be at json.listing or at the root
      const rawListing = (json.listing ?? json) as Record<string, unknown>;
      if (!rawListing || !rawListing.name) {
        debugLog.push(`No listing.name found. Top-level keys: ${Object.keys(json).slice(0, 10).join(", ")}`);
        continue;
      }

      return { listing: mapApiListing(rawListing, currency), debugLog };
    } catch (e) {
      debugLog.push(`Fetch error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { listing: null, debugLog };
}

// ---------------------------------------------------------------------------
// HTML fallback strategies
// ---------------------------------------------------------------------------

function parseJsonLd(html: string): ImportedListing | null {
  const regex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const schemas = Array.isArray(data) ? data : [data];
      for (const schema of schemas) {
        if (schema["@type"] === "LodgingBusiness" || schema["@type"] === "Accommodation" || schema["@type"] === "Hotel") {
          const listing: ImportedListing = {};
          if (schema.name) listing.public_title = schema.name;
          if (schema.description) listing.description = schema.description;
          if (schema.address) {
            const addr = schema.address;
            listing.city = addr.addressLocality ?? addr.city;
            listing.state = addr.addressRegion ?? addr.state;
            listing.country = addr.addressCountry ?? addr.country;
            listing.address = addr.streetAddress ?? addr.street;
          }
          if (schema.geo) {
            listing.lat = Number(schema.geo.latitude) || undefined;
            listing.lng = Number(schema.geo.longitude) || undefined;
          }
          if (schema.numberOfRooms) listing.bedrooms = Number(schema.numberOfRooms) || undefined;
          if (schema.amenityFeature) {
            listing.amenities = mapAmenities((schema.amenityFeature as { name?: string }[]).map((a) => a.name ?? ""));
          }
          return listing;
        }
      }
    } catch { /* continue */ }
  }
  return null;
}

function parseNextData(html: string): ImportedListing | null {
  const match = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    const nextData = JSON.parse(match[1]);
    const listing: ImportedListing = {};

    const title = deepFind(nextData, "name") ?? deepFind(nextData, "listingTitle") ?? deepFind(nextData, "publicDescription");
    if (typeof title === "string" && title.trim()) listing.public_title = title.trim();

    const descObj = deepFind(nextData, "description");
    if (typeof descObj === "string") listing.description = descObj;
    else if (descObj && typeof descObj === "object") {
      const d = deepFind(descObj, "access") ?? deepFind(descObj, "summary") ?? deepFind(descObj, "space");
      if (typeof d === "string") listing.description = d;
    }

    const personCapacity = deepFind(nextData, "personCapacity") ?? deepFind(nextData, "maxGuests");
    if (typeof personCapacity === "number") listing.max_guests = personCapacity;
    const bedroomCount = deepFind(nextData, "bedroomCount") ?? deepFind(nextData, "bedrooms");
    if (typeof bedroomCount === "number") listing.bedrooms = bedroomCount;
    const bedCount = deepFind(nextData, "bedCount") ?? deepFind(nextData, "beds");
    if (typeof bedCount === "number") listing.beds = bedCount;
    const bathroomCount = deepFind(nextData, "bathroomCount") ?? deepFind(nextData, "bathrooms");
    if (typeof bathroomCount === "number") listing.bathrooms = bathroomCount;

    const city = deepFind(nextData, "city") ?? deepFind(nextData, "localizedCity");
    if (typeof city === "string") listing.city = city;
    const state = deepFind(nextData, "state") ?? deepFind(nextData, "stateName");
    if (typeof state === "string") listing.state = state;
    const country = deepFind(nextData, "country") ?? deepFind(nextData, "countryCode");
    if (typeof country === "string") listing.country = country;
    const lat = deepFind(nextData, "lat") ?? deepFind(nextData, "latitude");
    if (typeof lat === "number") listing.lat = lat;
    const lng = deepFind(nextData, "lng") ?? deepFind(nextData, "longitude");
    if (typeof lng === "number") listing.lng = lng;

    const price = deepFind(nextData, "price") ?? deepFind(nextData, "nightly_price") ?? deepFind(nextData, "originalPrice");
    if (typeof price === "number") listing.base_rate_amount = price;
    else if (typeof price === "object" && price !== null) {
      const amount = deepFind(price, "amount") ?? deepFind(price, "value");
      if (typeof amount === "number") listing.base_rate_amount = amount;
      const currency = deepFind(price, "currency") ?? deepFind(price, "currencyCode");
      if (typeof currency === "string") listing.base_rate_currency = currency;
    }

    const typeVal = deepFind(nextData, "propertyType") ?? deepFind(nextData, "roomType") ?? deepFind(nextData, "listingType");
    if (typeof typeVal === "string") listing.property_type = mapPropertyType(typeVal);

    const rentalTypeVal = deepFind(nextData, "roomType") ?? deepFind(nextData, "rentalType");
    if (typeof rentalTypeVal === "string") {
      const rt = rentalTypeVal.toLowerCase();
      if (rt.includes("entire") || rt.includes("whole")) listing.rental_type = "entire_place";
      else if (rt.includes("private")) listing.rental_type = "private_room";
      else if (rt.includes("shared") || rt.includes("hostel")) listing.rental_type = "shared_room";
    }

    const amenityNames: string[] = [];
    for (const group of deepFindAll(nextData, "amenities")) {
      if (Array.isArray(group)) {
        for (const item of group) {
          if (typeof item === "string") amenityNames.push(item);
          else if (item && typeof item === "object") {
            const n = deepFind(item, "name") ?? deepFind(item, "title") ?? deepFind(item, "label");
            if (typeof n === "string") amenityNames.push(n);
          }
        }
      }
    }
    if (amenityNames.length > 0) listing.amenities = mapAmenities(amenityNames);

    const minNights = deepFind(nextData, "minNights") ?? deepFind(nextData, "minimumNights") ?? deepFind(nextData, "min_nights");
    if (typeof minNights === "number") listing.minimum_stay = minNights;
    const checkInTime = deepFind(nextData, "checkInTime") ?? deepFind(nextData, "check_in_time");
    if (typeof checkInTime === "string") listing.check_in_time = checkInTime;
    const checkOutTime = deepFind(nextData, "checkOutTime") ?? deepFind(nextData, "check_out_time");
    if (typeof checkOutTime === "string") listing.check_out_time = checkOutTime;
    const houseRules = deepFind(nextData, "houseRules") ?? deepFind(nextData, "house_rules");
    if (typeof houseRules === "string") listing.rules = houseRules;

    const imageUrls = extractImages(nextData);
    if (imageUrls.length > 0) listing.images = imageUrls.map((url, i) => ({ url, caption: "", order: i }));

    return Object.keys(listing).length > 1 ? listing : null;
  } catch { return null; }
}

function parseMetaTags(html: string): ImportedListing {
  const listing: ImportedListing = {};
  const getMeta = (name: string): string | undefined => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]*)"`, "i")) ??
              html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${name}"`, "i"));
    return m ? m[1] : undefined;
  };
  const title = getMeta("og:title") ?? getMeta("twitter:title");
  if (title) listing.public_title = title.replace(/ - Airbnb$/, "").trim();
  const desc = getMeta("og:description") ?? getMeta("twitter:description") ?? getMeta("description");
  if (desc) listing.description = desc;
  const image = getMeta("og:image") ?? getMeta("twitter:image");
  if (image) listing.images = [{ url: image, caption: "", order: 0 }];
  return listing;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function importFromUrl(rawUrl: string): Promise<ImportedListing> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error("Invalid URL provided."); }

  const isAirbnb = url.hostname.includes("airbnb.");
  const isUk = url.hostname.includes(".co.uk");
  const cleanUrl = `${url.protocol}//${url.hostname}${url.pathname}`;
  const debugLines: string[] = [];

  // Strategy 1: Airbnb JSON API
  if (isAirbnb) {
    const listingId = extractAirbnbListingId(url.pathname);
    debugLines.push(`listingId: ${listingId ?? "not found"}`);
    if (listingId) {
      const { listing: apiListing, debugLog } = await fetchAirbnbApi(listingId, isUk);
      debugLines.push(...debugLog);
      if (apiListing && apiListing.public_title) {
        apiListing.source_url = cleanUrl;
        if (!apiListing.base_rate_currency) apiListing.base_rate_currency = isUk ? "GBP" : "USD";
        return apiListing;
      }
    }
  }

  // Strategy 2: HTML scrape
  debugLines.push("Falling back to HTML scrape");
  const response = await fetch(cleanUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-GB,en;q=0.9",
      "Cache-Control": "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
    },
  });

  debugLines.push(`HTML fetch: HTTP ${response.status}`);

  if (response.status === 403 || response.status === 401) {
    throw new Error(`Airbnb blocked this request. Debug: ${debugLines.join(" | ")}`);
  }
  if (response.status === 404) throw new Error("Listing not found. Check the URL is correct.");
  if (!response.ok) throw new Error(`Could not fetch listing (HTTP ${response.status}). Debug: ${debugLines.join(" | ")}`);

  const html = await response.text();
  const isHomepage = html.includes("Holiday Rentals, Cabins, Beach Houses") || html.includes("Vacation Rentals, Cabins, Beach Houses");
  debugLines.push(`isHomepage: ${isHomepage}, htmlLen: ${html.length}`);

  if (isHomepage) {
    throw new Error(`Airbnb is blocking server-side access to this listing. Debug info: ${debugLines.join(" | ")}`);
  }

  let listing: ImportedListing = {};
  for (const strategy of [parseNextData, parseJsonLd]) {
    try {
      const result = strategy(html);
      if (result && Object.keys(result).length > 1) { listing = result; break; }
    } catch { /* try next */ }
  }

  const og = parseMetaTags(html);
  listing = {
    public_title: listing.public_title ?? og.public_title,
    description: listing.description ?? og.description,
    images: listing.images?.length ? listing.images : og.images,
    ...listing,
  };
  listing.source_url = cleanUrl;
  if (isAirbnb && !listing.base_rate_currency) listing.base_rate_currency = isUk ? "GBP" : "USD";

  if (!listing.public_title && !listing.description) {
    throw new Error(`Could not extract listing data. Debug: ${debugLines.join(" | ")}`);
  }

  return listing;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" });

  try {
    const body = await req.json();
    const { url } = body as { url?: string };
    if (!url || typeof url !== "string" || !url.trim()) return json({ error: "url is required" });
    const listing = await importFromUrl(url.trim());
    return json({ data: listing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return json({ error: message });
  }
});
