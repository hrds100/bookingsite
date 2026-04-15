import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const SUPABASE_CONFIGURED =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface DateOverride {
  id: string;
  property_id: string;
  date: string; // "YYYY-MM-DD"
  custom_price: number | null;
  min_stay: number | null;
}

/* ── query keys ── */
const KEY_SINGLE  = (pid: string | undefined) => ["nfs-date-overrides-property", pid];
const KEY_MULTI   = (ids: string)             => ["nfs-date-overrides", ids];

/** Fetch overrides for a single property */
export function useNfsPropertyDateOverrides(propertyId: string | undefined) {
  return useQuery({
    queryKey: KEY_SINGLE(propertyId),
    queryFn: async (): Promise<DateOverride[]> => {
      if (!SUPABASE_CONFIGURED || !propertyId) return [];
      const { data, error } = await supabase
        .from("nfs_property_date_overrides")
        .select("*")
        .eq("property_id", propertyId)
        .order("date", { ascending: true });
      if (error || !data) return [];
      return data as DateOverride[];
    },
    enabled: !!propertyId,
    staleTime: 30_000,
  });
}

/** Fetch overrides for multiple properties (multi-calendar) */
export function useNfsDateOverrides(propertyIds: string[]) {
  const sortedKey = propertyIds.slice().sort().join(",");
  return useQuery({
    queryKey: KEY_MULTI(sortedKey),
    queryFn: async (): Promise<DateOverride[]> => {
      if (!SUPABASE_CONFIGURED || propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from("nfs_property_date_overrides")
        .select("*")
        .in("property_id", propertyIds)
        .order("date", { ascending: true });
      if (error || !data) return [];
      return data as DateOverride[];
    },
    enabled: propertyIds.length > 0,
    staleTime: 30_000,
  });
}

/** Upsert custom_price and/or min_stay for a list of dates */
export function useNfsUpsertDateOverrides() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      propertyId,
      dates,
      custom_price,
      min_stay,
    }: {
      propertyId: string;
      dates: string[];
      custom_price?: number | null;
      min_stay?: number | null;
    }) => {
      if (!dates.length) return;
      // Build rows — preserve existing fields by upserting only provided columns
      const rows = dates.map((date) => ({
        property_id:  propertyId,
        date,
        ...(custom_price !== undefined ? { custom_price } : {}),
        ...(min_stay     !== undefined ? { min_stay     } : {}),
      }));
      const { error } = await supabase
        .from("nfs_property_date_overrides")
        .upsert(rows, { onConflict: "property_id,date" });
      if (error) throw new Error(error.message);
      return { propertyId, dates };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: KEY_SINGLE(variables.propertyId) });
      queryClient.invalidateQueries({ queryKey: ["nfs-date-overrides"] });
    },
  });
}

/** Clear custom_price or min_stay (set to null) for a list of dates.
 *  If both fields become null, the row is deleted. */
export function useNfsClearDateOverrides() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      propertyId,
      dates,
      field,
    }: {
      propertyId: string;
      dates: string[];
      field: "custom_price" | "min_stay" | "all";
    }) => {
      if (!dates.length) return;
      if (field === "all") {
        const { error } = await supabase
          .from("nfs_property_date_overrides")
          .delete()
          .eq("property_id", propertyId)
          .in("date", dates);
        if (error) throw new Error(error.message);
      } else {
        // Null-out the field; the row stays (other field may still be set)
        const update: Record<string, null> = { [field]: null };
        const { error } = await supabase
          .from("nfs_property_date_overrides")
          .update(update)
          .eq("property_id", propertyId)
          .in("date", dates);
        if (error) throw new Error(error.message);
        // Clean up rows where both fields are null
        await supabase
          .from("nfs_property_date_overrides")
          .delete()
          .eq("property_id", propertyId)
          .in("date", dates)
          .is("custom_price", null)
          .is("min_stay",     null);
      }
      return { propertyId, dates, field };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: KEY_SINGLE(variables.propertyId) });
      queryClient.invalidateQueries({ queryKey: ["nfs-date-overrides"] });
    },
  });
}
