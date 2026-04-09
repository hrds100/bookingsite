import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mockReservations, type MockReservation, updateMockReservationStatus, getReservationProperty } from "@/data/mock-reservations";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Property info returned from the join */
export interface ReservationPropertyJoin {
  public_title?: string;
  images?: { url: string }[] | null;
  city?: string;
  country?: string;
  operator_id?: string;
  nfs_operators?: { contact_email?: string } | null;
}

/** Reservation with optional joined property data */
export type ReservationWithProperty = MockReservation & {
  nfs_properties?: ReservationPropertyJoin | null;
};

/** Fetch reservations for current user (traveler) */
export function useNfsReservations(guestEmail?: string) {
  return useQuery({
    queryKey: ["nfs-reservations", guestEmail],
    queryFn: async (): Promise<ReservationWithProperty[]> => {
      if (!SUPABASE_CONFIGURED || !guestEmail) return [];

      const { data, error } = await supabase
        .from("nfs_reservations")
        .select("*, nfs_properties(public_title, images, city, country)")
        .eq("guest_email", guestEmail)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data as unknown as ReservationWithProperty[];
    },
    staleTime: 30_000,
  });
}

/** Fetch reservations for an operator — all reservations for their properties */
export function useNfsOperatorReservations(operatorId?: string | null) {
  return useQuery({
    queryKey: ["nfs-operator-reservations", operatorId],
    queryFn: async (): Promise<ReservationWithProperty[]> => {
      if (!SUPABASE_CONFIGURED || !operatorId) return [];

      const { data, error } = await supabase
        .from("nfs_reservations")
        .select("*, nfs_properties!inner(operator_id, public_title, city, country, images)")
        .eq("nfs_properties.operator_id", operatorId)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data as unknown as ReservationWithProperty[];
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

/** Fetch single reservation by ID with joined property data */
export function useNfsReservationWithProperty(id: string | undefined) {
  return useQuery({
    queryKey: ["nfs-reservation-with-property", id],
    queryFn: async (): Promise<ReservationWithProperty | null> => {
      if (!id) return null;

      if (id.startsWith("res-")) {
        const mock = mockReservations.find(r => r.id === id);
        if (!mock) return null;
        const propInfo = getReservationProperty(mock);
        return {
          ...mock,
          nfs_properties: {
            public_title: propInfo.title,
            images: propInfo.image ? [{ url: propInfo.image }] : null,
            city: propInfo.city,
            country: propInfo.country,
          },
        };
      }

      if (!SUPABASE_CONFIGURED) {
        const mock = mockReservations.find(r => r.id === id);
        if (!mock) return null;
        const propInfo = getReservationProperty(mock);
        return {
          ...mock,
          nfs_properties: {
            public_title: propInfo.title,
            images: propInfo.image ? [{ url: propInfo.image }] : null,
            city: propInfo.city,
            country: propInfo.country,
          },
        };
      }

      const { data, error } = await supabase
        .from("nfs_reservations")
        .select("*, nfs_properties(public_title, images, city, country, operator_id, nfs_operators(contact_email))")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        const mock = mockReservations.find(r => r.id === id);
        if (!mock) return null;
        const propInfo = getReservationProperty(mock);
        return {
          ...mock,
          nfs_properties: {
            public_title: propInfo.title,
            images: propInfo.image ? [{ url: propInfo.image }] : null,
            city: propInfo.city,
            country: propInfo.country,
          },
        };
      }

      return data as unknown as ReservationWithProperty;
    },
    enabled: !!id,
  });
}

/** Fetch confirmed/blocked date ranges for a property (used by booking calendar) */
export function useNfsPropertyBlockedDates(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["nfs-property-blocked-dates", propertyId],
    queryFn: async (): Promise<{ from: Date; to: Date }[]> => {
      if (!propertyId || !SUPABASE_CONFIGURED) return [];

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nfs-property-availability?property_id=${propertyId}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.ranges ?? []).map((r: { from: string; to: string }) => ({
        from: new Date(r.from),
        to: new Date(r.to),
      }));
    },
    enabled: !!propertyId,
    staleTime: 60_000,
  });
}

/** Update reservation status (confirm / cancel) */
export function useNfsUpdateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, payment_status }: { id: string; status: string; payment_status?: string }) => {
      // Mock reservation — update in-memory
      if (id.startsWith("res-")) {
        updateMockReservationStatus(id, status);
        return { id, status };
      }

      if (!SUPABASE_CONFIGURED) {
        updateMockReservationStatus(id, status);
        return { id, status };
      }

      const patch: Record<string, string> = { status };
      if (payment_status) patch.payment_status = payment_status;

      const { error } = await supabase
        .from("nfs_reservations")
        .update(patch)
        .eq("id", id);

      if (error) throw new Error(error.message);
      return { id, status };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["nfs-reservation", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["nfs-operator-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["nfs-reservations"] });
    },
  });
}
