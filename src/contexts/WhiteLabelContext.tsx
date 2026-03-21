import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { NfsOperator } from "@/hooks/useNfsOperator";

interface WhiteLabelState {
  /** The resolved operator for this domain, or null if on the main NFStay site */
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

/** Hostnames that are the main NFStay site (not white-label) */
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

  useEffect(() => {
    const hostname = window.location.hostname;

    // Main site — skip resolution
    if (isMainSite(hostname)) {
      setState({ operator: null, loading: false, isWhiteLabel: false });
      return;
    }

    // Could be a subdomain (sunset.nfstay.app) or custom domain (stays.company.com)
    const subdomain = extractSubdomain(hostname);

    async function resolveOperator() {
      try {
        let query;
        if (subdomain) {
          // Match by subdomain column
          query = supabase
            .from("nfs_operators")
            .select("*")
            .eq("subdomain", subdomain)
            .maybeSingle();
        } else {
          // Match by custom_domain column
          query = supabase
            .from("nfs_operators")
            .select("*")
            .eq("custom_domain", hostname)
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
