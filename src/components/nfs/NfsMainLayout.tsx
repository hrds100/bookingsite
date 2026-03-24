import { Outlet } from "react-router-dom";
import { NfsMainNavbar } from "./NfsMainNavbar";
import { NfsMainFooter } from "./NfsMainFooter";

export function NfsMainLayout() {
  return (
    <div data-feature="NFSTAY__MAIN_LAYOUT" className="min-h-screen flex flex-col">
      <NfsMainNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <NfsMainFooter />
    </div>
  );
}
