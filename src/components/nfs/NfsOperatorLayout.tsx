import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NfsOperatorSidebar } from "./NfsOperatorSidebar";

export function NfsOperatorLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <NfsOperatorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card shrink-0">
            <SidebarTrigger className="mr-4" />
            <span className="text-sm font-semibold text-muted-foreground">Operator Portal</span>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
