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
async function syncListingsFromHospitable(
  supabase: ReturnType<typeof createClient>,
  operatorId: string,
  customerId: string,
  connectionRowId: string,
): Promise<{ synced: number; errors: string[]; debug: Record<string, unknown> }> {
  const errors: string[] = [];
  const debug: Record<string, unknown> = { customerId, endpoints: [] };
  let synced = 0;

  // Mark sync as in-progress
  await supabase
    .from('nfs_hospitable_connections')
    .update({ sync_status: 'syncing', last_sync_error: null })
    .eq('id', connectionRowId);

  // Try multiple known Hospitable Connect API listing endpoints
  let listings: Record<string, unknown>[] = [];
  const endpointCandidates = [
    `${HOSPITABLE_CONNECT_BASE}/customers/${customerId}/properties`,
    `${HOSPITABLE_CONNECT_BASE}/customers/${customerId}/listings`,
    `${HOSPITABLE_CONNECT_BASE}/listings?customer_id=${customerId}`,
  ];

  for (const endpoint of endpointCandidates) {
    try {
      const res = await fetch(endpoint, { method: 'GET', headers: connectHeaders() });
      const text = await res.text();
      let json: unknown = null;
      try { json = JSON.parse(text); } catch { json = text; }

      console.log(`[Hospitable] ${endpoint} → ${res.status}: ${text.slice(0, 500)}`);
      (debug.endpoints as unknown[]).push({ url: endpoint, status: res.status, body: text.slice(0, 500) });

      if (res.ok && json) {
        const parsed = json as Record<string, unknown>;
        const raw = Array.isArray(json) ? json : (
          Array.isArray(parsed.data) ? parsed.data :
          Array.isArray(parsed.listings) ? parsed.listings :
          Array.isArray(parsed.properties) ? parsed.properties :
          Array.isArray(parsed.results) ? parsed.results :
          Array.isArray(parsed.items) ? parsed.items :
          []
        );
        if (Array.isArray(raw) && raw.length > 0) {
          listings = raw as Record<string, unknown>[];
          console.log(`[Hospitable] Got ${listings.length} listings from ${endpoint}`);
          debug.successEndpoint = endpoint;
          debug.listingCount = listings.length;
          break;
        } else if (Array.isArray(raw) && raw.length === 0) {
          console.log(`[Hospitable] ${endpoint} returned empty array`);
        }
      }
    } catch (e) {
      console.log(`[Hospitable] ${endpoint} threw: ${e}`);
      (debug.endpoints as unknown[]).push({ url: endpoint, error: String(e) });
    }
  }

  if (listings.length === 0) {
    const syncError = 'No listings returned from Hospitable API. Ensure your Airbnb account is connected in Hospitable.';
    await supabase
      .from('nfs_hospitable_connections')
      .update({
        sync_status: 'completed',
        last_sync_at: new Date().toISOString(),
        total_properties: 0,
        last_sync_error: syncError,
      })
      .eq('id', connectionRowId);
    return { synced: 0, errors: [syncError], debug };
  }

  // Map each Hospitable listing to an nfs_properties record
  for (const listing of listings) {
    try {
      const hospId = String(listing.id ?? listing.listing_id ?? listing.property_id ?? '');
      if (!hospId) continue;

      // Map images
      const rawPhotos: Record<string, unknown>[] = Array.isArray(listing.photos)
        ? listing.photos as Record<string, unknown>[]
        : Array.isArray(listing.images)
          ? listing.images as Record<string, unknown>[]
          : [];
      const images = rawPhotos.slice(0, 20).map((p: Record<string, unknown>, i: number) => ({
        url: String(p.url ?? p.large ?? p.medium ?? p.original ?? p.thumbnail ?? ''),
        order: i,
      })).filter((img: { url: string }) => img.url);

      // Map address
      const addr = (listing.address ?? listing.location ?? {}) as Record<string, unknown>;
      const city = String(addr.city ?? listing.city ?? '');
      const country = String(addr.country ?? listing.country ?? '');
      const street = String(addr.street ?? addr.address ?? addr.line1 ?? listing.street ?? '');
      const lat = Number(addr.lat ?? addr.latitude ?? listing.lat ?? listing.latitude ?? 0) || null;
      const lng = Number(addr.lng ?? addr.longitude ?? listing.lng ?? listing.longitude ?? 0) || null;

      // Map room counts
      const bedrooms = Number(listing.bedrooms ?? listing.bedroom_count ?? listing.bedrooms_count ?? 0);
      const bathrooms = Number(listing.bathrooms ?? listing.bathroom_count ?? listing.bathrooms_count ?? 0);
      const maxGuests = Number(listing.max_guests ?? listing.person_capacity ?? listing.guests ?? listing.accommodates ?? 2);

      // Map pricing
      const price = (listing.pricing ?? listing.price ?? {}) as Record<string, unknown>;
      const baseRate = Number(price.base_price ?? price.nightly_price ?? price.amount ?? listing.base_rate ?? listing.nightly_price ?? 0);
      const currency = String(price.currency ?? listing.currency ?? 'GBP').toUpperCase();

      const title = String(listing.name ?? listing.title ?? listing.public_title ?? 'Untitled Property');
      const description = String(listing.description ?? listing.summary ?? listing.notes ?? '');
      const propertyType = String(listing.property_type ?? listing.type ?? listing.room_type ?? 'apartment').toLowerCase();
      const minStay = Number(listing.min_nights ?? listing.minimum_nights ?? listing.minimum_stay ?? 1);

      const propertyData: Record<string, unknown> = {
        operator_id: operatorId,
        hospitable_property_id: hospId,
        hospitable_customer_id: customerId,
        hospitable_connected: true,
        hospitable_sync_status: 'synced',
        hospitable_last_sync_at: new Date().toISOString(),
        public_title: title,
        description,
        property_type: propertyType,
        city,
        country,
        street,
        lat,
        lng,
        max_guests: maxGuests,
        minimum_stay: minStay,
        base_rate_amount: baseRate || 0,
        base_rate_currency: currency,
        status: 'draft',
        images: images.length > 0 ? images : [],
        room_counts: {
          bedrooms,
          bathrooms,
          beds: bedrooms,
        },
        cleaning_fee: { enabled: false, amount: 0 },
        weekly_discount: { enabled: false, percentage: 0 },
        monthly_discount: { enabled: false, percentage: 0 },
        extra_guest_fee: { enabled: false, amount: 0, after_guests: 1 },
      };

      const { error: upsertErr } = await supabase
        .from('nfs_properties')
        .upsert(propertyData, { onConflict: 'hospitable_property_id,operator_id', ignoreDuplicates: false });

      if (upsertErr) {
        console.error('[Hospitable] upsert error for', hospId, upsertErr.message);
        errors.push(`${hospId}: ${upsertErr.message}`);
      } else {
        synced++;
      }
    } catch (e) {
      errors.push(String(e));
    }
  }

  await supabase
    .from('nfs_hospitable_connections')
    .update({
      sync_status: errors.length > 0 && synced === 0 ? 'failed' : 'completed',
      last_sync_at: new Date().toISOString(),
      total_properties: synced,
      last_sync_error: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
    })
    .eq('id', connectionRowId);

  return { synced, errors, debug };
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

        // If already connected, don't reset — just regenerate the auth URL
        const { data: existingConn } = await supabase
          .from('nfs_hospitable_connections')
          .select('id, hospitable_customer_id, status, is_active')
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

        // Re-use existing customer ID if we have a valid connected one
        if (existingConn?.hospitable_customer_id && existingConn.status === 'connected' && existingConn.is_active) {
          const verifyRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/customers/${existingConn.hospitable_customer_id}`, { method: 'GET', headers: connectHeaders() });
          if (verifyRes.ok) customerId = existingConn.hospitable_customer_id;
        }

        if (!customerId) {
          // Try creating the customer
          const customerRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/customers`, {
            method: 'POST',
            headers: connectHeaders(),
            body: JSON.stringify({ id: operatorId, email: operatorEmail, name: operatorName }),
          });

          const customerText = await customerRes.text();
          console.log(`[Hospitable] Create customer → ${customerRes.status}: ${customerText.slice(0, 300)}`);

          if (customerRes.ok) {
            const customerData = JSON.parse(customerText);
            customerId = customerData.id || customerData.data?.id || '';
          } else if (customerRes.status === 422 || customerRes.status === 409) {
            // Customer already exists — fetch by our ID
            const getRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/customers/${operatorId}`, { method: 'GET', headers: connectHeaders() });
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
          body: JSON.stringify({ customer_id: customerId, redirect_url: callbackUrl }),
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

        if (existingConn?.id && existingConn.status !== 'connected') {
          // Update existing pending row
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
          await supabase.from('nfs_hospitable_connections').insert({
            operator_id: operatorId,
            profile_id: profileId,
            hospitable_customer_id: customerId,
            auth_code: state,
            auth_code_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            status: 'pending',
            sync_status: 'pending',
            health_status: 'unknown',
            is_active: false,
            total_properties: 0,
            total_reservations: 0,
            connected_platforms: [],
            user_metadata: { redirect_origin: origin },
          });
        }
        // If already connected, just return the auth URL without resetting status

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
        let connectionId = '';
        let connectedPlatforms: string[] = [];

        if (resolvedCustomerId) {
          try {
            const verifyRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/customers/${resolvedCustomerId}`, { method: 'GET', headers: connectHeaders() });
            const verifyText = await verifyRes.text();
            console.log(`[Hospitable] Verify customer ${resolvedCustomerId} → ${verifyRes.status}: ${verifyText.slice(0, 500)}`);
            if (verifyRes.ok) {
              const verifyData = JSON.parse(verifyText);
              connectionId = verifyData.connection_id || verifyData.data?.connection_id || '';
              connectedPlatforms = verifyData.connected_platforms || verifyData.data?.connected_platforms || [];
            }
          } catch (e) {
            console.error('[Hospitable] Customer verify error:', e);
          }
        }

        const existingMeta = (connectionRow.user_metadata && typeof connectionRow.user_metadata === 'object')
          ? connectionRow.user_metadata as Record<string, unknown> : {};

        await supabase.from('nfs_hospitable_connections').update({
          hospitable_customer_id: resolvedCustomerId,
          hospitable_connection_id: connectionId,
          status: 'connected',
          is_active: true,
          connected_at: new Date().toISOString(),
          connected_platforms: connectedPlatforms,
          user_metadata: existingMeta,
          auth_code: null,
          auth_code_expires_at: null,
          last_error: null,
          health_status: 'healthy',
        }).eq('id', connectionRow.id);

        // Immediately sync listings
        console.log('[Hospitable] Starting direct listing sync for customer:', resolvedCustomerId);
        syncListingsFromHospitable(
          supabase,
          connectionRow.operator_id as string,
          resolvedCustomerId,
          connectionRow.id as string,
        ).catch((e) => console.error('[Hospitable] Background sync error:', e));

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
          if (custRes.ok) customerInfo = JSON.parse(custText);
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

        await supabase.from('nfs_hospitable_connections').update({
          status: 'disconnected',
          is_active: false,
          disconnected_at: new Date().toISOString(),
          sync_status: 'pending',
          auth_code: null,
        }).eq('id', connectionRow?.id ?? '');

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error('[Hospitable] Unhandled error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
