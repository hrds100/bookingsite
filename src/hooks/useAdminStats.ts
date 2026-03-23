import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mockPlatformStats, mockPlatformRevenue } from "@/data/mock-admin";

interface PlatformStats {
  totalUsers: number;
  totalOperators: number;
  totalProperties: number;
  totalBookings: number;
  totalRevenue: number;
  pendingApprovals: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  bookings: number;
}

/** Fetch real platform-wide stats from Supabase */
export function useAdminPlatformStats() {
  return useQuery({
    queryKey: ["admin-platform-stats"],
    queryFn: async (): Promise<PlatformStats> => {
      try {
        const [usersRes, operatorsRes, propertiesRes, reservationsRes, pendingRes] = await Promise.all([
          (supabase.from("profiles") as any).select("id", { count: "exact", head: true }),
          (supabase.from("nfs_operators") as any).select("id", { count: "exact", head: true }),
          (supabase.from("nfs_properties") as any).select("id", { count: "exact", head: true }).eq("listing_status", "listed"),
          (supabase.from("nfs_reservations") as any).select("total_amount"),
          (supabase.from("nfs_operators") as any).select("id", { count: "exact", head: true }).eq("onboarding_completed", false),
        ]);

        const totalRevenue = (reservationsRes.data ?? []).reduce(
          (sum: number, r: { total_amount: number }) => sum + (r.total_amount || 0),
          0
        );

        return {
          totalUsers: usersRes.count ?? 0,
          totalOperators: operatorsRes.count ?? 0,
          totalProperties: propertiesRes.count ?? 0,
          totalBookings: reservationsRes.data?.length ?? 0,
          totalRevenue,
          pendingApprovals: pendingRes.count ?? 0,
        };
      } catch {
        return mockPlatformStats;
      }
    },
    staleTime: 60_000,
  });
}

/** Fetch real monthly revenue + booking counts from Supabase */
export function useAdminMonthlyData() {
  return useQuery({
    queryKey: ["admin-monthly-data"],
    queryFn: async (): Promise<MonthlyData[]> => {
      try {
        const { data, error } = await (supabase.from("nfs_reservations") as any)
          .select("created_at, total_amount")
          .order("created_at", { ascending: true });

        if (error || !data || data.length === 0) return mockPlatformRevenue;

        // Group by month
        const grouped = new Map<string, { revenue: number; bookings: number }>();
        for (const r of data) {
          const date = new Date(r.created_at);
          const key = date.toLocaleString("en-US", { month: "short", year: "2-digit" });
          const existing = grouped.get(key) ?? { revenue: 0, bookings: 0 };
          existing.revenue += r.total_amount || 0;
          existing.bookings += 1;
          grouped.set(key, existing);
        }

        // Take last 9 months
        const result = Array.from(grouped.entries())
          .map(([month, d]) => ({ month, ...d }))
          .slice(-9);

        return result.length > 0 ? result : mockPlatformRevenue;
      } catch {
        return mockPlatformRevenue;
      }
    },
    staleTime: 60_000,
  });
}
