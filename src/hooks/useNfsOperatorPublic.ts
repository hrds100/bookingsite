import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface OperatorPublicInfo {
  id: string;
  brand_name: string;
  first_name: string | null;
  about_bio: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  accept_cash_booking: boolean;
  created_at: string;
}

const mockOperatorPublic: OperatorPublicInfo = {
  id: "op-001",
  brand_name: "Sunset Properties Ltd",
  first_name: "James",
  about_bio: "We're a family-run property management company with over 10 years of hospitality experience. Our goal is to make every guest feel at home.",
  contact_whatsapp: "+447700900000",
  contact_email: "hello@sunsetproperties.com",
  accept_cash_booking: false,
  created_at: "2024-06-15T00:00:00Z",
};

/** Fetch public operator info by operator ID (for property detail page) */
export function useNfsOperatorPublic(operatorId: string | undefined) {
  return useQuery({
    queryKey: ["nfs-operator-public", operatorId],
    queryFn: async (): Promise<OperatorPublicInfo | null> => {
      if (!operatorId) return null;

      // Mock data fallback for mock properties
      if (operatorId.startsWith("op-")) {
        return mockOperatorPublic;
      }

      if (!SUPABASE_CONFIGURED) {
        return mockOperatorPublic;
      }

      const { data, error } = await supabase
        .from("nfs_operators")
        .select("id, brand_name, first_name, about_bio, contact_whatsapp, contact_email, accept_cash_booking, created_at")
        .eq("id", operatorId)
        .maybeSingle();

      if (error || !data) {
        return mockOperatorPublic;
      }

      return data as unknown as OperatorPublicInfo;
    },
    enabled: !!operatorId,
    staleTime: 120_000,
  });
}
