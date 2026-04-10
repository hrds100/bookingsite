import { useState, useMemo, useRef, useEffect } from "react";
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Minus, Plus, Users, CalendarDays, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface NfsSearchFiltersProps {
  resultCount: number;
  sortBy: string;
  onSortChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeType: string;
  onTypeChange: (type: string) => void;
  priceMin: string;
  priceMax: string;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  bedrooms: number;
  onBedroomsChange: (n: number) => void;
  beds: number;
  onBedsChange: (n: number) => void;
  bathrooms: number;
  onBathroomsChange: (n: number) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  // New filter props
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  adults: number;
  onAdultsChange: (n: number) => void;
  children: number;
  onChildrenChange: (n: number) => void;
  selectedAmenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
  locationQuery: string;
  onLocationQueryChange: (value: string) => void;
  availableCities: string[];
}

const typeOptions = [
  'All',
  'Entire home',
  'Apartment',
  'Villa',
  'Castle',
  'Cabin',
  'Boat',
  'Treehouse',
  'Beach house',
  'Mountain',
];

const AMENITY_OPTIONS = [
  'WiFi',
  'Pool',
  'Kitchen',
  'Free parking',
  'Air conditioning',
  'Washer',
  'Dryer',
  'TV',
  'Gym',
  'Hot tub',
  'Heating',
  'Workspace',
  'Garden',
  'Balcony',
  'Terrace',
  'BBQ grill',
  'Sauna',
  'Elevator',
];

function GuestStepper({
  label,
  sub,
  value,
  onChange,
  min = 0,
  disableIncrement = false,
}: {
  label: string;
  sub: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  disableIncrement?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="text-sm w-3 text-center">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          disabled={disableIncrement}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30"
          aria-label={`Increase ${label}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function NfsSearchFilters({
  resultCount,
  sortBy,
  onSortChange,
  showFilters,
  onToggleFilters,
  activeType,
  onTypeChange,
  priceMin,
  priceMax,
  onPriceMinChange,
  onPriceMaxChange,
  bedrooms,
  onBedroomsChange,
  beds,
  onBedsChange,
  bathrooms,
  onBathroomsChange,
  hasFilters,
  onClearFilters,
  dateRange,
  onDateRangeChange,
  adults,
  onAdultsChange,
  children: childrenCount,
  onChildrenChange,
  selectedAmenities,
  onAmenitiesChange,
  locationQuery,
  onLocationQueryChange,
  availableCities,
}: NfsSearchFiltersProps) {
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  // Close location dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredCities = useMemo(() => {
    if (!locationQuery) return availableCities;
    const q = locationQuery.toLowerCase();
    return availableCities.filter((c) => c.toLowerCase().includes(q));
  }, [locationQuery, availableCities]);

  const totalGuests = adults + childrenCount;

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      onAmenitiesChange(selectedAmenities.filter((a) => a !== amenity));
    } else {
      onAmenitiesChange([...selectedAmenities, amenity]);
    }
  };

  return (
    <div data-feature="NFSTAY__FILTERS" className="space-y-3">
      {/* Results bar */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p data-feature="NFSTAY__FILTER_COUNT" className="text-sm text-foreground font-semibold shrink-0">
          {resultCount}+ results
        </p>
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto">
          <div data-feature="NFSTAY__FILTER_SORT" className="flex items-center border border-border rounded-lg overflow-hidden">
            <span className="text-[10px] sm:text-xs text-muted-foreground px-2 sm:px-3">Sort by:</span>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="h-8 sm:h-9 w-[86px] sm:w-[120px] text-[10px] sm:text-xs border-0 border-l border-border rounded-none shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevant">Relevant</SelectItem>
                <SelectItem value="price-asc">Price: Low → High</SelectItem>
                <SelectItem value="price-desc">Price: High → Low</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 sm:h-9 text-[10px] sm:text-xs gap-1 sm:gap-1.5 rounded-lg"
            onClick={onToggleFilters}
          >
            <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Filters
            {hasFilters && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </Button>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 sm:h-9 text-[10px] sm:text-xs text-destructive gap-1"
              onClick={onClearFilters}
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Expanded filters panel */}
      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4 overflow-x-hidden">
          {/* Row 1: Location autocomplete + Date range + Guest count */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start gap-3 sm:gap-4">
            {/* Location Autocomplete */}
            <div data-feature="NFSTAY__FILTER_LOCATION" className="relative" ref={locationRef}>
              <span className="text-xs font-medium text-muted-foreground block mb-1">Location:</span>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search cities..."
                  value={locationQuery}
                  onChange={(e) => {
                    onLocationQueryChange(e.target.value);
                    setLocationOpen(true);
                  }}
                  onFocus={() => setLocationOpen(true)}
                  className="w-full sm:w-[180px] h-8 pl-8 pr-2 text-xs border border-input rounded-md bg-card outline-none focus:border-primary"
                  data-testid="location-input"
                />
              </div>
              {locationOpen && filteredCities.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full sm:w-[180px] bg-card border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
                  {filteredCities.map((city) => (
                    <button
                      key={city}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition"
                      onClick={() => {
                        onLocationQueryChange(city);
                        setLocationOpen(false);
                      }}
                      data-testid={`location-option-${city}`}
                    >
                      <MapPin className="w-3 h-3 inline mr-1.5 text-muted-foreground" />
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range Picker */}
            <div data-feature="NFSTAY__FILTER_DATES">
              <span className="text-xs font-medium text-muted-foreground block mb-1">Dates:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 h-8 px-3 text-xs border border-input rounded-md bg-card hover:border-primary transition"
                    data-testid="date-filter-trigger"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={cn(dateRange?.from ? "text-foreground" : "text-muted-foreground")}>
                      {dateRange?.from
                        ? `${format(dateRange.from, 'MMM d')}${dateRange.to ? ` – ${format(dateRange.to, 'MMM d')}` : ''}`
                        : 'Check in – Check out'}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="bottom">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={onDateRangeChange}
                    numberOfMonths={2}
                    disabled={{ before: new Date() }}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Guest Count */}
            <div data-feature="NFSTAY__FILTER_GUESTS">
              <span className="text-xs font-medium text-muted-foreground block mb-1">Guests:</span>
              <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 h-8 px-3 text-xs border border-input rounded-md bg-card hover:border-primary transition"
                    data-testid="guest-filter-trigger"
                  >
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={cn(totalGuests > 0 ? "text-foreground" : "text-muted-foreground")}>
                      {totalGuests > 0 ? `${totalGuests} guest${totalGuests !== 1 ? 's' : ''}` : 'Add guests'}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4">
                  <GuestStepper
                    label="Adults"
                    sub="Ages 13+"
                    value={adults}
                    onChange={onAdultsChange}
                    min={0}
                  />
                  <GuestStepper
                    label="Children"
                    sub="Ages 2-12"
                    value={childrenCount}
                    onChange={onChildrenChange}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Row 2: Type + Price + Bedrooms/Beds/Bathrooms */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
            <div data-feature="NFSTAY__FILTER_TYPE" className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Type:</span>
              <Select value={activeType} onValueChange={onTypeChange}>
                <SelectTrigger className="h-8 w-28 sm:w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div data-feature="NFSTAY__FILTER_PRICE" className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Price / night:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => onPriceMinChange(e.target.value)}
                  className="w-16 sm:w-20 h-8 px-2 text-xs border border-input rounded-md bg-card outline-none focus:border-primary"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => onPriceMaxChange(e.target.value)}
                  className="w-16 sm:w-20 h-8 px-2 text-xs border border-input rounded-md bg-card outline-none focus:border-primary"
                />
              </div>
            </div>
            <div data-feature="NFSTAY__FILTER_BEDROOMS" className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Bedrooms:</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => onBedroomsChange(n)}
                    className={`w-8 h-8 rounded-md text-xs font-medium border transition ${
                      bedrooms === n
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border hover:border-foreground'
                    }`}
                  >
                    {n === 0 ? 'Any' : n === 5 ? '5+' : n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Beds:</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => onBedsChange(n)}
                    className={`w-8 h-8 rounded-md text-xs font-medium border transition ${
                      beds === n
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border hover:border-foreground'
                    }`}
                  >
                    {n === 0 ? 'Any' : n === 5 ? '5+' : n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Bathrooms:</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => onBathroomsChange(n)}
                    className={`w-8 h-8 rounded-md text-xs font-medium border transition ${
                      bathrooms === n
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border hover:border-foreground'
                    }`}
                  >
                    {n === 0 ? 'Any' : n === 5 ? '5+' : n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Amenities collapsible */}
          <Collapsible open={amenitiesOpen} onOpenChange={setAmenitiesOpen}>
            <CollapsibleTrigger asChild>
              <button
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition"
                data-testid="amenities-toggle"
              >
                {amenitiesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Amenities
                {selectedAmenities.length > 0 && (
                  <span className="text-primary font-semibold">({selectedAmenities.length})</span>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-3"
                data-testid="amenities-grid"
              >
                {AMENITY_OPTIONS.map((amenity) => (
                  <label
                    key={amenity}
                    className="flex items-center gap-2 text-xs cursor-pointer select-none min-h-[44px] py-1"
                  >
                    <Checkbox
                      checked={selectedAmenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                      data-testid={`amenity-${amenity}`}
                    />
                    {amenity}
                  </label>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
