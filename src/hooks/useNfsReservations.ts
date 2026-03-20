import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mockReservations, type MockReservation } from "@/data/mock-reservations";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Fetch reservations for current user (traveler) — falls back to mock */
export function useNfsReservations(guestEmail?: string) {
  return useQuery({
    queryKey: ["nfs-reservations", guestEmail],
    queryFn: async (): Promise<MockReservation[]> => {
      if (!SUPABASE_CONFIGURED) return mockReservations;

      if (!guestEmail) return mockReservations;

      const { data, error } = await supabase
        .from("nfs_reservations")
        .select("*")
        .eq("guest_email", guestEmail)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        return mockReservations;
      }

      return data as unknown as MockReservation[];
    },
    staleTime: 30_000,
  });
}

/** Fetch reservations for an operator — all reservations for their properties */
export function useNfsOperatorReservations(operatorId?: string | null) {
  return useQuery({
    queryKey: ["nfs-operator-reservations", operatorId],
    queryFn: async (): Promise<MockReservation[]> => {
      if (!SUPABASE_CONFIGURED || !operatorId) return mockReservations;

      const { data, error } = await supabase
        .from("nfs_reservations")
        .select("*, nfs_properties!inner(operator_id)")
        .eq("nfs_properties.operator_id", operatorId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        return mockReservations;
      }

      return data as unknown as MockReservation[];
    },
    enabled: !!operatorId,
    staleTime: 30_000,
  });
}

/** Fetch single reservation by ID */
export function useNfsReservation(id: string | undefined) {
  return useQuery({
    queryKey: ["nfs-reservation", id],
    queryFn: async (): Promise<MockReservation | null> => {
      if (!id) return null;

      if (id.startsWith("res-")) {
        return mockReservations.find(r => r.id === id) ?? null;
      }

      if (!SUPABASE_CONFIGURED) {
        return mockReservations.find(r => r.id === id) ?? null;
      }

      const { data, error } = await supabase
        .from("nfs_reservations")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        return mockReservations.find(r => r.id === id) ?? null;
      }

      return data as unknown as MockReservation;
    },
    enabled: !!id,
  });
}
