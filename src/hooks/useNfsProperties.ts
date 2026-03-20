import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mockProperties, type MockProperty } from "@/data/mock-properties";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Fetch all listed properties — falls back to mock data if Supabase not configured */
export function useNfsProperties() {
  return useQuery({
    queryKey: ["nfs-properties"],
    queryFn: async (): Promise<MockProperty[]> => {
      if (!SUPABASE_CONFIGURED) return mockProperties;

      const { data, error } = await supabase
        .from("nfs_properties")
        .select("*")
        .eq("listing_status", "listed")
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        // Fall back to mock data if no real properties exist yet
        return mockProperties;
      }

      return data as unknown as MockProperty[];
    },
    staleTime: 60_000,
  });
}

/** Fetch single property by ID — checks Supabase first, falls back to mock */
export function useNfsProperty(id: string | undefined) {
  return useQuery({
    queryKey: ["nfs-property", id],
    queryFn: async (): Promise<MockProperty | null> => {
      if (!id) return null;

      // If ID is a mock ID (prop-001 etc), use mock data directly
      if (id.startsWith("prop-")) {
        return mockProperties.find(p => p.id === id) ?? null;
      }

      if (!SUPABASE_CONFIGURED) {
        return mockProperties.find(p => p.id === id) ?? null;
      }

      const { data, error } = await supabase
        .from("nfs_properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        // Fall back to mock
        return mockProperties.find(p => p.id === id) ?? null;
      }

      return data as unknown as MockProperty;
    },
    enabled: !!id,
  });
}

/** Search properties with filters */
export function useNfsPropertySearch(filters: {
  query?: string;
  type?: string;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  sortBy?: string;
}) {
  return useQuery({
    queryKey: ["nfs-property-search", filters],
    queryFn: async (): Promise<MockProperty[]> => {
      // For now, always use mock data for search (Supabase full-text search requires setup)
      let props = mockProperties.filter(p => p.listing_status === "listed");

      if (filters.query) {
        const q = filters.query.toLowerCase();
        props = props.filter(p =>
          p.city.toLowerCase().includes(q) ||
          p.country.toLowerCase().includes(q) ||
          p.public_title.toLowerCase().includes(q)
        );
      }

      if (filters.type && filters.type !== "All") {
        const typeName = filters.type.toLowerCase();
        props = props.filter(p => p.property_type.toLowerCase().includes(typeName));
      }

      if (filters.priceMin) props = props.filter(p => p.base_rate_amount >= filters.priceMin!);
      if (filters.priceMax) props = props.filter(p => p.base_rate_amount <= filters.priceMax!);
      if (filters.bedrooms && filters.bedrooms > 0) {
        props = props.filter(p => p.room_counts.bedrooms >= filters.bedrooms!);
      }

      if (filters.sortBy === "price-asc") props.sort((a, b) => a.base_rate_amount - b.base_rate_amount);
      else if (filters.sortBy === "price-desc") props.sort((a, b) => b.base_rate_amount - a.base_rate_amount);
      else if (filters.sortBy === "newest") props.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return props;
    },
    staleTime: 30_000,
  });
}
