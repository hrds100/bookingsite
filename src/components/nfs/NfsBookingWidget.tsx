import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { CalendarDays, Users, Minus, Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CURRENCIES } from "@/lib/constants";
import type { MockProperty } from "@/data/mock-properties";
import type { DateRange } from "react-day-picker";

interface NfsBookingWidgetProps {
  property: MockProperty;
}

export function NfsBookingWidget({ property }: NfsBookingWidgetProps) {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  const currency = CURRENCIES.find(c => c.code === property.base_rate_currency);
  const nights = dateRange?.from && dateRange?.to ? differenceInDays(dateRange.to, dateRange.from) : 0;
  const subtotal = property.base_rate_amount * nights;
  const cleaningFee = property.cleaning_fee.enabled ? property.cleaning_fee.amount : 0;
  const weeklyDiscount = property.weekly_discount.enabled && nights >= 7
    ? Math.round(subtotal * property.weekly_discount.percentage / 100)
    : 0;
  const monthlyDiscount = property.monthly_discount.enabled && nights >= 28
    ? Math.round(subtotal * property.monthly_discount.percentage / 100)
    : 0;
  const discount = monthlyDiscount || weeklyDiscount;
  const promoDiscount = promoApplied ? 25 : 0;
  const total = subtotal + cleaningFee - discount - promoDiscount;

  const handleReserve = () => {
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
      subtotal,
      cleaningFee,
      discount,
      promoDiscount,
      promoCode: promoApplied ? promoCode : '',
      total,
      currency: property.base_rate_currency,
      currencySymbol: currency?.symbol || '£',
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
        <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-30"><Minus className="w-3 h-3" /></button>
        <span className="text-sm w-3 text-center">{value}</span>
        <button onClick={() => onChange(value + 1)} disabled={disableIncrement} className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-30"><Plus className="w-3 h-3" /></button>
      </div>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="mb-4">
        <span className="text-xl sm:text-2xl font-bold">{currency?.symbol}{property.base_rate_amount}</span>
        <span className="text-muted-foreground text-sm"> /night</span>
      </div>

      {/* Dates */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="w-full border border-border rounded-xl overflow-hidden mb-3">
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="p-3 text-left">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Check in</label>
                <span className={cn("text-sm", dateRange?.from ? "text-foreground" : "text-muted-foreground")}>
                  {dateRange?.from ? format(dateRange.from, 'MMM d, yyyy') : 'Add date'}
                </span>
              </div>
              <div className="p-3 text-left">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Check out</label>
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
          <button className="w-full border border-border rounded-xl p-3 text-left mb-4">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Guests (max {property.max_guests})</label>
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

      {/* Pricing breakdown */}
      {nights > 0 && (
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{currency?.symbol}{property.base_rate_amount} × {nights} nights</span>
            <span>{currency?.symbol}{subtotal}</span>
          </div>
          {cleaningFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cleaning fee</span>
              <span>{currency?.symbol}{cleaningFee}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-primary">
              <span>{nights >= 28 ? 'Monthly' : 'Weekly'} discount</span>
              <span>-{currency?.symbol}{discount}</span>
            </div>
          )}

          {/* Promo */}
          {!promoApplied ? (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Promo code"
                className="flex-1 h-8 px-3 text-xs border border-input rounded-md bg-card outline-none focus:border-primary"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => promoCode && setPromoApplied(true)}>Apply</Button>
            </div>
          ) : (
            <div className="flex justify-between text-primary">
              <span className="flex items-center gap-1">
                {promoCode}
                <button onClick={() => { setPromoApplied(false); setPromoCode(''); }} className="text-destructive ml-1">×</button>
              </span>
              <span>-{currency?.symbol}{promoDiscount}</span>
            </div>
          )}

          <hr className="border-border" />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{currency?.symbol}{total}</span>
          </div>
        </div>
      )}

      {belowMinStay && (
        <p className="text-center text-xs text-destructive mb-2 font-medium">
          Minimum stay is {property.minimum_stay} nights
        </p>
      )}

      <Button
        onClick={handleReserve}
        disabled={!nights || belowMinStay}
        className="w-full rounded-xl py-3 text-base font-semibold"
        size="lg"
      >
        {nights > 0 ? 'Reserve' : 'Check availability'}
      </Button>

      <p className="text-center text-xs text-muted-foreground mt-3">You won't be charged yet</p>

      {property.minimum_stay > 1 && (
        <p className="text-center text-xs text-muted-foreground mt-1">Minimum {property.minimum_stay} night stay</p>
      )}
    </div>
  );
}
