import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface BlockedDate {
  id: string;
  property_id: string;
  date: string; // "YYYY-MM-DD"
  created_at: string;
}

/** Fetch all blocked dates for a set of property IDs */
export function useNfsBlockedDates(propertyIds: string[]) {
  return useQuery({
    queryKey: ["nfs-blocked-dates", propertyIds.slice().sort().join(",")],
    queryFn: async (): Promise<BlockedDate[]> => {
      if (!SUPABASE_CONFIGURED || propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from("nfs_blocked_dates")
        .select("*")
        .in("property_id", propertyIds)
        .order("date", { ascending: true });
      if (error || !data) return [];
      return data as BlockedDate[];
    },
    enabled: propertyIds.length > 0,
    staleTime: 30_000,
  });
}

/** Fetch blocked date strings ("YYYY-MM-DD") for a single property */
export function useNfsPropertyBlockedDatesList(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["nfs-blocked-dates-property", propertyId],
    queryFn: async (): Promise<string[]> => {
      if (!SUPABASE_CONFIGURED || !propertyId) return [];
      const { data, error } = await supabase
        .from("nfs_blocked_dates")
        .select("date")
        .eq("property_id", propertyId)
        .order("date", { ascending: true });
      if (error || !data) return [];
      return data.map((r: { date: string }) => r.date);
    },
    enabled: !!propertyId,
    staleTime: 30_000,
  });
}

/** Toggle a single date blocked/unblocked */
export function useNfsToggleBlockedDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      propertyId,
      date,
      block,
    }: {
      propertyId: string;
      date: string;
      block: boolean;
    }) => {
      if (block) {
        const { error } = await supabase
          .from("nfs_blocked_dates")
          .upsert({ property_id: propertyId, date }, { onConflict: "property_id,date" });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("nfs_blocked_dates")
          .delete()
          .eq("property_id", propertyId)
          .eq("date", date);
        if (error) throw new Error(error.message);
      }
      return { propertyId, date, block };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["nfs-blocked-dates"] });
      queryClient.invalidateQueries({ queryKey: ["nfs-blocked-dates-property", variables.propertyId] });
      queryClient.invalidateQueries({ queryKey: ["nfs-property-blocked-dates", variables.propertyId] });
    },
  });
}

/** Bulk insert or delete a list of dates for a property */
export function useNfsBlockDateRange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      propertyId,
      dates,
      block,
    }: {
      propertyId: string;
      dates: string[];
      block: boolean;
    }) => {
      if (dates.length === 0) return;
      if (block) {
        const rows = dates.map((date) => ({ property_id: propertyId, date }));
        const { error } = await supabase
          .from("nfs_blocked_dates")
          .upsert(rows, { onConflict: "property_id,date" });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("nfs_blocked_dates")
          .delete()
          .eq("property_id", propertyId)
          .in("date", dates);
        if (error) throw new Error(error.message);
      }
      return { propertyId, dates, block };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["nfs-blocked-dates"] });
      queryClient.invalidateQueries({ queryKey: ["nfs-blocked-dates-property", variables.propertyId] });
      queryClient.invalidateQueries({ queryKey: ["nfs-property-blocked-dates", variables.propertyId] });
    },
  });
}
