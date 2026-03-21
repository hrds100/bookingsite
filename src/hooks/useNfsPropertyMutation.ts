import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export interface PropertyFields {
  public_title: string;
  property_type: string;
  rental_type: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  lat: number | null;
  lng: number | null;
  max_guests: number;
  room_counts: { bedrooms: number; beds: number; bathrooms: number };
  base_rate_amount: number;
  base_rate_currency: string;
  cleaning_fee: { enabled: boolean; amount: number };
  minimum_stay: number;
  cancellation_policy: string;
  amenities: Record<string, boolean>;
  images: { url: string; caption: string; order: number }[];
  listing_status?: string;
  check_in_time?: string;
  check_out_time?: string;
  rules?: string;
}

/** Insert a new property into nfs_properties */
export function useNfsPropertyCreate() {
  const queryClient = useQueryClient();
  const { operatorId } = useAuth();

  return useMutation({
    mutationFn: async (fields: PropertyFields) => {
      if (!operatorId) throw new Error("Operator not found. Please complete operator onboarding first.");

      const row = {
        operator_id: operatorId,
        public_title: fields.public_title,
        property_type: fields.property_type,
        rental_type: fields.rental_type,
        description: fields.description,
        address: fields.address,
        city: fields.city,
        state: fields.state,
        country: fields.country,
        postal_code: fields.postal_code,
        lat: fields.lat,
        lng: fields.lng,
        max_guests: fields.max_guests,
        room_counts: fields.room_counts,
        base_rate_amount: fields.base_rate_amount,
        base_rate_currency: fields.base_rate_currency,
        cleaning_fee: fields.cleaning_fee,
        minimum_stay: fields.minimum_stay,
        cancellation_policy: fields.cancellation_policy,
        amenities: fields.amenities,
        images: fields.images,
        listing_status: fields.listing_status || "listed",
        status: "completed",
        check_in_time: fields.check_in_time || null,
        check_out_time: fields.check_out_time || null,
        rules: fields.rules || null,
      };

      const { data, error } = await (supabase.from("nfs_properties") as any)
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfs-operator-properties"] });
    },
  });
}

/** Update an existing property by ID */
export function useNfsPropertyUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<PropertyFields> }) => {
      const updates: Record<string, unknown> = {
        ...fields,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await (supabase.from("nfs_properties") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfs-operator-properties"] });
    },
  });
}

/** Delete a property by ID */
export function useNfsPropertyDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("nfs_properties") as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfs-operator-properties"] });
    },
  });
}
