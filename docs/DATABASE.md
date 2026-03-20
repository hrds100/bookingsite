# Database

## Current State

The booking site is connected to **Supabase** (shared project with hub.nfstay.com). Auth is fully wired. Data hooks query real tables but **fall back to mock data** when tables are empty or Supabase is unreachable.

**Supabase project:** `asazddtvjvmckouxcmmo`
**URL:** `https://asazddtvjvmckouxcmmo.supabase.co`

## Mock Data (fallback)

These files provide fallback data when Supabase tables are empty:
- `src/data/mock-properties.ts` — 12 properties
- `src/data/mock-destinations.ts` — 10 cities
- `src/data/mock-reservations.ts` — 8 reservations + 6 testimonials
- `src/data/mock-operator.ts` — operator profile
- `src/data/mock-admin.ts` — admin dashboard metrics

## Data Hooks

| Hook | Table | Fallback |
|------|-------|----------|
| `useNfsProperties()` | `nfs_properties` | mockProperties |
| `useNfsProperty(id)` | `nfs_properties` | mockProperties.find() |
| `useNfsPropertySearch(filters)` | client-side filter | mockProperties |
| `useNfsReservations(email)` | `nfs_reservations` | mockReservations |
| `useNfsOperatorReservations(opId)` | `nfs_reservations` join `nfs_properties` | mockReservations |
| `useNfsReservation(id)` | `nfs_reservations` | mockReservations.find() |
| `useNfsOperator()` | `nfs_operators` | null |
| `useNfsOperatorUpdate()` | `nfs_operators` (mutation) | — |
| `useNfsOperatorProperties(opId)` | `nfs_properties` | [] |

## NFStay Tables (nfs_ prefix)

| Table | Purpose | Wired? |
|-------|---------|--------|
| `nfs_operators` | Operator profiles (brand, contact, settings) | Yes — read + update |
| `nfs_properties` | Property listings (details, pricing, amenities, images) | Yes — read |
| `nfs_reservations` | Guest bookings (dates, guests, status, payment) | Yes — read + insert via edge function |
| `nfs_stripe_accounts` | Operator Stripe Connect accounts | Not yet |
| `nfs_hospitable_connections` | Hospitable sync credentials | Not yet |
| `nfs_promo_codes` | Discount codes per operator | Not yet |
| `nfs_analytics` | Aggregated analytics events | Not yet |
| `nfs_webhook_events` | Inbound webhook log | Not yet |

## Shared Tables (with marketplace10)

| Table | Purpose |
|-------|---------|
| `auth.users` | Supabase Auth — shared user accounts |
| `profiles` | User profiles — shared across hub and booking site |

## Auth

- **Provider:** Supabase Auth (email/password)
- **Social login:** Particle Network config ready, not wired to frontend yet
- **Shared:** Same `auth.users` table as hub.nfstay.com — login works cross-domain
- **Operator detection:** `useAuth` checks `nfs_operators.profile_id` to set `isOperator`
- **Admin detection:** Hardcoded admin emails: `admin@hub.nfstay.com`, `hugo@nfstay.com`

## Edge Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `nfs-create-checkout` | Creates Stripe Checkout Session + pending reservation | Deployed + active |

## Supabase Secrets (for Edge Functions)

| Secret | Purpose |
|--------|---------|
| `STRIPE_SECRET_KEY` | Stripe API (sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe webhook signatures |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe Connect OAuth |

## n8n Integration

Booking notifications are sent via n8n webhooks (fire-and-forget, non-blocking).

| Webhook Path | n8n Workflow ID | Trigger | Status |
|---|---|---|---|
| `nfstay-booking-confirmed` | `vp5QBp1qIT08WJCt` | Payment success page | Active (webhook created, email nodes need SMTP credential) |
| `nfstay-booking-enquiry` | — | Not wired yet | Planned |

**n8n base URL:** `https://n8n.srv886554.hstgr.cloud`
**Webhook URL:** `https://n8n.srv886554.hstgr.cloud/webhook/{path}`
**Frontend helper:** `src/lib/n8n.ts` — postWebhook() with 8s AbortController timeout

## RLS Rules

Every `nfs_` table must have Row Level Security enabled:
- Operators can only read/write their own data
- Guests can read listed properties, write their own reservations
- Admins have full access via service_role key
- **Never bypass RLS** — always use anon key on the frontend

## Storage Buckets

| Bucket | Purpose | Status |
|--------|---------|--------|
| `nfs-property-photos` | Property images uploaded by operators | Not yet created |
| `nfs-operator-logos` | Operator brand logos | Not yet created |
