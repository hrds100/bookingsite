import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mockReservations } from "@/data/mock-reservations";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const BLOCKING_STATUSES = ["confirmed", "pending", "completed"];

/**
 * Returns the set of property IDs that have a reservation overlapping
 * [checkIn, checkOut). Half-open interval — same-day turnover is allowed.
 * Returns an empty Set when either date is missing or invalid.
 */
export function useUnavailablePropertyIds(checkIn?: string | null, checkOut?: string | null) {
  const enabled = !!checkIn && !!checkOut && checkIn < checkOut;

  return useQuery({
    queryKey: ["nfs-unavailable-property-ids", checkIn, checkOut],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<Set<string>> => {
      if (!checkIn || !checkOut) return new Set();

      if (!SUPABASE_CONFIGURED) {
        return new Set(
          mockReservations
            .filter(r => BLOCKING_STATUSES.includes(r.status))
            .filter(r => r.check_in < checkOut && r.check_out > checkIn)
            .map(r => r.property_id)
        );
      }

      // Overlap test for half-open intervals: r.check_in < checkOut AND r.check_out > checkIn
      const { data, error } = await supabase
        .from("nfs_reservations")
        .select("property_id, status, check_in, check_out")
        .in("status", BLOCKING_STATUSES)
        .lt("check_in", checkOut)
        .gt("check_out", checkIn);

      if (error || !data) return new Set();
      return new Set(data.map(r => r.property_id as string));
    },
  });
}
