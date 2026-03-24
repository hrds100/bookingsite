# nfstay Booking Site - AI Agent Instructions

> **Single source of truth for all AI operating rules.** Read FIRST. Every session. No exceptions.

---

## 1. SYSTEM ROLE

Claude acts as **AI Developer** for the nfstay booking site (nfstay.app).

- Claude reads code before editing - never guesses.
- Claude writes clean, minimal code. No over-engineering.
- Claude reports to Hugo. No unrequested features.

**Project:** Standalone vacation rental booking platform - React + Vite + TypeScript + Tailwind + shadcn/ui.
**Priority order:** reliability > UX polish > clean code > speed.

---

## 2. DOC SCOPING - read before every task

| Task type | Docs to read |
|-----------|-------------|
| **Always** | `CLAUDE.md` + `docs/AGENT_INSTRUCTIONS.md` (this file) |
| UI components / pages | + `docs/ARCHITECTURE.md` + `docs/ROUTES.md` |
| Database / API wiring | + `docs/DATABASE.md` |
| Deployment / Vercel | + `docs/DEPLOYMENT.md` |
| Coding standards | + `docs/CODING_RULES.md` |

---

## 3. MANDATORY PRE-TASK STEPS

1. Read the docs scoped to your task (Section 2).
2. Read the actual source files you will modify. **Never edit code you haven't opened.**
3. Run `npm run build` before pushing. Zero errors.

---

## 4. HARD RULES

1. **Zero TypeScript errors always.** Run `npx tsc --noEmit` before committing.
2. **Never hardcode secrets.** Env vars only (see `.env.example`).
3. **Never add unrequested features.** Do only what is asked.
4. **Read before edit.** Never modify a file without reading it first.
5. **Keep code minimal.** No extra abstractions, no over-engineering.
6. **Destructive actions** (delete, drop, force push): **STOP and ask Hugo.**
7. **Empty states, loading states, error states** must exist before a feature ships.
8. **Data hooks fall back to mock data** when Supabase returns empty. Do not remove mock fallback without Hugo's approval.
9. **shadcn/ui first.** Prefer existing components before building custom ones.
10. **Mobile first.** Every component works at 375px before desktop.
11. **No Lorem Ipsum.** Use realistic property/travel data as placeholders.
12. **Playwright e2e test is mandatory before marking DONE.** After every fix or feature, write a Playwright test that verifies the change works, run it with `npx playwright test`, and include the pass/fail result in the report. No exceptions. Do not claim something is "working" or "fixed" without a passing Playwright test. Use the existing `playwright-fixture.ts` for imports (`test`, `expect`). Config is in `playwright.config.ts`.

---

## 5. DEV COMMANDS

| Command | What it does | When to use |
|---------|-------------|-------------|
| `npm run dev` | Starts local dev server (Vite) | Development |
| `npm run build` | Production build | **Before every push** |
| `npm run lint` | ESLint check | Before pushing |
| `npm run test` | Vitest test suite | After code changes |
| `npx playwright test` | Playwright e2e tests | **After every fix or feature - non-negotiable.** Write a test, run it, paste the result. |

---

## 6. PROJECT REFERENCE

| Item | Value |
|------|-------|
| Repo | https://github.com/hrds100/bookingsite |
| Live | https://nfstay.app |
| Vercel team | `hugos-projects-f8cc36a8` |
| Supabase | `asazddtvjvmckouxcmmo` (shared with hub.nfstay.com) |
| Framework | React 18 + Vite + TypeScript |
| UI library | shadcn/ui + Tailwind CSS |
| Auth | Supabase Auth (email/password) - shared with hub.nfstay.com |
| Database | Supabase PostgreSQL - `nfs_*` tables |
| Payments | Stripe Checkout via Edge Function |
| Maps | Google Maps JavaScript API |
| Icons | Lucide React |
| State | React Query + Supabase + localStorage |
| Related | hub.nfstay.com (marketplace10 - separate repo, same Supabase) |

---

## 7. CURRENT STATE

The site is partially wired to real backend services. Data hooks fall back to mock data when Supabase returns empty results.

| Feature | Status |
|---------|--------|
| Landing page | Live — legacy VPS layout (no hero image, centered text + search bar) |
| Search + filters | Live — real data, beds/bathrooms/bedrooms/type/price filters, 3-col grid on xl |
| Property detail | Live — real data, taller images (500px), larger title, smooth map fly-to |
| Auth (sign in/up) | Real — Supabase Auth + WhatsApp OTP + Particle wallet (matches hub.nfstay.com) |
| Navbar | Legacy design — grid-cols-3, animated gradient toggle pill, gradient Sign In, mobile bottom nav |
| Checkout / booking | Real — Stripe Checkout via Edge Function |
| Currency switching | Real — localStorage persistence |
| Google Maps (search) | Real — markers, geocoding fallback, smooth fly-to (zoom out → pan → zoom in) |
| Google Maps (property detail) | Real — embed iframe, city+country fallback when lat/lng missing |
| Property form save | Real — writes to nfs_properties via mutation hooks |
| Photo upload | Real — uploads to nfs-images Storage bucket |
| Operator properties | Real — queries nfs_properties (falls back to mock) |
| Operator settings | Real — saves to nfs_operators |
| Operator reservations | Real — queries nfs_reservations (falls back to mock) |
| Admin dashboard stats | Real — queries profiles, nfs_operators, nfs_reservations |
| Admin charts | Real — monthly aggregation from reservations |
| Operator dashboard revenue | Real — computed from operator's reservations |
| Operator analytics | Real — revenue, occupancy, bookings charts |
| Admin portal access | Protected — requires admin email (admin@hub.nfstay.com or hugo@nfstay.com) |
| Traveler reservation detail | Protected — auth guard, redirects to /signin |
| Social login (Google/Apple/X/Facebook) | Real — Particle Network OAuth (shared with hub.nfstay.com) |
| White-label preview | Real — ?preview=operator-id, operator branding + accent color |
| White-label subdomains | Code ready — Vercel wildcard domain not configured yet |
| Operator footer contacts | Real — phone (tel:), WhatsApp (wa.me), email, social links |
| Email notifications | Real — n8n webhook on booking confirm (Resend API) |
| Hospitable sync | Not wired — credentials saved |
| Stripe Connect (payouts) | Not wired — credentials saved |
| Verify email resend | UI exists, not wired |
| OAuth callback | TODO — for Stripe Connect/Hospitable (social login works separately) |
| Avg Rating | Placeholder — no reviews table yet |
| WhatsApp OTP on email sign-up | Real — n8n send-otp/verify-otp, matches marketplace10 |
| Wallet creation on email sign-up | Real — particle-generate-jwt + WalletProvisioner |
| WalletProvisioner component | Real — silent wallet creation on authenticated page load |
| CountryCodeSelect component | Real — 42 countries, searchable dropdown |
| VerifyOtp page (/verify-otp) | Real — 4-digit OTP, auto-verify, 5-min timer, resend |

### All PRs shipped (2026-03-23 session)

| PR | What |
|----|------|
| #20 | Audit: security, branding, UX, mobile (14 fixes) |
| #21 | Map geocoding fallback |
| #22 | Docs update |
| #23 | Admin + operator dashboards wired to real data |
| #24 | White-label preview mode |
| #25 | Legacy structure: footer contacts, filters, ratings, operator colors |
| #26 | Visual restructure: legacy proportions |
| #27 | Full legacy VPS UI port: gradient buttons, no-image hero, card proportions |
| #28 | Navbar rewrite: exact legacy match |
| #29 | Purple → green brand gradient |
| #30 | White booking widget, smooth map fly-to, "Explore" text |
| #31 | New logo on sign in/up pages |
| #33 | Fix search page mobile overflow (375px) + og:title branding + e2e test fixes |

### Full Playwright audit (2026-03-23)

152 e2e tests passed against live site covering every route, auth flow, data rendering, mobile responsiveness, and performance. Known unbuilt features: Hospitable sync, Stripe Connect payouts, verify email resend, reviews system, traveler settings page, user profile photo.

---

## 7b. CROSS-APP AUTH ARCHITECTURE (CRITICAL - DO NOT BREAK)

nfstay has TWO apps sharing the SAME Supabase project and the SAME Particle Network config:

| App | URL | Repo |
|-----|-----|------|
| Hub (marketplace) | hub.nfstay.com | marketplace10 |
| Booking site | nfstay.app | bookingsite |

### Shared infrastructure
- **Supabase project:** `asazddtvjvmckouxcmmo` (same auth.users, same profiles table)
- **Particle Legacy config:** projectId `4f8aca10-0c7e-4617-bfff-7ccb5269f365` (social login - Google/Apple/X/Facebook)
- **Particle Hub config:** projectId `470629ca-91af-45fa-a52b-62ed2adf9ef0` (JWT auth - email/password wallet creation)
- **Password seed:** `_NFsTay2!` (used in `derivedPassword()` - NEVER rename)
- **n8n instance:** https://n8n.srv886554.hstgr.cloud (shared webhooks)

### Auth flows (must be identical on both apps)

**Social login (Google/Apple/X/Facebook):**
1. Particle `thirdpartyAuth()` opens OAuth popup/redirect
2. Callback page completes `connect()`, gets uuid + email
3. `derivedPassword(uuid)` generates deterministic password
4. Sign in or sign up to Supabase with derived password
5. Update profile with `wallet_auth_method` and `wallet_address`

**Email sign-up (target flow - must match marketplace10):**
1. User fills: name, email, password, WhatsApp number (with country code)
2. `supabase.auth.signUp()` creates Supabase account
3. `sendOtp()` sends 4-digit code via WhatsApp (n8n webhook: `/webhook/send-otp`)
4. Redirect to `/verify-otp` page
5. User enters OTP, verified via n8n webhook (`/webhook/verify-otp`)
6. After OTP verified: generate JWT via `particle-generate-jwt` Edge Function
7. `WalletProvisioner` creates Particle wallet silently in background
8. Wallet address saved to `profiles.wallet_address`

**Email sign-in:**
1. `supabase.auth.signInWithPassword()` directly
2. `WalletProvisioner` runs silently on dashboard load - creates wallet if missing

### NEVER DO THESE (breaks cross-app auth)
- NEVER rename the password seed `_NFsTay2!` - it locks out ALL social login users across BOTH apps
- NEVER change `PARTICLE_LEGACY_CONFIG` credentials - breaks social login wallet recovery
- NEVER create a separate Supabase project for bookingsite - accounts must be shared
- NEVER skip the WhatsApp OTP step on email sign-up - both apps must verify WhatsApp
- NEVER skip wallet creation on email sign-up - both apps must provision wallets
- NEVER install `@particle-network/auth-core` as a static dependency - use dynamic `import()` to keep bundle size small and avoid vite.config.ts conflicts

### n8n webhooks (shared, already live)
| Webhook | Path | Status |
|---------|------|--------|
| Send OTP | `/webhook/send-otp` | Active (200) |
| Verify OTP | `/webhook/verify-otp` | Active (200) |
| Wallet Created | `/webhook/wallet-created` | Not active (notification only) |
| Booking Confirmed | `/webhook/nfstay-booking-confirmed` | Active |

### Supabase Edge Functions (shared, already deployed)
| Function | Purpose |
|----------|---------|
| `particle-generate-jwt` | Generates signed JWT for Particle wallet creation |
| `nfs-create-checkout` | Creates Stripe Checkout session + pending reservation |

---

## 8. UI DESIGN STANDARDS

- **Visual reference:** Legacy nfstay-frontend-vps — same structure, layout, proportions
- **Brand reference:** hub.nfstay.com/brand (password: 5891)
- **Primary color:** NFStay Green `#1E9A80`
- **Gradient:** `linear-gradient(270deg, #27dea0 0%, #1E9A80 100%)`
- **Background:** White `#FFFFFF`
- **Logo:** [nf]stay — Sora font, NfsLogo component
- **Typography:** Inter (body/nav/buttons), Sora (logo only)
- **Buttons:** `rounded-full` for CTAs, `bg-primary-gradient text-white`
- **Cards:** `rounded-2xl`, `aspect-[320/300]`, `hover:scale-110`
- **Navbar:** `h-16 sm:h-20`, `grid grid-cols-3`, animated gradient toggle pill
- **Footer (main):** `bg-[#f0f3f7]`, green hover accents `#1E9A80`
- **Footer (operator):** `bg-gray-900` dark, with contact info
- **Components:** shadcn/ui first, custom only when necessary
- **Motion:** 200–300ms transitions, map fly-to uses zoom-out→pan→zoom-in
- **Mobile first:** 375px → tablet → desktop, bottom nav with gradient active state
- **Empty states:** always designed, never blank screens
- **Loading states:** skeleton or spinner, never layout shift

---

## 9. RESPONSE FORMAT

After completing a task:

```
DONE
What: [one sentence - what changed]
Files: [list of files modified]
Build: [pass/fail]
Test: [clickable URL or "check locally at localhost:5173"]
```

Keep it short. Hugo can read the diff.

---

## 10. n8n ACCESS

n8n is the automation engine for email notifications and workflows. You have full API access.

**Instance:** https://n8n.srv886554.hstgr.cloud
**Login:** `hello@agencin.com` / `@#Dgs58913367.$%`
**API Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZmI1M2JkZS0zZTdjLTQ2NWItOGI5MS1hOTQwOTlkZGM2YTMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzczNDI0MDQ5fQ.7lz1_W28UkD0SwjITXHn1t75A8Fl5eVM46XfENFkEtg`

### API usage

```bash
# List workflows
curl -H "X-N8N-API-KEY: <key>" https://n8n.srv886554.hstgr.cloud/api/v1/workflows

# Get a specific workflow
curl -H "X-N8N-API-KEY: <key>" https://n8n.srv886554.hstgr.cloud/api/v1/workflows/<id>

# Activate/deactivate
curl -X POST -H "X-N8N-API-KEY: <key>" https://n8n.srv886554.hstgr.cloud/api/v1/workflows/<id>/activate
curl -X POST -H "X-N8N-API-KEY: <key>" https://n8n.srv886554.hstgr.cloud/api/v1/workflows/<id>/deactivate

# Update workflow (PUT with name, nodes, connections, settings)
curl -X PUT -H "X-N8N-API-KEY: <key>" -H "Content-Type: application/json" \
  https://n8n.srv886554.hstgr.cloud/api/v1/workflows/<id> -d '{"name":"...","nodes":[...],"connections":{},"settings":{}}'

# Check executions
curl -H "X-N8N-API-KEY: <key>" "https://n8n.srv886554.hstgr.cloud/api/v1/executions?workflowId=<id>&limit=5&includeData=true"

# Trigger a webhook
curl -X POST https://n8n.srv886554.hstgr.cloud/webhook/<path> -H "Content-Type: application/json" -d '{...}'
```

### Bookingsite workflows

| Workflow | ID | Webhook Path | Status |
|---|---|---|---|
| nfstay - Booking Confirmed | `z5laFFJMZmq1f5uK` | `nfstay-booking-confirmed` | Active |

### Key lessons learned

1. **Webhook nodes MUST have a `webhookId` field** - without it the webhook URL won't register even if the workflow is active.
2. **Webhook data arrives at `$input.first().json.body`** - not `$input.first().json` directly. Always use `const data = $input.first().json.body || $input.first().json;` in Code nodes.
3. **Emails use Resend API** - called via `this.helpers.httpRequest()` in Code nodes, not via n8n Email Send nodes. The Resend API key is embedded in the Code node JS.
4. **Deactivate before updating, then reactivate** - PUT updates don't always take effect on a live workflow.
5. **Always prefer API over manual UI** - the n8n API can do everything: create, update, activate, deactivate, check executions.
