import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface IcalFeed {
  name: string;
  url: string;
  last_synced: string | null;
}

export interface IcalProperty {
  ical_token: string;
  ical_feeds: IcalFeed[];
}

/** Fetch ical_token and ical_feeds for a property */
export function useNfsIcalProperty(propertyId: string | null | undefined) {
  return useQuery({
    queryKey: ["nfs-ical-property", propertyId],
    queryFn: async (): Promise<IcalProperty | null> => {
      if (!SUPABASE_CONFIGURED || !propertyId) return null;
      const { data } = await supabase
        .from("nfs_properties")
        .select("ical_token, ical_feeds")
        .eq("id", propertyId)
        .maybeSingle();
      if (!data) return null;
      return {
        ical_token: data.ical_token as string,
        ical_feeds: (data.ical_feeds as IcalFeed[]) ?? [],
      };
    },
    enabled: !!propertyId,
    staleTime: 30_000,
  });
}

/** Save ical_feeds array back to the property */
export function useNfsIcalFeedsUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ propertyId, feeds }: { propertyId: string; feeds: IcalFeed[] }) => {
      if (!SUPABASE_CONFIGURED) throw new Error("Supabase not configured");
      const { error } = await supabase
        .from("nfs_properties")
        .update({ ical_feeds: feeds })
        .eq("id", propertyId);
      if (error) throw error;
    },
    onSuccess: (_data, { propertyId }) => {
      void queryClient.invalidateQueries({ queryKey: ["nfs-ical-property", propertyId] });
    },
  });
}

/** Trigger iCal sync for a property (calls edge function) */
export function useNfsIcalSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      if (!SUPABASE_CONFIGURED) throw new Error("Supabase not configured");
      const { data, error } = await supabase.functions.invoke("nfs-ical-sync", {
        body: { property_id: propertyId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { imported: number; errors: string[] };
    },
    onSuccess: (_data, propertyId) => {
      void queryClient.invalidateQueries({ queryKey: ["nfs-ical-property", propertyId] });
      void queryClient.invalidateQueries({ queryKey: ["nfs-blocked-dates"] });
      void queryClient.invalidateQueries({ queryKey: ["nfs-property-blocked-dates"] });
    },
  });
}

/** Build the export URL for a property */
export function buildIcalExportUrl(propertyId: string, icalToken: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/functions/v1/nfs-ical-export/${propertyId}.ics?token=${icalToken}`;
}
