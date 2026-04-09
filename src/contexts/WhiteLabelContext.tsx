import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { NfsOperator } from "@/hooks/useNfsOperator";

/** Convert hex color to HSL string for CSS variable (e.g. "164 73% 34%") */
function hexToHsl(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return `0 0% ${Math.round(l * 100)}%`;

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = 0;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) hue = ((b - r) / d + 2) / 6;
  else hue = ((r - g) / d + 4) / 6;

  return `${Math.round(hue * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

interface WhiteLabelState {
  /** The resolved operator for this domain, or null if on the main nfstay site */
  operator: NfsOperator | null;
  /** True while we're resolving the domain */
  loading: boolean;
  /** Whether we're on a white-label domain (not nfstay.app / localhost) */
  isWhiteLabel: boolean;
}

const WhiteLabelContext = createContext<WhiteLabelState>({
  operator: null,
  loading: true,
  isWhiteLabel: false,
});

/** Hostnames that are the main nfstay site (not white-label) */
const MAIN_HOSTNAMES = [
  "nfstay.app",
  "www.nfstay.app",
  "localhost",
  "127.0.0.1",
];

function isMainSite(hostname: string): boolean {
  // Vercel preview deployments
  if (hostname.endsWith(".vercel.app")) return true;
  return MAIN_HOSTNAMES.includes(hostname);
}

/**
 * Extract the subdomain from a hostname like "sunset.nfstay.app" → "sunset"
 * Also handles local dev domains like "sunset-local.test" → "sunset"
 * Returns null if it's the bare domain or www.
 */
function extractSubdomain(hostname: string): string | null {
  const parts = hostname.split(".");
  // Production: e.g. ["sunset", "nfstay", "app"]
  if (parts.length === 3 && parts[1] === "nfstay" && parts[2] === "app") {
    const sub = parts[0];
    if (sub === "www") return null;
    return sub;
  }
  // Local dev: e.g. "sunset-local.test" → "sunset"
  if (parts.length === 2 && parts[1] === "test" && parts[0].endsWith("-local")) {
    return parts[0].replace(/-local$/, "");
  }
  return null;
}

export function WhiteLabelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WhiteLabelState>({
    operator: null,
    loading: true,
    isWhiteLabel: false,
  });
  const originalPrimaryRef = useRef<string | null>(null);

  // Apply operator accent color to ALL theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    if (state.isWhiteLabel && state.operator) {
      // Save originals on first white-label load
      if (!originalPrimaryRef.current) {
        originalPrimaryRef.current = getComputedStyle(root)
          .getPropertyValue('--primary').trim();
      }
      // Default to black (#000000) if operator has no accent color
      const color = state.operator.accent_color || '#000000';
      const hsl = hexToHsl(color);
      // Parse hue and saturation for lighter/darker variants
      const parts = hsl.split(' ');
      const hue = parts[0];
      const sat = parts[1];
      const lightAccentLight = `${hue} ${sat.replace('%', '') ? sat : '50%'} 96%`;
      const darkAccentForeground = `${hue} ${sat} 20%`;

      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--accent', hsl);
      root.style.setProperty('--ring', hsl);
      root.style.setProperty('--accent-light', lightAccentLight);
      root.style.setProperty('--accent-foreground', darkAccentForeground);
      root.style.setProperty('--sidebar-ring', hsl);
    } else if (originalPrimaryRef.current) {
      // Reset all to original values when leaving white-label
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--accent-light');
      root.style.removeProperty('--accent-foreground');
      root.style.removeProperty('--sidebar-ring');
    }
  }, [state.isWhiteLabel, state.operator]);

  // Update page title, OG tags, og:image and favicon for white-label operators
  useEffect(() => {
    if (state.isWhiteLabel && state.operator) {
      const op = state.operator;
      const brand = op.brand_name || '';

      // Title
      const title = op.meta_title || (brand ? `${brand} - Find Stays, Book Directly` : 'Find Stays, Book Directly');
      document.title = title;

      // Description
      const desc = op.meta_description || `Book unique stays directly with ${brand || 'us'}. No middleman fees.`;

      // Helper: set or create a <meta> tag
      const setMeta = (selector: string, attr: string, value: string) => {
        let el = document.querySelector(selector) as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement('meta');
          const [attrName, attrValue] = selector.replace('meta[', '').replace(']', '').split('=');
          el.setAttribute(attrName, attrValue.replace(/"/g, ''));
          document.head.appendChild(el);
        }
        el.setAttribute(attr, value);
      };

      setMeta('meta[property="og:title"]', 'content', title);
      setMeta('meta[name="twitter:title"]', 'content', title);
      setMeta('meta[property="og:description"]', 'content', desc);
      setMeta('meta[name="twitter:description"]', 'content', desc);
      setMeta('meta[name="description"]', 'content', desc);

      // OG image — use operator's dedicated og_image_url, fall back to hero_photo
      const ogImage = op.og_image_url || op.hero_photo;
      if (ogImage) {
        setMeta('meta[property="og:image"]', 'content', ogImage);
        setMeta('meta[name="twitter:image"]', 'content', ogImage);
        setMeta('meta[property="twitter:card"]', 'content', 'summary_large_image');
      }

      // Favicon
      if (op.favicon_url) {
        let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = op.favicon_url;
      }
    } else {
      document.title = 'Find Stays, Book Directly';
    }
  }, [state.isWhiteLabel, state.operator]);

  useEffect(() => {
    const hostname = window.location.hostname;

    // Preview mode: ?preview=<operator-id> forces white-label view on main site
    const previewId = new URLSearchParams(window.location.search).get("preview");

    // Main site — skip resolution (unless preview mode)
    if (isMainSite(hostname) && !previewId) {
      setState({ operator: null, loading: false, isWhiteLabel: false });
      return;
    }

    // Could be a subdomain (sunset.nfstay.app) or custom domain (stays.company.com)
    const subdomain = extractSubdomain(hostname);

    // If Supabase isn't configured, skip the lookup — fall back to main site
    if (!SUPABASE_CONFIGURED) {
      setState({ operator: null, loading: false, isWhiteLabel: false });
      return;
    }

    async function resolveOperator() {
      try {
        let query;
        if (previewId) {
          // Preview mode — look up operator by ID
          query = supabase
            .from("nfs_operators")
            .select("*")
            .eq("id", previewId)
            .maybeSingle();
        } else if (subdomain) {
          // Match by subdomain column
          query = supabase
            .from("nfs_operators")
            .select("*")
            .eq("subdomain", subdomain)
            .eq("landing_page_enabled", true)
            .maybeSingle();
        } else {
          // Match by custom_domain column
          query = supabase
            .from("nfs_operators")
            .select("*")
            .eq("custom_domain", hostname)
            .eq("custom_domain_verified", true)
            .maybeSingle();
        }

        const { data, error } = await query;

        if (error || !data) {
          // No operator found for this domain — show main site as fallback
          setState({ operator: null, loading: false, isWhiteLabel: false });
          return;
        }

        setState({
          operator: data as unknown as NfsOperator,
          loading: false,
          isWhiteLabel: true,
        });
      } catch {
        // On network error, fall back to main site
        setState({ operator: null, loading: false, isWhiteLabel: false });
      }
    }

    resolveOperator();
  }, []);

  return (
    <WhiteLabelContext.Provider value={state}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

export function useWhiteLabel() {
  return useContext(WhiteLabelContext);
}
