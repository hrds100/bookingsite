import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

interface UpdateReservationParams {
  id: string;
  status: string;
}

/**
 * Mutation hook to update a reservation's status (confirm, cancel, etc.)
 * Falls back gracefully when Supabase is not configured — returns success for mock IDs.
 */
export function useNfsUpdateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: UpdateReservationParams) => {
      // Mock reservations (res-*) — simulate success without hitting DB
      if (id.startsWith("res-") || !SUPABASE_CONFIGURED) {
        return { id, status };
      }

      const { data, error } = await supabase
        .from("nfs_reservations")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfs-reservation"] });
      queryClient.invalidateQueries({ queryKey: ["nfs-operator-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["nfs-reservations"] });
    },
  });
}
