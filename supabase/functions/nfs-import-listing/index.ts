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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
}

// ---------------------------------------------------------------------------
// Amenity mapping: Airbnb label → NFStay key
// ---------------------------------------------------------------------------

const AMENITY_MAP: Record<string, string> = {
  // wifi
  "wifi": "wifi",
  "wireless internet": "wifi",
  "pocket wifi": "wifi",
  // parking
  "free parking on premises": "parking",
  "free street parking": "parking",
  "paid parking on premises": "parking",
  "parking": "parking",
  // ac
  "air conditioning": "ac",
  "central air conditioning": "ac",
  // heating
  "heating": "heating",
  "central heating": "heating",
  // washer
  "washing machine": "washer",
  "washer": "washer",
  // dryer
  "dryer": "dryer",
  "tumble dryer": "dryer",
  // kitchen
  "kitchen": "kitchen",
  "kitchenette": "kitchen",
  "full kitchen": "kitchen",
  // safety
  "smoke alarm": "smoke_alarm",
  "smoke detector": "smoke_alarm",
  "fire extinguisher": "fire_extinguisher",
  "first aid kit": "first_aid",
  // outdoor / extras
  "pool": "pool",
  "private pool": "pool",
  "shared pool": "pool",
  "hot tub": "hot_tub",
  "jacuzzi": "hot_tub",
  "garden": "garden",
  "private garden": "garden",
  "bbq grill": "bbq",
  "barbecue grill": "bbq",
  "bbq": "bbq",
  // entertainment
  "tv": "tv",
  "hdtv": "tv",
  "cable tv": "tv",
  "smart tv": "tv",
  "gym": "gym",
  "gym access": "gym",
  "fitness centre": "gym",
  "fitness center": "gym",
  "game room": "game_room",
  "games room": "game_room",
  // accessibility
  "elevator": "elevator",
  "lift": "elevator",
  "wheelchair accessible": "wheelchair_access",
  "wheelchair-accessible": "wheelchair_access",
  // ev
  "ev charger": "ev_charger",
  "electric vehicle charger": "ev_charger",
};

function mapAmenities(names: string[]): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const name of names) {
    const key = AMENITY_MAP[name.toLowerCase().trim()];
    if (key) result[key] = true;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Property type mapping
// ---------------------------------------------------------------------------

const PROPERTY_TYPE_MAP: Record<string, string> = {
  "apartment": "apartment",
  "flat": "apartment",
  "house": "house",
  "villa": "villa",
  "studio": "studio",
  "cabin": "cabin",
  "cottage": "cottage",
  "townhouse": "townhouse",
  "condo": "condo",
  "condominium": "condo",
  "loft": "loft",
  "bungalow": "house",
  "chalet": "villa",
  "guesthouse": "house",
  "guest suite": "apartment",
};

function mapPropertyType(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return PROPERTY_TYPE_MAP[raw.toLowerCase().trim()] ?? "other";
}

// ---------------------------------------------------------------------------
// Utility: deep-search a nested object for a key
// ---------------------------------------------------------------------------

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

// Collect ALL values for a key across a nested structure
function deepFindAll(obj: unknown, key: string, maxDepth = 10): unknown[] {
  const results: unknown[] = [];
  function walk(o: unknown, depth: number) {
    if (depth <= 0 || o === null || typeof o !== "object") return;
    if (Array.isArray(o)) {
      for (const item of o) walk(item, depth - 1);
      return;
    }
    const rec = o as Record<string, unknown>;
    if (key in rec) results.push(rec[key]);
    for (const v of Object.values(rec)) walk(v, depth - 1);
  }
  walk(obj, maxDepth);
  return results;
}

// ---------------------------------------------------------------------------
// Image extraction: pull all Airbnb CDN URLs from a nested structure
// ---------------------------------------------------------------------------

function extractImages(obj: unknown, maxDepth = 12): string[] {
  const urls = new Set<string>();
  function walk(o: unknown, depth: number) {
    if (depth <= 0 || o === null || typeof o !== "object") return;
    if (typeof o === "string") {
      if (o.includes("muscache.com") || o.includes("a0.muscache.com")) urls.add(o);
      return;
    }
    if (Array.isArray(o)) { for (const i of o) walk(i, depth - 1); return; }
    for (const v of Object.values(o as Record<string, unknown>)) walk(v, depth - 1);
  }
  walk(obj, maxDepth);
  // Also scan string values
  function scanStrings(o: unknown, depth: number) {
    if (depth <= 0 || o === null) return;
    if (typeof o === "string") {
      // Extract all muscache URLs from a single string
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
// Strategy 1: JSON-LD
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
            const names = (schema.amenityFeature as { name?: string }[]).map((a) => a.name ?? "");
            listing.amenities = mapAmenities(names);
          }
          return listing;
        }
      }
    } catch {
      // continue
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Strategy 2: __NEXT_DATA__
// ---------------------------------------------------------------------------

function parseNextData(html: string): ImportedListing | null {
  const match = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    const nextData = JSON.parse(match[1]);
    const listing: ImportedListing = {};

    // Title
    const title = deepFind(nextData, "name") ?? deepFind(nextData, "listingTitle") ?? deepFind(nextData, "publicDescription");
    if (typeof title === "string" && title.trim()) listing.public_title = title.trim();

    // Description
    const descObj = deepFind(nextData, "description");
    if (typeof descObj === "string") listing.description = descObj;
    else if (descObj && typeof descObj === "object") {
      const d = deepFind(descObj, "access") ?? deepFind(descObj, "summary") ?? deepFind(descObj, "space");
      if (typeof d === "string") listing.description = d;
    }

    // Guests, bedrooms, beds, bathrooms
    const personCapacity = deepFind(nextData, "personCapacity") ?? deepFind(nextData, "maxGuests");
    if (typeof personCapacity === "number") listing.max_guests = personCapacity;
    const bedroomCount = deepFind(nextData, "bedroomCount") ?? deepFind(nextData, "bedrooms");
    if (typeof bedroomCount === "number") listing.bedrooms = bedroomCount;
    const bedCount = deepFind(nextData, "bedCount") ?? deepFind(nextData, "beds");
    if (typeof bedCount === "number") listing.beds = bedCount;
    const bathroomCount = deepFind(nextData, "bathroomCount") ?? deepFind(nextData, "bathrooms");
    if (typeof bathroomCount === "number") listing.bathrooms = bathroomCount;

    // Location
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

    // Price
    const price = deepFind(nextData, "price") ?? deepFind(nextData, "nightly_price") ?? deepFind(nextData, "originalPrice");
    if (typeof price === "number") listing.base_rate_amount = price;
    else if (typeof price === "object" && price !== null) {
      const amount = deepFind(price, "amount") ?? deepFind(price, "value");
      if (typeof amount === "number") listing.base_rate_amount = amount;
      const currency = deepFind(price, "currency") ?? deepFind(price, "currencyCode");
      if (typeof currency === "string") listing.base_rate_currency = currency;
    }

    // Property type
    const typeVal = deepFind(nextData, "propertyType") ?? deepFind(nextData, "roomType") ?? deepFind(nextData, "listingType");
    if (typeof typeVal === "string") listing.property_type = mapPropertyType(typeVal);

    // Rental type
    const rentalTypeVal = deepFind(nextData, "roomType") ?? deepFind(nextData, "rentalType");
    if (typeof rentalTypeVal === "string") {
      const rt = rentalTypeVal.toLowerCase();
      if (rt.includes("entire") || rt.includes("whole")) listing.rental_type = "entire_place";
      else if (rt.includes("private")) listing.rental_type = "private_room";
      else if (rt.includes("shared") || rt.includes("hostel")) listing.rental_type = "shared_room";
    }

    // Amenities
    const amenityNames: string[] = [];
    const amenities = deepFindAll(nextData, "amenities");
    for (const group of amenities) {
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

    // Minimum stay
    const minNights = deepFind(nextData, "minNights") ?? deepFind(nextData, "minimumNights") ?? deepFind(nextData, "min_nights");
    if (typeof minNights === "number") listing.minimum_stay = minNights;

    // Check in/out
    const checkInTime = deepFind(nextData, "checkInTime") ?? deepFind(nextData, "check_in_time");
    if (typeof checkInTime === "string") listing.check_in_time = checkInTime;
    const checkOutTime = deepFind(nextData, "checkOutTime") ?? deepFind(nextData, "check_out_time");
    if (typeof checkOutTime === "string") listing.check_out_time = checkOutTime;

    // House rules
    const houseRules = deepFind(nextData, "houseRules") ?? deepFind(nextData, "house_rules");
    if (typeof houseRules === "string") listing.rules = houseRules;

    // Images
    const imageUrls = extractImages(nextData);
    if (imageUrls.length > 0) {
      listing.images = imageUrls.map((url, i) => ({ url, caption: "", order: i }));
    }

    return Object.keys(listing).length > 1 ? listing : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Strategy 3: Open Graph / meta fallback
// ---------------------------------------------------------------------------

function parseMetaTags(html: string): ImportedListing {
  const listing: ImportedListing = {};

  const getMeta = (name: string): string | undefined => {
    const match =
      html.match(new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]*)"`, "i")) ??
      html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${name}"`, "i"));
    return match ? match[1] : undefined;
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
// Airbnb API strategy — avoids HTML scraping entirely
// ---------------------------------------------------------------------------

function extractAirbnbListingId(pathname: string): string | null {
  const match = pathname.match(/\/rooms\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchAirbnbApi(listingId: string, isUk: boolean): Promise<ImportedListing | null> {
  const currency = isUk ? "GBP" : "USD";
  const apiUrl = `https://www.airbnb.com/api/v2/listings/${listingId}?_format=for_rooms_show&key=d306zoyjsyarp7uqwjaufrqo&currency=${currency}&locale=en-US`;

  const res = await fetch(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "X-Airbnb-API-Key": "d306zoyjsyarp7uqwjaufrqo",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) return null;

  let json: Record<string, unknown>;
  try { json = await res.json(); } catch { return null; }

  const l = (json.listing ?? json) as Record<string, unknown>;
  if (!l) return null;

  const listing: ImportedListing = {};

  // Title
  if (typeof l.name === "string") listing.public_title = l.name.trim();

  // Description — try multiple fields
  const descFields = ["description", "summary", "space", "access", "interaction", "neighborhood_overview", "transit", "notes"];
  const descParts: string[] = [];
  for (const f of descFields) {
    if (typeof l[f] === "string" && (l[f] as string).trim()) descParts.push((l[f] as string).trim());
  }
  if (descParts.length > 0) listing.description = descParts[0]; // use primary description

  // Capacity / rooms
  if (typeof l.person_capacity === "number") listing.max_guests = l.person_capacity;
  if (typeof l.bedrooms === "number") listing.bedrooms = l.bedrooms;
  if (typeof l.beds === "number") listing.beds = l.beds;
  if (typeof l.bathrooms === "number") listing.bathrooms = l.bathrooms;

  // Location
  if (typeof l.city === "string") listing.city = l.city;
  if (typeof l.state === "string") listing.state = l.state;
  if (typeof l.country === "string") listing.country = l.country;
  if (typeof l.country_code === "string" && !listing.country) listing.country = l.country_code;
  if (typeof l.lat === "number") listing.lat = l.lat;
  if (typeof l.lng === "number") listing.lng = l.lng;
  if (typeof l.address === "string") listing.address = l.address;

  // Property / rental type
  if (typeof l.property_type === "string") listing.property_type = mapPropertyType(l.property_type);
  if (typeof l.room_type === "string") {
    const rt = (l.room_type as string).toLowerCase();
    if (rt.includes("entire") || rt.includes("whole")) listing.rental_type = "entire_place";
    else if (rt.includes("private")) listing.rental_type = "private_room";
    else if (rt.includes("shared") || rt.includes("hotel")) listing.rental_type = "shared_room";
  }

  // Price
  if (typeof l.price === "number") {
    listing.base_rate_amount = l.price;
    listing.base_rate_currency = currency;
  } else if (l.price && typeof l.price === "object") {
    const p = l.price as Record<string, unknown>;
    const amount = p.amount ?? p.rate ?? p.nightly_price;
    if (typeof amount === "number") { listing.base_rate_amount = amount; listing.base_rate_currency = currency; }
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
        const u = (p as Record<string, unknown>).x_large_url ?? (p as Record<string, unknown>).large ?? (p as Record<string, unknown>).url ?? (p as Record<string, unknown>).picture;
        if (typeof u === "string") imageUrls.push(u);
      }
    }
    if (imageUrls.length > 0) listing.images = imageUrls.slice(0, 20).map((url, i) => ({ url, caption: "", order: i }));
  }

  // Min nights
  if (typeof l.min_nights === "number") listing.minimum_stay = l.min_nights;

  // Check-in / check-out
  if (typeof l.check_in_time === "string") listing.check_in_time = l.check_in_time;
  if (typeof l.check_out_time === "string") listing.check_out_time = l.check_out_time;

  // House rules
  if (typeof l.house_rules === "string") listing.rules = l.house_rules;

  return Object.keys(listing).length > 1 ? listing : null;
}

// ---------------------------------------------------------------------------
// Main fetch + parse
// ---------------------------------------------------------------------------

async function importFromUrl(rawUrl: string): Promise<ImportedListing> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error("Invalid URL provided."); }

  const isAirbnb = url.hostname.includes("airbnb.");
  const isUk = url.hostname.includes(".co.uk");
  const cleanUrl = `${url.protocol}//${url.hostname}${url.pathname}`;

  // ── Strategy 1: Airbnb internal API (clean JSON, no bot detection) ──
  if (isAirbnb) {
    const listingId = extractAirbnbListingId(url.pathname);
    if (listingId) {
      try {
        const apiResult = await fetchAirbnbApi(listingId, isUk);
        if (apiResult && apiResult.public_title) {
          apiResult.source_url = cleanUrl;
          if (!apiResult.base_rate_currency) apiResult.base_rate_currency = isUk ? "GBP" : "USD";
          return apiResult;
        }
      } catch {
        // fall through to HTML scraping
      }
    }
  }

  // ── Strategy 2: HTML scrape fallback ──
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

  if (response.status === 403 || response.status === 401) throw new Error("Airbnb blocked this request.");
  if (response.status === 404) throw new Error("Listing not found. Check the URL is correct and the listing is still active.");
  if (!response.ok) throw new Error(`Could not fetch listing (HTTP ${response.status}).`);

  const html = await response.text();

  // Detect homepage redirect (anti-bot)
  if (html.includes("Holiday Rentals, Cabins, Beach Houses") || html.includes("Vacation Rentals, Cabins, Beach Houses")) {
    throw new Error("Airbnb redirected to homepage — this listing may be unavailable from server-side requests. Try the Airbnb Sync option instead.");
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

  if (isAirbnb) {
    if (!listing.base_rate_currency) listing.base_rate_currency = isUk ? "GBP" : "USD";
  }

  if (!listing.public_title && !listing.description) {
    throw new Error("Could not extract listing data. The page may require login or the URL format is unsupported.");
  }

  return listing;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // Always return 200 so supabase.functions.invoke() doesn't swallow the error message.
  // Errors are communicated via { error: string } in the response body.

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" });
  }

  try {
    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string" || !url.trim()) {
      return json({ error: "url is required" });
    }

    const listing = await importFromUrl(url.trim());
    return json({ data: listing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return json({ error: message });
  }
});
