import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, ChevronUp, ChevronDown } from "lucide-react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useNfsOperator } from "@/hooks/useNfsOperator";
import { useNfsOperatorReservations } from "@/hooks/useNfsReservations";
import { useNfsOperatorProperties } from "@/hooks/useNfsProperties";
import { useNfsBlockedDates, useNfsBlockDateRange } from "@/hooks/useNfsBlockedDates";
import { NfsMultiCalendar } from "@/components/nfs/NfsMultiCalendar";

/* ── filter defaults ── */
const DEFAULT_FILTERS = {
  bedrooms:   0,
  beds:       0,
  bathrooms:  0,
  status:     "all" as "all" | "listed" | "unlisted" | "draft",
};

type Filters = typeof DEFAULT_FILTERS;

/* ── stepper row ── */
function StepperRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <ChevronDown className="w-3 h-3" />
        </Button>
        <span className="text-sm font-semibold w-6 text-center">
          {value === 0 ? "Any" : `${value}+`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={() => onChange(value + 1)}
        >
          <ChevronUp className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

/* ── count active filters ── */
function activeFilterCount(f: Filters) {
  let n = 0;
  if (f.bedrooms > 0)  n++;
  if (f.beds > 0)      n++;
  if (f.bathrooms > 0) n++;
  if (f.status !== "all") n++;
  return n;
}

export default function OperatorCalendar() {
  const { user } = useAuth();
  const { data: operator } = useNfsOperator(user?.id);

  const { data: properties = [], isLoading: propsLoading } =
    useNfsOperatorProperties(operator?.id ?? null);

  const { data: reservations = [], isLoading: resLoading } =
    useNfsOperatorReservations(operator?.id ?? null);

  const propertyIds = useMemo(() => properties.map((p) => p.id), [properties]);

  const { data: blockedDates = [], isLoading: blockedLoading } =
    useNfsBlockedDates(propertyIds);

  const blockRange = useNfsBlockDateRange();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  /* ── filter + search ── */
  const filteredProperties = useMemo(() => {
    let props = [...properties];

    // text search
    const q = search.trim().toLowerCase();
    if (q) {
      props = props.filter(
        (p) =>
          p.public_title.toLowerCase().includes(q) ||
          (p.city ?? "").toLowerCase().includes(q) ||
          (p.country ?? "").toLowerCase().includes(q),
      );
    }

    // rooms filters
    if (filters.bedrooms > 0)
      props = props.filter((p) => (p.room_counts?.bedrooms ?? 0) >= filters.bedrooms);
    if (filters.beds > 0)
      props = props.filter((p) => (p.room_counts?.beds ?? 0) >= filters.beds);
    if (filters.bathrooms > 0)
      props = props.filter((p) => (p.room_counts?.bathrooms ?? 0) >= filters.bathrooms);

    // status filter
    if (filters.status !== "all")
      props = props.filter((p) => p.listing_status === filters.status);

    return props;
  }, [properties, search, filters]);

  const activeFilters = activeFilterCount(filters);

  /* ── single-property range block handler ── */
  const handleRangeBlock = async (
    propertyId: string,
    fromDate: string,
    toDate: string,
    block: boolean,
  ) => {
    try {
      const from = parseISO(fromDate);
      const to   = parseISO(toDate);
      const dates = eachDayOfInterval({ start: from, end: to }).map((d) =>
        format(d, "yyyy-MM-dd"),
      );
      await blockRange.mutateAsync({ propertyId, dates, block });
      toast.success(
        block
          ? `${dates.length} date${dates.length === 1 ? "" : "s"} blocked`
          : `${dates.length} date${dates.length === 1 ? "" : "s"} unblocked`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update availability",
      );
      throw err; // re-throw so dialog stays open on error
    }
  };

  /* ── multi-property bulk block handler ── */
  const handleMultiRangeBlock = async (
    propertyIds: string[],
    fromDate: string,
    toDate: string,
    block: boolean,
  ) => {
    const from  = parseISO(fromDate);
    const to    = parseISO(toDate);
    const dates = eachDayOfInterval({ start: from, end: to }).map((d) =>
      format(d, "yyyy-MM-dd"),
    );
    let success = 0;
    for (const propertyId of propertyIds) {
      try {
        await blockRange.mutateAsync({ propertyId, dates, block });
        success++;
      } catch { /* continue with remaining */ }
    }
    if (success > 0) {
      toast.success(
        block
          ? `${dates.length} date${dates.length === 1 ? "" : "s"} blocked across ${success} ${success === 1 ? "property" : "properties"}`
          : `${dates.length} date${dates.length === 1 ? "" : "s"} unblocked across ${success} ${success === 1 ? "property" : "properties"}`,
      );
    } else {
      toast.error("Failed to update availability");
    }
  };

  const isLoading = propsLoading || resLoading || blockedLoading;

  return (
    <div
      data-feature="NFSTAY__OP_CALENDAR"
      className="p-4 sm:p-6 space-y-5 max-w-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View reservations and manage availability across all properties
          </p>
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search properties…"
              className="pl-9 rounded-full h-9 text-sm"
            />
          </div>

          {/* Filter Popover */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-9 px-3 gap-1.5 flex-shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilters > 0 && (
                  <Badge className="h-5 w-5 p-0 text-[10px] flex items-center justify-center rounded-full">
                    {activeFilters}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Filters</h3>
                {activeFilters > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                  >
                    <X className="w-3 h-3" />
                    Clear all
                  </Button>
                )}
              </div>

              {/* Rooms & Beds */}
              <div className="border-b border-border pb-3 mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Rooms &amp; Beds
                </p>
                <StepperRow
                  label="Bedrooms"
                  value={filters.bedrooms}
                  onChange={(v) => setFilters((f) => ({ ...f, bedrooms: v }))}
                />
                <StepperRow
                  label="Beds"
                  value={filters.beds}
                  onChange={(v) => setFilters((f) => ({ ...f, beds: v }))}
                />
                <StepperRow
                  label="Bathrooms"
                  value={filters.bathrooms}
                  onChange={(v) => setFilters((f) => ({ ...f, bathrooms: v }))}
                />
              </div>

              {/* Status */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Listing Status
                </p>
                <Select
                  value={filters.status}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, status: v as Filters["status"] }))
                  }
                >
                  <SelectTrigger className="h-9 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="listed">Listed</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.bedrooms > 0 && (
            <Badge variant="secondary" className="gap-1 rounded-full pr-1.5">
              {filters.bedrooms}+ Bedrooms
              <button
                className="ml-0.5 hover:text-foreground"
                onClick={() => setFilters((f) => ({ ...f, bedrooms: 0 }))}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.beds > 0 && (
            <Badge variant="secondary" className="gap-1 rounded-full pr-1.5">
              {filters.beds}+ Beds
              <button
                className="ml-0.5 hover:text-foreground"
                onClick={() => setFilters((f) => ({ ...f, beds: 0 }))}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.bathrooms > 0 && (
            <Badge variant="secondary" className="gap-1 rounded-full pr-1.5">
              {filters.bathrooms}+ Bathrooms
              <button
                className="ml-0.5 hover:text-foreground"
                onClick={() => setFilters((f) => ({ ...f, bathrooms: 0 }))}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.status !== "all" && (
            <Badge variant="secondary" className="gap-1 rounded-full pr-1.5 capitalize">
              {filters.status}
              <button
                className="ml-0.5 hover:text-foreground"
                onClick={() => setFilters((f) => ({ ...f, status: "all" }))}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Calendar */}
      <NfsMultiCalendar
        properties={filteredProperties}
        reservations={reservations}
        blockedDates={blockedDates}
        onRangeBlock={handleRangeBlock}
        onMultiRangeBlock={handleMultiRangeBlock}
        loading={isLoading}
      />
    </div>
  );
}
