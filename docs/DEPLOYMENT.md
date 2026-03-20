# Deployment

## Infrastructure

| Service | Purpose | URL |
|---------|---------|-----|
| Vercel | Frontend hosting | nfstay.app |
| GitHub | Source code | github.com/hrds100/bookingsite |
| Supabase | Backend (future) | asazddtvjvmckouxcmmo.supabase.co |

## Auto-Deploy

Every push to `main` triggers a Vercel production deploy automatically.

```
git push origin main → Vercel builds → nfstay.app updates (~2 min)
```

## Domains

| Domain | Points to |
|--------|-----------|
| nfstay.app | Vercel (bookingsite project) |
| www.nfstay.app | 308 redirect → nfstay.app |
| hub.nfstay.com | Vercel (marketplace10 project — separate repo) |

## DNS

nfstay.app DNS A record points to `76.76.21.21` (Vercel anycast).

## Environment Variables

Set in Vercel → bookingsite → Settings → Environment Variables.

| Variable | Description | Status |
|----------|-------------|--------|
| `VITE_SUPABASE_URL` | Supabase REST URL | Not set yet |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Not set yet |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API | Not set yet |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Not set yet |

## Build

```bash
npm run build    # Vite production build → dist/
```

Output goes to `dist/`. Vercel serves this as a static SPA with client-side routing.

## Vercel Config

`vercel.json` (if needed for SPA routing):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
