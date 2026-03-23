import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Menu, X, Search, Clock, Users, Hotel, CalendarDays, LogOut, MessageCircle } from "lucide-react";
import { NfsLogo } from "./NfsLogo";
import { NfsCurrencySelector } from "./NfsCurrencySelector";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";

export function NfsMainNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, isOperator } = useAuth();
  const { operator: wlOperator, isWhiteLabel } = useWhiteLabel();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const isSearchPage = location.pathname === "/search";
  const isHomePage = location.pathname === "/";

  const handleSearch = () => {
    const p = new URLSearchParams();
    if (query) p.set("query", query);
    navigate(`/search?${p.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-[1600px] mx-auto flex items-center h-20 px-4 gap-3">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="p-2 rounded-lg hover:bg-secondary"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {isWhiteLabel && wlOperator ? (
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
              {wlOperator.logo_url ? (
                <img src={wlOperator.logo_url} alt={wlOperator.brand_name} className="h-8 w-auto" />
              ) : (
                <span>{wlOperator.brand_name}</span>
              )}
            </Link>
          ) : (
            <NfsLogo />
          )}
        </div>

        {/* Center: context-dependent */}
        {isHomePage ? (
          /* Homepage: Find a stay / Reservations tabs */
          <div className="hidden lg:flex items-center justify-center flex-1">
            <div className="relative bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-full p-1.5 shadow-lg shadow-purple-500/5 hover:shadow-purple-500/10 transition-all duration-300">
              <div className="absolute top-1.5 h-[calc(100%-12px)] bg-primary-gradient rounded-full transition-all duration-500 ease-out shadow-sm left-1.5 w-[calc(50%-6px)]" />
              <Link
                to="/search"
                className="relative z-10 px-4 xl:px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 min-w-[120px] xl:min-w-[140px] text-white inline-flex items-center justify-center"
              >
                Search Properties
              </Link>
              <Link
                to="/traveler/reservations"
                className="relative z-10 px-4 xl:px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 min-w-[120px] xl:min-w-[140px] text-gray-600 hover:text-purple-600 inline-flex items-center justify-center"
              >
                My Reservations
              </Link>
            </div>
          </div>
        ) : isSearchPage ? (
          /* Search page: inline search bar in the navbar */
          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="flex items-center border border-border rounded-full bg-background px-2 py-1.5 shadow-sm max-w-2xl w-full">
              <div className="flex items-center gap-2 flex-1 px-3">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Where to?"
                  className="text-sm bg-transparent outline-none flex-1 placeholder:text-muted-foreground"
                />
              </div>
              <div className="h-6 w-px bg-border" />
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 hover:text-foreground transition-colors whitespace-nowrap">
                <Clock className="w-4 h-4" />
                <span>Any dates...</span>
              </button>
              <div className="h-6 w-px bg-border" />
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 hover:text-foreground transition-colors whitespace-nowrap">
                <Users className="w-4 h-4" />
                <span>1 guest</span>
              </button>
              <Button size="sm" className="rounded-2xl px-5 ml-1" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Right: currency + account */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* Contact button */}
          <a
            href={
              isWhiteLabel && wlOperator?.contact_whatsapp
                ? `https://wa.me/${wlOperator.contact_whatsapp.replace(/[^0-9]/g, '')}`
                : isWhiteLabel && wlOperator?.contact_email
                  ? `mailto:${wlOperator.contact_email}`
                  : "mailto:hello@nfstay.app"
            }
            target={isWhiteLabel && wlOperator?.contact_whatsapp ? "_blank" : undefined}
            rel={isWhiteLabel && wlOperator?.contact_whatsapp ? "noopener noreferrer" : undefined}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            Contact
          </a>
          <NfsCurrencySelector />
          {user ? (
            <div className="flex items-center gap-2">
              {isOperator && !isWhiteLabel && (
                <Link to="/nfstay" className="text-sm font-medium text-primary hover:underline px-2">
                  Dashboard
                </Link>
              )}
              <button
                onClick={() => signOut()}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg border border-border flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/signin"
              className="text-sm font-medium bg-primary-gradient text-white px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile: currency + search shortcut */}
        <div className="flex md:hidden items-center gap-2 ml-auto">
          <NfsCurrencySelector />
          {!isHomePage && (
            <button
              className="p-2 rounded-lg hover:bg-secondary"
              onClick={() => navigate("/search")}
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-4 space-y-3">
          <Link to="/search" className="block text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>Find a stay</Link>
          <Link to="/traveler/reservations" className="block text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>Reservations</Link>
          <Link to="/booking" className="block text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>Find your booking</Link>
          <a
            href={
              isWhiteLabel && wlOperator?.contact_whatsapp
                ? `https://wa.me/${wlOperator.contact_whatsapp.replace(/[^0-9]/g, '')}`
                : isWhiteLabel && wlOperator?.contact_email
                  ? `mailto:${wlOperator.contact_email}`
                  : "mailto:hello@nfstay.app"
            }
            target={isWhiteLabel && wlOperator?.contact_whatsapp ? "_blank" : undefined}
            rel={isWhiteLabel && wlOperator?.contact_whatsapp ? "noopener noreferrer" : undefined}
            className="block text-sm font-medium text-foreground py-2"
            onClick={() => setMobileOpen(false)}
          >
            Contact us
          </a>
          {!isWhiteLabel && (
            <>
              <hr className="border-border" />
              <Link to="/nfstay" className="block text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>Operator portal</Link>
              <Link to="/admin/nfstay" className="block text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>Admin portal</Link>
            </>
          )}
          <hr className="border-border" />
          {user ? (
            <button
              onClick={() => { signOut(); setMobileOpen(false); }}
              className="block text-sm font-medium text-foreground py-2 w-full text-left"
            >
              Sign out
            </button>
          ) : (
            <Link to="/signin" className="block text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>Sign in</Link>
          )}
          {!isWhiteLabel && (
            <Button asChild className="w-full rounded-lg" onClick={() => setMobileOpen(false)}>
              <Link to="/signup">List your property</Link>
            </Button>
          )}
        </div>
      )}
      {/* Mobile bottom nav */}
      {/* Mobile bottom nav — legacy gradient style */}
      <div className="fixed bottom-0 left-0 right-0 shadow-lg z-40 lg:hidden">
        <div className="flex items-center justify-center p-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-full p-1 shadow-sm w-full max-w-[300px]">
            <Link
              to="/search"
              className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 text-center ${
                isSearchPage || isHomePage ? 'bg-primary-gradient text-white shadow-sm' : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              Search
            </Link>
            <Link
              to="/traveler/reservations"
              className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 text-center ${
                location.pathname.includes('/traveler') ? 'bg-primary-gradient text-white shadow-sm' : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              Bookings
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
