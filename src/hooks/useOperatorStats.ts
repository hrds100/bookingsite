import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mockMonthlyRevenue, mockOccupancyData } from "@/data/mock-operator";
import { differenceInDays, parseISO } from "date-fns";

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface MonthlyOccupancy {
  month: string;
  rate: number;
}

/** Fetch operator's monthly revenue from real reservations */
export function useOperatorMonthlyRevenue(operatorId: string | null) {
  return useQuery({
    queryKey: ["operator-monthly-revenue", operatorId],
    enabled: !!operatorId,
    queryFn: async (): Promise<MonthlyRevenue[]> => {
      if (!operatorId) return mockMonthlyRevenue;

      try {
        // Get operator's property IDs first
        const { data: props } = await (supabase.from("nfs_properties") as any)
          .select("id")
          .eq("operator_id", operatorId);

        if (!props || props.length === 0) return mockMonthlyRevenue;

        const propIds = props.map((p: { id: string }) => p.id);

        // Get reservations for those properties
        const { data: reservations, error } = await (supabase.from("nfs_reservations") as any)
          .select("created_at, total_amount")
          .in("property_id", propIds)
          .order("created_at", { ascending: true });

        if (error || !reservations || reservations.length === 0) return mockMonthlyRevenue;

        // Group by month
        const grouped = new Map<string, number>();
        for (const r of reservations) {
          const date = new Date(r.created_at);
          const key = date.toLocaleString("en-US", { month: "short" });
          grouped.set(key, (grouped.get(key) ?? 0) + (r.total_amount || 0));
        }

        const result = Array.from(grouped.entries())
          .map(([month, revenue]) => ({ month, revenue: Math.round(revenue) }))
          .slice(-6);

        return result.length > 0 ? result : mockMonthlyRevenue;
      } catch {
        return mockMonthlyRevenue;
      }
    },
    staleTime: 60_000,
  });
}

/** Estimate operator's monthly occupancy from reservations */
export function useOperatorOccupancy(operatorId: string | null) {
  return useQuery({
    queryKey: ["operator-occupancy", operatorId],
    enabled: !!operatorId,
    queryFn: async (): Promise<MonthlyOccupancy[]> => {
      if (!operatorId) return mockOccupancyData;

      try {
        const { data: props } = await (supabase.from("nfs_properties") as any)
          .select("id")
          .eq("operator_id", operatorId);

        if (!props || props.length === 0) return mockOccupancyData;

        const propIds = props.map((p: { id: string }) => p.id);
        const propCount = propIds.length;

        const { data: reservations, error } = await (supabase.from("nfs_reservations") as any)
          .select("check_in, check_out, created_at")
          .in("property_id", propIds)
          .not("status", "eq", "cancelled");

        if (error || !reservations || reservations.length === 0) return mockOccupancyData;

        // Group booked nights by month
        const grouped = new Map<string, number>();
        for (const r of reservations) {
          const nights = differenceInDays(parseISO(r.check_out), parseISO(r.check_in));
          const date = new Date(r.check_in);
          const key = date.toLocaleString("en-US", { month: "short" });
          grouped.set(key, (grouped.get(key) ?? 0) + nights);
        }

        // Occupancy rate = booked nights / (properties * 30 days) * 100
        const result = Array.from(grouped.entries())
          .map(([month, bookedNights]) => ({
            month,
            rate: Math.min(100, Math.round((bookedNights / (propCount * 30)) * 100)),
          }))
          .slice(-6);

        return result.length > 0 ? result : mockOccupancyData;
      } catch {
        return mockOccupancyData;
      }
    },
    staleTime: 60_000,
  });
}

/** Calculate operator's total revenue from reservations */
export function useOperatorTotalRevenue(operatorId: string | null) {
  return useQuery({
    queryKey: ["operator-total-revenue", operatorId],
    enabled: !!operatorId,
    queryFn: async (): Promise<number> => {
      if (!operatorId) return 0;

      try {
        const { data: props } = await (supabase.from("nfs_properties") as any)
          .select("id")
          .eq("operator_id", operatorId);

        if (!props || props.length === 0) return 0;

        const propIds = props.map((p: { id: string }) => p.id);

        const { data: reservations } = await (supabase.from("nfs_reservations") as any)
          .select("total_amount")
          .in("property_id", propIds)
          .not("status", "eq", "cancelled");

        if (!reservations) return 0;

        return reservations.reduce((sum: number, r: { total_amount: number }) => sum + (r.total_amount || 0), 0);
      } catch {
        return 0;
      }
    },
    staleTime: 60_000,
  });
}
