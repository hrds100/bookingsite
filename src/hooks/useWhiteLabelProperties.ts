import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mockProperties, type MockProperty } from "@/data/mock-properties";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Returns properties scoped to the current white-label operator.
 * On the main site, returns all listed properties (same as useNfsProperties).
 * On a white-label domain, returns only that operator's properties.
 */
export function useWhiteLabelProperties() {
  const { operator, isWhiteLabel } = useWhiteLabel();

  return useQuery({
    queryKey: ["nfs-properties", isWhiteLabel ? operator?.id : "all"],
    queryFn: async (): Promise<MockProperty[]> => {
      if (!SUPABASE_CONFIGURED) {
        // Mock fallback — filter by operator_id if white-label
        if (isWhiteLabel && operator) {
          return mockProperties.filter(
            (p) => p.listing_status === "listed" && p.operator_id === operator.id
          );
        }
        return mockProperties;
      }

      let query = supabase
        .from("nfs_properties")
        .select("*")
        .eq("listing_status", "listed")
        .order("created_at", { ascending: false });

      if (isWhiteLabel && operator) {
        query = query.eq("operator_id", operator.id);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        // Fall back to mock data, filtered if white-label
        if (isWhiteLabel && operator) {
          return mockProperties.filter(
            (p) => p.listing_status === "listed" && p.operator_id === operator.id
          );
        }
        return mockProperties;
      }

      return data as unknown as MockProperty[];
    },
    staleTime: 60_000,
  });
}

/**
 * Filter mock properties for white-label search (client-side).
 * Used by NfsSearchPage which does client-side filtering.
 */
export function useWhiteLabelMockProperties(): MockProperty[] {
  const { operator, isWhiteLabel } = useWhiteLabel();

  return useMemo(() => {
    if (isWhiteLabel && operator) {
      return mockProperties.filter((p) => p.operator_id === operator.id);
    }
    return mockProperties;
  }, [operator, isWhiteLabel]);
}
