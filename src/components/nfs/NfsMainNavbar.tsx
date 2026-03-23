import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Menu, X, Search, Clock, Users, User, ChevronDown, LogOut, MessageCircle } from "lucide-react";
import { NfsLogo } from "./NfsLogo";
import { NfsCurrencySelector } from "./NfsCurrencySelector";
import { useAuth } from "@/hooks/useAuth";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";

export function NfsMainNavbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, isOperator } = useAuth();
  const { operator: wlOperator, isWhiteLabel } = useWhiteLabel();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const isSearchPage = location.pathname === "/search";
  const isHomePage = location.pathname === "/";

  const [navMode, setNavMode] = useState<"traveler" | "reservations">("traveler");

  useEffect(() => {
    if (location.pathname.includes("/traveler/reservations")) {
      setNavMode("reservations");
    } else {
      setNavMode("traveler");
    }
  }, [location.pathname]);

  const handleNavToggle = (mode: "traveler" | "reservations") => {
    if (mode === "reservations") {
      if (!user) {
        navigate("/signin");
        return;
      }
      navigate("/traveler/reservations");
    } else {
      navigate("/search");
    }
    setNavMode(mode);
  };

  const handleSearch = () => {
    const p = new URLSearchParams();
    if (query) p.set("query", query);
    navigate(`/search?${p.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const contactHref = isWhiteLabel && wlOperator?.contact_whatsapp
    ? `https://wa.me/${wlOperator.contact_whatsapp.replace(/[^0-9]/g, '')}`
    : isWhiteLabel && wlOperator?.contact_email
      ? `mailto:${wlOperator.contact_email}`
      : "mailto:hello@nfstay.app";
  const contactExternal = !!(isWhiteLabel && wlOperator?.contact_whatsapp);

  return (
    <>
      {/* Main navbar */}
      <nav className="sticky top-0 left-0 right-0 w-full h-16 sm:h-20 bg-white z-50">
        <div className="max-w-full mx-auto xl:px-10 md:px-10 sm:px-4 px-3 h-full">
          <div className={`${isSearchPage ? "flex justify-between items-center" : "grid grid-cols-3"} h-full gap-2 sm:gap-3 md:gap-0`}>

            {/* LEFT: Logo */}
            <div className={`flex items-center gap-2 sm:gap-4 ${isSearchPage ? "hidden lg:flex" : "flex"}`}>
              {isWhiteLabel && wlOperator ? (
                <Link to="/" className="flex items-center gap-2 pt-1.5">
                  {wlOperator.logo_url ? (
                    <img src={wlOperator.logo_url} alt={wlOperator.brand_name} className="object-contain w-[100px] sm:w-[120px] h-[32px]" />
                  ) : (
                    <span className="text-xl font-bold text-foreground">{wlOperator.brand_name}</span>
                  )}
                </Link>
              ) : (
                <Link to="/" className="flex items-center pt-1.5">
                  <NfsLogo />
                </Link>
              )}
            </div>

            {/* CENTER: Toggle pill (non-search) or Currency (mobile) */}
            {!isSearchPage && (
              <div className="flex lg:hidden items-center gap-2 flex-1 justify-center max-w-[300px]">
                <NfsCurrencySelector />
              </div>
            )}

            {!isSearchPage && (
              <div className="hidden lg:flex items-center justify-center">
                <div className="relative bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-full p-1.5 shadow-lg shadow-purple-500/5 hover:shadow-purple-500/10 transition-all duration-300">
                  {/* Animated gradient indicator */}
                  <div
                    className={`absolute top-1.5 h-[calc(100%-12px)] bg-primary-gradient rounded-full transition-all duration-500 ease-out shadow-sm ${
                      navMode === "traveler" || isSearchPage
                        ? "left-1.5 w-[calc(50%-6px)]"
                        : "left-[calc(50%+3px)] w-[calc(50%-6px)]"
                    }`}
                  />
                  <button
                    onClick={() => handleNavToggle("traveler")}
                    className={`relative z-10 px-4 xl:px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 min-w-[120px] xl:min-w-[140px] transform hover:scale-105 ${
                      navMode === "traveler" || isSearchPage ? "text-white" : "text-gray-600 hover:text-purple-600"
                    }`}
                  >
                    <span className="hidden xl:inline">Search Properties</span>
                    <span className="xl:hidden">Search</span>
                  </button>
                  <button
                    onClick={() => handleNavToggle("reservations")}
                    className={`relative z-10 px-4 xl:px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 min-w-[120px] xl:min-w-[140px] transform hover:scale-105 ${
                      navMode === "reservations" ? "text-white" : "text-gray-600 hover:text-purple-600"
                    }`}
                  >
                    <span className="hidden xl:inline">My Reservations</span>
                    <span className="xl:hidden">Bookings</span>
                  </button>
                </div>
              </div>
            )}

            {/* CENTER: Search bar (search page only) */}
            {isSearchPage && (
              <div className="flex flex-1 justify-center w-full max-w-[800px] px-2 sm:px-4">
                <div className="flex items-center border border-gray-200 rounded-full bg-white px-2 py-1.5 shadow-sm w-full">
                  <div className="flex items-center gap-2 flex-1 px-3">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Where to?"
                      className="text-sm bg-transparent outline-none flex-1 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="h-6 w-px bg-gray-200" />
                  <button className="flex items-center gap-1.5 text-sm text-gray-500 px-3 hover:text-gray-900 transition-colors whitespace-nowrap">
                    <Clock className="w-4 h-4" />
                    <span>Any dates...</span>
                  </button>
                  <div className="h-6 w-px bg-gray-200" />
                  <button className="flex items-center gap-1.5 text-sm text-gray-500 px-3 hover:text-gray-900 transition-colors whitespace-nowrap">
                    <Users className="w-4 h-4" />
                    <span>1 guest</span>
                  </button>
                  <button onClick={handleSearch} className="bg-primary-gradient text-white font-medium py-2 px-5 rounded-full text-sm hover:opacity-90 transition-opacity ml-1">
                    Search
                  </button>
                </div>
              </div>
            )}

            {/* RIGHT: Actions */}
            <div className={`items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 ${isSearchPage ? "hidden lg:flex" : "flex ml-auto"}`}>
              {/* Currency + Contact (lg+) */}
              <div className="hidden lg:flex items-center gap-2 lg:gap-3">
                <NfsCurrencySelector />
                <a
                  href={contactHref}
                  target={contactExternal ? "_blank" : undefined}
                  rel={contactExternal ? "noopener noreferrer" : undefined}
                  className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Contact
                </a>
              </div>

              {/* User menu or Sign In (sm+) */}
              {user ? (
                <button
                  onClick={() => setDrawerOpen(!drawerOpen)}
                  className="hidden sm:flex items-center px-2 sm:px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs sm:text-sm border shadow-sm hover:bg-gray-100 max-w-[120px] sm:max-w-[160px] lg:max-w-none"
                >
                  <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                  <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                </button>
              ) : (
                <Link
                  to="/signin"
                  className="hidden sm:flex px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium bg-primary-gradient text-white rounded-full hover:opacity-90 transition-opacity"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile user icon */}
              {user && (
                <button
                  onClick={() => setDrawerOpen(!drawerOpen)}
                  className="sm:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <User className="w-4 h-4" />
                </button>
              )}

              {/* Hamburger */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Left sidebar (hamburger menu) */}
      <div className={`fixed top-0 left-0 h-full w-[240px] sm:w-[300px] bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-[60] ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4">
          <div className="flex justify-end">
            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="border-t border-gray-200" />
        <div className="p-4 space-y-2">
          <Link to="/search" onClick={() => setSidebarOpen(false)} className="block p-2 rounded-lg hover:bg-[#f0f0ed] transition-colors">
            <h3 className="font-semibold text-base">Traveler</h3>
            <p className="text-[#737373] font-medium text-sm">Find Stays and manage bookings</p>
          </Link>
          {!isWhiteLabel && (
            <Link to="/nfstay" onClick={() => setSidebarOpen(false)} className="block p-2 rounded-lg hover:bg-[#f0f0ed] transition-colors">
              <h3 className="font-semibold text-base">Operators</h3>
              <p className="text-[#737373] font-medium text-sm">Grow your vacation rental business</p>
            </Link>
          )}
          {!isWhiteLabel && (
            <Link to="/admin/nfstay" onClick={() => setSidebarOpen(false)} className="block p-2 rounded-lg hover:bg-[#f0f0ed] transition-colors">
              <h3 className="font-semibold text-base">Admin</h3>
              <p className="text-[#737373] font-medium text-sm">Platform management</p>
            </Link>
          )}
        </div>
      </div>

      {/* Right drawer (user menu / sign in) */}
      {user ? (
        <div className={`fixed top-0 right-0 z-[60] h-full w-72 bg-white shadow-lg transform transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex justify-end p-4">
            <button onClick={() => setDrawerOpen(false)} className="p-1 bg-gray-100 rounded-md">
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <div className="flex flex-col items-center p-4 space-y-2 border-b">
            <div className="w-14 h-14 bg-primary-gradient rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-white" />
            </div>
            <p className="font-medium text-black">{user.email}</p>
          </div>
          <div className="flex flex-col items-center space-y-6 p-6 text-sm text-gray-800">
            {isOperator && !isWhiteLabel && (
              <Link to="/nfstay" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 hover:text-purple-600 font-semibold transition-colors">
                Dashboard
              </Link>
            )}
            <button
              onClick={() => { signOut(); setDrawerOpen(false); }}
              className="flex items-center gap-3 cursor-pointer hover:text-purple-600 font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
      ) : (
        <div className={`fixed inset-y-0 right-0 w-[280px] sm:w-[320px] bg-white/95 backdrop-blur-lg shadow-2xl transform transition-transform duration-300 ease-in-out z-[60] border-l border-gray-200/50 ${drawerOpen ? "translate-x-0" : "translate-x-full"} md:hidden`}>
          <div className="flex flex-col h-full">
            <div className="flex-1 py-6">
              <div className="px-6 mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Menu</h3>
              </div>
              {[
                { label: "Find a stay", href: "/search" },
                { label: "Reservations", href: "/traveler/reservations" },
                { label: "Find your booking", href: "/booking" },
                { label: "List your property", href: "/signup" },
                { label: "FAQ", href: "#" },
              ].map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center py-3 px-6 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200 border-l-2 border-transparent hover:border-purple-500"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="border-t border-gray-100 bg-gradient-to-r from-purple-50/50 to-green-50/50 py-6 px-6 space-y-4">
              <Link
                to="/signin"
                onClick={() => setDrawerOpen(false)}
                className="block w-full px-4 py-3 font-medium bg-primary-gradient text-white rounded-xl hover:opacity-90 transition-opacity text-center shadow-lg shadow-purple-500/25"
              >
                Sign In
              </Link>
              <a
                href={contactHref}
                target={contactExternal ? "_blank" : undefined}
                rel={contactExternal ? "noopener noreferrer" : undefined}
                onClick={() => setDrawerOpen(false)}
                className="block w-full px-4 py-3 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-center text-gray-700"
              >
                Contact us
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop overlay */}
      {(sidebarOpen || drawerOpen) && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-purple-900/30 via-black/40 to-green-900/30 backdrop-blur-sm z-[55] animate-in fade-in duration-300"
          onClick={() => { setSidebarOpen(false); setDrawerOpen(false); }}
        />
      )}

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 shadow-lg z-40 lg:hidden">
        <div className="flex items-center justify-center p-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-full p-1 shadow-sm w-full max-w-[300px]">
            <button
              onClick={() => handleNavToggle("traveler")}
              className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                navMode === "traveler" || isSearchPage
                  ? "bg-primary-gradient text-white shadow-sm"
                  : "text-gray-600 hover:text-purple-600"
              }`}
            >
              Search
            </button>
            <button
              onClick={() => handleNavToggle("reservations")}
              className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                navMode === "reservations"
                  ? "bg-primary-gradient text-white shadow-sm"
                  : "text-gray-600 hover:text-purple-600"
              }`}
            >
              Bookings
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
