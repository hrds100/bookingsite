import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NfsOperatorSidebar } from "./NfsOperatorSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNfsOperator } from "@/hooks/useNfsOperator";

export function NfsOperatorLayout() {
  const { user, loading, isOperator } = useAuth();
  const { data: operator, isLoading: operatorLoading } = useNfsOperator();

  if (loading || operatorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // User is logged in but has no operator record — send to onboarding
  if (!isOperator || !operator) {
    return <Navigate to="/nfstay/onboarding" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <NfsOperatorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card shrink-0">
            <SidebarTrigger className="mr-4" />
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
