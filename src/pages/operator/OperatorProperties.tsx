import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus, Search, MoreHorizontal, Eye, Pencil, Trash2,
  LayoutGrid, List, EyeOff, FileText, SlidersHorizontal,
  X, ChevronUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { NfsPropertyCard } from "@/components/nfs/NfsPropertyCard";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { useNfsOperatorProperties, useNfsDeleteProperty, useNfsUpdatePropertyStatus } from "@/hooks/useNfsOperator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

/* ── filter defaults ── */
const DEFAULT_FILTERS = {
  status:   "all" as "all" | "listed" | "draft" | "unlisted",
  source:   "all" as "all" | "airbnb" | "nfstay",
  bedrooms: 0,
};
type Filters = typeof DEFAULT_FILTERS;

/* ── stepper row (same pattern as calendar) ── */
function StepperRow({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-full"
          disabled={value <= 0} onClick={() => onChange(Math.max(0, value - 1))}>
          <ChevronDown className="w-3 h-3" />
        </Button>
        <span className="text-sm font-semibold w-6 text-center">
          {value === 0 ? "Any" : `${value}+`}
        </span>
        <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-full"
          onClick={() => onChange(value + 1)}>
          <ChevronUp className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function activeFilterCount(f: Filters) {
  let n = 0;
  if (f.status !== "all") n++;
  if (f.source !== "all") n++;
  if (f.bedrooms > 0) n++;
  return n;
}

/* ── source badge ── */
function SourceBadge({ property }: { property: Record<string, unknown> }) {
  if (property.hospitable_property_id) {
    return (
      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
        Airbnb
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
      NFStay
    </span>
  );
}

export default function OperatorProperties() {
  const { formatPrice } = useCurrency();
  const { operatorId } = useAuth();
  const { data: realProperties, isLoading } = useNfsOperatorProperties(operatorId);
  const deleteProperty = useNfsDeleteProperty();
  const updateStatus = useNfsUpdatePropertyStatus();

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "grid">("table");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<"delete" | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const operatorProps = (realProperties ?? []) as Record<string, unknown>[];

  const filtered = useMemo(() => {
    let props = [...operatorProps];
    const term = search.trim().toLowerCase();
    if (term) {
      props = props.filter(p =>
        (String(p.public_title ?? "").toLowerCase().includes(term)) ||
        (String(p.internal_name ?? "").toLowerCase().includes(term)) ||
        (String(p.city ?? "").toLowerCase().includes(term))
      );
    }
    if (filters.status !== "all") {
      props = props.filter(p => p.listing_status === filters.status);
    }
    if (filters.source === "airbnb") {
      props = props.filter(p => !!p.hospitable_property_id);
    } else if (filters.source === "nfstay") {
      props = props.filter(p => !p.hospitable_property_id);
    }
    if (filters.bedrooms > 0) {
      props = props.filter(p => {
        const rc = p.room_counts as Record<string, number> | null;
        return (rc?.bedrooms ?? 0) >= filters.bedrooms;
      });
    }
    return props;
  }, [operatorProps, search, filters]);

  const activeFilters = activeFilterCount(filters);

  /* ── selection ── */
  const allFilteredIds = useMemo(() => new Set(filtered.map(p => String(p.id))), [filtered]);
  const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(String(p.id)));
  const someSelected = filtered.some(p => selectedIds.has(String(p.id)));
  const selectedInFiltered = filtered.filter(p => selectedIds.has(String(p.id)));

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) allFilteredIds.forEach(id => next.delete(id));
      else allFilteredIds.forEach(id => next.add(id));
      return next;
    });

  const clearSelection = () => setSelectedIds(new Set());

  const propTitle = (p: Record<string, unknown>) =>
    String(p.public_title ?? "").trim() || "Untitled draft";

  /* ── single actions ── */
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteProperty.mutateAsync(confirmDelete.id);
      toast({ title: "Property deleted", description: `"${confirmDelete.title}" has been permanently deleted.` });
    } catch {
      toast({ title: "Delete failed", description: "Could not delete the property. Try again.", variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleStatusChange = async (propertyId: string, status: "draft" | "listed", title: string) => {
    try {
      await updateStatus.mutateAsync({ propertyId, status });
      toast({
        title: status === "listed" ? "Property published" : "Moved to draft",
        description: status === "listed" ? `"${title}" is now live.` : `"${title}" is now hidden from guests.`,
      });
    } catch {
      toast({ title: "Update failed", description: "Could not update property status. Try again.", variant: "destructive" });
    }
  };

  /* ── bulk actions ── */
  const handleBulkStatus = async (status: "listed" | "draft") => {
    const ids = Array.from(selectedIds);
    let success = 0;
    for (const id of ids) {
      try { await updateStatus.mutateAsync({ propertyId: id, status }); success++; } catch { /* continue */ }
    }
    toast({ title: status === "listed" ? `${success} properties published` : `${success} moved to draft` });
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    let success = 0;
    for (const id of ids) {
      try { await deleteProperty.mutateAsync(id); success++; } catch { /* continue */ }
    }
    toast({ title: `${success} ${success === 1 ? "property" : "properties"} deleted` });
    clearSelection();
    setBulkConfirm(null);
  };

  return (
    <div data-feature="NFSTAY__OP_PROPERTIES" className="p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-sm text-muted-foreground">{operatorProps.length} properties managed</p>
        </div>
        <Button data-feature="NFSTAY__OP_PROPERTIES_ADD" asChild className="rounded-lg gap-2">
          <Link to="/nfstay/properties/new"><Plus className="w-4 h-4" /> Add Property</Link>
        </Button>
      </div>

      {/* Search + Filters + View Toggle */}
      <div className="flex items-center gap-3">
        <div data-feature="NFSTAY__OP_PROPERTIES_SEARCH" className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-lg"
          />
        </div>

        {/* Filter popover */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-lg h-9 px-3 gap-1.5">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters > 0 && (
                <Badge className="h-5 w-5 p-0 text-[10px] flex items-center justify-center rounded-full">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="start">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Filters</h3>
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setFilters(DEFAULT_FILTERS)}>
                  <X className="w-3 h-3" /> Clear all
                </Button>
              )}
            </div>

            {/* Source */}
            <div className="border-b border-border pb-3 mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Source</p>
              <Select value={filters.source}
                onValueChange={v => setFilters(f => ({ ...f, source: v as Filters["source"] }))}>
                <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="airbnb">Airbnb (Hospitable)</SelectItem>
                  <SelectItem value="nfstay">NFStay only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="border-b border-border pb-3 mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Listing Status</p>
              <Select value={filters.status}
                onValueChange={v => setFilters(f => ({ ...f, status: v as Filters["status"] }))}>
                <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="listed">Listed</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rooms */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Rooms</p>
              <StepperRow label="Bedrooms" value={filters.bedrooms}
                onChange={v => setFilters(f => ({ ...f, bedrooms: v }))} />
            </div>
          </PopoverContent>
        </Popover>

        {/* View toggle */}
        <div data-feature="NFSTAY__OP_PROPERTIES_FILTER"
          className="flex border border-border rounded-lg overflow-hidden">
          <button onClick={() => setView("table")}
            className={`p-2 ${view === "table" ? "bg-secondary" : "hover:bg-secondary/50"}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setView("grid")}
            className={`p-2 ${view === "grid" ? "bg-secondary" : "hover:bg-secondary/50"}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      {activeFilters > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.source !== "all" && (
            <Badge variant="secondary" className="gap-1 rounded-full pr-1.5">
              {filters.source === "airbnb" ? "Airbnb" : "NFStay"}
              <button className="ml-0.5 hover:text-foreground"
                onClick={() => setFilters(f => ({ ...f, source: "all" }))}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.status !== "all" && (
            <Badge variant="secondary" className="gap-1 rounded-full pr-1.5 capitalize">
              {filters.status}
              <button className="ml-0.5 hover:text-foreground"
                onClick={() => setFilters(f => ({ ...f, status: "all" }))}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.bedrooms > 0 && (
            <Badge variant="secondary" className="gap-1 rounded-full pr-1.5">
              {filters.bedrooms}+ Bedrooms
              <button className="ml-0.5 hover:text-foreground"
                onClick={() => setFilters(f => ({ ...f, bedrooms: 0 }))}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <NfsEmptyState
          icon={Search}
          title="No properties found"
          description={search || activeFilters > 0 ? "Try different search or filter options" : "Add your first property to get started"}
          actionLabel={search || activeFilters > 0 ? undefined : "Add Property"}
          onAction={search || activeFilters > 0 ? undefined : () => { window.location.href = "/nfstay/properties/new"; }}
        />
      ) : view === "table" ? (
        <div data-feature="NFSTAY__OP_PROPERTIES_LIST"
          className="bg-card border border-border rounded-2xl overflow-hidden">

          {/* Bulk action bar */}
          {someSelected && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border-b border-primary/20">
              <span className="text-sm font-semibold text-primary">
                {selectedInFiltered.length} selected
              </span>
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <Button size="sm" variant="outline" className="h-7 text-xs rounded-full gap-1.5"
                  onClick={() => handleBulkStatus("listed")} disabled={updateStatus.isPending}>
                  <FileText className="w-3.5 h-3.5" /> Publish all
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs rounded-full gap-1.5"
                  onClick={() => handleBulkStatus("draft")} disabled={updateStatus.isPending}>
                  <EyeOff className="w-3.5 h-3.5" /> Draft all
                </Button>
                <Button size="sm" variant="outline"
                  className="h-7 text-xs rounded-full gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setBulkConfirm("delete")} disabled={deleteProperty.isPending}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete all
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full"
                  onClick={clearSelection}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left bg-muted/30">
                  <th className="p-4 w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="p-4 font-medium text-muted-foreground">Property</th>
                  <th className="p-4 font-medium text-muted-foreground">Type</th>
                  <th className="p-4 font-medium text-muted-foreground">Location</th>
                  <th className="p-4 font-medium text-muted-foreground">Rate/night</th>
                  <th className="p-4 font-medium text-muted-foreground">Status</th>
                  <th className="p-4 font-medium text-muted-foreground w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const pid = String(p.id);
                  const images = p.images as { url: string; is_cover?: boolean }[] | undefined;
                  const coverUrl = images?.find(i => i.is_cover)?.url ?? images?.[0]?.url ?? "";
                  const rc = p.room_counts as Record<string, number> | null;
                  return (
                    <tr key={pid}
                      className={`border-b border-border last:border-0 transition-colors ${selectedIds.has(pid) ? "bg-primary/5" : "hover:bg-muted/20"}`}>
                      {/* Checkbox */}
                      <td className="p-4 w-10">
                        <Checkbox
                          checked={selectedIds.has(pid)}
                          onCheckedChange={() => toggleSelect(pid)}
                          aria-label={`Select ${propTitle(p)}`}
                        />
                      </td>
                      {/* Property */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {coverUrl ? (
                            <img src={coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground text-xs">No img</div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link to={`/nfstay/properties/${pid}`}
                                className="font-medium hover:text-primary transition-colors">
                                {String(p.public_title ?? "").trim() || (
                                  <span className="text-muted-foreground italic">Untitled draft</span>
                                )}
                              </Link>
                              <SourceBadge property={p} />
                            </div>
                            {p.internal_name && (
                              <p className="text-xs text-muted-foreground/70 italic mt-0.5 truncate">
                                {String(p.internal_name)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {rc?.bedrooms != null ? `${rc.bedrooms} bed · ` : ""}
                              {rc?.bathrooms != null ? `${rc.bathrooms} bath · ` : ""}
                              {p.max_guests ? `${p.max_guests} guests` : "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{String(p.property_type ?? "") || "—"}</td>
                      <td className="p-4 text-muted-foreground">
                        {p.city && p.country
                          ? `${p.city}, ${p.country}`
                          : String(p.city ?? p.country ?? "") || (
                            <span className="italic text-muted-foreground/60">No location</span>
                          )}
                      </td>
                      <td className="p-4 font-medium">{formatPrice(Number(p.base_rate_amount ?? 0))}</td>
                      <td className="p-4"><NfsStatusBadge status={String(p.listing_status ?? "")} /></td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-secondary">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {p.listing_status === "listed" && (
                              <DropdownMenuItem asChild>
                                <Link to={`/property/${String(p.slug ?? pid)}`} className="gap-2 flex items-center">
                                  <Eye className="w-4 h-4" /> View listing
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <Link to={`/nfstay/properties/${pid}`} className="gap-2 flex items-center">
                                <Pencil className="w-4 h-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            {p.listing_status === "listed" ? (
                              <DropdownMenuItem className="gap-2"
                                onClick={() => handleStatusChange(pid, "draft", propTitle(p))}
                                disabled={updateStatus.isPending}>
                                <EyeOff className="w-4 h-4" /> Move to draft
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="gap-2"
                                onClick={() => handleStatusChange(pid, "listed", propTitle(p))}
                                disabled={updateStatus.isPending}>
                                <FileText className="w-4 h-4" /> Publish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive gap-2 focus:text-destructive"
                              onClick={() => setConfirmDelete({ id: pid, title: propTitle(p) })}>
                              <Trash2 className="w-4 h-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => {
            const pid = String(p.id);
            return (
              <div key={pid} className="relative group">
                {/* Checkbox overlay */}
                <div className={`absolute top-3 left-3 z-10 transition-opacity ${selectedIds.has(pid) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  <div className="bg-white/90 backdrop-blur-sm rounded-md p-0.5 shadow-sm">
                    <Checkbox
                      checked={selectedIds.has(pid)}
                      onCheckedChange={() => toggleSelect(pid)}
                      aria-label={`Select ${propTitle(p)}`}
                    />
                  </div>
                </div>
                {/* Source badge */}
                <div className="absolute top-3 right-3 z-10">
                  <SourceBadge property={p} />
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <NfsPropertyCard property={p as any} />
              </div>
            );
          })}
        </div>
      )}

      {/* Single delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete property?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{confirmDelete?.title}"</strong> will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProperty.isPending}>
              {deleteProperty.isPending ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkConfirm === "delete"} onOpenChange={open => { if (!open) setBulkConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedInFiltered.length} {selectedInFiltered.length === 1 ? "property" : "properties"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {selectedInFiltered.length} selected{" "}
              {selectedInFiltered.length === 1 ? "property" : "properties"}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProperty.isPending}>
              {deleteProperty.isPending ? "Deleting…" : `Delete ${selectedInFiltered.length} ${selectedInFiltered.length === 1 ? "property" : "properties"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
