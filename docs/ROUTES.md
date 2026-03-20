# Routes

All routes are defined in `src/App.tsx`.

## Traveler Routes (NfsMainLayout — navbar + footer)

| Path | Component | Description |
|------|-----------|-------------|
| `/` | NfsMainLanding | Homepage — hero, destinations, featured, how-it-works, testimonials, FAQ, CTA |
| `/search` | NfsSearchPage | Search results with filters (left) + map (right) |
| `/property/:id` | NfsPropertyView | Property detail page with booking widget |
| `/checkout` | NfsCheckoutPage | Guest checkout flow |
| `/booking` | NfsGuestBookingLookup | Look up existing booking by email/confirmation |
| `/payment/success` | NfsPaymentSuccess | Payment confirmation |
| `/payment/cancel` | NfsPaymentCancel | Payment cancelled |
| `/traveler/reservations` | TravelerReservations | Guest's booking history |
| `/traveler/reservation/:id` | TravelerReservationDetail | Single booking detail |

## Operator Routes (NfsOperatorLayout — sidebar)

| Path | Component | Description |
|------|-----------|-------------|
| `/nfstay` | OperatorDashboard | Operator overview/stats |
| `/nfstay/onboarding` | OperatorOnboarding | 8-step onboarding wizard (standalone) |
| `/nfstay/properties` | OperatorProperties | Property list |
| `/nfstay/properties/new` | OperatorPropertyForm | Create property |
| `/nfstay/properties/:id` | OperatorPropertyForm | Edit property |
| `/nfstay/reservations` | OperatorReservations | Reservation list |
| `/nfstay/reservations/:id` | OperatorReservationDetail | Single reservation |
| `/nfstay/create-reservation` | OperatorCreateReservation | Manual reservation |
| `/nfstay/analytics` | OperatorAnalytics | Charts and metrics |
| `/nfstay/settings` | OperatorSettings | Account settings |

## Admin Routes (NfsAdminLayout — sidebar)

| Path | Component | Description |
|------|-----------|-------------|
| `/admin/nfstay` | AdminDashboard | Platform overview |
| `/admin/nfstay/users` | AdminUsers | Manage users |
| `/admin/nfstay/operators` | AdminOperators | Manage operators |
| `/admin/nfstay/analytics` | AdminAnalytics | Platform analytics |
| `/admin/nfstay/settings` | AdminSettings | Platform config |

## Auth Routes (standalone — no layout)

| Path | Component | Description |
|------|-----------|-------------|
| `/signin` | SignInPage | Sign in |
| `/signup` | SignUpPage | Sign up |
| `/traveler/login` | TravelerLoginPage | Alternative login |
| `/verify-email` | VerifyEmailPage | Email verification |
| `/nfstay/oauth-callback` | OAuthCallbackPage | OAuth redirect |
| `/auth/callback` | AuthCallbackPage | Auth callback |
| `*` | NotFound | 404 |
