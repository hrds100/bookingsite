

# nfstay — Phase 1: Foundation + Traveler Portal

## Overview
Build the complete design system, app structure, layouts, and the full guest-facing traveler experience using realistic mock data. This creates a polished, demo-ready product that can be wired to Supabase later.

---

## 1. Design System & Global Setup
- Apply Inter font, nfstay CSS variables (green primary `hsl(145 63% 42%)`), typography scale, button variants, card styles, input styles
- Status badge components, skeleton loaders, empty state component, toast configuration
- Constants file: currencies, property types, cancellation policies, check-in/out times

## 2. Routing & Layouts
- **`NfsMainLayout`**: sticky navbar (logo with green "NFS", "Sign in" link, "List your property" CTA) + footer (4-column with links and socials)
- **`NfsWhiteLabelProvider`**: domain detection context (white-label vs main site), renders appropriate route tree
- Route structure for all public/traveler routes: `/`, `/search`, `/property/:id`, `/checkout`, `/booking`, `/payment/success`, `/payment/cancel`, `/signin`, `/signup`, `/traveler/login`, `/auth/callback`, `/verify-email`
- 404 page and property-not-found page

## 3. Auth Pages (UI only, no Supabase wiring)
- **SignIn** / **SignUp** / **TravelerLogin** (magic link) / **VerifyEmail** / **AuthCallback** — all styled per spec with form validation

## 4. Main Landing Page (`/`)
- Hero section with dark overlay, badge, H1, subtitle, and `NfsHeroSearch` widget
- Popular Destinations carousel (Embla, 10 hardcoded cities with photos)
- Featured Properties grid (8 mock properties using `NfsPropertyCard`)
- How It Works (3 cards), Why nfstay (3×2 grid), Testimonials carousel (6 reviews), FAQ accordion (8 items), CTA banner

## 5. `NfsHeroSearch` Component
- Location input with Google Places autocomplete (graceful fallback if no API key)
- Date range picker (2-month calendar, check-in/check-out with range highlighting)
- Guests dropdown (adults/children/infants steppers)
- Search button → navigates to `/search` with query params

## 6. Search Page (`/search`)
- Compressed search bar, property type filter chips, expandable price/bedroom filters
- Grid view with `NfsPropertyCard` components (mock data, 12+ properties)
- Map view with Google Maps price markers and mini property cards on click
- Grid/Map toggle, result count, loading skeletons, empty state
- URL params sync

## 7. `NfsPropertyCard` Component
- Image carousel with hover arrows and dot indicators
- Favourite heart toggle (localStorage), "New" badge
- Title, location, beds/baths, price per night
- Links to `/property/:id`

## 8. Property View Page (`/property/:id`)
- Photo gallery (desktop: 5-image grid, mobile: swipe carousel) + lightbox with thumbnails
- Left column: title, quick stats, description (show more/less), amenities grid + modal, house rules, cancellation policy, location map
- Right column: `NfsBookingWidget` (sticky)
- Share button (Web Share API / copy link), favourite button

## 9. `NfsBookingWidget`
- Date picker, guest selector, availability validation
- Pricing breakdown (rate × nights, cleaning fee, discounts, promo code input)
- Reserve button → saves booking intent to sessionStorage → navigates to `/checkout`

## 10. Checkout Page (`/checkout`)
- Guest form (name, email, phone with country code, special requests)
- Promo code input, booking policies checkbox
- Right sidebar: booking summary with property thumbnail + pricing breakdown
- Session expiry handling with countdown banner
- "Complete booking" button (mock success → redirect to payment success)

## 11. Payment Success & Cancel Pages
- **Success**: green checkmark, booking details card with cover image, reservation ID, action buttons
- **Cancel**: amber warning, "return to property" and "browse other" buttons

## 12. Guest Booking Lookup (`/booking`)
- Email search form, auto-fill from URL params
- Results list with reservation cards (mock data)

## 13. Traveler Dashboard (auth-gated UI)
- **Reservations list** (`/traveler/reservations`): tabs (All/Upcoming/Past/Cancelled), reservation cards
- **Reservation detail** (`/traveler/reservation/:id`): property card, dates, pricing, payment info, cancel request button

## 14. Nice-to-Have Enhancements (included)
- Recently viewed properties (localStorage) shown on landing page
- Search history dropdown on search input focus
- Property comparison feature (compare bar + `/compare` page)
- Currency selector in header (GBP/USD/EUR/AED/SGD with static rates)
- Print booking summary (`@media print` styles)

## 15. Mock Data Layer
- `src/data/mock-properties.ts` — 12 diverse properties with images, amenities, pricing, locations
- `src/data/mock-reservations.ts` — 8 sample reservations in various statuses
- `src/data/mock-destinations.ts` — 10 popular cities with photos
- All hooks stubbed to return mock data with simulated loading states

