import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  format, addDays, startOfDay, parseISO,
  differenceInDays, isToday, isBefore,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import { ChevronLeft, ChevronRight, CalendarDays, Ban, Unlock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { MockProperty } from "@/data/mock-properties";
import type { ReservationWithProperty } from "@/hooks/useNfsReservations";
import type { BlockedDate } from "@/hooks/useNfsBlockedDates";
import type { DateOverride } from "@/hooks/useNfsDateOverrides";

/* ── layout constants ─────────────────────────── */
const CELL_W = 56;   // px per day column
const ROW_H  = 64;   // px per property row
const PROP_W = 224;  // px for left property column
const DAYS   = 14;   // days visible at once

/* ── helpers ──────────────────────────────────── */
function resColor(status: string) {
  if (status === "pending_approval") return "bg-amber-500";
  if (status === "cancelled")        return "bg-rose-400";
  return "bg-primary";
}
function fmtRate(rate: number, sym = "£") { return `${sym}${rate}`; }

/* ── drag-selection type ──────────────────────── */
interface DragSelection {
  startPropIdx: number;
  startDateIdx: number;
  endPropIdx:   number;
  endDateIdx:   number;
}

function getRange(sel: DragSelection) {
  return {
    minPropIdx: Math.min(sel.startPropIdx, sel.endPropIdx),
    maxPropIdx: Math.max(sel.startPropIdx, sel.endPropIdx),
    minDateIdx: Math.min(sel.startDateIdx, sel.endDateIdx),
    maxDateIdx: Math.max(sel.startDateIdx, sel.endDateIdx),
  };
}

/* ── single-property dialog type ─────────────── */
interface RangeModal {
  propertyId:   string;
  propertyName: string;
  anchorDate:   Date;
}

/* ── props ────────────────────────────────────── */
export interface NfsMultiCalendarProps {
  properties:    MockProperty[];
  reservations:  ReservationWithProperty[];
  blockedDates:  BlockedDate[];
  dateOverrides?: DateOverride[];
  onRangeBlock:  (propertyId: string, fromDate: string, toDate: string, block: boolean) => Promise<void>;
  /** Fires when a drag selection is saved across multiple properties. If omitted, falls back to per-property onRangeBlock calls. */
  onMultiRangeBlock?: (propertyIds: string[], fromDate: string, toDate: string, block: boolean) => Promise<void>;
  /** Fires when a price/minstay override is saved for multiple properties */
  onMultiRangeOverride?: (
    propertyIds: string[],
    fromDate: string,
    toDate: string,
    field: "custom_price" | "min_stay",
    value: number | null,
  ) => Promise<void>;
  loading?: boolean;
}

/* ── component ────────────────────────────────── */
export function NfsMultiCalendar({
  properties,
  reservations,
  blockedDates,
  dateOverrides = [],
  onRangeBlock,
  onMultiRangeBlock,
  onMultiRangeOverride,
  loading,
}: NfsMultiCalendarProps) {
  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const today = startOfDay(new Date());

  /* ── single-property dialog ── */
  const [rangeModal, setRangeModal]         = useState<RangeModal | null>(null);
  const [rangeSelection, setRangeSelection] = useState<DateRange | undefined>(undefined);
  const [isSingleSubmitting, setIsSingleSubmitting] = useState(false);

  /* ── drag selection state ──
     During drag:  dragSel   is set, finalSel is null
     After drag:   dragSel   is null, finalSel is set (shows action panel)
     Single click: both null → single-property dialog opens instead
  ── */
  // refs — readable inside native event handlers without stale closures
  const isDraggingRef  = useRef(false);
  const dragStartRef   = useRef<{ propIdx: number; dateIdx: number } | null>(null);
  const dragSelRef     = useRef<DragSelection | null>(null);
  const propertiesRef  = useRef<MockProperty[]>(properties);
  const datesRef       = useRef<Date[]>([]);

  // state — drives re-renders
  const [dragSel,   setDragSel]   = useState<DragSelection | null>(null);
  const [finalSel,  setFinalSel]  = useState<DragSelection | null>(null);
  const [selAction, setSelAction] = useState<"block" | "unblock" | "price" | "minstay">("block");
  const [selPrice,    setSelPrice]    = useState<number | "">("");
  const [selMinStay,  setSelMinStay]  = useState<number | "">(1);
  const [isSelSubmitting, setIsSelSubmitting] = useState(false);

  // keep refs in sync with latest props/derived values
  useEffect(() => { propertiesRef.current = properties; }, [properties]);

  /* ── date array ── */
  const dates = useMemo(
    () => Array.from({ length: DAYS }, (_, i) => addDays(startDate, i)),
    [startDate],
  );
  useEffect(() => { datesRef.current = dates; }, [dates]);

  const endDate = useMemo(() => addDays(startDate, DAYS), [startDate]);

  /* ── blocked set: "propId::YYYY-MM-DD" ── */
  const blockedSet = useMemo(() => {
    const s = new Set<string>();
    blockedDates.forEach(b => s.add(`${b.property_id}::${b.date}`));
    return s;
  }, [blockedDates]);

  /* ── override map: "propId::YYYY-MM-DD" → DateOverride ── */
  const overrideMap = useMemo(() => {
    const m = new Map<string, DateOverride>();
    dateOverrides.forEach(o => m.set(`${o.property_id}::${o.date}`, o));
    return m;
  }, [dateOverrides]);

  const isBlocked = useCallback(
    (pid: string, date: Date) => blockedSet.has(`${pid}::${format(date, "yyyy-MM-dd")}`),
    [blockedSet],
  );

  /* ── reservations per property ── */
  const resByProp = useMemo(() => {
    const map = new Map<string, ReservationWithProperty[]>();
    properties.forEach(p => map.set(p.id, []));
    reservations.forEach(r => {
      if (r.status === "cancelled") return;
      const ci = parseISO(r.check_in);
      const co = parseISO(r.check_out);
      if (ci >= endDate || co <= startDate) return;
      map.get(r.property_id)?.push(r);
    });
    return map;
  }, [properties, reservations, startDate, endDate]);

  /* ── cell mouse-down: start drag ── */
  const handleCellMouseDown = useCallback((
    propIdx: number,
    dateIdx: number,
    inRes:   boolean,
    e:       React.MouseEvent,
  ) => {
    if (inRes) return;
    e.preventDefault(); // prevent browser text-selection cursor during drag
    isDraggingRef.current = true;
    dragStartRef.current  = { propIdx, dateIdx };
    const sel: DragSelection = { startPropIdx: propIdx, startDateIdx: dateIdx, endPropIdx: propIdx, endDateIdx: dateIdx };
    dragSelRef.current = sel;
    setDragSel(sel);
    setFinalSel(null); // clear previous selection
  }, []);

  /* ── cell mouse-enter: extend drag ── */
  const handleCellMouseEnter = useCallback((propIdx: number, dateIdx: number) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
    const sel: DragSelection = {
      startPropIdx: dragStartRef.current.propIdx,
      startDateIdx: dragStartRef.current.dateIdx,
      endPropIdx:   propIdx,
      endDateIdx:   dateIdx,
    };
    dragSelRef.current = sel;
    setDragSel(sel);
  }, []);

  /* ── document mouse-up: finalise drag ──
     Single click (start === end cell) → open single-property dialog.
     Multi-cell drag → show selection panel.
  ── */
  useEffect(() => {
    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const sel   = dragSelRef.current;
      dragStartRef.current  = null;
      dragSelRef.current    = null;
      setDragSel(null);

      if (!sel) return;

      const single =
        sel.startPropIdx === sel.endPropIdx &&
        sel.startDateIdx === sel.endDateIdx;

      if (single) {
        // Single click → per-property calendar dialog
        const property = propertiesRef.current[sel.startPropIdx];
        const date     = datesRef.current[sel.startDateIdx];
        if (property && date) {
          setRangeSelection({ from: date, to: date });
          setRangeModal({ propertyId: property.id, propertyName: property.public_title, anchorDate: date });
        }
        setFinalSel(null);
      } else {
        setFinalSel(sel);
      }
    };

    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []); // stable — all values accessed via refs

  /* ── active selection range (memo, O(1) per cell lookup) ── */
  const selRange = useMemo(() => {
    const sel = dragSel ?? finalSel;
    return sel ? getRange(sel) : null;
  }, [dragSel, finalSel]);

  const isSelected = (propIdx: number, dateIdx: number): boolean => {
    if (!selRange) return false;
    return (
      propIdx >= selRange.minPropIdx && propIdx <= selRange.maxPropIdx &&
      dateIdx >= selRange.minDateIdx && dateIdx <= selRange.maxDateIdx
    );
  };

  /* ── selection panel info ── */
  const selPanelInfo = useMemo(() => {
    if (!finalSel) return null;
    const r = getRange(finalSel);
    return {
      selectedProps: properties.slice(r.minPropIdx, r.maxPropIdx + 1),
      fromDate:      dates[r.minDateIdx],
      toDate:        dates[r.maxDateIdx],
      numDates:      r.maxDateIdx - r.minDateIdx + 1,
    };
  }, [finalSel, properties, dates]);

  /* ── save drag selection ── */
  const handleSelectionSave = async () => {
    if (!selPanelInfo) return;
    const { selectedProps, fromDate, toDate } = selPanelInfo;
    const fromStr = format(fromDate, "yyyy-MM-dd");
    const toStr   = format(toDate,   "yyyy-MM-dd");
    setIsSelSubmitting(true);
    try {
      if (selAction === "block" || selAction === "unblock") {
        const block = selAction === "block";
        if (onMultiRangeBlock && selectedProps.length > 1) {
          await onMultiRangeBlock(selectedProps.map(p => p.id), fromStr, toStr, block);
        } else {
          await Promise.all(selectedProps.map(p => onRangeBlock(p.id, fromStr, toStr, block)));
        }
      } else if (selAction === "price" || selAction === "minstay") {
        const field = selAction === "price" ? "custom_price" : "min_stay" as const;
        const rawVal = selAction === "price" ? selPrice : selMinStay;
        const value  = rawVal === "" ? null : Number(rawVal);
        if (onMultiRangeOverride) {
          await onMultiRangeOverride(selectedProps.map(p => p.id), fromStr, toStr, field, value);
        }
      }
      setFinalSel(null);
    } finally {
      setIsSelSubmitting(false);
    }
  };

  /* ── single-property dialog confirm ── */
  const handleRangeConfirm = async (block: boolean) => {
    if (!rangeModal || !rangeSelection?.from) return;
    const from = rangeSelection.from;
    const to   = rangeSelection.to ?? rangeSelection.from;
    setIsSingleSubmitting(true);
    try {
      await onRangeBlock(rangeModal.propertyId, format(from, "yyyy-MM-dd"), format(to, "yyyy-MM-dd"), block);
      setRangeModal(null);
      setRangeSelection(undefined);
    } finally {
      setIsSingleSubmitting(false);
    }
  };

  const singleDayCount = useMemo(() => {
    if (!rangeSelection?.from) return 0;
    const to = rangeSelection.to ?? rangeSelection.from;
    return differenceInDays(to, rangeSelection.from) + 1;
  }, [rangeSelection]);

  /* ── shift+click: extend existing selection ── */
  const selAnchorRef = useRef<{ propIdx: number; dateIdx: number } | null>(null);

  const handleCellShiftClick = useCallback((propIdx: number, dateIdx: number, inRes: boolean) => {
    if (inRes || !selAnchorRef.current) return;
    const anchor = selAnchorRef.current;
    setFinalSel({
      startPropIdx: anchor.propIdx,
      startDateIdx: anchor.dateIdx,
      endPropIdx:   propIdx,
      endDateIdx:   dateIdx,
    });
  }, []);

  /* ── navigation ── */
  const navigate = (delta: number) => setStartDate(prev => addDays(prev, delta * DAYS));
  const goToday  = () => setStartDate(today);

  /* ── loading / empty ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <CalendarDays className="w-12 h-12 opacity-20" />
        <p className="text-sm">No properties found</p>
      </div>
    );
  }

  const rangeLabel = `${format(startDate, "MMM d")} – ${format(addDays(startDate, DAYS - 1), "MMM d, yyyy")}`;

  /* ── render ── */
  return (
    <>
      <div className="space-y-3" data-feature="NFSTAY__OP_MULTI_CALENDAR">

        {/* ── toolbar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={goToday} className="rounded-full text-xs h-8 px-4">
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[186px] text-center select-none">{rangeLabel}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-primary" /> Confirmed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-500" /> Pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-rose-100 border border-rose-300" /> Blocked
            </span>
          </div>
        </div>

        {/* ── selection action panel (shown after a multi-cell drag) ── */}
        {selPanelInfo && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Date range */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-primary">
                {selPanelInfo.numDates} {selPanelInfo.numDates === 1 ? "date" : "dates"}
              </span>
              <span className="text-foreground font-medium">
                {format(selPanelInfo.fromDate, "MMM d")}
                {selPanelInfo.numDates > 1 && ` – ${format(selPanelInfo.toDate, "MMM d, yyyy")}`}
              </span>
            </div>

            {/* Properties count */}
            <span className="text-sm text-muted-foreground">
              {selPanelInfo.selectedProps.length === 1 ? (
                <span className="font-medium text-foreground truncate max-w-[160px] inline-block align-bottom">
                  {selPanelInfo.selectedProps[0].public_title}
                </span>
              ) : (
                <><span className="font-medium text-foreground">{selPanelInfo.selectedProps.length}</span> listings</>
              )}
            </span>

            {/* Action selector */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {(
                [
                  { val: "block",   icon: <Ban className="w-3.5 h-3.5 text-rose-500" />,   label: "Block",     accent: "accent-rose-500"  },
                  { val: "unblock", icon: <Unlock className="w-3.5 h-3.5 text-primary" />, label: "Unblock",   accent: "accent-primary"   },
                  { val: "price",   icon: null,                                             label: "Set Price", accent: "accent-amber-500" },
                  { val: "minstay", icon: null,                                             label: "Min Stay",  accent: "accent-blue-500"  },
                ] as const
              ).map(({ val, icon, label, accent }) => (
                <label key={val} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="radio" name="nfs-sel-action" value={val}
                    checked={selAction === val} onChange={() => setSelAction(val)}
                    className={accent} />
                  {icon}
                  {label}
                </label>
              ))}
            </div>

            {/* Inline value inputs */}
            {selAction === "price" && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Price / night"
                  className="h-7 w-32 text-xs rounded-full"
                  value={selPrice}
                  onChange={(e) => setSelPrice(e.target.value ? parseFloat(e.target.value) : "")}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-xs text-muted-foreground">or leave blank to clear</span>
              </div>
            )}
            {selAction === "minstay" && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Nights"
                  className="h-7 w-24 text-xs rounded-full"
                  value={selMinStay}
                  onChange={(e) => setSelMinStay(e.target.value ? parseInt(e.target.value) : "")}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-xs text-muted-foreground">min nights (blank = clear)</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <Button size="sm" variant="ghost"
                className="h-7 text-xs rounded-full text-muted-foreground"
                onClick={() => setFinalSel(null)} disabled={isSelSubmitting}>
                Clear
              </Button>
              <Button size="sm" className="h-7 text-xs rounded-full px-4"
                onClick={handleSelectionSave} disabled={isSelSubmitting}>
                {isSelSubmitting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Saving…</>
                  : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* ── calendar grid ── */}
        <div
          className="border border-border rounded-xl overflow-x-auto"
          /* Prevent native drag ghosts */
          onDragStart={e => e.preventDefault()}
        >
          <div style={{ minWidth: PROP_W + DAYS * CELL_W }}>

            {/* Header row */}
            <div className="flex border-b border-border bg-muted/30">
              <div
                className="sticky left-0 z-20 bg-muted/30 border-r border-border flex items-center px-3 flex-shrink-0"
                style={{ width: PROP_W, minWidth: PROP_W }}
              >
                <span className="text-[11px] font-medium text-muted-foreground">
                  {properties.length} {properties.length === 1 ? "property" : "properties"}
                </span>
              </div>
              {dates.map((date, dateIdx) => {
                const colSelected = selRange
                  ? dateIdx >= selRange.minDateIdx && dateIdx <= selRange.maxDateIdx
                  : false;
                return (
                  <div
                    key={date.toISOString()}
                    style={{ width: CELL_W, minWidth: CELL_W }}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 border-r border-border last:border-r-0 flex-shrink-0 transition-colors",
                      isToday(date) && !colSelected && "bg-primary/10",
                      colSelected && "bg-primary/15",
                    )}
                  >
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                      {format(date, "EEE")[0]}
                    </span>
                    <span className={cn(
                      "text-xs font-bold mt-0.5 w-6 h-6 flex items-center justify-center rounded-full",
                      isToday(date) ? "bg-primary text-white" : "text-foreground",
                    )}>
                      {format(date, "d")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Property rows */}
            {properties.map((property, propIdx) => {
              const propReservations = resByProp.get(property.id) ?? [];
              const coverImage =
                property.images?.find(i => i.is_cover)?.url ??
                property.images?.[0]?.url ?? "";

              return (
                <div
                  key={property.id}
                  className={cn(
                    "flex border-b border-border last:border-b-0",
                    propIdx % 2 === 0 ? "bg-white dark:bg-card" : "bg-muted/5",
                  )}
                  style={{ height: ROW_H }}
                >
                  {/* ── sticky property label ── */}
                  <div
                    className="sticky left-0 z-10 flex items-center gap-2.5 px-3 border-r border-border flex-shrink-0"
                    style={{
                      width: PROP_W, minWidth: PROP_W,
                      background: propIdx % 2 === 0 ? "white" : "hsl(var(--muted)/0.05)",
                    }}
                  >
                    {coverImage
                      ? <img src={coverImage} alt={property.public_title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      : <div className="w-9 h-9 rounded-lg bg-muted flex-shrink-0" />
                    }
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-tight">{property.public_title}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {[property.city, property.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* ── date cells + reservation overlay ── */}
                  <div className="relative flex-shrink-0" style={{ width: DAYS * CELL_W, height: ROW_H }}>

                    {/* Background cells */}
                    <div className="flex h-full">
                      {dates.map((date, dateIdx) => {
                        const blocked    = isBlocked(property.id, date);
                        const dateStr    = format(date, "yyyy-MM-dd");
                        const isPast     = isBefore(date, today);
                        const inRes      = propReservations.some(r => {
                          const ci = parseISO(r.check_in);
                          const co = parseISO(r.check_out);
                          return date >= ci && date < co;
                        });
                        const selected   = isSelected(propIdx, dateIdx);
                        const isDragLive = !!dragSel; // true while mouse is held
                        const override   = overrideMap.get(`${property.id}::${dateStr}`);
                        const hasPrice   = override?.custom_price != null;
                        const hasMinstay = override?.min_stay    != null;

                        return (
                          <div
                            key={dateStr}
                            style={{ width: CELL_W, minWidth: CELL_W }}
                            className={cn(
                              "border-r border-border last:border-r-0 h-full flex items-center justify-center flex-shrink-0",
                              "text-[10px] select-none transition-colors duration-75 flex-col gap-px",
                              // base
                              !selected && blocked && "bg-rose-50 dark:bg-rose-950/20",
                              !selected && !blocked && !inRes && hasPrice && "bg-amber-50/60",
                              !selected && isToday(date) && !blocked && !inRes && "bg-primary/5",
                              !selected && isPast && !blocked && !inRes && "opacity-50",
                              // selection (drag-live = brighter, finalSel = softer)
                              selected && isDragLive && "bg-primary/25 ring-1 ring-inset ring-primary/50",
                              selected && !isDragLive && "bg-primary/15 ring-1 ring-inset ring-primary/30",
                              // cursors — cell cursor for selectable, default otherwise
                              !inRes && "cursor-cell",
                              inRes && "cursor-default",
                            )}
                            onMouseDown={e => {
                              if (e.shiftKey) {
                                handleCellShiftClick(propIdx, dateIdx, inRes);
                                if (!e.shiftKey) selAnchorRef.current = { propIdx, dateIdx };
                              } else {
                                selAnchorRef.current = { propIdx, dateIdx };
                                handleCellMouseDown(propIdx, dateIdx, inRes, e);
                              }
                            }}
                            onMouseEnter={() => handleCellMouseEnter(propIdx, dateIdx)}
                          >
                            {selected ? (
                              /* indicator dot inside selected cell */
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                selAction === "block"   ? "bg-rose-400"  :
                                selAction === "unblock" ? "bg-primary"   :
                                selAction === "price"   ? "bg-amber-400" : "bg-blue-400",
                              )} />
                            ) : blocked ? (
                              <Ban className="w-3 h-3 text-rose-400" />
                            ) : !inRes ? (
                              <>
                                <span className={cn(
                                  hasPrice ? "text-amber-600 font-medium" : "text-muted-foreground/50",
                                )}>
                                  {fmtRate(hasPrice ? override!.custom_price! : property.base_rate_amount)}
                                </span>
                                {hasMinstay && (
                                  <span className="text-blue-500 leading-none" style={{ fontSize: 8 }}>
                                    {override!.min_stay}n+
                                  </span>
                                )}
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {/* Reservation bars — pointer-events:none so mouse passes through to cells */}
                    {propReservations.map(res => {
                      const ci = parseISO(res.check_in);
                      const co = parseISO(res.check_out);
                      const visStart = ci < startDate ? startDate : ci;
                      const visEnd   = co > endDate   ? endDate   : co;
                      const offsetDays = differenceInDays(visStart, startDate);
                      const spanDays   = differenceInDays(visEnd, visStart);
                      if (spanDays <= 0) return null;
                      const startsInView = ci >= startDate;
                      const endsInView   = co <= endDate;
                      const barLeft  = offsetDays * CELL_W + (startsInView ? 3 : 0);
                      const barWidth = spanDays * CELL_W - (startsInView ? 3 : 0) - (endsInView ? 3 : 0);
                      if (barWidth <= 0) return null;
                      const isActive  = ci <= today && co > today;
                      const guestName = [res.guest_first_name, res.guest_last_name].filter(Boolean).join(" ") || res.guest_email || "Guest";
                      const showFull  = barWidth > 100;
                      const showShort = barWidth > 44 && !showFull;

                      return (
                        <div
                          key={res.id}
                          style={{
                            position: "absolute", top: "50%", transform: "translateY(-50%)",
                            left: barLeft, width: barWidth, height: 38, borderRadius: 7, zIndex: 5,
                            // let mouse events pass through to the cell layer below
                            pointerEvents: "none",
                          }}
                          className={cn(
                            "flex items-center gap-1 px-2 overflow-hidden text-white shadow-sm",
                            resColor(res.status),
                            !startsInView && "rounded-l-none",
                            !endsInView   && "rounded-r-none",
                          )}
                          title={`${guestName} · ${res.check_in} → ${res.check_out}`}
                        >
                          {isActive && showFull && (
                            <span className="text-[8px] font-bold bg-white/25 rounded px-1 py-0.5 whitespace-nowrap flex-shrink-0">
                              NOW
                            </span>
                          )}
                          {showFull && (
                            <>
                              <span className="text-[11px] font-semibold truncate flex-1 min-w-0">{guestName}</span>
                              <span className="text-[10px] font-medium opacity-90 flex-shrink-0">£{res.total_amount}</span>
                            </>
                          )}
                          {showShort && (
                            <span className="text-[10px] font-semibold truncate">{guestName.split(" ")[0]}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* help text */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1.5">
            <Ban className="w-3 h-3 text-rose-400" />
            Click a date to manage a single property
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-primary/30 ring-1 ring-primary/50" />
            Drag to select multiple dates/properties — then Block, Set Price, or Min Stay
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-300" />
            Custom price override
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-blue-50 border border-blue-300" />
            Min stay override
          </span>
        </div>
      </div>

      {/* ── Single-property Range Block Dialog ── */}
      <Dialog
        open={!!rangeModal}
        onOpenChange={open => { if (!open && !isSingleSubmitting) { setRangeModal(null); setRangeSelection(undefined); } }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Block / Unblock Dates</DialogTitle>
            <DialogDescription>
              {rangeModal?.propertyName} — select a date range to block or unblock
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <Calendar
              mode="range"
              selected={rangeSelection}
              onSelect={setRangeSelection}
              defaultMonth={rangeModal?.anchorDate}
              numberOfMonths={1}
              disabled={{ before: today }}
              className="rounded-md border"
            />
            {rangeSelection?.from && (
              <p className="text-sm text-muted-foreground">
                {singleDayCount === 1
                  ? `1 day selected: ${format(rangeSelection.from, "MMM d, yyyy")}`
                  : `${singleDayCount} days: ${format(rangeSelection.from, "MMM d")} – ${format(rangeSelection.to ?? rangeSelection.from, "MMM d, yyyy")}`}
              </p>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setRangeModal(null); setRangeSelection(undefined); }}
              disabled={isSingleSubmitting} className="rounded-full">
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleRangeConfirm(false)}
              disabled={isSingleSubmitting || !rangeSelection?.from}
              className="rounded-full border-primary text-primary hover:bg-primary/10">
              {isSingleSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
              Unblock Range
            </Button>
            <Button onClick={() => handleRangeConfirm(true)}
              disabled={isSingleSubmitting || !rangeSelection?.from} className="rounded-full">
              {isSingleSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
              Block Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
