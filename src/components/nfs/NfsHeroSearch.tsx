import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, CalendarDays, CircleUserRound, ChevronDown, Minus, Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useNfsPropertyCities } from "@/hooks/useNfsProperties";
import { useTranslation } from "react-i18next";
import { useDynamicTranslation } from "@/hooks/useDynamicTranslation";

interface NfsHeroSearchProps {
  heading?: string;
  subHeading?: string;
  desc?: string;
  btnText?: string;
}

export function NfsHeroSearch({ heading, subHeading, desc, btnText }: NfsHeroSearchProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const translatedHeading = useDynamicTranslation(heading ?? '');
  const translatedSubHeading = useDynamicTranslation(subHeading ?? '');
  const translatedDesc = useDynamicTranslation(desc ?? '');
  const [location, setLocation] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const locationRef = useRef<HTMLDivElement>(null);

  const { data: allCities = [] } = useNfsPropertyCities();

  // Filter cities by what the user has typed
  const filteredCities = location.trim().length === 0
    ? allCities.slice(0, 8)
    : allCities.filter(
        (c) =>
          c.city.toLowerCase().includes(location.toLowerCase()) ||
          c.country.toLowerCase().includes(location.toLowerCase()),
      ).slice(0, 8);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalGuests = adults + children;

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('query', location);
    if (dateRange?.from) params.set('checkIn', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.set('checkOut', format(dateRange.to, 'yyyy-MM-dd'));
    if (adults > 1) params.set('adults', String(adults));
    if (children > 0) params.set('children', String(children));
    navigate(`/search?${params.toString()}`);
  };

  const handleSelectCity = (city: string) => {
    setLocation(city);
    setLocationOpen(false);
  };

  const Stepper = ({ label, sub, value, onChange, min = 0 }: { label: string; sub: string; value: number; onChange: (v: number) => void; min?: number }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-foreground disabled:opacity-30 disabled:hover:border-border transition"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-sm font-medium w-4 text-center">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-foreground transition"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d')}`
      : format(dateRange.from, 'MMM d')
    : null;

  const formatGuestCount = () => {
    const total = adults + children;
    const parts = [];
    if (total > 0) parts.push(`${total} guest${total > 1 ? 's' : ''}`);
    if (infants > 0) parts.push(`${infants} infant${infants > 1 ? 's' : ''}`);
    return parts.length ? parts.join(', ') : t('nav.add_guests');
  };

  return (
    <div data-feature="NFSTAY__HERO_SEARCH" className="border-b border-gray-200 pb-8 md:pb-14">
      <section className="flex items-center justify-center px-2">
        <div className="w-full max-w-[500px] md:max-w-[1000px] mt-4 md:mt-16">
          {/* Heading text */}
          {(heading || desc) && (
            <div className="text-center px-4 py-2 mb-4 md:mb-6">
              {heading && (
                <h1 className="text-3xl md:text-5xl font-semibold text-foreground">
                  {translatedHeading}
                </h1>
              )}
              {subHeading && (
                <h1 className="text-3xl md:text-5xl font-semibold text-foreground mt-4">
                  {translatedSubHeading}
                </h1>
              )}
              {desc && (
                <p className="text-[#9d9da1] mt-3 md:mt-6">{translatedDesc}</p>
              )}
            </div>
          )}

          {/* Search bar */}
          <div className="border border-[#e6e6eb] lg:rounded-full rounded-3xl flex flex-col lg:flex-row justify-between lg:p-2 md:p-8 p-5 mx-auto relative transition-all duration-300 shadow-sm hover:shadow-md bg-white">

            {/* Location with autocomplete */}
            <div
              ref={locationRef}
              className="flex items-center flex-1 p-2 border-b lg:border-none relative lg:min-w-[200px] lg:max-w-[300px]"
            >
              <div className="flex items-center flex-1 gap-2 min-w-0">
                <MapPin className="w-5 h-5 flex-shrink-0 text-black" />
                <input
                  data-feature="NFSTAY__HERO_LOCATION"
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); setLocationOpen(true); }}
                  onFocus={() => setLocationOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { setLocationOpen(false); handleSearch(); }
                    if (e.key === "Escape") setLocationOpen(false);
                  }}
                  placeholder={t('hero.search_placeholder')}
                  className="outline-none border-none w-full placeholder:text-black text-sm bg-transparent"
                  autoComplete="off"
                />
                {location && (
                  <button
                    type="button"
                    onClick={() => { setLocation(''); setLocationOpen(true); }}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-lg leading-none"
                  >
                    ×
                  </button>
                )}
                <ChevronDown className="w-4 h-4 text-black flex-shrink-0" />
              </div>

              {/* City dropdown */}
              {locationOpen && filteredCities.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[240px] bg-white border border-[#e6e6eb] rounded-2xl shadow-lg z-50 overflow-hidden">
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {location.trim() ? t('nav.matching_destinations') : t('nav.popular_destinations')}
                    </p>
                  </div>
                  {filteredCities.map((c) => (
                    <button
                      key={`${c.city}|${c.country}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                      onClick={() => handleSelectCity(c.city)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.city}</p>
                        <p className="text-xs text-gray-400 truncate">{c.country}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="h-7 w-px bg-[#e6e6eb] hidden lg:block absolute right-0" />
            </div>

            {/* Dates */}
            <Popover>
              <PopoverTrigger asChild>
                <button data-feature="NFSTAY__HERO_CHECKIN" className="flex flex-1 justify-between items-center mt-5 lg:mt-0 p-2 gap-2 cursor-pointer border-b lg:border-none relative lg:min-w-[250px] lg:max-w-[350px]">
                  <div className="flex flex-row gap-2 min-w-0">
                    <CalendarDays className="w-5 h-5 flex-shrink-0 text-black" />
                    <span className="text-nowrap overflow-hidden text-ellipsis text-sm">
                      {dateLabel ?? t('nav.any_dates')}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  <div className="h-7 w-px bg-[#e6e6eb] hidden lg:block absolute right-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  disabled={{ before: new Date() }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Guests */}
            <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
              <PopoverTrigger asChild>
                <button data-feature="NFSTAY__HERO_GUESTS" className="flex flex-1 justify-between items-center p-2 mt-5 lg:mt-0 gap-2 cursor-pointer relative lg:min-w-[180px] lg:max-w-[250px]">
                  <div className="flex flex-row gap-2 min-w-0">
                    <CircleUserRound className="w-5 h-5 flex-shrink-0 text-black" />
                    <span className="text-nowrap overflow-hidden text-ellipsis text-sm">
                      {formatGuestCount()}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 flex-shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end">
                <Stepper label={t('hero.adults')} sub={t('hero.adults_sub')} value={adults} onChange={setAdults} min={1} />
                <Stepper label={t('hero.children')} sub={t('hero.children_sub')} value={children} onChange={setChildren} />
                <Stepper label={t('hero.infants')} sub={t('hero.infants_sub')} value={infants} onChange={setInfants} />
              </PopoverContent>
            </Popover>

            {/* Search button */}
            <button
              data-feature="NFSTAY__HERO_SEARCH_BTN"
              onClick={handleSearch}
              className="w-auto md:w-[140px] h-[50px] mt-4 lg:mt-0 bg-primary-gradient text-white font-semibold py-2 px-6 rounded-full hover:opacity-90 transition-opacity text-[14px] flex items-center justify-center"
            >
              {btnText ?? t('hero.explore')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
