import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { NfsPropertyCard } from "@/components/nfs/NfsPropertyCard";
import { NfsSearchFilters } from "@/components/nfs/NfsSearchFilters";
import { NfsSearchMap } from "@/components/nfs/NfsSearchMap";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";
import { useWhiteLabelProperties } from "@/hooks/useWhiteLabelProperties";

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
  const { data: scopedProperties = [], isLoading } = useWhiteLabelProperties();

  const query = searchParams.get('query') || '';

  const filteredProperties = useMemo(() => {
    let props = scopedProperties.filter(p => p.listing_status === 'listed');

    if (query) {
      const q = query.toLowerCase();
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

    if (sortBy === 'price-asc') props.sort((a, b) => a.base_rate_amount - b.base_rate_amount);
    else if (sortBy === 'price-desc') props.sort((a, b) => b.base_rate_amount - a.base_rate_amount);
    else if (sortBy === 'newest') props.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return props;
  }, [query, activeType, priceMin, priceMax, bedrooms, beds, bathrooms, sortBy, scopedProperties]);

  const hasFilters = activeType !== 'All' || priceMin || priceMax || bedrooms > 0 || beds > 0 || bathrooms > 0;

  const clearFilters = () => {
    setActiveType('All');
    setPriceMin('');
    setPriceMax('');
    setBedrooms(0);
    setBeds(0);
    setBathrooms(0);
  };

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
            onTypeChange={setActiveType}
            priceMin={priceMin}
            priceMax={priceMax}
            onPriceMinChange={setPriceMin}
            onPriceMaxChange={setPriceMax}
            bedrooms={bedrooms}
            onBedroomsChange={setBedrooms}
            beds={beds}
            onBedsChange={setBeds}
            bathrooms={bathrooms}
            onBathroomsChange={setBathrooms}
            hasFilters={!!hasFilters}
            onClearFilters={clearFilters}
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
            <div data-feature="NFSTAY__SEARCH_RESULTS" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 pt-3">
              {filteredProperties.map((p) => (
                <NfsPropertyCard key={p.id} property={p} onHover={setHoveredId} />
              ))}
            </div>
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
