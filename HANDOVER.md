# Handover — bookingsite (nfstay.app)

**Date:** 2026-03-20
**From:** Claude (Hugo's session)
**To:** Tajul
**Repo:** https://github.com/hrds100/bookingsite
**Live:** https://nfstay.app
**Branch:** `main` (all work merged)

---

## What this project is

Standalone vacation rental booking site for nfstay. Separate from marketplace10 (hub.nfstay.com). Same Supabase database, same auth — different frontend, different Vercel project.

- React + Vite + TypeScript + Tailwind + shadcn/ui
- Supabase for auth + database + edge functions
- Stripe for payments
- Google Maps on search page
- n8n for email notifications

---

## What's working right now

| Feature | Status | Details |
|---------|--------|---------|
| Landing page | Live | Hero, destinations, featured properties, FAQ |
| Search page | Live | Filters + Google Maps with markers |
| Property detail | Live | Gallery, booking widget, amenities |
| Checkout | Live | Stripe Checkout via Edge Function |
| Payment success | Live | Confirmation page + n8n webhook fires |
| Auth (email/password) | Live | Supabase Auth, shared with hub |
| Navbar auth state | Live | Shows sign out when logged in |
| Operator properties list | Live | Reads from nfs_properties, falls back to mock |
| Operator settings | Live | Writes to nfs_operators |
| Operator reservations | Live | Reads from nfs_reservations, falls back to mock |
| Currency switching | Live | GBP/USD/EUR/AED/SGD via localStorage |
| n8n booking notification | Live | Webhook active, email needs Resend key |

---

## What's NOT working / not wired yet

| Feature | Status | Notes |
|---------|--------|-------|
| Social login (Google/Apple) | **LIVE** | Particle Network — primary login method, shared with hub.nfstay.com |
| Hospitable sync | Not wired | Credentials saved in memory, needs webhook + property import |
| Property search vs real DB | Mock only | Search filters mock data, not Supabase |
| Admin dashboard | Mock | Hardcoded stats |
| Email delivery | Almost | n8n workflow active but Resend API key is placeholder `re_placeholder` — needs real key |
| Custom operator domains | Not started | White-label subdomains |
| Booking lookup page | UI exists | `/booking` route, not wired to real data |

---

## DO NOT TOUCH

1. **src/pages/NfsCheckoutPage.tsx** — Stripe flow is working, don't break it
2. **supabase/functions/nfs-create-checkout/** — deployed edge function, working
3. **marketplace10 repo** — completely separate, don't mix code between repos
4. **src/lib/particle.ts** — PARTICLE_LEGACY_CONFIG and derivedPassword must never change (cross-domain compatibility)

---

## One blocker to resolve

**Resend API key** — The n8n workflow `nfstay — Booking Confirmed` (ID: `vp5QBp1qIT08WJCt`) has `re_placeholder` in the code nodes. Once Hugo provides the real Resend key (`re_...`), update it in:

- n8n → workflow `vp5QBp1qIT08WJCt` → "Send Guest Email" node → replace `re_placeholder`
- n8n → workflow `vp5QBp1qIT08WJCt` → "Notify Admin" node → replace `re_placeholder`

You can do this via the n8n API:

```bash
N8N_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZmI1M2JkZS0zZTdjLTQ2NWItOGI5MS1hOTQwOTlkZGM2YTMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzczNDI0MDQ5fQ.7lz1_W28UkD0SwjITXHn1t75A8Fl5eVM46XfENFkEtg"
# GET the workflow, find/replace re_placeholder with the real key, PUT it back
```

Or open it in the n8n UI at https://n8n.srv886554.hstgr.cloud

---

## Key files to know

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project overview, what's real vs mock |
| `docs/AGENT_INSTRUCTIONS.md` | Full agent operating rules — **read first** |
| `docs/ARCHITECTURE.md` | Component tree, data flow |
| `docs/ROUTES.md` | All routes and which components serve them |
| `docs/DATABASE.md` | Tables, hooks, edge functions, n8n integration |
| `docs/DEPLOYMENT.md` | Vercel, env vars, edge function deploy |
| `docs/CODING_RULES.md` | Code standards |
| `src/lib/supabase.ts` | Supabase client |
| `src/lib/n8n.ts` | n8n webhook helper (fire-and-forget) |
| `src/lib/constants.ts` | Property types, currencies, amenities |
| `src/contexts/CurrencyContext.tsx` | Currency state + conversion |
| `src/data/mock-*.ts` | Fallback data when DB is empty |

---

## Credentials available

All credentials are in Claude memory at `/Users/hugo/.claude/projects/-Users-hugo/memory/`:

| Memory file | What |
|-------------|------|
| `supabase_credentials.md` | Supabase URL, anon key, service_role key |
| `supabase_pat.md` | Supabase Management API PAT for edge function deploy |
| `vercel_token.md` | Vercel API token |
| `github_token.md` | GitHub PAT |
| `n8n_credentials.md` | n8n URL, login, API key |
| `reference_stripe_nfstay.md` | Stripe keys (live + test) |
| `reference_hospitable.md` | Hospitable partner ID, secret, bearer token |

Legacy VPS (reference only): `ssh root@31.97.118.211` / `AaWYEkrnCvxi+BfSsz0,`

---

## Vercel env vars (already set)

| Variable | Set? |
|----------|------|
| `VITE_SUPABASE_URL` | Yes |
| `VITE_SUPABASE_ANON_KEY` | Yes |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Yes |
| `VITE_N8N_WEBHOOK_URL` | Yes |

---

## Suggested next tasks (in priority order)

1. **Get Resend API key from Hugo** → update n8n workflow → emails work end-to-end
2. **Wire property search to Supabase** — replace mock filtering with real `nfs_properties` query
3. **Wire admin dashboard** — replace mock stats with real Supabase aggregations
4. **Hospitable sync** — import properties from Hospitable into nfs_properties
5. **Booking lookup** — wire `/booking` page to query real reservations by email

---

## Git workflow

- Always work on a feature branch: `feat/...`, `fix/...`
- Never push directly to main
- Create PR → merge via GitHub
- Every push to main auto-deploys to nfstay.app via Vercel (~2 min)
- Always `npm run build` + `npx tsc --noEmit` before pushing

---

## Commands

```bash
npm run dev          # local dev (Vite)
npm run build        # production build
npm run lint         # ESLint
npm run test         # Vitest
npx tsc --noEmit     # TypeScript check
```
