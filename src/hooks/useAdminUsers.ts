import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mockUsers } from "@/data/mock-admin";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const ADMIN_EMAILS = ["admin@hub.nfstay.com", "hugo@nfstay.com"];

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: "traveler" | "operator" | "admin";
  created_at: string;
  last_sign_in: string | null;
  avatar_url: string | null;
}

function mockFallback(): AdminUser[] {
  return mockUsers.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    created_at: u.created_at,
    last_sign_in: u.last_sign_in || null,
    avatar_url: u.avatar_url || null,
  }));
}

/** Fetch all users for admin view — falls back to mock */
export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUser[]> => {
      if (!SUPABASE_CONFIGURED) return mockFallback();

      const [profilesResult, operatorsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("nfs_operators")
          .select("profile_id"),
      ]);

      if (
        profilesResult.error ||
        !profilesResult.data ||
        profilesResult.data.length === 0
      ) {
        return mockFallback();
      }

      const operatorProfileIds = new Set(
        (operatorsResult.data ?? []).map(
          (o: Record<string, unknown>) => o.profile_id as string
        )
      );

      return profilesResult.data.map((p: Record<string, unknown>) => {
        const email = (p.email as string) ?? "";
        let role: AdminUser["role"] = "traveler";
        if (ADMIN_EMAILS.includes(email.toLowerCase())) {
          role = "admin";
        } else if (operatorProfileIds.has(p.id as string)) {
          role = "operator";
        }

        return {
          id: p.id as string,
          email,
          full_name: (p.full_name as string) ?? email.split("@")[0] ?? "Unknown",
          role,
          created_at: (p.created_at as string) ?? "",
          last_sign_in: (p.updated_at as string) ?? null,
          avatar_url: (p.avatar_url as string) ?? null,
        };
      });
    },
    staleTime: 30_000,
  });
}
