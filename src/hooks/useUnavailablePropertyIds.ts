import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mockReservations } from "@/data/mock-reservations";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const BLOCKING_STATUSES = ["confirmed", "pending", "completed"];

/**
 * Returns the set of property IDs that are unavailable for the requested
 * [checkIn, checkOut) range. Half-open interval — same-day turnover is allowed.
 *
 * A property is considered unavailable if EITHER:
 *  - there's an overlapping reservation in nfs_reservations
 *    (status: confirmed/pending/completed), OR
 *  - there's any row in nfs_blocked_dates with date in [checkIn, checkOut)
 *    (covers iCal-synced blocks from Airbnb/Hospitable/etc).
 *
 * Returns an empty Set when either date is missing or the range is invalid.
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

      const unavailable = new Set<string>();

      // 1. Reservations made via this booking system
      // Overlap test for half-open intervals: r.check_in < checkOut AND r.check_out > checkIn
      const { data: reservations } = await supabase
        .from("nfs_reservations")
        .select("property_id")
        .in("status", BLOCKING_STATUSES)
        .lt("check_in", checkOut)
        .gt("check_out", checkIn);

      reservations?.forEach(r => {
        if (r.property_id) unavailable.add(r.property_id as string);
      });

      // 2. Blocked dates (iCal imports + manual operator blocks)
      // nfs_blocked_dates stores one row per blocked night, so any date in
      // [checkIn, checkOut) means at least one night of the stay is unavailable.
      const { data: blocked } = await supabase
        .from("nfs_blocked_dates")
        .select("property_id")
        .gte("date", checkIn)
        .lt("date", checkOut);

      blocked?.forEach(b => {
        if (b.property_id) unavailable.add(b.property_id as string);
      });

      return unavailable;
    },
  });
}
