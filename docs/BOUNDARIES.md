# Boundaries

## What this project IS
- The traveler-facing booking site at nfstay.app
- Operator self-service portal (property management, reservations)
- Admin platform management
- Standalone - no dependency on marketplace10

## What this project is NOT
- NOT the hub marketplace (hub.nfstay.com - that's marketplace10)
- NOT the invest/blockchain module (that's inside marketplace10)
- NOT the white-label system (that was removed - may be rebuilt later)

## Shared Infrastructure (Supabase)
Both bookingsite and marketplace10 share the same Supabase project (`asazddtvjvmckouxcmmo`). When Supabase is wired:
- nfstay tables are prefixed `nfs_` - do not touch non-`nfs_` tables
- Auth is shared (same `auth.users` table)
- RLS policies must be in place before any mutation

## Do NOT modify
- marketplace10 repo - that's a separate project
- Supabase schema without explicit approval from Hugo
- Any table without the `nfs_` prefix
