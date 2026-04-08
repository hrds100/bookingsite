import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { CalendarDays, Users, Minus, Plus, Lock, Clock, Car, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { validatePromoCode as validatePromoCodeReal } from "@/lib/promo-codes";
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
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const { currency, convert } = useCurrency();
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
        <span className="text-base font-normal text-gray-900 ml-1">/ night</span>
      </div>

      {/* Dates */}
      <Popover>
        <PopoverTrigger asChild>
          <button data-feature="NFSTAY__WIDGET_CHECKIN" className="w-full border border-border rounded-xl overflow-hidden mb-3">
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="p-3 text-left">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Check in</label>
                <span className={cn("text-sm", dateRange?.from ? "text-foreground" : "text-muted-foreground")}>
                  {dateRange?.from ? format(dateRange.from, 'MMM d, yyyy') : 'Add date'}
                </span>
              </div>
              <div className="p-3 text-left">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Check out</label>
                <span className={cn("text-sm", dateRange?.to ? "text-foreground" : "text-muted-foreground")}>
                  {dateRange?.to ? format(dateRange.to, 'MMM d, yyyy') : 'Add date'}
                </span>
              </div>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center" side="bottom">
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
          <button data-feature="NFSTAY__WIDGET_GUESTS" className="w-full border border-border rounded-xl p-3 text-left mb-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Guests (max {property.max_guests})</label>
            <div className="flex items-center gap-2 mt-0.5">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{adults + children} guest{adults + children !== 1 ? 's' : ''}</span>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4">
          <Stepper label="Adults" sub="Ages 13+" value={adults} onChange={setAdults} min={1} disableIncrement={atMaxGuests} />
          <Stepper label="Children" sub="Ages 2-12" value={children} onChange={setChildren} disableIncrement={atMaxGuests} />
        </PopoverContent>
      </Popover>

      {/* Add-ons */}
      {nights > 0 && addons.length > 0 && (
        <div data-feature="NFSTAY__WIDGET_ADDONS" className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enhance your stay</p>
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
            <span className="text-muted-foreground">{sym}{rate} × {nights} night{nights !== 1 ? 's' : ''}</span>
            <span>{sym}{subtotal}</span>
          </div>
          {cleaningFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cleaning fee</span>
              <span>{sym}{cleaningFee}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service fee</span>
            <span>{sym}{serviceFee}</span>
          </div>
          {taxes > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxes</span>
              <span>{sym}{taxes}</span>
            </div>
          )}
          {addonsTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Add-ons</span>
              <span>{sym}{addonsTotal}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-primary">
              <span>{nights >= 28 ? 'Monthly' : 'Weekly'} discount</span>
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
                  placeholder="Promo code"
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
                  {promoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
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
            <span>Total</span>
            <span>{sym}{total}</span>
          </div>
        </div>
      )}

      {belowMinStay && (
        <p className="text-center text-xs text-destructive mb-2 font-medium">
          Minimum stay is {property.minimum_stay} nights
        </p>
      )}

      <button
        data-feature="NFSTAY__WIDGET_RESERVE"
        onClick={handleReserve}
        disabled={!nights || belowMinStay}
        className="w-full bg-primary-gradient text-white font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-all duration-200 hover:shadow-lg text-base disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {nights > 0 ? 'Reserve' : 'Check availability'}
      </button>

      <p className="text-center text-xs text-muted-foreground mt-3">You won't be charged yet</p>

      {property.minimum_stay > 1 && (
        <p className="text-center text-xs text-muted-foreground mt-1">Minimum {property.minimum_stay} night stay</p>
      )}
    </div>
  );
}
