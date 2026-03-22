import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mockOperatorApplications } from "@/data/mock-admin";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface AdminOperator {
  id: string;
  brand_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  property_count: number;
}

function mockFallback(): AdminOperator[] {
  return mockOperatorApplications.map((a) => ({
    id: a.id,
    brand_name: a.business_name,
    contact_email: a.contact_email,
    contact_phone: a.contact_phone,
    logo_url: null,
    onboarding_completed: a.status === "approved",
    created_at: a.applied_at,
    property_count: a.property_count,
  }));
}

/** Fetch all operators for admin view — falls back to mock */
export function useAdminOperators() {
  return useQuery({
    queryKey: ["admin-operators"],
    queryFn: async (): Promise<AdminOperator[]> => {
      if (!SUPABASE_CONFIGURED) return mockFallback();

      const { data, error } = await supabase
        .from("nfs_operators")
        .select("*, nfs_properties(id)")
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        return mockFallback();
      }

      return data.map((item: Record<string, unknown>) => ({
        id: item.id as string,
        brand_name: (item.brand_name as string) ?? "Unnamed",
        contact_email: (item.contact_email as string) ?? null,
        contact_phone: (item.contact_phone as string) ?? null,
        logo_url: (item.logo_url as string) ?? null,
        onboarding_completed: (item.onboarding_completed as boolean) ?? false,
        created_at: (item.created_at as string) ?? "",
        property_count: Array.isArray(item.nfs_properties)
          ? (item.nfs_properties as unknown[]).length
          : 0,
      }));
    },
    staleTime: 30_000,
  });
}
