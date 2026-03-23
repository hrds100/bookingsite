# Architecture

## Overview

nfstay booking site is a standalone React SPA deployed to Vercel at nfstay.app. It serves three user types through a single codebase with layout-based routing.

## User Portals

| Portal | Layout | Route prefix | Purpose |
|--------|--------|-------------|---------|
| Traveler | `NfsMainLayout` (navbar + footer) | `/` | Browse, search, book properties |
| Operator | `NfsOperatorLayout` (sidebar) | `/nfstay/*` | Manage properties, reservations, settings |
| Admin | `NfsAdminLayout` (sidebar) | `/admin/nfstay/*` | Platform management |

## Route Map

### Traveler (public)
```
/                          → NfsMainLanding (hero + destinations + featured + FAQ)
/search                    → NfsSearchPage (filters + map split view)
/property/:id              → NfsPropertyView (detail + booking widget)
/checkout                  → NfsCheckoutPage
/booking                   → NfsGuestBookingLookup
/payment/success           → NfsPaymentSuccess
/payment/cancel            → NfsPaymentCancel
/traveler/reservations     → TravelerReservations
/traveler/reservation/:id  → TravelerReservationDetail
```

### Operator (authenticated)
```
/nfstay                    → OperatorDashboard
/nfstay/onboarding         → OperatorOnboarding (8-step wizard)
/nfstay/properties         → OperatorProperties
/nfstay/properties/new     → OperatorPropertyForm (create)
/nfstay/properties/:id     → OperatorPropertyForm (edit)
/nfstay/reservations       → OperatorReservations
/nfstay/reservations/:id   → OperatorReservationDetail
/nfstay/create-reservation → OperatorCreateReservation
/nfstay/analytics          → OperatorAnalytics
/nfstay/settings           → OperatorSettings
```

### Admin
```
/admin/nfstay              → AdminDashboard
/admin/nfstay/users        → AdminUsers
/admin/nfstay/operators    → AdminOperators
/admin/nfstay/analytics    → AdminAnalytics
/admin/nfstay/settings     → AdminSettings
```

### Auth (standalone — no layout wrapper)
```
/signin                    → SignInPage
/signup                    → SignUpPage
/traveler/login            → TravelerLoginPage
/verify-email              → VerifyEmailPage
/nfstay/oauth-callback     → OAuthCallbackPage
/auth/callback             → AuthCallbackPage
```

## Component Structure

```
src/components/
├── nfs/                   ← 16 nfstay components
│   ├── NfsMainLayout      ← Navbar + <Outlet> + Footer
│   ├── NfsMainNavbar      ← Context-aware (home tabs / search bar)
│   ├── NfsMainFooter      ← 4-column (About / Operators / Travelers / Legal)
│   ├── NfsHeroSearch      ← Destination + date picker + guest stepper
│   ├── NfsPropertyCard    ← Image carousel + favourites + info
│   ├── NfsSearchFilters   ← Type / price / bedrooms / sort
│   ├── NfsSearchMap       ← Placeholder map with price markers
│   ├── NfsBookingWidget   ← Booking sidebar (dates, guests, pricing)
│   ├── NfsCurrencySelector← Currency dropdown
│   ├── NfsEmptyState      ← Reusable empty state
│   ├── NfsLogo            ← Brand component
│   ├── NfsStatusBadge     ← Status indicator
│   ├── NfsOperatorLayout  ← Sidebar layout for operators
│   ├── NfsOperatorSidebar ← Operator navigation
│   ├── NfsAdminLayout     ← Sidebar layout for admins
│   └── NfsAdminSidebar    ← Admin navigation
└── ui/                    ← 39 shadcn/ui primitives
```

## Data Layer

Data flows through **React Query hooks** that query Supabase. All hooks fall back to **mock data** when Supabase returns empty results or is unreachable.

### Real (connected to Supabase)

| Data | Hook | Table |
|------|------|-------|
| Auth session | `useAuth()` | `auth.users` + `profiles` |
| Operator detection | `useAuth()` | `nfs_operators` |
| Listed properties | `useNfsProperties()` | `nfs_properties` |
| Single property | `useNfsProperty(id)` | `nfs_properties` |
| Operator's properties | `useNfsOperatorProperties(opId)` | `nfs_properties` |
| Operator profile | `useNfsOperator()` | `nfs_operators` |
| Operator settings save | `useNfsOperatorUpdate()` | `nfs_operators` |
| Reservations (traveler) | `useNfsReservations(email)` | `nfs_reservations` |
| Reservations (operator) | `useNfsOperatorReservations(opId)` | `nfs_reservations` |
| Guest checkout | Supabase Edge Function | `nfs_reservations` + Stripe |

### Mock Fallback (client-side only)

| Data | Source |
|------|--------|
| Properties (12) | `src/data/mock-properties.ts` |
| Destinations (10) | `src/data/mock-destinations.ts` |
| Reservations (8) | `src/data/mock-reservations.ts` |
| Testimonials (6) | `src/data/mock-reservations.ts` |
| Operator profile | `src/data/mock-operator.ts` |
| Admin metrics | `src/data/mock-admin.ts` |

### Client-Side Persistence

| Data | Storage |
|------|---------|
| Favourites | localStorage (`nfs_favourites`) |
| Recently viewed | localStorage (`nfs_recently_viewed`) |
| Currency preference | localStorage (`nfs_currency`) |

## Backend Services

| Service | Purpose | Status |
|---------|---------|--------|
| Supabase | Auth, DB, Edge Functions, RLS | Connected |
| Stripe | Guest payments via Checkout | Connected (edge function) |
| Google Maps | Property maps on search page | Connected |
| Hospitable | Calendar sync, listing sync | Not yet — credentials ready |
| n8n | Webhooks, email notifications | Not yet — credentials ready |

## Edge Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `nfs-create-checkout` | Creates Stripe Checkout Session + pending reservation | Deployed |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.3 + TypeScript 5.8 |
| Build | Vite 5.4 |
| Styling | Tailwind CSS 3.4 |
| Components | shadcn/ui (Radix primitives) |
| Icons | Lucide React |
| Data fetching | TanStack React Query 5 |
| Auth | Supabase Auth (email/password + Particle social login) |
| Database | Supabase (PostgreSQL) |
| Edge functions | Supabase Edge Functions (Deno) |
| Payments | Stripe Checkout |
| Maps | Google Maps JavaScript API |
| Dates | date-fns + react-day-picker |
| Validation | Zod |
| Charts | Recharts |
| Toasts | Sonner |
| Testing | Vitest + Playwright |
