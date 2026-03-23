# nfstay Design Cheatsheet — nfstay.app

> This file auto-loads in every Claude session for bookingsite.
> Follow these tokens exactly. Never introduce new hex values or random colours.

## Brand Colours (CSS variables from index.css)

| Token | Light mode | Dark mode | Use for |
|-------|-----------|-----------|---------|
| `--primary` | `164 73% 34%` (teal) | `164 60% 42%` | Buttons, links, active states, ring |
| `--primary-foreground` | `0 0% 100%` (white) | `0 0% 100%` | Text on primary backgrounds |
| `--secondary` | `30 14% 96%` (warm gray) | `0 0% 14%` | Secondary buttons, subtle backgrounds |
| `--accent` | `164 73% 34%` (same teal) | `164 60% 42%` | Highlights, focus rings |
| `--accent-light` | `164 50% 96%` (very light teal) | `164 40% 12%` | Badge backgrounds, hover tints |
| `--destructive` | `0 84% 60%` (red) | `0 63% 31%` | Delete buttons, error states |
| `--muted` | `30 14% 96%` | `0 0% 14%` | Disabled states, placeholder backgrounds |
| `--muted-foreground` | `0 1% 51%` | `0 0% 65%` | Secondary text, hints |
| `--border` | `0 0% 89%` | `0 0% 18%` | All borders |
| `--card` | `30 14% 96%` (warm) | `0 0% 10%` | Card backgrounds |

### Semantic colours
| Token | Value | Use for |
|-------|-------|---------|
| `--success` | `164 60% 40%` | Success toasts, confirmed states |
| `--warning` | `38 92% 50%` | Warning badges, caution states |
| `--danger` | `0 84% 60%` | Error states, destructive actions |
| `--info` | `217 91% 60%` | Info badges, neutral alerts |

## Key difference from hub.nfstay.com
- **Bookingsite primary is teal** (`164 73% 34%`) — NOT the green used on hub (`145 63% 42%`)
- **Card backgrounds are warm** (`30 14% 96%`) — NOT pure white
- **Font is Inter only** — no Plus Jakarta Sans or Playfair Display on this site

## Font
- **Body + headings:** `Inter` (weights: 400, 500, 600, 700, 800)
- **Fallback:** `system-ui, sans-serif`

## Spacing
- **Grid:** 4px / 8px increments — never arbitrary margins
- **Container:** max-width `1400px`, padding `2rem`, centred
- **Border radius:** `--radius: 0.625rem` (lg), `-2px` (md), `-4px` (sm)

## Component Library
- **Always use shadcn/ui first** — custom components only when shadcn doesn't have it
- **Icons:** Lucide React only — no other icon libraries
- **Conditional classes:** use `cn()` from `@/lib/utils`
- **Never hand-edit** files in `src/components/ui/` — those are shadcn-managed
- **nfstay-specific components** live in `src/components/nfs/` (16 components)

## Responsive
- **Mobile first:** style for 375px, then `sm:`, `md:`, `lg:`, `xl:`
- Reference designs: Airbnb, Booking.com — clean, minimal, confident

## Motion
- Transitions: 200–300ms only — never decorative
- Accordion: 0.2s ease-out
- Respect `prefers-reduced-motion`

## Hard rules
1. Never introduce new hex values — use existing CSS variables only
2. Never use inline styles — Tailwind classes only
3. Never use CSS modules
4. No Lorem Ipsum — use realistic property/travel data
5. Every component must have: normal state, empty state, loading state, error state
6. Data hooks must fall back to mock data when Supabase returns empty — never remove mock fallback without approval
7. Do NOT revert or overwrite existing styles unless the task explicitly requires it
