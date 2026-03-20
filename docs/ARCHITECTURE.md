# Architecture

## Overview

NFStay booking site is a standalone React SPA deployed to Vercel at nfstay.app. It serves three user types through a single codebase with layout-based routing.

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
├── nfs/                   ← 16 NFStay components
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

## Data Layer (current)

All data is **mock/local** — no backend connected yet.

| Data | Source | File |
|------|--------|------|
| Properties (12) | Static array | `src/data/mock-properties.ts` |
| Destinations (10) | Static array | `src/data/mock-destinations.ts` |
| Reservations (8) | Static array | `src/data/mock-reservations.ts` |
| Testimonials (6) | Static array | `src/data/mock-reservations.ts` |
| Operator profile | Static object | `src/data/mock-operator.ts` |
| Admin metrics | Static object | `src/data/mock-admin.ts` |
| Favourites | localStorage | `nfs_favourites` key |
| Recently viewed | localStorage | `nfs_recently_viewed` key |
| Currency preference | localStorage | `nfs_currency` key |

## Data Layer (future — when wired)

| Service | Purpose |
|---------|---------|
| Supabase | DB, auth, storage, edge functions, RLS |
| Stripe | Payment processing, operator payouts |
| Google Maps | Property maps, places autocomplete |
| Hospitable | Calendar sync, channel management |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.3 + TypeScript 5.8 |
| Build | Vite 5.4 |
| Styling | Tailwind CSS 3.4 |
| Components | shadcn/ui (Radix primitives) |
| Icons | Lucide React |
| Data fetching | TanStack React Query 5 |
| Dates | date-fns + react-day-picker |
| Validation | Zod |
| Charts | Recharts |
| Toasts | Sonner |
| Testing | Vitest + Playwright |
