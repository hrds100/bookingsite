# Database

## Current State

The booking site currently runs on **mock data only**. No Supabase connection.

Mock data files:
- `src/data/mock-properties.ts` — 12 properties
- `src/data/mock-destinations.ts` — 10 cities
- `src/data/mock-reservations.ts` — 8 reservations + 6 testimonials
- `src/data/mock-operator.ts` — operator profile
- `src/data/mock-admin.ts` — admin metrics

## Future State (Supabase)

When wired, the booking site will use the shared Supabase project (`asazddtvjvmckouxcmmo`). All NFStay tables are prefixed `nfs_`.

### Core Tables

| Table | Purpose |
|-------|---------|
| `nfs_operators` | Operator profiles (brand, contact, settings) |
| `nfs_properties` | Property listings (details, pricing, amenities, images) |
| `nfs_reservations` | Guest bookings (dates, guests, status, payment) |
| `nfs_stripe_accounts` | Operator Stripe Connect accounts |
| `nfs_hospitable_connections` | Hospitable sync credentials |
| `nfs_promo_codes` | Discount codes per operator |
| `nfs_analytics` | Aggregated analytics events |
| `nfs_webhook_events` | Inbound webhook log |

### Shared Tables (with marketplace10)

| Table | Purpose |
|-------|---------|
| `auth.users` | Supabase Auth — shared user accounts |
| `profiles` | User profiles — shared across hub and booking site |

### RLS Rules

Every `nfs_` table must have Row Level Security enabled:
- Operators can only read/write their own data
- Guests can read listed properties, write their own reservations
- Admins have full access via service_role key
- **Never bypass RLS** — always use anon key on the frontend

### Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `nfs-property-photos` | Property images uploaded by operators |
| `nfs-operator-logos` | Operator brand logos |
