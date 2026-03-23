# NFStay Booking Site — nfstay.app

Standalone vacation rental booking platform. React + Vite + TypeScript + Tailwind + shadcn/ui + Supabase.

## Priority Order
reliability > UX polish > clean code > speed

## Design System
- **Visual design:** Ported from legacy nfstay-frontend-vps (structure, layout, proportions)
- **Brand color:** NFStay Green `#1E9A80`
- **Gradient:** `linear-gradient(270deg, #27dea0 0%, #1E9A80 100%)` — used for CTAs, nav toggles, Sign In button
- **Background:** White `#FFFFFF`
- **Footer (main site):** `bg-[#f0f3f7]` light gray, green hover accents `#1E9A80`
- **Footer (operator):** `bg-gray-900` dark with contact info (phone, email, WhatsApp, socials)
- **Logo:** [nf]stay — Sora font, bordered square + letterSpaced text (NfsLogo component)
- **Font:** Inter (body/nav/buttons), Sora (logo only)
- **Buttons:** `rounded-full` for CTAs, `bg-primary-gradient text-white`
- **Cards:** `rounded-2xl`, `aspect-[320/300]`, `hover:scale-110`, `shadow-card`
- **Navbar:** `h-16 sm:h-20`, `grid grid-cols-3`, animated gradient toggle pill, mobile bottom nav
- **Search grid:** `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`
- **Property images:** `h-[400px] md:h-[480px] lg:h-[500px]`
- **Sidebar:** `xl:w-96 xl:sticky xl:top-24`
- **Hero:** No background image — centered title + subtitle + description + search bar
- **Operator white-label:** Default accent = black `#000000`, operator sets their own via accent_color
- **Design reference file:** `.claude/rules/design.md`

## Repo Map
```
src/
  pages/              ← route-level components (landing, search, property, checkout, operator/*, admin/*)
  components/
    nfs/              ← 18 NFStay-specific components (layouts, navbar, footer, cards, filters, maps)
    ui/               ← 39 shadcn/ui primitives (never hand-edit)
  contexts/           ← CurrencyContext (GBP/USD/EUR/AED/SGD), WhiteLabelContext (operator preview)
  data/               ← mock properties, destinations, reservations (fallback when DB empty)
  hooks/              ← useAuth, useNfsProperties, useNfsReservations, useNfsOperator, useRecentlyViewed, useAdminStats, useOperatorStats
  lib/                ← supabase.ts, n8n.ts, particle.ts, constants.ts, utils.ts
  test/               ← Vitest setup
docs/                 ← architecture, agent instructions, deployment, database
e2e/                  ← Playwright e2e tests (13 tests against live site)
supabase/functions/   ← Edge functions (nfs-create-checkout)
```

## Core Commands
```bash
npm run dev          # local dev server (Vite)
npm run build        # production build
npm run lint         # ESLint
npm run test         # Vitest
npx playwright test e2e/audit-batch-1.spec.ts --config=e2e/playwright.config.ts  # e2e tests
git push origin main # auto-deploys to Vercel → nfstay.app
```

## Where Truth Lives
- Agent instructions: `docs/AGENT_INSTRUCTIONS.md`
- Architecture: `docs/ARCHITECTURE.md`
- Routes: `docs/ROUTES.md`
- Database: `docs/DATABASE.md`
- Deployment: `docs/DEPLOYMENT.md`
- Coding rules: `docs/CODING_RULES.md`
- Design tokens: `.claude/rules/design.md`

## Top Rules (full list in docs/AGENT_INSTRUCTIONS.md)
1. Read the file before editing it. Never guess.
2. Zero TypeScript errors — always.
3. No hardcoded secrets — env vars only.
4. Every async call: try/catch + user-visible error state.
5. All data hooks fall back to mock data when Supabase returns empty results.
6. Destructive actions: STOP and ask Hugo.
7. Do NOT revert or overwrite existing styles unless the task explicitly requires it.

## What's Real vs Mock
| Feature | Status |
|---------|--------|
| Auth (email/password sign in/up) | Real — Supabase Auth |
| Social login (Google/Apple/X/Facebook) | Real — Particle Network (shared with hub.nfstay.com) |
| Navbar auth state | Real — shows sign out when logged in |
| Property form save | Real — writes to nfs_properties via mutation hooks |
| Photo upload | Real — uploads to nfs-images Storage bucket |
| Operator properties list | Real — queries nfs_properties (falls back to mock) |
| Operator settings save | Real — writes to nfs_operators |
| Operator reservations | Real — queries nfs_reservations (falls back to mock) |
| Guest checkout | Real — Stripe Checkout via Edge Function |
| Google Maps on search | Real — live map with markers, geocoding fallback, smooth fly-to on hover |
| Google Maps on property detail | Real — embed iframe, city+country fallback when lat/lng missing |
| Currency switching | Real — localStorage persistence |
| Email notifications | Real — n8n webhook on booking confirm (fire-and-forget) |
| Admin dashboard stats | Real — queries profiles, nfs_operators, nfs_reservations (falls back to mock) |
| Admin charts | Real — monthly aggregation from reservations |
| Operator dashboard revenue | Real — computed from operator's reservations |
| Operator analytics | Real — revenue, occupancy, bookings charts |
| Admin portal access | Protected — requires admin email (admin@hub.nfstay.com or hugo@nfstay.com) |
| Traveler reservation detail | Protected — auth guard, redirects to /signin |
| White-label preview | Real — ?preview=operator-id shows operator branded site |
| Property search/filters | Real — client-side filtering with beds/bathrooms/bedrooms/type/price |
| Hospitable sync | Not wired — credentials saved |
| Stripe Connect (payouts) | Not wired — credentials saved |
| Verify email resend | UI exists, not wired |
| OAuth callback logic | TODO — for Stripe Connect/Hospitable, not for social login |
| Avg Rating on operator dashboard | Placeholder — no reviews table yet |

## Operator White-Label System
- Preview any operator: `https://nfstay.app?preview=OPERATOR_ID`
- Demo operator: `03cc56a2-b2a3-4937-96a5-915c906f9b5b`
- Subdomain routing: `*.nfstay.app` (Vercel wildcard not configured yet)
- Custom domain: CNAME lookup in WhiteLabelContext
- Operator default colors: black (#000000), operator picks accent_color
- Navbar/footer/hero adapt automatically via isWhiteLabel flag

## Operator Contact Fields (all in nfs_operators table)
| Field | Type | Display |
|-------|------|---------|
| contact_email | string | Footer, navbar contact link |
| contact_phone | string | Footer (tel: link) |
| contact_whatsapp | string | Footer (wa.me link), navbar contact priority |
| contact_telegram | string | Settings only |
| social_instagram | string | Operator footer |
| social_facebook | string | Operator footer |
| social_twitter | string | Operator footer |
| social_tiktok | string | Operator footer |
| social_youtube | string | Operator footer |
| google_business_url | string | Settings only |
| airbnb_url | string | Settings only |

## PRs Shipped (2026-03-23 session)
| PR | What |
|----|------|
| #20 | 14 audit fixes (security, branding, UX, mobile) |
| #21 | Map geocoding fallback for properties without lat/lng |
| #22 | Docs update — audit status |
| #23 | Admin + operator dashboards wired to real Supabase data |
| #24 | White-label preview mode (?preview=operator-id) |
| #25 | Legacy structure alignment — footer contacts, filters, ratings, operator colors |
| #26 | Visual restructure — legacy proportions with brand tokens |
| #27 | Full legacy VPS UI port — gradient buttons, no-image hero, card proportions |
| #28 | Navbar rewrite — exact legacy match (grid-cols-3, gradient toggle, sidebars) |
| #29 | Purple → green brand gradient swap |
| #30 | White booking widget, smooth map fly-to, "Explore" text |
| #31 | New [nf]stay logo on sign in/up pages |

## Domains
- **Live:** https://nfstay.app
- **GitHub:** https://github.com/hrds100/bookingsite
- **Vercel team:** `hugos-projects-f8cc36a8`
- **Supabase:** `asazddtvjvmckouxcmmo` (shared with hub.nfstay.com)
- **Related:** hub.nfstay.com (marketplace10 — separate repo)
- **Legacy reference:** /Users/hugo/Downloads/AI Folder/openclaw/nfstay-frontend-vps/
