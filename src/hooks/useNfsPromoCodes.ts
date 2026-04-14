import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNfsOperator } from "./useNfsOperator";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface NfsPromoCode {
  id: string;
  operator_id: string;
  name: string | null;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

export interface PromoCodeInput {
  name?: string;
  code: string;
  discount_percent: number;
  max_uses?: number | null;
  expires_at?: string | null;
}

export function useNfsPromoCodes() {
  const { data: operator } = useNfsOperator();
  const operatorId = operator?.id;

  return useQuery({
    queryKey: ["nfs-promo-codes", operatorId],
    queryFn: async (): Promise<NfsPromoCode[]> => {
      if (!SUPABASE_CONFIGURED || !operatorId) return [];
      const { data, error } = await supabase
        .from("nfs_promo_codes")
        .select("id, operator_id, name, code, discount_percent, max_uses, current_uses, expires_at, active, created_at")
        .eq("operator_id", operatorId)
        .order("created_at", { ascending: false });
      if (error || !data) return [];
      return data as NfsPromoCode[];
    },
    enabled: !!operatorId,
    staleTime: 30_000,
  });
}

export function useNfsPromoCodeCreate() {
  const queryClient = useQueryClient();
  const { data: operator } = useNfsOperator();

  return useMutation({
    mutationFn: async (input: PromoCodeInput) => {
      if (!SUPABASE_CONFIGURED || !operator) throw new Error("Not configured");
      const { error } = await supabase.from("nfs_promo_codes").insert({
        operator_id: operator.id,
        name: input.name ?? null,
        code: input.code.toUpperCase().trim(),
        discount_percent: input.discount_percent,
        max_uses: input.max_uses ?? null,
        expires_at: input.expires_at ?? null,
        active: true,
        current_uses: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nfs-promo-codes"] });
    },
  });
}

export function useNfsPromoCodeToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!SUPABASE_CONFIGURED) throw new Error("Not configured");
      const { error } = await supabase
        .from("nfs_promo_codes")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nfs-promo-codes"] });
    },
  });
}

export function useNfsPromoCodeDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_CONFIGURED) throw new Error("Not configured");
      const { error } = await supabase
        .from("nfs_promo_codes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nfs-promo-codes"] });
    },
  });
}
