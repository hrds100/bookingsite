import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { differenceInDays } from "date-fns";
import { NfsPropertyCard } from "@/components/nfs/NfsPropertyCard";
import { NfsSearchFilters } from "@/components/nfs/NfsSearchFilters";
import { NfsSearchMap } from "@/components/nfs/NfsSearchMap";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useWhiteLabelProperties } from "@/hooks/useWhiteLabelProperties";
import type { DateRange } from "react-day-picker";

const PAGE_SIZE = 12;

export default function NfsSearchPage() {
  const [searchParams] = useSearchParams();
  const [activeType, setActiveType] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [bedrooms, setBedrooms] = useState(0);
  const [beds, setBeds] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [sortBy, setSortBy] = useState('relevant');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // New filter state
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [locationQuery, setLocationQuery] = useState('');

  const { data: scopedProperties = [], isLoading } = useWhiteLabelProperties();

  const query = searchParams.get('query') || '';

  // Extract unique cities from property data for autocomplete
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    scopedProperties.forEach((p) => {
      if (p.listing_status === 'listed') {
        cities.add(p.city);
      }
    });
    return Array.from(cities).sort();
  }, [scopedProperties]);

  const filteredProperties = useMemo(() => {
    let props = scopedProperties.filter(p => p.listing_status === 'listed');

    // Location: use locationQuery if set, otherwise fall back to URL query param
    const locationSearch = locationQuery || query;
    if (locationSearch) {
      const q = locationSearch.toLowerCase();
      props = props.filter(p =>
        p.city.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.public_title.toLowerCase().includes(q)
      );
    }

    if (activeType !== 'All') {
      const typeName = activeType.toLowerCase();
      props = props.filter(p => p.property_type.toLowerCase().includes(typeName));
    }

    if (priceMin) props = props.filter(p => p.base_rate_amount >= Number(priceMin));
    if (priceMax) props = props.filter(p => p.base_rate_amount <= Number(priceMax));
    if (bedrooms > 0) props = props.filter(p => p.room_counts.bedrooms >= bedrooms);
    if (beds > 0) props = props.filter(p => (p.room_counts.beds ?? p.room_counts.bedrooms) >= beds);
    if (bathrooms > 0) props = props.filter(p => p.room_counts.bathrooms >= bathrooms);

    // Date range filter: filter by minimum_stay when dates selected
    if (dateRange?.from && dateRange?.to) {
      const nights = differenceInDays(dateRange.to, dateRange.from);
      if (nights > 0) {
        props = props.filter(p => p.minimum_stay <= nights);
      }
    }

    // Guest count filter: max_guests >= total guests
    const totalGuests = adults + children;
    if (totalGuests > 0) {
      props = props.filter(p => p.max_guests >= totalGuests);
    }

    // Amenity filter: property must have ALL selected amenities
    if (selectedAmenities.length > 0) {
      props = props.filter(p =>
        selectedAmenities.every(amenity => p.amenities[amenity] === true)
      );
    }

    if (sortBy === 'price-asc') props.sort((a, b) => a.base_rate_amount - b.base_rate_amount);
    else if (sortBy === 'price-desc') props.sort((a, b) => b.base_rate_amount - a.base_rate_amount);
    else if (sortBy === 'newest') props.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return props;
  }, [query, locationQuery, activeType, priceMin, priceMax, bedrooms, beds, bathrooms, sortBy, scopedProperties, dateRange, adults, children, selectedAmenities]);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  if (safePage !== currentPage) {
    // Will correct on next render
    setTimeout(() => setCurrentPage(safePage), 0);
  }

  const paginatedProperties = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProperties.slice(start, start + PAGE_SIZE);
  }, [filteredProperties, safePage]);

  const hasFilters = activeType !== 'All' || priceMin || priceMax || bedrooms > 0 || beds > 0 || bathrooms > 0
    || (dateRange?.from !== undefined) || adults > 0 || children > 0 || selectedAmenities.length > 0 || locationQuery !== '';

  const clearFilters = () => {
    setActiveType('All');
    setPriceMin('');
    setPriceMax('');
    setBedrooms(0);
    setBeds(0);
    setBathrooms(0);
    setDateRange(undefined);
    setAdults(0);
    setChildren(0);
    setSelectedAmenities([]);
    setLocationQuery('');
    setCurrentPage(1);
  };

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push(-1); // ellipsis
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push(-1); // ellipsis
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  return (
    <div data-feature="NFSTAY__SEARCH" className="flex h-[calc(100vh-80px)] w-full overflow-x-hidden">
      {/* Left panel – listings */}
      <div className="w-full lg:w-[50%] flex flex-col overflow-hidden border-r border-border">
        <div className="px-5 pt-4 pb-2 shrink-0">
          <NfsSearchFilters
            data-feature="NFSTAY__SEARCH_FILTERS"
            resultCount={filteredProperties.length}
            sortBy={sortBy}
            onSortChange={setSortBy}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            activeType={activeType}
            onTypeChange={(t) => { setActiveType(t); setCurrentPage(1); }}
            priceMin={priceMin}
            priceMax={priceMax}
            onPriceMinChange={(v) => { setPriceMin(v); setCurrentPage(1); }}
            onPriceMaxChange={(v) => { setPriceMax(v); setCurrentPage(1); }}
            bedrooms={bedrooms}
            onBedroomsChange={(n) => { setBedrooms(n); setCurrentPage(1); }}
            beds={beds}
            onBedsChange={(n) => { setBeds(n); setCurrentPage(1); }}
            bathrooms={bathrooms}
            onBathroomsChange={(n) => { setBathrooms(n); setCurrentPage(1); }}
            hasFilters={!!hasFilters}
            onClearFilters={clearFilters}
            dateRange={dateRange}
            onDateRangeChange={(r) => { setDateRange(r); setCurrentPage(1); }}
            adults={adults}
            onAdultsChange={(n) => { setAdults(n); setCurrentPage(1); }}
            children={children}
            onChildrenChange={(n) => { setChildren(n); setCurrentPage(1); }}
            selectedAmenities={selectedAmenities}
            onAmenitiesChange={(a) => { setSelectedAmenities(a); setCurrentPage(1); }}
            locationQuery={locationQuery}
            onLocationQueryChange={(v) => { setLocationQuery(v); setCurrentPage(1); }}
            availableCities={availableCities}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredProperties.length === 0 ? (
            <NfsEmptyState
              icon={Search}
              title="No exact matches"
              description="Try adjusting your search or clearing some filters"
              actionLabel="Clear all filters"
              onAction={clearFilters}
            />
          ) : (
            <>
              <div data-feature="NFSTAY__SEARCH_RESULTS" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 pt-3">
                {paginatedProperties.map((p) => (
                  <NfsPropertyCard key={p.id} property={p} onHover={setHoveredId} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div data-testid="search-pagination" className="mt-8 mb-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                          className={safePage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          aria-disabled={safePage === 1}
                        />
                      </PaginationItem>
                      {pageNumbers.map((num, idx) =>
                        num === -1 ? (
                          <PaginationItem key={`ellipsis-${idx}`}>
                            <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">...</span>
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={num}>
                            <PaginationLink
                              isActive={num === safePage}
                              onClick={() => setCurrentPage(num)}
                              className="cursor-pointer"
                              data-testid={`page-${num}`}
                            >
                              {num}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                          className={safePage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          aria-disabled={safePage === totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right panel – map (hidden on mobile) */}
      <div data-feature="NFSTAY__SEARCH_MAP" className="hidden lg:block flex-1">
        <NfsSearchMap properties={filteredProperties} hoveredId={hoveredId} />
      </div>
    </div>
  );
}
