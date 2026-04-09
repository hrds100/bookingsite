import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { provisionOperatorNfstaySubdomain } from "@/lib/provision-nfstay-subdomain";
import { useAuth } from "./useAuth";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface NfsOperator {
  id: string;
  profile_id: string;
  brand_name: string;
  legal_name: string | null;
  first_name: string | null;
  last_name: string | null;
  persona_type: string | null;
  subdomain: string | null;
  custom_domain: string | null;
  primary_domain_type: string | null;
  accent_color: string;
  logo_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  hero_photo: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  about_bio: string | null;
  about_photo: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_telegram: string | null;
  whatsapp_prefill_message: string | null;
  social_twitter: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  google_business_url: string | null;
  airbnb_url: string | null;
  google_analytics_id: string | null;
  meta_pixel_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  booking_mode: string | null;
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
        .select("id, profile_id, brand_name, legal_name, first_name, last_name, persona_type, subdomain, custom_domain, primary_domain_type, accent_color, logo_url, favicon_url, og_image_url, hero_photo, hero_headline, hero_subheadline, about_bio, about_photo, contact_email, contact_phone, contact_whatsapp, contact_telegram, whatsapp_prefill_message, social_twitter, social_instagram, social_facebook, social_tiktok, social_youtube, google_business_url, airbnb_url, google_analytics_id, meta_pixel_id, meta_title, meta_description, booking_mode, faqs, created_at")
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

      const { error } = await supabase
        .from("nfs_operators")
        .insert(row);

      if (error) throw error;
      return row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfs-operator"] });
      void provisionOperatorNfstaySubdomain();
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["nfs-operator"] });
      const sub = variables.subdomain;
      if (typeof sub === "string" && sub.length >= 3) {
        void provisionOperatorNfstaySubdomain();
      }
    },
  });
}

/** Delete a property by ID */
export function useNfsDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase
        .from("nfs_properties")
        .delete()
        .eq("id", propertyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfs-operator-properties"] });
    },
  });
}

/** Update listing_status of a property */
export function useNfsUpdatePropertyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, status }: { propertyId: string; status: "draft" | "listed" }) => {
      const { error } = await supabase
        .from("nfs_properties")
        .update({ listing_status: status })
        .eq("id", propertyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfs-operator-properties"] });
    },
  });
}

/** Minimal domain info needed by property cards to resolve redirect URLs */
export interface OperatorDomainInfo {
  brand_name: string;
  subdomain: string | null;
  custom_domain: string | null;
  primary_domain_type: string | null;
  logo_url: string | null;
}

/**
 * Fetch a map of { operatorId → OperatorDomainInfo } for all operators.
 * Used by property cards on nfstay.app to route traveler clicks to the
 * operator's own branded booking site when they have a subdomain or custom domain.
 */
export function useNfsOperatorDomains(): Record<string, OperatorDomainInfo> {
  const { data = {} } = useQuery({
    queryKey: ["nfs-operator-domains"],
    queryFn: async (): Promise<Record<string, OperatorDomainInfo>> => {
      if (!SUPABASE_CONFIGURED) return {};
      const { data, error } = await supabase
        .from("nfs_operators")
        .select("id, brand_name, subdomain, custom_domain, primary_domain_type, logo_url");
      if (error || !data) return {};
      return Object.fromEntries(
        data.map((op) => [
          op.id,
          {
            brand_name: op.brand_name as string,
            subdomain: op.subdomain as string | null,
            custom_domain: op.custom_domain as string | null,
            primary_domain_type: op.primary_domain_type as string | null,
            logo_url: op.logo_url as string | null,
          },
        ])
      );
    },
    staleTime: 5 * 60_000,
  });
  return data;
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
