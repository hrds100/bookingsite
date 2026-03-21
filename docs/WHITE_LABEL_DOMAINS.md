# White-Label Domains Setup

## How it works

The app detects the current hostname on load:
- **Main site** (`nfstay.app`, `www.nfstay.app`, `localhost`, `*.vercel.app`) → normal NFStay experience
- **Subdomain** (`sunset.nfstay.app`) → looks up `nfs_operators.subdomain = 'sunset'`
- **Custom domain** (`stays.theircompany.com`) → looks up `nfs_operators.custom_domain = 'stays.theircompany.com'`

If a matching operator is found, the site shows only that operator's properties with their branding (logo, colors, hero, FAQs). Marketplace-specific sections (destinations, testimonials, "Why NFStay", operator CTA) are hidden.

## Subdomain setup (*.nfstay.app)

### Prerequisites
1. **Wildcard DNS**: Add `*.nfstay.app` A record pointing to `76.76.21.21` (Vercel anycast), or CNAME to `cname.vercel-dns.com`
2. **Vercel wildcard domain**: In Vercel → bookingsite project → Settings → Domains → add `*.nfstay.app`

### For each operator
1. Operator sets their `subdomain` in Settings → Branding (e.g. `sunset`)
2. `sunset.nfstay.app` immediately works — no per-operator DNS or Vercel config needed

## Custom domain setup (stays.theircompany.com)

### Per-operator steps
1. **Operator** points their domain's DNS to Vercel:
   - CNAME `stays.theircompany.com` → `cname.vercel-dns.com`
2. **Hugo** adds the domain in Vercel → bookingsite → Settings → Domains → add `stays.theircompany.com`
   - Vercel auto-provisions SSL
3. **Operator** enters `stays.theircompany.com` in Settings → Branding → Custom Domain field

## Operator branding columns (nfs_operators)

| Column | Used for |
|--------|----------|
| `subdomain` | e.g. `sunset` → `sunset.nfstay.app` |
| `custom_domain` | e.g. `stays.theircompany.com` |
| `brand_name` | Shown in navbar/footer instead of "NFsTay" |
| `logo_url` | Logo image in navbar/footer |
| `accent_color` | Brand color (future: CSS variable override) |
| `hero_photo` | Landing page hero background |
| `hero_headline` | Landing page headline |
| `hero_subheadline` | Landing page subheadline |
| `about_bio` | About section on white-label landing |
| `faqs` | JSONB array of {question, answer} — replaces default FAQs |

## Architecture

- `src/contexts/WhiteLabelContext.tsx` — domain detection + Supabase lookup
- `src/hooks/useWhiteLabelProperties.ts` — operator-scoped property fetching
- Components check `useWhiteLabel()` to conditionally render branding

## Testing locally

Real `.nfstay.app` subdomains redirect to HTTPS via HSTS, which breaks local dev. Use a `.test` domain instead.

1. Add to your hosts file (`C:\Windows\System32\drivers\etc\hosts` or `/etc/hosts`):
   ```
   127.0.0.1  sunset-local.test
   ```

2. Visit `http://sunset-local.test:8081` (or whatever port Vite is running on).

The naming convention is `{subdomain}-local.test`. The app strips the `-local` suffix to get the subdomain (`sunset`), then looks it up in `nfs_operators.subdomain`.

`vite.config.ts` has `server.allowedHosts` configured for `sunset-local.test`.

The mock operator `op-001` has `subdomain: 'sunset'`, so this works with mock data out of the box.
