import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Menu, X, Search, Clock, Users, User, ChevronDown, LogOut, MessageCircle, Mail, Phone, Minus, Plus } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NfsLogo } from "./NfsLogo";
import { NfsCurrencySelector } from "./NfsCurrencySelector";
import { NfsFavouritesDropdown } from "./NfsFavouritesDropdown";
import { useAuth } from "@/hooks/useAuth";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";

export function NfsMainNavbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, isOperator } = useAuth();
  const { operator: wlOperator, isWhiteLabel } = useWhiteLabel();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const isSearchPage = location.pathname === "/search";
  const isHomePage = location.pathname === "/";

  const [navMode, setNavMode] = useState<"traveler" | "reservations">("traveler");
  const [navDateRange, setNavDateRange] = useState<DateRange | undefined>();
  const [navAdults, setNavAdults] = useState(0);
  const [navChildren, setNavChildren] = useState(0);
  const [navGuestsOpen, setNavGuestsOpen] = useState(false);

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
    if (navDateRange?.from) p.set("check_in", format(navDateRange.from, "yyyy-MM-dd"));
    if (navDateRange?.to) p.set("check_out", format(navDateRange.to, "yyyy-MM-dd"));
    if (navAdults > 0) p.set("adults", String(navAdults));
    if (navChildren > 0) p.set("children", String(navChildren));
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
      <nav data-feature="NFSTAY__NAVBAR" className="sticky top-0 left-0 right-0 w-full h-16 sm:h-20 bg-white z-50 overflow-visible">
        <div className="max-w-full mx-auto xl:px-10 md:px-10 sm:px-4 px-3 h-full">
          <div className={`${isSearchPage ? "flex justify-between items-center" : "grid grid-cols-3"} h-full gap-2 sm:gap-3 md:gap-0`}>

            {/* LEFT: Logo */}
            <div data-feature="NFSTAY__NAVBAR_LOGO" className={`flex items-center gap-2 sm:gap-4 ${isSearchPage ? "hidden lg:flex" : "flex"}`}>
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
                <div className="relative bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-full p-1.5 shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/10 transition-all duration-300">
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
                      navMode === "traveler" || isSearchPage ? "text-white" : "text-gray-600 hover:text-primary"
                    }`}
                  >
                    <span className="hidden xl:inline">Search Properties</span>
                    <span className="xl:hidden">Search</span>
                  </button>
                  <button
                    onClick={() => handleNavToggle("reservations")}
                    className={`relative z-10 px-4 xl:px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 min-w-[120px] xl:min-w-[140px] transform hover:scale-105 ${
                      navMode === "reservations" ? "text-white" : "text-gray-600 hover:text-primary"
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
              <div className="flex flex-1 justify-center w-full max-w-[800px] px-2 sm:px-4 min-w-0">
                <div data-feature="NFSTAY__NAVBAR_SEARCH" className="flex items-center border border-gray-200 rounded-full bg-white px-2 py-1.5 shadow-sm w-full min-w-0">
                  <div className="flex items-center gap-2 flex-1 px-3 min-w-0">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Where to?"
                      className="text-sm bg-transparent outline-none flex-1 placeholder:text-gray-400 min-w-0"
                    />
                  </div>
                  <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                  {/* Date range picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 px-3 hover:text-gray-900 transition-colors whitespace-nowrap">
                        <Clock className="w-4 h-4" />
                        <span>
                          {navDateRange?.from
                            ? `${format(navDateRange.from, "MMM d")}${navDateRange.to ? ` – ${format(navDateRange.to, "MMM d")}` : ""}`
                            : "Any dates..."}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center" side="bottom">
                      <Calendar
                        mode="range"
                        selected={navDateRange}
                        onSelect={setNavDateRange}
                        numberOfMonths={2}
                        disabled={{ before: new Date() }}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                  {/* Guest count picker */}
                  <Popover open={navGuestsOpen} onOpenChange={setNavGuestsOpen}>
                    <PopoverTrigger asChild>
                      <button className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 px-3 hover:text-gray-900 transition-colors whitespace-nowrap">
                        <Users className="w-4 h-4" />
                        <span>
                          {navAdults + navChildren > 0
                            ? `${navAdults + navChildren} guest${navAdults + navChildren !== 1 ? "s" : ""}`
                            : "Add guests"}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-4" align="center" side="bottom">
                      {/* Adults */}
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium">Adults</p>
                          <p className="text-xs text-muted-foreground">Ages 13+</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setNavAdults(Math.max(0, navAdults - 1))}
                            disabled={navAdults <= 0}
                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm w-3 text-center">{navAdults}</span>
                          <button
                            onClick={() => setNavAdults(navAdults + 1)}
                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* Children */}
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium">Children</p>
                          <p className="text-xs text-muted-foreground">Ages 2–12</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setNavChildren(Math.max(0, navChildren - 1))}
                            disabled={navChildren <= 0}
                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm w-3 text-center">{navChildren}</span>
                          <button
                            onClick={() => setNavChildren(navChildren + 1)}
                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <button onClick={handleSearch} className="bg-primary-gradient text-white font-medium py-2 px-5 rounded-full text-sm hover:opacity-90 transition-opacity ml-1 shrink-0">
                    Search
                  </button>
                </div>
              </div>
            )}

            {/* RIGHT: Actions */}
            <div className={`items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 ${isSearchPage ? "hidden lg:flex" : "flex ml-auto"}`}>
              {/* Currency + Favourites + Contact (lg+) */}
              <div className="hidden lg:flex items-center gap-2 lg:gap-3">
                <NfsCurrencySelector />
                <NfsFavouritesDropdown />
                <div className="relative">
                  <button
                    onClick={() => setContactOpen(!contactOpen)}
                    className="px-3 lg:px-4 py-2 lg:py-2 text-xs lg:text-sm font-medium border border-gray-200 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-1"
                  >
                    Contact
                    <ChevronDown className={`w-3 h-3 transition-transform ${contactOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {contactOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                      {isWhiteLabel && wlOperator?.contact_whatsapp && (
                        <a
                          href={`https://wa.me/${wlOperator.contact_whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${wlOperator.brand_name}, I have a question about your properties.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setContactOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </a>
                      )}
                      {isWhiteLabel && wlOperator?.contact_email ? (
                        <a
                          href={`mailto:${wlOperator.contact_email}`}
                          onClick={() => setContactOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                        >
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          Email
                        </a>
                      ) : (
                        <a
                          href="mailto:hello@nfstay.app"
                          onClick={() => setContactOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                        >
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          Email
                        </a>
                      )}
                      {isWhiteLabel && wlOperator?.contact_phone && (
                        <a
                          href={`tel:${wlOperator.contact_phone}`}
                          onClick={() => setContactOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                        >
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          Call
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* User menu or Sign In (sm+) */}
              {user ? (
                <button
                  onClick={() => setDrawerOpen(!drawerOpen)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border shadow-sm hover:bg-gray-100"
                >
                  <User className="w-5 h-5" />
                  <ChevronDown className="w-3 h-3" />
                </button>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="hidden sm:flex px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium border border-gray-300 rounded-full hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    Sign up
                  </Link>
                  <Link
                    to="/signin"
                    className="hidden sm:flex px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium bg-primary-gradient text-white rounded-full hover:opacity-90 transition-opacity"
                  >
                    Sign In
                  </Link>
                </>
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
                data-feature="NFSTAY__NAVBAR_MENU"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="border-t border-gray-200" />
        <div className="p-4 space-y-2">
          <Link data-feature="NFSTAY__NAVBAR_LINK" to="/search" onClick={() => setSidebarOpen(false)} className="block p-2 rounded-lg hover:bg-[#f0f0ed] transition-colors">
            <h3 className="font-semibold text-base">Traveler</h3>
            <p className="text-[#737373] font-medium text-sm">Find Stays and manage bookings</p>
          </Link>
        </div>
      </div>

      {/* Right drawer (user menu / sign in) */}
      {user ? (
        <div className={`fixed top-0 right-0 z-[60] h-full w-72 bg-white shadow-lg transform transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex justify-end p-4">
            <button onClick={() => setDrawerOpen(false)} className="p-2 bg-gray-100 rounded-md">
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
              <Link to="/nfstay" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 hover:text-primary font-semibold transition-colors">
                Dashboard
              </Link>
            )}
            <button
              onClick={() => { signOut(); setDrawerOpen(false); }}
              className="flex items-center gap-3 cursor-pointer hover:text-primary font-semibold transition-colors"
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
                { label: "Find a stay", href: "/search", external: false },
                { label: "Reservations", href: "/traveler/reservations", external: false },
                { label: "Find your booking", href: "/booking", external: false },
                { label: "List your property", href: "https://hub.nfstay.com", external: true },
                { label: "FAQ", href: "#", external: false },
              ].map((link) => (
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center py-3 px-6 text-sm font-medium text-gray-700 hover:bg-accent-light hover:text-primary transition-colors duration-200 border-l-2 border-transparent hover:border-primary"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center py-3 px-6 text-sm font-medium text-gray-700 hover:bg-accent-light hover:text-primary transition-colors duration-200 border-l-2 border-transparent hover:border-primary"
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </div>
            <div className="border-t border-gray-100 bg-gradient-to-r from-emerald-50/50 to-emerald-50/30 py-6 px-6 space-y-4">
              <Link
                to="/signin"
                onClick={() => setDrawerOpen(false)}
                className="block w-full px-4 py-3 font-medium bg-primary-gradient text-white rounded-xl hover:opacity-90 transition-opacity text-center shadow-lg shadow-emerald-500/25"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setDrawerOpen(false)}
                className="block w-full px-4 py-3 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-center text-gray-700"
              >
                Create account
              </Link>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact us</p>
                {isWhiteLabel && wlOperator?.contact_whatsapp && (
                  <a
                    href={`https://wa.me/${wlOperator.contact_whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${wlOperator.brand_name}, I have a question.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 font-medium bg-[#25D366] text-white rounded-xl hover:bg-[#20bd5a] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
                <a
                  href={isWhiteLabel && wlOperator?.contact_email ? `mailto:${wlOperator.contact_email}` : "mailto:hello@nfstay.app"}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact dropdown backdrop (invisible) */}
      {contactOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setContactOpen(false)} />
      )}

      {/* Backdrop overlay */}
      {(sidebarOpen || drawerOpen) && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-emerald-900/20 via-black/30 to-emerald-900/20 backdrop-blur-sm z-[55] animate-in fade-in duration-300"
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
                  : "text-gray-600 hover:text-primary"
              }`}
            >
              Search
            </button>
            <button
              onClick={() => handleNavToggle("reservations")}
              className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                navMode === "reservations"
                  ? "bg-primary-gradient text-white shadow-sm"
                  : "text-gray-600 hover:text-primary"
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
