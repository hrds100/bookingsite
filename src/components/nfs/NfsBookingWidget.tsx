import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, startOfDay, addDays } from "date-fns";
import { CalendarDays, Users, Minus, Plus, Lock, Clock, Car, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "react-i18next";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import { supabase } from "@/lib/supabase";
import { validatePromoCode as validatePromoCodeReal } from "@/lib/promo-codes";
import { useNfsPropertyBlockedDates } from "@/hooks/useNfsReservations";
import type { MockProperty } from "@/data/mock-properties";
import type { DateRange } from "react-day-picker";

/** Canonical add-on shape used throughout the booking flow */
export interface BookingAddon {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface NfsBookingWidgetProps {
  property: MockProperty;
}

export function NfsBookingWidget({ property }: NfsBookingWidgetProps) {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { data: blockedRanges = [] } = useNfsPropertyBlockedDates(property.id);

  // When check-in is selected but check-out isn't yet, find the earliest blocked
  // date after check-in and disable everything from there onwards — prevents
  // travellers from spanning a range over blocked/booked dates.
  const dynamicDisabled = useMemo(() => {
    const base: Parameters<typeof Calendar>[0]["disabled"] = [{ before: startOfDay(new Date()) }, ...blockedRanges];
    if (!dateRange?.from || dateRange?.to) return base;

    const from = startOfDay(dateRange.from);
    const firstBlockedAfter = blockedRanges
      .map((r) => startOfDay(r.from))
      .filter((d) => d > from)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    if (!firstBlockedAfter) return base;
    // Allow check-out ON the first blocked day (guest leaves that morning),
    // but disable the day after it and everything beyond.
    return [...base, { from: addDays(firstBlockedAfter, 1), to: addDays(new Date(9999, 0, 1), 0) }];
  }, [dateRange?.from, dateRange?.to, blockedRanges]);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // "from" = picking check-in, "to" = picking check-out
  const [calPhase, setCalPhase] = useState<"from" | "to">("from");
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const { currency, convert } = useCurrency();
  const { t } = useTranslation();
  const { operator } = useWhiteLabel();
  const acceptCash = operator?.accept_cash_booking ?? false;

  // Cash booking form state
  const [showCashForm, setShowCashForm] = useState(false);
  const [cashName, setCashName] = useState('');
  const [cashEmail, setCashEmail] = useState('');
  const [cashSubmitting, setCashSubmitting] = useState(false);
  const fromCur = property.base_rate_currency;
  const sym = currency.symbol;

  // Resolve add-ons: prefer property.addons (jsonb from DB), fall back to mock
  const addons: BookingAddon[] = useMemo(() => {
    const raw = (property as any).addons;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((a: any, i: number) => ({
        id: a.id || `addon-${i}`,
        name: a.name || a.label || 'Add-on',
        price: typeof a.price === 'number' ? a.price : 0,
        description: a.description || '',
      }));
    }
    // No add-ons configured for this property
    return [];
  }, [(property as any).addons]);

  // Convert all prices from property's native currency to user's selected currency
  const rate = convert(property.base_rate_amount, fromCur);
  const nights = dateRange?.from && dateRange?.to ? differenceInDays(dateRange.to, dateRange.from) : 0;
  const subtotal = rate * nights;
  const cleaningFee = property.cleaning_fee.enabled ? convert(property.cleaning_fee.amount, fromCur) : 0;
  const weeklyDiscount = property.weekly_discount.enabled && nights >= 7
    ? Math.round(subtotal * property.weekly_discount.percentage / 100)
    : 0;
  const monthlyDiscount = property.monthly_discount.enabled && nights >= 28
    ? Math.round(subtotal * property.monthly_discount.percentage / 100)
    : 0;
  const discount = monthlyDiscount || weeklyDiscount;
  const promoDiscount = promoApplied ? Math.round(subtotal * promoApplied.discount / 100) : 0;
  const serviceFee = Math.round((subtotal - discount) * 0.05);
  const taxes = 0; // placeholder
  const addonsTotal = addons
    .filter(a => selectedAddons.includes(a.id))
    .reduce((sum, a) => sum + convert(a.price, fromCur), 0);
  const total = subtotal + cleaningFee + serviceFee + taxes + addonsTotal - discount - promoDiscount;

  const handleApplyPromo = async () => {
    setPromoError('');
    if (!promoCode.trim()) return;

    setPromoLoading(true);
    try {
      const result = await validatePromoCodeReal(promoCode);
      if (result.valid) {
        setPromoApplied({
          code: result.code || promoCode.toUpperCase().trim(),
          discount: result.discount,
          label: `${result.discount}% off`,
        });
        setPromoError('');
      } else {
        setPromoApplied(null);
        setPromoError(result.message || 'Invalid promo code');
      }
    } catch {
      setPromoApplied(null);
      setPromoError('Could not validate code. Try again.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleClearPromo = () => {
    setPromoApplied(null);
    setPromoCode('');
    setPromoError('');
  };

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleCashBook = async () => {
    if (!cashName.trim() || !cashEmail.trim()) return;
    setCashSubmitting(true);
    try {
      const ref = `CASH-${Date.now().toString(36).toUpperCase()}`;
      const nameParts = cashName.trim().split(' ');
      const { error } = await supabase.from('nfs_reservations').insert({
        property_id: property.id,
        guest_first_name: nameParts[0] || cashName,
        guest_last_name: nameParts.slice(1).join(' ') || '',
        guest_email: cashEmail.trim(),
        guest_phone: '',
        check_in: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
        check_out: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
        adults,
        children,
        infants: 0,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'cash',
        total_amount: total,
        payment_currency: currency.code,
        booking_reference: ref,
      });
      const confirmation = {
        ref,
        propertyTitle: property.public_title,
        checkIn: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
        checkOut: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
        guests: adults + children,
        total,
        currency: currency.code,
        currencySymbol: currency.symbol,
        error: error?.message ?? null,
      };
      sessionStorage.setItem('nfs_cash_booking', JSON.stringify(confirmation));
      navigate('/cash-booking-confirmed');
    } catch (err) {
      setCashSubmitting(false);
    }
  };

  const handleReserve = () => {
    const selectedAddonObjects = addons.filter(a => selectedAddons.includes(a.id));
    const intent = {
      propertyId: property.id,
      propertyTitle: property.public_title,
      propertyImage: property.images.find(i => i.is_cover)?.url || property.images[0]?.url,
      propertyCity: property.city,
      propertyCountry: property.country,
      checkIn: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
      checkOut: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
      nights,
      adults,
      children,
      baseRate: property.base_rate_amount,
      subtotal,
      cleaningFee,
      discount,
      promoDiscount,
      promoCode: promoApplied ? promoApplied.code : '',
      promoLabel: promoApplied ? promoApplied.label : '',
      serviceFee,
      taxes,
      addons: selectedAddonObjects.map(a => ({
        id: a.id,
        label: a.name,
        description: a.description || '',
        price: convert(a.price, fromCur),
      })),
      addonsTotal,
      total,
      currency: property.base_rate_currency,
      currencySymbol: sym,
      expiresAt: Date.now() + 30 * 60 * 1000,
    };
    sessionStorage.setItem('nfs_booking_intent', JSON.stringify(intent));
    navigate('/checkout');
  };

  const totalGuests = adults + children;
  const atMaxGuests = totalGuests >= property.max_guests;

  const belowMinStay = nights > 0 && nights < property.minimum_stay;

  const Stepper = ({ label, sub, value, onChange, min = 0, disableIncrement = false }: { label: string; sub: string; value: number; onChange: (v: number) => void; min?: number; disableIncrement?: boolean }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30"><Minus className="w-3.5 h-3.5" /></button>
        <span className="text-sm w-3 text-center">{value}</span>
        <button onClick={() => onChange(value + 1)} disabled={disableIncrement} className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30"><Plus className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );

  const addonIcon = (addonId: string) => {
    if (addonId.includes('transfer') || addonId.includes('car') || addonId.includes('taxi')) return <Car className="w-4 h-4" />;
    if (addonId.includes('basket') || addonId.includes('gift') || addonId.includes('welcome')) return <Gift className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  return (
    <div data-feature="NFSTAY__BOOKING_WIDGET" className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-card">
      <div data-feature="NFSTAY__WIDGET_PRICE" className="mb-4">
        <span className="text-xl sm:text-2xl font-bold text-primary">{sym}{rate}</span>
        <span className="text-base font-normal text-gray-900 ml-1">{t('property.per_night')}</span>
      </div>

      {/* Dates */}
      <Popover
        open={calendarOpen}
        onOpenChange={(open) => {
          setCalendarOpen(open);
          // On open: if both dates are set, next click should pick new check-in
          // If only from is set, continue picking check-out
          if (open) {
            setCalPhase(dateRange?.from && !dateRange?.to ? "to" : "from");
          }
        }}
      >
        <PopoverTrigger asChild>
          <button data-feature="NFSTAY__WIDGET_CHECKIN" className="w-full border border-border rounded-xl overflow-hidden mb-3">
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className={cn("p-3 text-left", calendarOpen && calPhase === "from" && "bg-muted/40")}>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">{t('widget.check_in_label')}</label>
                <span className={cn("text-sm", dateRange?.from ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {dateRange?.from ? format(dateRange.from, 'MMM d, yyyy') : t('widget.add_date')}
                </span>
              </div>
              <div className={cn("p-3 text-left", calendarOpen && calPhase === "to" && "bg-muted/40")}>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">{t('widget.check_out_label')}</label>
                <span className={cn("text-sm", dateRange?.to ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {dateRange?.to ? format(dateRange.to, 'MMM d, yyyy') : t('widget.add_date')}
                </span>
              </div>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center" side="bottom">
          {/* Header — Airbnb style */}
          <div className="px-4 pt-4 pb-2 border-b border-border">
            {dateRange?.from && dateRange?.to ? (
              <>
                <p className="text-base font-bold">{nights === 1 ? t('widget.nights', { n: nights }) : t('widget.nights_plural', { n: nights })}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(dateRange.from, "d MMM yyyy")} – {format(dateRange.to, "d MMM yyyy")}
                </p>
              </>
            ) : (
              <p className="text-base font-semibold">
                {calPhase === "from" ? t('widget.select_checkin_label') : t('widget.select_checkout_label')}
              </p>
            )}
          </div>

          <Calendar
            mode="range"
            selected={dateRange}
            onDayClick={(day) => {
              // Ignore disabled days
              const isDisabled = (dynamicDisabled as any[]).some((d) => {
                if (d instanceof Date) return d.toDateString() === day.toDateString();
                if (d?.before) return day < d.before;
                if (d?.from && d?.to) return day >= d.from && day <= d.to;
                return false;
              });
              if (isDisabled) return;

              if (calPhase === "from") {
                setDateRange({ from: day, to: undefined });
                setCalPhase("to");
              } else {
                // to phase
                if (dateRange?.from && day > dateRange.from) {
                  setDateRange({ from: dateRange.from, to: day });
                  setCalendarOpen(false);
                  setCalPhase("from");
                } else {
                  // clicked same or before from — restart check-in
                  setDateRange({ from: day, to: undefined });
                }
              }
            }}
            numberOfMonths={2}
            disabled={dynamicDisabled}
            className="p-3 pointer-events-auto"
          />

          {/* Footer — Clear + Close */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <button
              type="button"
              onClick={() => { setDateRange(undefined); setCalPhase("from"); }}
              className="text-sm font-semibold underline underline-offset-2 text-foreground hover:text-primary transition-colors"
            >
              {t('widget.clear_dates')}
            </button>
            <button
              type="button"
              onClick={() => setCalendarOpen(false)}
              className="px-5 py-2 bg-foreground text-background text-sm font-semibold rounded-lg hover:opacity-80 transition-opacity"
            >
              {t('widget.close_btn')}
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Guests */}
      <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
        <PopoverTrigger asChild>
          <button data-feature="NFSTAY__WIDGET_GUESTS" className="w-full border border-border rounded-xl p-3 text-left mb-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">{t('widget.guests_max', { n: property.max_guests })}</label>
            <div className="flex items-center gap-2 mt-0.5">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{adults + children} {adults + children === 1 ? t('common.guest') : t('common.guests')}</span>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4">
          <Stepper label={t('widget.adults_label')} sub={t('widget.adults_sub_label')} value={adults} onChange={setAdults} min={1} disableIncrement={atMaxGuests} />
          <Stepper label={t('widget.children_label')} sub={t('widget.children_sub_label')} value={children} onChange={setChildren} disableIncrement={atMaxGuests} />
        </PopoverContent>
      </Popover>

      {/* Add-ons */}
      {nights > 0 && addons.length > 0 && (
        <div data-feature="NFSTAY__WIDGET_ADDONS" className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('widget.enhance')}</p>
          <div className="grid grid-cols-2 gap-2">
            {addons.map(addon => {
              const selected = selectedAddons.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all text-sm",
                    selected
                      ? "border-primary bg-[hsl(164_73%_34%/0.06)]"
                      : "border-border hover:border-muted-foreground/40"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-muted-foreground", selected && "text-primary")}>
                      {addonIcon(addon.id)}
                    </span>
                    <span className={cn("font-medium text-xs", selected && "text-primary")}>{addon.name}</span>
                  </div>
                  {addon.description && (
                    <span className="text-xs text-muted-foreground">{addon.description}</span>
                  )}
                  <span className={cn("text-xs font-semibold", selected ? "text-primary" : "text-foreground")}>{sym}{convert(addon.price, fromCur)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pricing breakdown */}
      {nights > 0 && (
        <div data-feature="NFSTAY__WIDGET_BREAKDOWN" className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{sym}{rate} × {nights} {nights === 1 ? t('widget.night_label') : t('widget.nights_label_plural')}</span>
            <span>{sym}{subtotal}</span>
          </div>
          {cleaningFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('widget.cleaning_fee_label')}</span>
              <span>{sym}{cleaningFee}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('widget.service_fee_label')}</span>
            <span>{sym}{serviceFee}</span>
          </div>
          {taxes > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('widget.taxes_label')}</span>
              <span>{sym}{taxes}</span>
            </div>
          )}
          {addonsTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('widget.addons_label')}</span>
              <span>{sym}{addonsTotal}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-primary">
              <span>{nights >= 28 ? t('widget.monthly_discount_label') : t('widget.weekly_discount_label')}</span>
              <span>-{sym}{discount}</span>
            </div>
          )}

          {/* Promo */}
          {!promoApplied ? (
            <div className="pt-1">
              <div className="flex gap-2">
                <input
                  data-testid="promo-input"
                  type="text"
                  value={promoCode}
                  onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
                  placeholder={t('widget.promo_code_placeholder')}
                  className="flex-1 h-8 px-3 text-xs border border-input rounded-md bg-card outline-none focus:border-primary"
                  disabled={promoLoading}
                />
                <Button
                  data-testid="promo-apply"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={handleApplyPromo}
                  disabled={promoLoading}
                >
                  {promoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : t('widget.apply_btn')}
                </Button>
              </div>
              {promoError && (
                <p data-testid="promo-error" className="text-xs text-destructive mt-1">{promoError}</p>
              )}
            </div>
          ) : (
            <div className="flex justify-between text-primary">
              <span className="flex items-center gap-1">
                {promoApplied.code} ({promoApplied.label})
                <button onClick={handleClearPromo} className="text-destructive ml-1">×</button>
              </span>
              <span>-{sym}{promoDiscount}</span>
            </div>
          )}

          <hr className="border-border" />
          <div className="flex justify-between font-bold text-lg">
            <span>{t('widget.total_label')}</span>
            <span>{sym}{total}</span>
          </div>
        </div>
      )}

      {belowMinStay && (
        <p className="text-center text-xs text-destructive mb-2 font-medium">
          {t('widget.min_stay_error', { n: property.minimum_stay })}
        </p>
      )}

      <button
        data-feature="NFSTAY__WIDGET_RESERVE"
        onClick={handleReserve}
        disabled={!nights || belowMinStay}
        className="w-full bg-primary-gradient text-white font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-all duration-200 hover:shadow-lg text-base disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {nights > 0 ? t('widget.reserve_btn') : t('widget.check_availability')}
      </button>

      <p className="text-center text-xs text-muted-foreground mt-3">{t('widget.no_charge')}</p>

      {property.minimum_stay > 1 && (
        <p className="text-center text-xs text-muted-foreground mt-1">{t('widget.min_stay', { n: property.minimum_stay })}</p>
      )}

      {/* Cash booking option */}
      {acceptCash && nights > 0 && !belowMinStay && (
        <div className="mt-4 pt-4 border-t border-border">
          {!showCashForm ? (
            <>
              <button
                data-feature="NFSTAY__WIDGET_CASH"
                onClick={() => setShowCashForm(true)}
                className="w-full border-2 border-primary text-primary font-semibold py-3.5 px-6 rounded-full hover:bg-primary/5 transition-all duration-200 text-base"
              >
                {t('widget.cash_button')}
              </button>
              <p className="text-center text-xs text-muted-foreground mt-2">{t('widget.cash_note')}</p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">{t('widget.cash_button')}</p>
              <input
                type="text"
                value={cashName}
                onChange={e => setCashName(e.target.value)}
                placeholder={t('widget.cash_name')}
                className="w-full h-10 px-3 text-sm border border-input rounded-lg bg-background outline-none focus:border-primary"
              />
              <input
                type="email"
                value={cashEmail}
                onChange={e => setCashEmail(e.target.value)}
                placeholder={t('widget.cash_email')}
                className="w-full h-10 px-3 text-sm border border-input rounded-lg bg-background outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCashBook}
                  disabled={cashSubmitting || !cashName.trim() || !cashEmail.trim()}
                  className="flex-1 bg-primary-gradient text-white font-semibold py-3 px-4 rounded-full hover:opacity-90 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cashSubmitting ? t('widget.cash_submitting') : t('widget.cash_confirm')}
                </button>
                <button
                  onClick={() => { setShowCashForm(false); setCashName(''); setCashEmail(''); }}
                  className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('widget.cash_cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
