/**
 * Vercel Edge Function — SSR-safe Open Graph meta tag injection.
 *
 * Social scrapers (WhatsApp, Facebook, Twitter) don't execute JavaScript,
 * so client-side WhiteLabelContext meta-tag injection never reaches them.
 * This function intercepts every HTML page request, detects the domain,
 * fetches the matching operator from Supabase, and returns the built
 * index.html with the correct OG/Twitter tags already in the <head>.
 *
 * Flow:
 *  nfstay.app           → serve index.html as-is (platform branding)
 *  *.nfstay.app         → look up operator by subdomain, inject their OG tags
 *  custom-domain.com    → look up operator by custom_domain, inject their OG tags
 *  unknown domain       → strip all nfstay OG branding (no image, generic title)
 */

export const config = { runtime: 'edge' };

const PLATFORM_HOST = 'nfstay.app';
const SUPABASE_URL  = (
  (process.env.VITE_SUPABASE_URL ?? 'https://asazddtvjvmckouxcmmo.supabase.co')
).replace(/\/$/, '');
const SUPABASE_KEY  = process.env.VITE_SUPABASE_ANON_KEY ?? '';

// Module-level template cache — persists across warm edge-function invocations.
let _templateHtml  = '';
let _templateFetched = 0;
const TEMPLATE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getTemplate(): Promise<string> {
  const now = Date.now();
  if (_templateHtml && now - _templateFetched < TEMPLATE_TTL_MS) {
    return _templateHtml;
  }
  // Fetch the static built index.html from the platform origin.
  // Static files are served before rewrites so this doesn't loop.
  const res = await fetch(`https://${PLATFORM_HOST}/index.html`);
  _templateHtml  = await res.text();
  _templateFetched = now;
  return _templateHtml;
}

interface OperatorRow {
  brand_name:       string;
  meta_title:       string | null;
  meta_description: string | null;
  og_image_url:     string | null;
  favicon_url:      string | null;
}

async function fetchOperator(host: string): Promise<OperatorRow | null> {
  try {
    const isSubdomain = host.endsWith(`.${PLATFORM_HOST}`);
    const col = isSubdomain ? 'subdomain' : 'custom_domain';
    const val = isSubdomain ? host.slice(0, -(`.${PLATFORM_HOST}`.length)) : host;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nfs_operators` +
      `?${col}=eq.${encodeURIComponent(val)}` +
      `&select=brand_name,meta_title,meta_description,og_image_url,favicon_url` +
      `&limit=1`,
      {
        headers: {
          apikey:        SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows: OperatorRow[] = await res.json();
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Minimal HTML-attribute escaping for injected values. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectTags(
  html: string,
  opts: {
    title:       string;
    description: string;
    ogUrl:       string;
    ogImage:     string | null;
  }
): string {
  const { title, description, ogUrl, ogImage } = opts;
  const twitterCard = ogImage ? 'summary_large_image' : 'summary';

  // <title> and meta description
  html = html
    .replace(/(<title>)[^<]*(<\/title>)/,                                    `$1${esc(title)}$2`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/,             `$1${esc(description)}$2`);

  // OG tags
  html = html
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/,             `$1${esc(ogUrl)}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/,           `$1${esc(title)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/,     `$1${esc(description)}$2`);

  // Twitter tags
  html = html
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,          `$1${esc(title)}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,    `$1${esc(description)}$2`)
    .replace(/(<meta\s+name="twitter:card"\s+content=")[^"]*(")/,           `$1${twitterCard}$2`);

  // OG image
  if (ogImage) {
    html = html
      .replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/,         `$1${esc(ogImage)}$2`)
      .replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/,        `$1${esc(ogImage)}$2`);
  } else {
    // Strip all image meta tags — never leak nfstay branding onto other domains
    html = html
      .replace(/<meta\s+property="og:image"[^>]*\/?>\n?/g,         '')
      .replace(/<meta\s+property="og:image:width"[^>]*\/?>\n?/g,   '')
      .replace(/<meta\s+property="og:image:height"[^>]*\/?>\n?/g,  '')
      .replace(/<meta\s+name="twitter:image"[^>]*\/?>\n?/g,        '');
  }

  return html;
}

export default async function handler(request: Request): Promise<Response> {
  const rawHost = request.headers.get('host') ?? PLATFORM_HOST;
  // Strip port (e.g. localhost:5173 → localhost)
  const host = rawHost.replace(/:\d+$/, '');

  // ── 1. Main platform — serve as-is ──────────────────────────────────────────
  if (host === PLATFORM_HOST || host === `www.${PLATFORM_HOST}` || host === 'localhost') {
    try {
      const html = await getTemplate();
      return new Response(html, {
        headers: {
          'content-type':  'text/html; charset=utf-8',
          'cache-control': 'public, max-age=300, stale-while-revalidate=60',
        },
      });
    } catch {
      return new Response('Service unavailable', { status: 503 });
    }
  }

  // ── 2. Operator domain ───────────────────────────────────────────────────────
  let html: string;
  try {
    html = await getTemplate();
  } catch {
    return new Response('Service unavailable', { status: 503 });
  }

  const operator = await fetchOperator(host);

  if (operator) {
    const title       = operator.meta_title       ?? `${operator.brand_name} — Book Direct`;
    const description = operator.meta_description ?? `Book your stay directly with ${operator.brand_name}. No middlemen, no hidden fees.`;

    html = injectTags(html, {
      title,
      description,
      ogUrl:   `https://${host}/`,
      ogImage: operator.og_image_url ?? null,
    });
    // Remove nfstay's own twitter:site handle from operator pages
    html = html.replace(/<meta\s+name="twitter:site"[^>]*\/?>\n?/g, '');
  } else {
    // Unknown domain — strip all nfstay branding
    html = injectTags(html, {
      title:       host,
      description: '',
      ogUrl:       `https://${host}/`,
      ogImage:     null,
    });
    html = html.replace(/<meta\s+name="twitter:site"[^>]*\/?>\n?/g, '');
  }

  return new Response(html, {
    headers: {
      'content-type':  'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, stale-while-revalidate=30',
    },
  });
}
