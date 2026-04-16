import { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NfsOperatorSidebar } from "./NfsOperatorSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNfsOperator } from "@/hooks/useNfsOperator";
import { supabase } from "@/lib/supabase";

export function NfsOperatorLayout() {
  const { user, loading } = useAuth();
  const { data: operator, isLoading: operatorLoading, isFetched } = useNfsOperator();

  // Synchronously detect bridge tokens in URL so we show a spinner
  // before the auth guard can redirect to /signin
  const [bridging, setBridging] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return !!(p.get("access_token") && p.get("refresh_token"));
  });

  useEffect(() => {
    if (!bridging) return;
    const p = new URLSearchParams(window.location.search);
    const accessToken = p.get("access_token");
    const refreshToken = p.get("refresh_token");
    if (!accessToken || !refreshToken) { setBridging(false); return; }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(() => {
        // Mark this session as hub-authenticated so operator dashboard stays accessible
        sessionStorage.setItem("nfs_hub_auth", "true");
        // Remove tokens from URL so they aren't visible or bookmarked
        const url = new URL(window.location.href);
        url.searchParams.delete("access_token");
        url.searchParams.delete("refresh_token");
        window.history.replaceState({}, "", url.toString());
      })
      .catch((err) => console.error("[SessionBridge] setSession failed:", err))
      .finally(() => setBridging(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (bridging || loading || (!!user && !isFetched)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Operator dashboard is only accessible when authenticated via hub.nfstay.com
  // (hub passes access_token + refresh_token in URL, which sets the sessionStorage flag)
  if (sessionStorage.getItem("nfs_hub_auth") !== "true") {
    window.location.href = "https://hub.nfstay.com/dashboard";
    return null;
  }

  // User is logged in but has no operator record — send to onboarding
  if (!operator) {
    return <Navigate to="/nfstay/onboarding" replace />;
  }

  return (
    <SidebarProvider>
      <div data-feature="NFSTAY__OP_LAYOUT" className="min-h-screen flex w-full">
        <NfsOperatorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card shrink-0">
            <SidebarTrigger data-feature="NFSTAY__OP_SIDEBAR_COLLAPSE" className="mr-4" />
            <span className="text-sm font-semibold text-muted-foreground">
              {operator.brand_name || "Operator Portal"}
            </span>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
