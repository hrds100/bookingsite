import { useState, useMemo, useCallback } from "react";
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
import type { MockProperty } from "@/data/mock-properties";
import type { ReservationWithProperty } from "@/hooks/useNfsReservations";
import type { BlockedDate } from "@/hooks/useNfsBlockedDates";

/* ── layout constants ─────────────────────────── */
const CELL_W = 56;   // px per day column
const ROW_H  = 64;   // px per property row
const PROP_W = 224;  // px for the left property column
const DAYS   = 14;   // days visible at once

/* ── helpers ──────────────────────────────────── */
function resColor(status: string) {
  if (status === "pending_approval") return "bg-amber-500";
  if (status === "cancelled") return "bg-rose-400";
  return "bg-primary";
}

function fmtRate(rate: number, sym = "£") {
  return `${sym}${rate}`;
}

/* ── types ────────────────────────────────────── */
interface RangeModal {
  propertyId: string;
  propertyName: string;
  anchorDate: Date;
}

export interface NfsMultiCalendarProps {
  properties: MockProperty[];
  reservations: ReservationWithProperty[];
  blockedDates: BlockedDate[];
  onRangeBlock: (
    propertyId: string,
    fromDate: string,
    toDate: string,
    block: boolean,
  ) => Promise<void>;
  loading?: boolean;
}

/* ── component ────────────────────────────────── */
export function NfsMultiCalendar({
  properties,
  reservations,
  blockedDates,
  onRangeBlock,
  loading,
}: NfsMultiCalendarProps) {
  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const today = startOfDay(new Date());

  /* ── range-block dialog state ── */
  const [rangeModal, setRangeModal] = useState<RangeModal | null>(null);
  const [rangeSelection, setRangeSelection] = useState<DateRange | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dates = useMemo(
    () => Array.from({ length: DAYS }, (_, i) => addDays(startDate, i)),
    [startDate],
  );

  const endDate = useMemo(() => addDays(startDate, DAYS), [startDate]);

  /* blocked set: "propertyId::YYYY-MM-DD" */
  const blockedSet = useMemo(() => {
    const s = new Set<string>();
    blockedDates.forEach((b) => s.add(`${b.property_id}::${b.date}`));
    return s;
  }, [blockedDates]);

  const isBlocked = useCallback(
    (pid: string, date: Date) =>
      blockedSet.has(`${pid}::${format(date, "yyyy-MM-dd")}`),
    [blockedSet],
  );

  /* reservations per property, overlapping the visible window */
  const resByProp = useMemo(() => {
    const map = new Map<string, ReservationWithProperty[]>();
    properties.forEach((p) => map.set(p.id, []));
    reservations.forEach((r) => {
      if (r.status === "cancelled") return;
      const ci = parseISO(r.check_in);
      const co = parseISO(r.check_out);
      if (ci >= endDate || co <= startDate) return;
      const list = map.get(r.property_id);
      if (list) list.push(r);
    });
    return map;
  }, [properties, reservations, startDate, endDate]);

  const navigate = (delta: number) =>
    setStartDate((prev) => addDays(prev, delta * DAYS));

  const goToday = () => setStartDate(today);

  /* open range dialog when a cell is clicked */
  const handleCellClick = useCallback(
    (property: MockProperty, date: Date, inRes: boolean) => {
      if (inRes) return;
      setRangeSelection({ from: date, to: date });
      setRangeModal({
        propertyId: property.id,
        propertyName: property.public_title,
        anchorDate: date,
      });
    },
    [],
  );

  /* submit block/unblock for the selected range */
  const handleRangeConfirm = async (block: boolean) => {
    if (!rangeModal || !rangeSelection?.from) return;
    const from = rangeSelection.from;
    const to   = rangeSelection.to ?? rangeSelection.from;
    setIsSubmitting(true);
    try {
      await onRangeBlock(
        rangeModal.propertyId,
        format(from, "yyyy-MM-dd"),
        format(to,   "yyyy-MM-dd"),
        block,
      );
      setRangeModal(null);
      setRangeSelection(undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* day count label */
  const dayCount = useMemo(() => {
    if (!rangeSelection?.from) return 0;
    const to = rangeSelection.to ?? rangeSelection.from;
    return differenceInDays(to, rangeSelection.from) + 1;
  }, [rangeSelection]);

  /* ── loading / empty states ───────────────────── */
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

  /* ── render ───────────────────────────────────── */
  const rangeLabel = `${format(startDate, "MMM d")} – ${format(addDays(startDate, DAYS - 1), "MMM d, yyyy")}`;

  return (
    <>
      <div className="space-y-3" data-feature="NFSTAY__OP_MULTI_CALENDAR">
        {/* ── toolbar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="rounded-full text-xs h-8 px-4"
          >
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[186px] text-center select-none">
              {rangeLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => navigate(1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* legend */}
          <div className="ml-auto hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-primary" />
              Confirmed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-500" />
              Pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-rose-100 border border-rose-300" />
              Blocked
            </span>
          </div>
        </div>

        {/* ── calendar grid ── */}
        <div className="border border-border rounded-xl overflow-x-auto">
          <div style={{ minWidth: PROP_W + DAYS * CELL_W }}>

            {/* Header row */}
            <div className="flex border-b border-border bg-muted/30">
              {/* Corner */}
              <div
                className="sticky left-0 z-20 bg-muted/30 border-r border-border flex items-center px-3 flex-shrink-0"
                style={{ width: PROP_W, minWidth: PROP_W }}
              >
                <span className="text-[11px] font-medium text-muted-foreground">
                  {properties.length} {properties.length === 1 ? "property" : "properties"}
                </span>
              </div>
              {/* Date headers */}
              {dates.map((date) => (
                <div
                  key={date.toISOString()}
                  style={{ width: CELL_W, minWidth: CELL_W }}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 border-r border-border last:border-r-0 flex-shrink-0",
                    isToday(date) && "bg-primary/10",
                  )}
                >
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    {format(date, "EEE")[0]}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold mt-0.5 w-6 h-6 flex items-center justify-center rounded-full",
                      isToday(date)
                        ? "bg-primary text-white"
                        : "text-foreground",
                    )}
                  >
                    {format(date, "d")}
                  </span>
                </div>
              ))}
            </div>

            {/* Property rows */}
            {properties.map((property, idx) => {
              const propReservations = resByProp.get(property.id) ?? [];
              const coverImage =
                property.images?.find((i) => i.is_cover)?.url ??
                property.images?.[0]?.url ??
                "";

              return (
                <div
                  key={property.id}
                  className={cn(
                    "flex border-b border-border last:border-b-0",
                    idx % 2 === 0 ? "bg-white dark:bg-card" : "bg-muted/5",
                  )}
                  style={{ height: ROW_H }}
                >
                  {/* ── sticky property info ── */}
                  <div
                    className="sticky left-0 z-10 flex items-center gap-2.5 px-3 border-r border-border flex-shrink-0"
                    style={{
                      width: PROP_W,
                      minWidth: PROP_W,
                      background: idx % 2 === 0 ? "white" : "hsl(var(--muted)/0.05)",
                    }}
                  >
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={property.public_title}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-muted flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-tight">
                        {property.public_title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {[property.city, property.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* ── date cells + reservation overlay ── */}
                  <div
                    className="relative flex-shrink-0"
                    style={{ width: DAYS * CELL_W, height: ROW_H }}
                  >
                    {/* Background cells */}
                    <div className="flex h-full">
                      {dates.map((date) => {
                        const blocked = isBlocked(property.id, date);
                        const dateStr = format(date, "yyyy-MM-dd");
                        const isPast = isBefore(date, today);
                        const inRes = propReservations.some((r) => {
                          const ci = parseISO(r.check_in);
                          const co = parseISO(r.check_out);
                          return date >= ci && date < co;
                        });

                        return (
                          <div
                            key={dateStr}
                            style={{ width: CELL_W, minWidth: CELL_W }}
                            className={cn(
                              "border-r border-border last:border-r-0 h-full flex items-center justify-center flex-shrink-0",
                              "text-[10px] select-none transition-colors",
                              blocked && "bg-rose-50 dark:bg-rose-950/20",
                              isToday(date) && !blocked && "bg-primary/5",
                              isPast && !blocked && !inRes && "opacity-50",
                              !inRes && !isPast && "cursor-pointer",
                              !inRes && !blocked && !isPast && "hover:bg-muted/60",
                              !inRes && blocked && !isPast && "hover:bg-rose-100",
                            )}
                            onClick={() => handleCellClick(property, date, inRes)}
                            title={
                              inRes
                                ? undefined
                                : "Click to select date range"
                            }
                          >
                            {blocked ? (
                              <Ban className="w-3 h-3 text-rose-400" />
                            ) : !inRes ? (
                              <span className="text-muted-foreground/50">
                                {fmtRate(property.base_rate_amount)}
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {/* Reservation bars overlay */}
                    {propReservations.map((res) => {
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

                      const isActive = ci <= today && co > today;
                      const guestName =
                        [res.guest_first_name, res.guest_last_name]
                          .filter(Boolean)
                          .join(" ") ||
                        res.guest_email ||
                        "Guest";

                      const showFull  = barWidth > 100;
                      const showShort = barWidth > 44 && !showFull;

                      return (
                        <div
                          key={res.id}
                          style={{
                            position: "absolute",
                            top: "50%",
                            transform: "translateY(-50%)",
                            left: barLeft,
                            width: barWidth,
                            height: 38,
                            borderRadius: 7,
                            zIndex: 5,
                          }}
                          className={cn(
                            "flex items-center gap-1 px-2 overflow-hidden",
                            resColor(res.status),
                            "text-white shadow-sm",
                            !startsInView && "rounded-l-none",
                            !endsInView && "rounded-r-none",
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
                              <span className="text-[11px] font-semibold truncate flex-1 min-w-0">
                                {guestName}
                              </span>
                              <span className="text-[10px] font-medium opacity-90 flex-shrink-0">
                                £{res.total_amount}
                              </span>
                            </>
                          )}
                          {showShort && (
                            <span className="text-[10px] font-semibold truncate">
                              {guestName.split(" ")[0]}
                            </span>
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
        <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1">
            <Ban className="w-3 h-3 text-rose-400" />
            Click a date to select a range to block or unblock
          </span>
          <span className="flex items-center gap-1">
            <Unlock className="w-3 h-3 text-primary" />
            Blocked dates show in red — click to unblock via range picker
          </span>
        </div>
      </div>

      {/* ── Range Block Dialog ── */}
      <Dialog
        open={!!rangeModal}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setRangeModal(null);
            setRangeSelection(undefined);
          }
        }}
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
                {dayCount === 1
                  ? `1 day selected: ${format(rangeSelection.from, "MMM d, yyyy")}`
                  : `${dayCount} days: ${format(rangeSelection.from, "MMM d")} – ${format(rangeSelection.to ?? rangeSelection.from, "MMM d, yyyy")}`}
              </p>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRangeModal(null);
                setRangeSelection(undefined);
              }}
              disabled={isSubmitting}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleRangeConfirm(false)}
              disabled={isSubmitting || !rangeSelection?.from}
              className="rounded-full border-primary text-primary hover:bg-primary/10"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
              Unblock Range
            </Button>
            <Button
              onClick={() => handleRangeConfirm(true)}
              disabled={isSubmitting || !rangeSelection?.from}
              className="rounded-full"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
              Block Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
