# NFStay Booking Site — nfstay.app

Standalone vacation rental booking platform. React + Vite + TypeScript + Tailwind + shadcn/ui + Supabase.

## Priority Order
reliability > UX polish > clean code > speed

## Repo Map
```
src/
  pages/              ← route-level components (landing, search, property, checkout, operator/*, admin/*)
  components/
    nfs/              ← 16 NFStay-specific components (layouts, navbar, footer, cards, filters, maps)
    ui/               ← 39 shadcn/ui primitives (never hand-edit)
  contexts/           ← CurrencyContext (GBP/USD/EUR/AED/SGD)
  data/               ← mock properties, destinations, reservations (fallback when DB empty)
  hooks/              ← useAuth, useNfsProperties, useNfsReservations, useNfsOperator, useRecentlyViewed
  lib/                ← supabase.ts, particle.ts, constants.ts, utils.ts
  test/               ← Vitest setup
docs/                 ← architecture, agent instructions, deployment, database
supabase/functions/   ← Edge functions (nfs-create-checkout)
```

## Core Commands
```bash
npm run dev          # local dev server (Vite)
npm run build        # production build
npm run lint         # ESLint
npm run test         # Vitest
git push origin main # auto-deploys to Vercel → nfstay.app
```

## Where Truth Lives
- Agent instructions: `docs/AGENT_INSTRUCTIONS.md`
- Architecture: `docs/ARCHITECTURE.md`
- Routes: `docs/ROUTES.md`
- Database: `docs/DATABASE.md`
- Deployment: `docs/DEPLOYMENT.md`
- Coding rules: `docs/CODING_RULES.md`

## Top Rules (full list in docs/AGENT_INSTRUCTIONS.md)
1. Read the file before editing it. Never guess.
2. Zero TypeScript errors — always.
3. No hardcoded secrets — env vars only.
4. Every async call: try/catch + user-visible error state.
5. All data hooks fall back to mock data when Supabase returns empty results.
6. Destructive actions: STOP and ask Hugo.

## What's Real vs Mock
| Feature | Status |
|---------|--------|
| Auth (email/password sign in/up) | Real — Supabase Auth |
| Navbar auth state | Real — shows sign out when logged in |
| Operator properties list | Real — queries nfs_properties (falls back to mock) |
| Operator settings save | Real — writes to nfs_operators |
| Operator reservations | Real — queries nfs_reservations (falls back to mock) |
| Guest checkout | Real — Stripe Checkout via Edge Function |
| Google Maps on search | Real — live map with markers |
| Currency switching | Real — localStorage |
| Property search/filters | Mock — client-side filtering of mock data |
| Admin dashboard | Mock — hardcoded stats |
| Social login (Google/Apple) | Not wired yet — Particle config ready |
| Hospitable sync | Not wired yet — credentials saved |
| Email notifications | Not wired yet — n8n credentials saved |

## Domains
- **Live:** https://nfstay.app
- **GitHub:** https://github.com/hrds100/bookingsite
- **Vercel team:** `hugos-projects-f8cc36a8`
- **Supabase:** `asazddtvjvmckouxcmmo` (shared with hub.nfstay.com)
- **Related:** hub.nfstay.com (marketplace10 — separate repo)
