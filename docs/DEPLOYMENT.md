# Deployment

## Infrastructure

| Service | Purpose | URL |
|---------|---------|-----|
| Vercel | Frontend hosting | nfstay.app |
| GitHub | Source code | github.com/hrds100/bookingsite |
| Supabase | Auth + DB + Edge Functions | asazddtvjvmckouxcmmo.supabase.co |
| Stripe | Payment processing | Via Supabase Edge Function |
| n8n | Email notifications + automation | n8n.srv886554.hstgr.cloud |

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
| hub.nfstay.com | Vercel (marketplace10 project - separate repo) |

## DNS

nfstay.app DNS A record points to `76.76.21.21` (Vercel anycast).

## Vercel Environment Variables

Set in Vercel → bookingsite → Settings → Environment Variables.

| Variable | Description | Status |
|----------|-------------|--------|
| `VITE_SUPABASE_URL` | Supabase REST URL | Set |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Set |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API | Set |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (test mode) | Set |
| `VITE_N8N_WEBHOOK_URL` | n8n webhook base URL | Set |

## Supabase Secrets (Edge Functions)

Set via Supabase Management API.

| Secret | Description | Status |
|--------|-------------|--------|
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_live_...) | Set |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret | Set |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe Connect OAuth client ID | Set |
| `VERCEL_TOKEN` | Vercel API token (operator subdomain auto-provision) | Set in Supabase for `nfs-provision-nfstay-subdomain` |
| `VERCEL_TEAM_ID` | Team id, e.g. `team_...` | Set |
| `VERCEL_BOOKINGSITE_PROJECT_ID` | bookingsite project id, e.g. `prj_...` | Set |

## Edge Functions

| Function | Endpoint | Status |
|----------|----------|--------|
| `nfs-create-checkout` | `POST /functions/v1/nfs-create-checkout` | Deployed + active |
| `nfs-provision-nfstay-subdomain` | `POST /functions/v1/nfs-provision-nfstay-subdomain` | Deploy from `marketplace10/supabase/functions`; registers `{subdomain}.nfstay.app` on Vercel when an operator saves their slug |

Deploy edge functions:
```bash
SUPABASE_ACCESS_TOKEN="sbp_..." supabase functions deploy <name> --project-ref asazddtvjvmckouxcmmo --no-verify-jwt
```

Or via Supabase Management API (if CLI has workdir issues).

## Vercel Config

`vercel.json` enables SPA routing - all paths serve `index.html`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Build

```bash
npm run build    # Vite production build → dist/
```

Output goes to `dist/`. Vercel serves this as a static SPA with client-side routing.
