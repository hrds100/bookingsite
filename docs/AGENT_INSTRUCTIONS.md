# NFStay Booking Site — AI Agent Instructions

> **Single source of truth for all AI operating rules.** Read FIRST. Every session. No exceptions.

---

## 1. SYSTEM ROLE

Claude acts as **AI Developer** for the NFStay booking site (nfstay.app).

- Claude reads code before editing — never guesses.
- Claude writes clean, minimal code. No over-engineering.
- Claude reports to Hugo. No unrequested features.

**Project:** Standalone vacation rental booking platform — React + Vite + TypeScript + Tailwind + shadcn/ui.
**Priority order:** reliability > UX polish > clean code > speed.

---

## 2. DOC SCOPING — read before every task

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
| `npx playwright test` | Playwright e2e tests | **After every fix or feature — non-negotiable.** Write a test, run it, paste the result. |

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
| Auth | Supabase Auth (email/password) — shared with hub.nfstay.com |
| Database | Supabase PostgreSQL — `nfs_*` tables |
| Payments | Stripe Checkout via Edge Function |
| Maps | Google Maps JavaScript API |
| Icons | Lucide React |
| State | React Query + Supabase + localStorage |
| Related | hub.nfstay.com (marketplace10 — separate repo, same Supabase) |

---

## 7. CURRENT STATE

The site is partially wired to real backend services. Data hooks fall back to mock data when Supabase returns empty results.

| Feature | Status |
|---------|--------|
| Landing page | Live (mock data for properties) |
| Search + filters | Live (mock data, real Google Maps) |
| Property detail | Live (mock data) |
| Auth (sign in/up) | Real — Supabase Auth (same accounts as hub.nfstay.com) |
| Navbar auth state | Real — shows sign out when logged in |
| Checkout / booking | Real — Stripe Checkout via Edge Function |
| Currency switching | Real (client-side conversion) |
| Google Maps | Real — live map with markers, hover-to-zoom |
| Operator properties | Real — queries nfs_properties (falls back to mock) |
| Operator settings | Real — saves to nfs_operators |
| Operator reservations | Real — queries nfs_reservations (falls back to mock) |
| Admin dashboard | Mock — hardcoded stats |
| Social login (Google/Apple) | Real — Particle Network OAuth (shared with hub.nfstay.com) |
| Hospitable sync | Not wired — credentials saved |
| Email notifications | Real — n8n webhook on booking confirm (Resend API) |
| Property create/edit form | UI exists, not saving to DB |
| Photo upload | UI exists, not wired to Supabase Storage |
| Stripe Connect (operator payouts) | Not wired — credentials saved |
| White-label / subdomains | Not built |

---

## 8. UI DESIGN STANDARDS

- **Reference:** Airbnb, Booking.com — clean, minimal, confident
- **Spacing:** consistent 4px/8px grid
- **Typography:** Inter font family, one scale
- **Colors:** existing Tailwind tokens only — never introduce new hex values
- **Components:** shadcn/ui first, custom only when necessary
- **Motion:** subtle only (200–300ms transitions)
- **Mobile first:** 375px → tablet → desktop
- **Empty states:** always designed, never blank screens
- **Loading states:** skeleton or spinner, never layout shift

---

## 9. RESPONSE FORMAT

After completing a task:

```
DONE
What: [one sentence — what changed]
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
| NFsTay — Booking Confirmed | `z5laFFJMZmq1f5uK` | `nfstay-booking-confirmed` | Active |

### Key lessons learned

1. **Webhook nodes MUST have a `webhookId` field** — without it the webhook URL won't register even if the workflow is active.
2. **Webhook data arrives at `$input.first().json.body`** — not `$input.first().json` directly. Always use `const data = $input.first().json.body || $input.first().json;` in Code nodes.
3. **Emails use Resend API** — called via `this.helpers.httpRequest()` in Code nodes, not via n8n Email Send nodes. The Resend API key is embedded in the Code node JS.
4. **Deactivate before updating, then reactivate** — PUT updates don't always take effect on a live workflow.
5. **Always prefer API over manual UI** — the n8n API can do everything: create, update, activate, deactivate, check executions.
