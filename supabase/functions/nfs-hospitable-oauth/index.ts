// nfstay Hospitable Connect Edge Function
// Implements the official Hospitable Connect partner flow.
// Sync is done directly via Hospitable API — no n8n dependency.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NFS_HOSPITABLE_PARTNER_ID = Deno.env.get('NFS_HOSPITABLE_PARTNER_ID');
const NFS_HOSPITABLE_PARTNER_SECRET = Deno.env.get('NFS_HOSPITABLE_PARTNER_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const HOSPITABLE_CONNECT_BASE = 'https://connect.hospitable.com/api/v1';
const CONNECT_VERSION = '2024-01-01';

const ALLOWED_ORIGINS = ['https://hub.nfstay.com', 'https://nfstay.app'];
const DEFAULT_ORIGIN = 'https://hub.nfstay.com';

function resolveOrigin(raw: string | null): string {
  if (raw && ALLOWED_ORIGINS.includes(raw)) return raw;
  return DEFAULT_ORIGIN;
}

function buildRedirectUrl(origin: string, params: Record<string, string>): string {
  const isHub = origin === 'https://hub.nfstay.com';
  const basePath = isHub ? '/operator/settings' : '/nfstay/oauth-callback';
  const qs = new URLSearchParams(isHub ? { tab: 'hospitable', ...params } : { provider: 'hospitable', ...params });
  return `${origin}${basePath}?${qs.toString()}`;
}

function connectHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${NFS_HOSPITABLE_PARTNER_SECRET}`,
    'Connect-Version': CONNECT_VERSION,
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

/**
 * Fetch listings from Hospitable Connect API and upsert into nfs_properties.
 * Returns { synced, errors, debug }.
 */
// ── Shared helpers for listing field mapping ──

const COUNTRY_MAP: Record<string, string> = { GB: 'United Kingdom', US: 'United States', AE: 'United Arab Emirates', SG: 'Singapore', FR: 'France', ES: 'Spain', IT: 'Italy', DE: 'Germany', PT: 'Portugal', GR: 'Greece', TH: 'Thailand', AU: 'Australia', CA: 'Canada' };

const AMENITY_MAP: Record<string, string> = {
  WIRELESS_INTERNET: 'wifi', WIFI: 'wifi',
  KITCHEN: 'kitchen', OVEN: 'kitchen', MICROWAVE: 'kitchen', STOVE: 'kitchen', REFRIGERATOR: 'kitchen',
  TV: 'tv', HEATING: 'heating', WASHER: 'washer', DRYER: 'dryer',
  FREE_PARKING: 'parking', PARKING: 'parking',
  ELEVATOR: 'elevator', HAIR_DRYER: 'hair_dryer',
  IRON: 'iron', DISHWASHER: 'dishwasher',
  POOL: 'pool', GYM: 'gym', HOT_TUB: 'hot_tub',
  AIR_CONDITIONING: 'air_conditioning', AC: 'air_conditioning',
  SMOKE_DETECTOR: 'smoke_detector', CARBON_MONOXIDE_DETECTOR: 'carbon_monoxide_detector',
  FIRE_EXTINGUISHER: 'fire_extinguisher', FIRST_AID_KIT: 'first_aid_kit',
  ESSENTIALS: 'essentials', BED_LINENS: 'bed_linens', HANGERS: 'hangers',
  COFFEE: 'coffee_maker', COOKING_BASICS: 'cooking_basics',
  PRIVATE_ENTRANCE: 'private_entrance',
};

/** Map a raw Hospitable listing to basic nfs_properties fields (no API calls needed) */
function mapListingToBasicProperty(listing: Record<string, unknown>, operatorId: string, customerId: string) {
  const hospId = String(listing.id ?? listing.listing_id ?? listing.property_id ?? '');
  if (!hospId) return null;

  // Skip unlisted/unpublished Airbnb listings
  if (listing.available === 0 || listing.available === false) return null;

  // Thumbnail from listing metadata (no extra API call)
  const images: { url: string; order: number }[] = [];
  const pictureUrl = listing.picture as string | undefined;
  if (pictureUrl) {
    const largeUrl = pictureUrl.replace('aki_policy=x_small', 'aki_policy=large');
    images.push({ url: largeUrl, order: 0 });
  }

  // Address
  const addr = (listing.address ?? listing.location ?? {}) as Record<string, unknown>;
  const city = String(addr.city ?? listing.city ?? '');
  const countryCode = String(addr.country_code ?? addr.country ?? listing.country ?? '');
  const country = COUNTRY_MAP[countryCode.toUpperCase()] || countryCode;
  const street = String(addr.street ?? addr.address ?? addr.line1 ?? listing.street ?? '');
  const postalCode = String(addr.zipcode ?? addr.postal_code ?? addr.postcode ?? '');
  const state = String(addr.state ?? addr.region ?? '');
  const lat = Number(addr.latitude ?? addr.lat ?? listing.latitude ?? listing.lat ?? 0) || null;
  const lng = Number(addr.longitude ?? addr.lng ?? listing.longitude ?? listing.lng ?? 0) || null;

  // Room counts
  const capacity = (listing.capacity ?? {}) as Record<string, unknown>;
  const bedrooms = Number(listing.bedrooms ?? capacity.bedrooms ?? 0);
  const bathrooms = Number(listing.bathrooms ?? capacity.bathrooms ?? 0);
  const beds = Number(capacity.beds ?? listing.beds ?? bedrooms);
  const maxGuests = Number(capacity.max ?? listing.max_guests ?? listing.person_capacity ?? 2);

  // Cleaning fee from listing.fees
  const feesArr = Array.isArray(listing.fees) ? listing.fees as Record<string, unknown>[] : [];
  let cleaningFeeAmount = 0;
  let pricingCurrency = 'GBP';
  for (const fee of feesArr) {
    const feeObj = (fee.fee ?? {}) as Record<string, unknown>;
    if (fee.name === 'PASS_THROUGH_CLEANING_FEE') {
      cleaningFeeAmount = Number(feeObj.amount ?? 0) / 100;
      pricingCurrency = String(feeObj.currency ?? 'GBP').toUpperCase();
    }
  }

  const title = String(listing.public_name ?? listing.name ?? listing.title ?? listing.public_title ?? 'Untitled Property');
  const description = String(listing.description ?? listing.summary ?? listing.notes ?? '');
  const propertyType = String(listing.property_type ?? listing.type ?? listing.room_type ?? 'apartment').toLowerCase();
  const minStay = Number(listing.min_nights ?? listing.minimum_nights ?? listing.minimum_stay ?? 1);

  // Map amenities
  const rawAmenities = Array.isArray(listing.amenities) ? listing.amenities as string[] : [];
  const amenities: Record<string, boolean> = {};
  for (const a of rawAmenities) {
    const mapped = AMENITY_MAP[a];
    if (mapped) amenities[mapped] = true;
    amenities[a.toLowerCase()] = true;
  }

  const checkInTime = listing.check_in ? String(listing.check_in) : null;
  const checkOutTime = listing.check_out ? String(listing.check_out) : null;

  return {
    hospId,
    data: {
      operator_id: operatorId,
      hospitable_property_id: hospId,
      hospitable_customer_id: customerId,
      hospitable_connected: true,
      hospitable_sync_status: 'pending_enrichment',
      hospitable_last_sync_at: new Date().toISOString(),
      public_title: title,
      description,
      property_type: propertyType,
      city,
      country,
      street,
      postal_code: postalCode || null,
      state: state || null,
      lat,
      lng,
      max_guests: maxGuests,
      minimum_stay: minStay,
      base_rate_amount: 0,
      base_rate_currency: pricingCurrency,
      status: 'draft',
      images: images.length > 0 ? images : [],
      amenities,
      room_counts: { bedrooms, bathrooms, beds },
      cleaning_fee: { enabled: cleaningFeeAmount > 0, amount: cleaningFeeAmount },
      weekly_discount: { enabled: false, percentage: 0 },
      monthly_discount: { enabled: false, percentage: 0 },
      extra_guest_fee: { enabled: false, amount: 0, after_guests: 1 },
      ...(checkInTime ? { check_in_time: checkInTime } : {}),
      ...(checkOutTime ? { check_out_time: checkOutTime } : {}),
      custom_rates: {},
    } as Record<string, unknown>,
  };
}

/** Fetch all listing metadata from Hospitable (paginated, no per-property API calls) */
async function fetchAllListings(
  customerId: string,
  debug: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  let listings: Record<string, unknown>[] = [];
  let pageUrl: string | null = `${HOSPITABLE_CONNECT_BASE}/customers/${customerId}/listings`;

  while (pageUrl) {
    try {
      const res = await fetch(pageUrl, { method: 'GET', headers: connectHeaders() });
      const text = await res.text();
      console.log(`[Hospitable] ${pageUrl} → ${res.status}: ${text.slice(0, 500)}`);
      (debug.endpoints as unknown[]).push({ url: pageUrl, status: res.status, body: text.slice(0, 300) });

      if (!res.ok) { pageUrl = null; break; }

      const parsed = JSON.parse(text) as Record<string, unknown>;
      const page = Array.isArray(parsed.data) ? parsed.data as Record<string, unknown>[] : [];
      listings = listings.concat(page);

      const links = parsed.links as Record<string, string | null> | null;
      pageUrl = links?.next ?? null;
    } catch (e) {
      console.log(`[Hospitable] listings fetch error: ${e}`);
      (debug.endpoints as unknown[]).push({ url: pageUrl, error: String(e) });
      pageUrl = null;
    }
  }
  return listings;
}

/**
 * Phase 1 — Quick sync: saves all listings with basic data (no images/calendar API calls).
 * Fast enough to run in callback (~2-5 seconds for 300 properties).
 * Properties are saved with hospitable_sync_status='pending_enrichment'.
 */
async function quickSyncListings(
  supabase: ReturnType<typeof createClient>,
  operatorId: string,
  customerId: string,
  connectionRowId: string,
): Promise<{ synced: number; total: number; errors: string[]; debug: Record<string, unknown> }> {
  const errors: string[] = [];
  const debug: Record<string, unknown> = { customerId, endpoints: [] };
  let synced = 0;

  await supabase
    .from('nfs_hospitable_connections')
    .update({ sync_status: 'syncing', last_sync_error: null, sync_progress: {} })
    .eq('id', connectionRowId);

  const listings = await fetchAllListings(customerId, debug);

  debug.listingCount = listings.length;
  if (listings.length > 0) {
    debug.successEndpoint = `${HOSPITABLE_CONNECT_BASE}/customers/${customerId}/listings`;
    debug.sampleListing = listings[0];
  }

  await supabase
    .from('nfs_hospitable_connections')
    .update({ last_sync_results: { debug, raw_keys: listings.length > 0 ? Object.keys(listings[0]) : [] } })
    .eq('id', connectionRowId);

  if (listings.length === 0) {
    const syncError = 'No listings found in Hospitable. Please reconnect and link your Airbnb account on the Hospitable authorization page.';
    await supabase
      .from('nfs_hospitable_connections')
      .update({
        sync_status: 'completed',
        last_sync_at: new Date().toISOString(),
        total_properties: 0,
        last_sync_error: syncError,
        connected_platforms: [],
        sync_progress: {},
      })
      .eq('id', connectionRowId);
    return { synced: 0, total: 0, errors: [syncError], debug };
  }

  // Upsert all listings with basic data (no per-property API calls)
  for (const listing of listings) {
    try {
      const mapped = mapListingToBasicProperty(listing, operatorId, customerId);
      if (!mapped) continue;

      const { error: upsertErr } = await supabase
        .from('nfs_properties')
        .upsert(mapped.data, { onConflict: 'hospitable_property_id,operator_id', ignoreDuplicates: false });

      if (upsertErr) {
        console.error('[Hospitable] quick upsert error for', mapped.hospId, upsertErr.message);
        errors.push(`${mapped.hospId}: ${upsertErr.message}`);
      } else {
        synced++;
      }
    } catch (e) {
      errors.push(String(e));
    }
  }

  // Mark as enriching — properties are saved but need images/calendar
  await supabase
    .from('nfs_hospitable_connections')
    .update({
      sync_status: synced > 0 ? 'enriching' : 'failed',
      last_sync_at: new Date().toISOString(),
      total_properties: synced,
      last_sync_error: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
      connected_platforms: synced > 0 ? ['airbnb'] : [],
      sync_progress: { total: synced, enriched: 0, failed: 0 },
    })
    .eq('id', connectionRowId);

  return { synced, total: listings.length, errors, debug };
}

/**
 * Phase 2 — Enrich: fetch images + calendar for properties with pending_enrichment status.
 * Processes a batch at a time, updates progress after each batch.
 * Can be called multiple times to continue where it left off.
 */
async function enrichProperties(
  supabase: ReturnType<typeof createClient>,
  operatorId: string,
  customerId: string,
  connectionRowId: string,
  batchSize = 15,
): Promise<{ enriched: number; remaining: number; errors: string[] }> {
  const errors: string[] = [];
  let enriched = 0;

  // Get properties that need enrichment
  const { data: pendingProps } = await supabase
    .from('nfs_properties')
    .select('id, hospitable_property_id')
    .eq('operator_id', operatorId)
    .eq('hospitable_connected', true)
    .eq('hospitable_sync_status', 'pending_enrichment')
    .limit(batchSize);

  if (!pendingProps || pendingProps.length === 0) {
    // All done — mark connection as completed
    await supabase
      .from('nfs_hospitable_connections')
      .update({ sync_status: 'completed' })
      .eq('id', connectionRowId);
    return { enriched: 0, remaining: 0, errors: [] };
  }

  for (const prop of pendingProps) {
    const hospId = prop.hospitable_property_id as string;
    try {
      // Fetch images
      const images: { url: string; order: number }[] = [];
      try {
        const imgRes = await fetch(
          `${HOSPITABLE_CONNECT_BASE}/customers/${customerId}/listings/${hospId}/images`,
          { method: 'GET', headers: connectHeaders() },
        );
        if (imgRes.ok) {
          const imgData = JSON.parse(await imgRes.text());
          const imgArr = Array.isArray(imgData.data) ? imgData.data as Record<string, unknown>[] : [];
          for (const img of imgArr) {
            const url = String(img.url ?? img.thumbnail_url ?? '');
            if (url) images.push({ url, order: Number(img.order ?? images.length) });
          }
          images.sort((a, b) => a.order - b.order);
        }
      } catch (_e) { /* fall back to existing thumbnail */ }

      // Fetch calendar for pricing + availability
      let baseRate = 0;
      const blockedDates: string[] = [];
      const weekdayPrices: number[] = [];
      const weekendPrices: number[] = [];
      let pricingCurrency = 'GBP';
      try {
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const endDate90 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const calUrl = `${HOSPITABLE_CONNECT_BASE}/listings/${hospId}/calendar?start_date=${startDate}&end_date=${endDate90}`;
        const calRes = await fetch(calUrl, { method: 'GET', headers: connectHeaders() });
        if (calRes.ok) {
          const calData = JSON.parse(await calRes.text());
          const dates = calData.data?.dates ?? [];
          for (const d of dates as Record<string, unknown>[]) {
            const dateStr = String(d.date ?? '');
            const price = (d.price ?? {}) as Record<string, unknown>;
            const avail = (d.availability ?? {}) as Record<string, unknown>;
            const priceAmount = Number(price.amount ?? 0) / 100;
            if (price.currency) pricingCurrency = String(price.currency).toUpperCase();
            if (avail.available === false && dateStr) blockedDates.push(dateStr);
            if (priceAmount > 0 && avail.available !== false) {
              const dayOfWeek = new Date(dateStr).getDay();
              if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
                weekendPrices.push(priceAmount);
              } else {
                weekdayPrices.push(priceAmount);
              }
            }
          }
          if (weekdayPrices.length > 0) {
            weekdayPrices.sort((a, b) => a - b);
            baseRate = weekdayPrices[Math.floor(weekdayPrices.length / 2)];
          } else if (weekendPrices.length > 0) {
            weekendPrices.sort((a, b) => a - b);
            baseRate = weekendPrices[Math.floor(weekendPrices.length / 2)];
          }
        }
      } catch (calErr) {
        console.log(`[Hospitable] Calendar fetch failed for ${hospId}:`, calErr);
      }

      let weekendRate = 0;
      if (weekendPrices.length > 0) {
        weekendPrices.sort((a, b) => a - b);
        weekendRate = weekendPrices[Math.floor(weekendPrices.length / 2)];
      }

      // Update property with enriched data
      const updateData: Record<string, unknown> = {
        hospitable_sync_status: 'synced',
        hospitable_last_sync_at: new Date().toISOString(),
        base_rate_amount: baseRate || 0,
        base_rate_currency: pricingCurrency,
        custom_rates: weekendRate > 0 || baseRate > 0 ? {
          ...(weekendRate > 0 ? { weekend_rate: weekendRate } : {}),
          ...(baseRate > 0 ? { weekday_rate: baseRate } : {}),
          source: 'hospitable',
          last_synced: new Date().toISOString(),
        } : {},
      };
      // Only update images if we fetched new ones
      if (images.length > 0) updateData.images = images;

      await supabase
        .from('nfs_properties')
        .update(updateData)
        .eq('id', prop.id);

      // Sync blocked dates
      if (blockedDates.length > 0) {
        try {
          await supabase
            .from('nfs_blocked_dates')
            .delete()
            .eq('property_id', prop.id)
            .eq('source', 'hospitable');

          const blockedRows = blockedDates.map((date: string) => ({
            property_id: prop.id,
            date,
            source: 'hospitable',
          }));
          for (let i = 0; i < blockedRows.length; i += 500) {
            const batch = blockedRows.slice(i, i + 500);
            await supabase
              .from('nfs_blocked_dates')
              .upsert(batch, { onConflict: 'property_id,date' });
          }
        } catch (blockErr) {
          console.error('[Hospitable] blocked dates sync failed:', blockErr);
        }
      }

      enriched++;
    } catch (e) {
      errors.push(`${hospId}: ${String(e)}`);
      // Mark as failed enrichment so we don't retry forever
      await supabase
        .from('nfs_properties')
        .update({ hospitable_sync_status: 'synced' })
        .eq('id', prop.id);
    }
  }

  // Check how many are still pending
  const { count: remainingCount } = await supabase
    .from('nfs_properties')
    .select('id', { count: 'exact', head: true })
    .eq('operator_id', operatorId)
    .eq('hospitable_connected', true)
    .eq('hospitable_sync_status', 'pending_enrichment');

  const remaining = remainingCount ?? 0;

  // Update progress on connection
  const { data: connData } = await supabase
    .from('nfs_hospitable_connections')
    .select('sync_progress, total_properties')
    .eq('id', connectionRowId)
    .single();

  const prevProgress = (connData?.sync_progress ?? {}) as Record<string, number>;
  const totalProps = (connData?.total_properties ?? 0) as number;
  const totalEnriched = (prevProgress.enriched ?? 0) + enriched;
  const totalFailed = (prevProgress.failed ?? 0) + errors.length;

  await supabase
    .from('nfs_hospitable_connections')
    .update({
      sync_status: remaining > 0 ? 'enriching' : 'completed',
      sync_progress: { total: totalProps, enriched: totalEnriched, failed: totalFailed },
      last_sync_at: new Date().toISOString(),
      last_sync_error: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
    })
    .eq('id', connectionRowId);

  return { enriched, remaining, errors };
}

/**
 * Legacy wrapper — runs quick sync + full enrichment in one call.
 * Used by resync action. May timeout for large accounts, but enrichment
 * can be continued via the 'enrich' action.
 */
async function syncListingsFromHospitable(
  supabase: ReturnType<typeof createClient>,
  operatorId: string,
  customerId: string,
  connectionRowId: string,
): Promise<{ synced: number; errors: string[]; debug: Record<string, unknown> }> {
  // Phase 1: Quick sync all listings
  const quickResult = await quickSyncListings(supabase, operatorId, customerId, connectionRowId);

  if (quickResult.synced === 0) {
    return { synced: 0, errors: quickResult.errors, debug: quickResult.debug };
  }

  // Phase 2: Enrich in batches until done or timeout
  let totalEnriched = 0;
  const allErrors = [...quickResult.errors];
  let remaining = quickResult.synced;

  while (remaining > 0) {
    const batch = await enrichProperties(supabase, operatorId, customerId, connectionRowId, 15);
    totalEnriched += batch.enriched;
    remaining = batch.remaining;
    allErrors.push(...batch.errors);

    // If a batch enriched 0 and there are still remaining, something is wrong — break
    if (batch.enriched === 0 && remaining > 0) break;
  }

  return { synced: quickResult.synced, errors: allErrors, debug: quickResult.debug };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!NFS_HOSPITABLE_PARTNER_ID || !NFS_HOSPITABLE_PARTNER_SECRET) {
    return new Response(
      JSON.stringify({ error: 'Hospitable credentials not configured. Set NFS_HOSPITABLE_PARTNER_ID and NFS_HOSPITABLE_PARTNER_SECRET in Supabase edge function secrets.' }),
      { status: 500, headers: corsHeaders }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);

  try {
    if (req.method === 'GET') {
      const action = url.searchParams.get('action');

      // ══ AUTHORIZE ══
      if (action === 'authorize') {
        const operatorId = url.searchParams.get('operator_id');
        const profileId = url.searchParams.get('profile_id');
        const origin = resolveOrigin(url.searchParams.get('origin'));

        if (!operatorId || !profileId) {
          return new Response(JSON.stringify({ error: 'operator_id and profile_id required' }), { status: 400, headers: corsHeaders });
        }

        // Fetch existing connection including connected_platforms to detect incomplete connections
        const { data: existingConn } = await supabase
          .from('nfs_hospitable_connections')
          .select('id, hospitable_customer_id, status, is_active, connected_platforms')
          .eq('operator_id', operatorId)
          .order('connected_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: operatorRow } = await supabase
          .from('nfs_operators')
          .select('contact_email, first_name, last_name, brand_name')
          .eq('id', operatorId)
          .single();

        let operatorEmail = operatorRow?.contact_email || '';
        if (!operatorEmail) {
          const { data: profileRow } = await supabase.from('profiles').select('email').eq('id', profileId).single();
          operatorEmail = profileRow?.email || `operator-${operatorId}@nfstay.com`;
        }

        const operatorName = operatorRow?.brand_name
          || [operatorRow?.first_name, operatorRow?.last_name].filter(Boolean).join(' ')
          || 'NFStay Operator';

        let customerId = '';

        // Only reuse existing customer if the connection is active (connected with platforms)
        // If disconnected or deleted, always create a fresh customer to avoid zombie state
        const canReuseCustomer = existingConn?.hospitable_customer_id
          && !existingConn.hospitable_customer_id.startsWith('pending-reset')
          && !existingConn.hospitable_customer_id.startsWith('deleted-')
          && existingConn.status !== 'disconnected';

        if (canReuseCustomer) {
          const verifyRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/customers/${existingConn.hospitable_customer_id}`, { method: 'GET', headers: connectHeaders() });
          if (verifyRes.ok) customerId = existingConn.hospitable_customer_id;
        }

        if (!customerId) {
          // Use a unique ID for reconnections to avoid conflicts with zombie customers
          const uniqueId = existingConn?.status === 'disconnected'
            ? `${operatorId}-${Date.now()}`
            : operatorId;

          // Try creating the customer
          const customerRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/customers`, {
            method: 'POST',
            headers: connectHeaders(),
            body: JSON.stringify({ id: uniqueId, email: operatorEmail, name: operatorName }),
          });

          const customerText = await customerRes.text();
          console.log(`[Hospitable] Create customer → ${customerRes.status}: ${customerText.slice(0, 300)}`);

          if (customerRes.ok) {
            const customerData = JSON.parse(customerText);
            customerId = customerData.id || customerData.data?.id || '';
          } else if (customerRes.status === 422 || customerRes.status === 409) {
            // Customer already exists — fetch by our ID
            const getRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/customers/${uniqueId}`, { method: 'GET', headers: connectHeaders() });
            const getText = await getRes.text();
            console.log(`[Hospitable] Get existing customer → ${getRes.status}: ${getText.slice(0, 300)}`);
            if (getRes.ok) {
              const getData = JSON.parse(getText);
              customerId = getData.id || getData.data?.id || '';
            }
          } else {
            const errText = customerText;
            return new Response(JSON.stringify({ error: 'Failed to create Hospitable customer', detail: errText }), { status: 502, headers: corsHeaders });
          }
        }

        if (!customerId) {
          return new Response(JSON.stringify({ error: 'No customer ID returned from Hospitable' }), { status: 502, headers: corsHeaders });
        }

        const callbackUrl = `${SUPABASE_URL}/functions/v1/nfs-hospitable-oauth?action=callback`;
        const authCodeRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/auth-codes`, {
          method: 'POST',
          headers: connectHeaders(),
          // channels instructs Hospitable's Connect page to prompt the user to link Airbnb
          body: JSON.stringify({ customer_id: customerId, redirect_url: callbackUrl, channels: ['airbnb'] }),
        });

        const authCodeText = await authCodeRes.text();
        console.log(`[Hospitable] Auth code → ${authCodeRes.status}: ${authCodeText.slice(0, 300)}`);

        if (!authCodeRes.ok) {
          return new Response(JSON.stringify({ error: 'Failed to create Hospitable auth code', detail: authCodeText }), { status: 502, headers: corsHeaders });
        }

        const authCodeData = JSON.parse(authCodeText);
        const returnUrl = authCodeData.return_url || authCodeData.data?.return_url || authCodeData.url || authCodeData.data?.url || '';

        if (!returnUrl) {
          return new Response(JSON.stringify({ error: 'No return_url in Hospitable auth code response', raw: authCodeData }), { status: 502, headers: corsHeaders });
        }

        const state = crypto.randomUUID();

        // Determine if this is an incomplete connection (connected but no Airbnb linked)
        const isIncompleteConnection = existingConn?.status === 'connected' &&
          Array.isArray(existingConn.connected_platforms) &&
          existingConn.connected_platforms.length === 0;

        if (existingConn?.id && (existingConn.status !== 'connected' || isIncompleteConnection)) {
          // Update existing row to pending so callback can re-process it
          await supabase.from('nfs_hospitable_connections').update({
            hospitable_customer_id: customerId,
            auth_code: state,
            auth_code_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            status: 'pending',
            sync_status: 'pending',
            user_metadata: { redirect_origin: origin },
            last_error: null,
          }).eq('id', existingConn.id);
        } else if (!existingConn) {
          // New connection
          const { error: insertErr } = await supabase.from('nfs_hospitable_connections').insert({
            operator_id: operatorId,
            profile_id: profileId,
            hospitable_customer_id: customerId,
            auth_code: state,
            auth_code_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            status: 'pending',
            sync_status: 'pending',
            health_status: 'healthy',
            is_active: false,
            total_properties: 0,
            total_reservations: 0,
            connected_platforms: [],
            user_metadata: { redirect_origin: origin },
          });
          if (insertErr) {
            console.error('[Hospitable] Connection insert failed:', insertErr.message);
            return new Response(JSON.stringify({ error: 'Failed to save connection', detail: insertErr.message }), { status: 500, headers: corsHeaders });
          }
        } else if (existingConn?.id) {
          // Already connected with Airbnb linked — still update redirect origin + auth code
          // so the callback redirects back to the correct site (nfstay.app vs hub)
          await supabase.from('nfs_hospitable_connections').update({
            auth_code: state,
            auth_code_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            user_metadata: { redirect_origin: origin },
          }).eq('id', existingConn.id);
        }

        return new Response(JSON.stringify({ url: returnUrl }), { status: 200, headers: corsHeaders });
      }

      // ══ CALLBACK ══
      if (action === 'callback') {
        const status = url.searchParams.get('status');
        const customerId = url.searchParams.get('customer_id');
        const errorParam = url.searchParams.get('error');

        console.log(`[Hospitable] Callback params: status=${status} customer_id=${customerId} error=${errorParam} all=${url.search}`);

        let connectionRow: Record<string, unknown> | null = null;
        let redirectOrigin = DEFAULT_ORIGIN;

        if (customerId) {
          const { data } = await supabase
            .from('nfs_hospitable_connections')
            .select('id, operator_id, profile_id, hospitable_customer_id, auth_code_expires_at, user_metadata')
            .eq('hospitable_customer_id', customerId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          connectionRow = data;
        }

        if (!connectionRow) {
          const { data } = await supabase
            .from('nfs_hospitable_connections')
            .select('id, operator_id, profile_id, hospitable_customer_id, auth_code_expires_at, user_metadata')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          connectionRow = data;
        }

        if (connectionRow?.user_metadata && typeof connectionRow.user_metadata === 'object') {
          const meta = connectionRow.user_metadata as Record<string, string>;
          redirectOrigin = resolveOrigin(meta.redirect_origin || null);
        }

        if (errorParam || status === 'error') {
          if (connectionRow) {
            await supabase.from('nfs_hospitable_connections')
              .update({ status: 'failed', last_error: { message: errorParam || 'Authorization failed' }, auth_code: null })
              .eq('id', connectionRow.id);
          }
          return new Response(null, { status: 302, headers: { Location: buildRedirectUrl(redirectOrigin, { error: errorParam || 'auth_failed' }) } });
        }

        if (!connectionRow) {
          return new Response(null, { status: 302, headers: { Location: buildRedirectUrl(DEFAULT_ORIGIN, { error: 'no_pending_connection' }) } });
        }

        const resolvedCustomerId = customerId || (connectionRow.hospitable_customer_id as string);

        // NOTE: Hospitable Connect customer GET only returns {id, email, name, phone, timezone, ip_address}
        // It does NOT return connection_id or connected_platforms — those are determined by syncing listings

        const existingMeta = (connectionRow.user_metadata && typeof connectionRow.user_metadata === 'object')
          ? connectionRow.user_metadata as Record<string, unknown> : {};

        await supabase.from('nfs_hospitable_connections').update({
          hospitable_customer_id: resolvedCustomerId,
          status: 'connected',
          is_active: true,
          connected_at: new Date().toISOString(),
          user_metadata: existingMeta,
          auth_code: null,
          auth_code_expires_at: null,
          last_error: null,
          health_status: 'healthy',
        }).eq('id', connectionRow.id);

        // Quick sync all listings (fast — no per-property API calls)
        // Properties are saved immediately, enrichment (images/calendar) happens via separate enrich calls
        console.log('[Hospitable] Starting quick listing sync for customer:', resolvedCustomerId);
        try {
          await quickSyncListings(
            supabase,
            connectionRow.operator_id as string,
            resolvedCustomerId,
            connectionRow.id as string,
          );
        } catch (e) {
          console.error('[Hospitable] Quick sync error:', e);
        }

        return new Response(null, { status: 302, headers: { Location: buildRedirectUrl(redirectOrigin, { status: 'success', success: 'connected' }) } });
      }
    }

    // ══ POST actions ══
    if (req.method === 'POST') {
      const body = await req.json();

      // Manual resync — direct Hospitable API call, returns debug info
      if (body.action === 'resync') {
        const operatorId = body.operator_id;
        const specificConnectionId = body.connection_id;
        if (!operatorId) return new Response(JSON.stringify({ error: 'operator_id required' }), { status: 400, headers: corsHeaders });

        let query = supabase
          .from('nfs_hospitable_connections')
          .select('id, hospitable_customer_id, hospitable_connection_id, status')
          .eq('operator_id', operatorId);

        if (specificConnectionId) {
          query = query.eq('id', specificConnectionId) as typeof query;
        }

        const { data: connectionRow } = await query.order('connected_at', { ascending: false }).limit(1).maybeSingle();

        if (!connectionRow) {
          return new Response(JSON.stringify({ error: 'No Hospitable connection found' }), { status: 400, headers: corsHeaders });
        }

        // Allow resync even on pending connections to help debug
        if (connectionRow.status === 'failed' || connectionRow.status === 'disconnected') {
          return new Response(JSON.stringify({ error: 'Connection is not active', status: connectionRow.status }), { status: 400, headers: corsHeaders });
        }

        // Verify customer status at Hospitable before syncing
        const customerId = connectionRow.hospitable_customer_id as string;
        let customerInfo: Record<string, unknown> = {};
        try {
          const custRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/customers/${customerId}`, { method: 'GET', headers: connectHeaders() });
          const custText = await custRes.text();
          console.log(`[Hospitable] Customer info → ${custRes.status}: ${custText.slice(0, 500)}`);
          if (custRes.ok) {
            customerInfo = JSON.parse(custText);
            // NOTE: Hospitable customer object does NOT include connected_platforms or connection_id
            // Those are derived from whether listings sync returns results
          }
        } catch (e) {
          console.log('[Hospitable] Could not fetch customer info:', e);
        }

        const { synced, errors, debug } = await syncListingsFromHospitable(
          supabase,
          operatorId,
          customerId,
          connectionRow.id as string,
        );

        return new Response(
          JSON.stringify({ success: true, synced, errors, debug, customerInfo }),
          { status: 200, headers: corsHeaders }
        );
      }

      // ══ ENRICH — process a batch of properties that need images/calendar ══
      if (body.action === 'enrich') {
        const operatorId = body.operator_id;
        const specificConnectionId = body.connection_id;
        const batchSize = Number(body.batch_size ?? 15);
        if (!operatorId) return new Response(JSON.stringify({ error: 'operator_id required' }), { status: 400, headers: corsHeaders });

        let query = supabase
          .from('nfs_hospitable_connections')
          .select('id, hospitable_customer_id, status')
          .eq('operator_id', operatorId);
        if (specificConnectionId) query = query.eq('id', specificConnectionId) as typeof query;

        const { data: connectionRow } = await query
          .order('connected_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!connectionRow || connectionRow.status !== 'connected') {
          return new Response(JSON.stringify({ error: 'No active connection found' }), { status: 400, headers: corsHeaders });
        }

        const result = await enrichProperties(
          supabase,
          operatorId,
          connectionRow.hospitable_customer_id as string,
          connectionRow.id as string,
          batchSize,
        );

        return new Response(
          JSON.stringify({ success: true, ...result }),
          { status: 200, headers: corsHeaders }
        );
      }

      if (body.action === 'disconnect') {
        const operatorId = body.operator_id;
        const connectionId = body.connection_id;
        if (!operatorId) return new Response(JSON.stringify({ error: 'operator_id required' }), { status: 400, headers: corsHeaders });

        let query = supabase
          .from('nfs_hospitable_connections')
          .select('id, hospitable_customer_id')
          .eq('operator_id', operatorId);
        if (connectionId) query = query.eq('id', connectionId) as typeof query;

        const { data: connectionRow } = await query.maybeSingle();

        // Delete the customer from Hospitable to fully release the Airbnb account
        // This allows the same Airbnb account to be connected by a different operator
        const custId = connectionRow?.hospitable_customer_id as string | undefined;
        let hospDeleteOk = false;
        if (custId && !custId.startsWith('pending-reset') && !custId.startsWith('deleted-')) {
          // Try up to 2 times to delete the customer
          for (let attempt = 0; attempt < 2 && !hospDeleteOk; attempt++) {
            try {
              const delRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/customers/${custId}`, {
                method: 'DELETE',
                headers: connectHeaders(),
              });
              console.log(`[Hospitable] Delete customer ${custId} attempt ${attempt + 1} → ${delRes.status}`);
              hospDeleteOk = delRes.status === 204 || delRes.status === 200 || delRes.status === 404;
            } catch (e) {
              console.error(`[Hospitable] Failed to delete customer (attempt ${attempt + 1}):`, e);
            }
          }
        } else if (custId?.startsWith('deleted-')) {
          // Already deleted previously
          hospDeleteOk = true;
        }

        if (!hospDeleteOk) {
          // Hospitable customer not deleted — Airbnb is still locked, disconnect cannot proceed
          return new Response(
            JSON.stringify({ error: 'Could not disconnect from Airbnb. The Hospitable account could not be released. Please try again or contact support.', hospitable_deleted: false }),
            { status: 502, headers: corsHeaders }
          );
        }

        // Also clean up hospitable-sourced blocked dates for this operator's properties
        try {
          const { data: opProperties } = await supabase
            .from('nfs_properties')
            .select('id')
            .eq('operator_id', operatorId)
            .eq('hospitable_connected', true);
          if (opProperties && opProperties.length > 0) {
            const propIds = opProperties.map((p: { id: string }) => p.id);
            await supabase
              .from('nfs_blocked_dates')
              .delete()
              .in('property_id', propIds)
              .eq('source', 'hospitable');
          }
        } catch (e) {
          console.error('[Hospitable] Failed to clean up blocked dates:', e);
        }

        // Mark properties as disconnected (keep them for operator to use)
        await supabase
          .from('nfs_properties')
          .update({
            hospitable_connected: false,
            hospitable_sync_status: 'disconnected',
          })
          .eq('operator_id', operatorId)
          .eq('hospitable_connected', true);

        await supabase.from('nfs_hospitable_connections').update({
          status: 'disconnected',
          is_active: false,
          disconnected_at: new Date().toISOString(),
          sync_status: 'pending',
          auth_code: null,
          hospitable_customer_id: `deleted-${custId}`,
        }).eq('id', connectionRow?.id ?? '');

        return new Response(JSON.stringify({ success: true, hospitable_deleted: true }), { status: 200, headers: corsHeaders });
      }

      // ══ DEBUG: inspect raw Hospitable customer response ══
      if (body.action === 'debug_customer') {
        const customerId = body.customer_id;
        if (!customerId) return new Response(JSON.stringify({ error: 'customer_id required' }), { status: 400, headers: corsHeaders });

        const results: Record<string, unknown> = {};
        const custRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/customers/${customerId}`, { method: 'GET', headers: connectHeaders() });
        const custText = await custRes.text();
        results.customer = { status: custRes.status, body: JSON.parse(custText.length ? custText : '{}') };

        const endpoints = [
          `${HOSPITABLE_CONNECT_BASE}/customers/${customerId}/properties`,
          `${HOSPITABLE_CONNECT_BASE}/customers/${customerId}/listings`,
          `${HOSPITABLE_CONNECT_BASE}/listings?customer_id=${customerId}`,
          `${HOSPITABLE_CONNECT_BASE}/customers/${customerId}/connections`,
        ];
        const endpointResults: unknown[] = [];
        for (const ep of endpoints) {
          const r = await fetch(ep, { method: 'GET', headers: connectHeaders() });
          const t = await r.text();
          endpointResults.push({ url: ep, status: r.status, body: t.slice(0, 800) });
        }
        results.endpoints = endpointResults;

        return new Response(JSON.stringify(results), { status: 200, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error('[Hospitable] Unhandled error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
