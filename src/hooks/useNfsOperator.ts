import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface NfsOperator {
  id: string;
  profile_id: string;
  brand_name: string;
  subdomain: string | null;
  custom_domain: string | null;
  accent_color: string;
  logo_url: string | null;
  hero_photo: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  about_bio: string | null;
  about_photo: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  faqs: { question: string; answer: string }[];
  created_at: string;
}

/** Fetch current user's operator profile */
export function useNfsOperator() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["nfs-operator", user?.id],
    queryFn: async (): Promise<NfsOperator | null> => {
      if (!SUPABASE_CONFIGURED || !user) return null;

      const { data, error } = await supabase
        .from("nfs_operators")
        .select("*")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (error || !data) return null;
      return data as unknown as NfsOperator;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

/** Create a new operator profile (used during onboarding) */
export function useNfsOperatorCreate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (fields: {
      brand_name: string;
      subdomain: string;
      accent_color: string;
      contact_email?: string;
      contact_phone?: string;
    }) => {
      if (!SUPABASE_CONFIGURED || !user) throw new Error("Not configured");

      // Insert with only the columns we know exist (same as manual SQL insert for Sunset)
      const row: Record<string, unknown> = {
        profile_id: user.id,
        brand_name: fields.brand_name,
        subdomain: fields.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        accent_color: fields.accent_color,
      };
      // Only add optional fields if provided
      if (fields.contact_email) row.contact_email = fields.contact_email;
      if (fields.contact_phone) row.contact_phone = fields.contact_phone;

      const { data, error } = await supabase
        .from("nfs_operators")
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfs-operator"] });
    },
  });
}

/** Update operator profile */
export function useNfsOperatorUpdate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<NfsOperator>) => {
      if (!SUPABASE_CONFIGURED || !user) throw new Error("Not configured");

      const { data, error } = await supabase
        .from("nfs_operators")
        .update(updates)
        .eq("profile_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfs-operator"] });
    },
  });
}

/** Fetch operator's own properties */
export function useNfsOperatorProperties(operatorId?: string | null) {
  return useQuery({
    queryKey: ["nfs-operator-properties", operatorId],
    queryFn: async () => {
      if (!SUPABASE_CONFIGURED || !operatorId) return [];

      const { data, error } = await supabase
        .from("nfs_properties")
        .select("*")
        .eq("operator_id", operatorId)
        .order("created_at", { ascending: false });

      if (error) return [];
      return data;
    },
    enabled: !!operatorId,
    staleTime: 30_000,
  });
}
