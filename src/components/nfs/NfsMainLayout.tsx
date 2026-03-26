import { Outlet, useLocation } from "react-router-dom";
import { NfsMainNavbar } from "./NfsMainNavbar";
import { NfsMainFooter } from "./NfsMainFooter";

/** Routes where the footer should be hidden (full-height layouts) */
const NO_FOOTER_ROUTES = ["/search"];

export function NfsMainLayout() {
  const { pathname } = useLocation();
  const hideFooter = NO_FOOTER_ROUTES.includes(pathname);

  return (
    <div data-feature="NFSTAY__MAIN_LAYOUT" className="min-h-screen flex flex-col">
      <NfsMainNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      {!hideFooter && <NfsMainFooter />}
    </div>
  );
}
