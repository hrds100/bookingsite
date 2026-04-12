import { useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ImportedListing {
  public_title?: string;
  description?: string;
  property_type?: string;
  rental_type?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  lat?: number;
  lng?: number;
  max_guests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  base_rate_amount?: number;
  base_rate_currency?: string;
  amenities?: Record<string, boolean>;
  images?: { url: string; caption: string; order: number }[];
  minimum_stay?: number;
  cancellation_policy?: string;
  check_in_time?: string;
  check_out_time?: string;
  rules?: string;
  source_url?: string;
}

interface UseNfsImportListingReturn {
  importListing: (url: string) => Promise<ImportedListing>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export function useNfsImportListing(): UseNfsImportListingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setIsLoading(false);
  };

  const importListing = async (url: string): Promise<ImportedListing> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("nfs-import-listing", {
        body: { url },
      });

      if (fnError) {
        const msg = fnError.message ?? "Import failed. Please try again.";
        setError(msg);
        throw new Error(msg);
      }

      if (data?.error) {
        const msg = data.error as string;
        setError(msg);
        throw new Error(msg);
      }

      return data.data as ImportedListing;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed. Please try again.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return { importListing, isLoading, error, reset };
}
