// Hospitable connection + sync hooks for bookingsite
// Mirrors marketplace10's use-nfs-hospitable.ts pattern, adapted for bookingsite's hook style

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useNfsOperator } from "./useNfsOperator";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// ── Types ──

export interface HospitableConnection {
  id: string;
  operator_id: string;
  profile_id: string;
  hospitable_customer_id: string;
  hospitable_connection_id: string | null;
  status: string;
  is_active: boolean;
  sync_status: string;
  health_status: string;
  connected_at: string | null;
  disconnected_at: string | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
  last_error: Record<string, unknown> | string | null;
  total_properties: number;
  total_reservations: number;
  connected_platforms: string[];
  user_metadata: Record<string, unknown> | null;
}

export interface HospitableSyncedProperty {
  id: string;
  public_title: string;
  hospitable_property_id: string | null;
  status: string;
  city: string | null;
  country: string | null;
  property_type: string | null;
  images: { url: string; caption?: string; order?: number }[] | null;
}

// ── useNfsHospitableConnection ──

export function useNfsHospitableConnection() {
  const { data: operator } = useNfsOperator();

  return useQuery({
    queryKey: ["nfs-hospitable-connection", operator?.id],
    queryFn: async (): Promise<HospitableConnection | null> => {
      if (!operator?.id) return null;

      const { data, error } = await (supabase.from("nfs_hospitable_connections") as any)
        .select("*")
        .eq("operator_id", operator.id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as HospitableConnection | null;
    },
    enabled: !!operator?.id,
    staleTime: 10_000,
  });
}

// ── useNfsHospitableSyncedProperties ──

export function useNfsHospitableSyncedProperties(operatorId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["nfs-hospitable-properties", operatorId],
    queryFn: async (): Promise<HospitableSyncedProperty[]> => {
      if (!operatorId) return [];

      const { data, error } = await (supabase.from("nfs_properties") as any)
        .select("id, public_title, hospitable_property_id, status, city, country, property_type, images")
        .eq("operator_id", operatorId)
        .not("hospitable_property_id", "is", null);

      if (error) return [];
      return (data || []) as HospitableSyncedProperty[];
    },
    enabled: !!operatorId && enabled,
    staleTime: 15_000,
  });
}

// ── useNfsHospitableConnect ──

export function useNfsHospitableConnect() {
  const { data: operator } = useNfsOperator();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateConnect = useCallback(async () => {
    if (!operator?.id || !operator?.profile_id) {
      setError("No operator profile found. Complete onboarding first.");
      return;
    }

    try {
      setConnecting(true);
      setError(null);

      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/nfs-hospitable-oauth?action=authorize&operator_id=${operator.id}&profile_id=${operator.profile_id}&origin=${encodeURIComponent('https://nfstay.app')}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token || ""}`,
            apikey: SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Connection failed" }));
        setError(err.error || "Failed to initiate Hospitable connection");
        return;
      }

      const result = await response.json();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }, [operator?.id, operator?.profile_id]);

  const triggerResync = useCallback(async (): Promise<boolean> => {
    if (!operator?.id) {
      setError("No operator found");
      return false;
    }

    try {
      setError(null);

      const { error: fnError } = await supabase.functions.invoke("nfs-hospitable-oauth", {
        body: { action: "resync", operator_id: operator.id },
      });

      if (fnError) {
        setError(fnError.message);
        return false;
      }

      // Refresh connection + properties data after short delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["nfs-hospitable-connection"] });
        queryClient.invalidateQueries({ queryKey: ["nfs-hospitable-properties"] });
      }, 1500);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger sync");
      return false;
    }
  }, [operator?.id, queryClient]);

  return { connecting, error, initiateConnect, triggerResync };
}

// ── useNfsHospitableImport (activate selected properties) ──

export function useNfsHospitableImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyIds: string[]) => {
      if (!propertyIds.length) throw new Error("No properties selected");

      const { error } = await (supabase.from("nfs_properties") as any)
        .update({ status: "listed" })
        .in("id", propertyIds);

      if (error) throw error;
      return propertyIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfs-hospitable-properties"] });
      queryClient.invalidateQueries({ queryKey: ["nfs-operator-properties"] });
    },
  });
}
