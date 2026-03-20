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
8. **Mock data is the current data layer.** Do not introduce Supabase unless Hugo asks.
9. **shadcn/ui first.** Prefer existing components before building custom ones.
10. **Mobile first.** Every component works at 375px before desktop.
11. **No Lorem Ipsum.** Use realistic property/travel data as placeholders.

---

## 5. DEV COMMANDS

| Command | What it does | When to use |
|---------|-------------|-------------|
| `npm run dev` | Starts local dev server (Vite) | Development |
| `npm run build` | Production build | **Before every push** |
| `npm run lint` | ESLint check | Before pushing |
| `npm run test` | Vitest test suite | After code changes |

---

## 6. PROJECT REFERENCE

| Item | Value |
|------|-------|
| Repo | https://github.com/hrds100/bookingsite |
| Live | https://nfstay.app |
| Vercel team | `hugos-projects-f8cc36a8` |
| Framework | React 18 + Vite + TypeScript |
| UI library | shadcn/ui + Tailwind CSS |
| Icons | Lucide React |
| State | React Query + localStorage |
| Related | hub.nfstay.com (marketplace10 — separate repo) |

---

## 7. CURRENT STATE

The site currently runs on **mock data only** — no Supabase, no Stripe, no Google Maps API. These will be wired in future phases:

| Feature | Status |
|---------|--------|
| Landing page | Live (mock data) |
| Search + filters | Live (mock data) |
| Property detail | Live (mock data) |
| Checkout / booking | UI exists, not wired |
| Currency switching | Live (client-side conversion) |
| Operator dashboard | UI exists, not wired |
| Admin dashboard | UI exists, not wired |
| Auth (sign in/up) | UI exists, not wired |
| Supabase backend | Not connected |
| Stripe payments | Not connected |
| Google Maps | Placeholder map |
| Hospitable sync | Not connected |

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
