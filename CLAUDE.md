# NFStay Booking Site — nfstay.app

Standalone vacation rental booking platform. React + Vite + TypeScript + Tailwind + shadcn/ui.

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
  data/               ← mock properties, destinations, reservations, testimonials
  hooks/              ← useRecentlyViewed, use-mobile, use-toast
  lib/                ← constants.ts (property types, currencies, amenities), utils.ts
  test/               ← Vitest setup
docs/                 ← architecture, agent instructions, deployment, database
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
5. Mock data only for now — Supabase wiring comes later.
6. Destructive actions: STOP and ask Hugo.

## Domains
- **Live:** https://nfstay.app
- **GitHub:** https://github.com/hrds100/bookingsite
- **Vercel team:** `hugos-projects-f8cc36a8`
- **Related:** hub.nfstay.com (marketplace10 — separate repo)
