import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInDays, isWithinInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNfsOperator, useNfsOperatorProperties } from "@/hooks/useNfsOperator";
import { useNfsPropertyBlockedDates } from "@/hooks/useNfsReservations";
import { supabase } from "@/lib/supabase";
import { notifyBookingConfirmed } from "@/lib/email";

/** Returns a friendly display label for a property */
function propLabel(p: { id: string; public_title?: string | null }): string {
  const t = p.public_title?.trim();
  return t || `(Unnamed — ${p.id.slice(0, 8).toUpperCase()})`;
}

/** True if [a1,a2] overlaps [b1,b2] */
function datesOverlap(a1: Date, a2: Date, b1: Date, b2: Date): boolean {
  return a1 < b2 && a2 > b1;
}

export default function OperatorCreateReservation() {
  const navigate = useNavigate();
  const { operatorId } = useAuth();
  const { data: operator } = useNfsOperator();
  const { data: properties, isLoading: propertiesLoading } = useNfsOperatorProperties(operatorId);
  const [loading, setLoading] = useState(false);

  const [propertyId, setPropertyId] = useState("");
  const [bookingType, setBookingType] = useState<"direct" | "request">("direct");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [totalAmount, setTotalAmount] = useState("0");

  // Fetch blocked ranges for the selected property
  const { data: blockedRanges = [] } = useNfsPropertyBlockedDates(propertyId || undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!propertyId) {
      toast({ title: "Select a property", variant: "destructive" });
      return;
    }
    if (!checkInDate || !checkOutDate) {
      toast({ title: "Select check-in and check-out dates", variant: "destructive" });
      return;
    }
    if (checkOutDate <= checkInDate) {
      toast({ title: "Check-out must be after check-in", variant: "destructive" });
      return;
    }

    // Validate against blocked ranges
    const conflict = blockedRanges.find(r =>
      datesOverlap(checkInDate, checkOutDate, r.from, r.to)
    );
    if (conflict) {
      toast({
        title: "Dates unavailable",
        description: `These dates overlap with an existing reservation (${format(conflict.from, "MMM d")} – ${format(conflict.to, "MMM d, yyyy")}).`,
        variant: "destructive",
      });
      return;
    }

    const checkIn = format(checkInDate, "yyyy-MM-dd");
    const checkOut = format(checkOutDate, "yyyy-MM-dd");
    const nights = differenceInDays(checkOutDate, checkInDate);
    const total = parseFloat(totalAmount) || 0;

    // Status based on booking type chosen by operator
    const status = bookingType === "direct" ? "confirmed" : "pending_approval";
    const paymentStatus = bookingType === "direct" && total > 0 ? "paid" : "pending";

    setLoading(true);
    try {
      const { error } = await supabase
        .from("nfs_reservations")
        .insert({
          property_id: propertyId,
          operator_id: operatorId ?? undefined,
          guest_first_name: firstName,
          guest_last_name: lastName,
          guest_email: email,
          guest_phone: phone || null,
          check_in: checkIn,
          check_out: checkOut,
          check_in_time: "14:00",
          check_out_time: "11:00",
          adults: parseInt(adults, 10),
          children: parseInt(children, 10),
          infants: 0,
          status,
          payment_status: paymentStatus,
          total_amount: total,
          payment_currency: "GBP",
          booking_source: "operator_direct",
        });

      if (error) throw error;

      // Send email notifications via nfs-send-email
      const prop = properties?.find(p => p.id === propertyId);
      notifyBookingConfirmed({
        reservationId: "",
        guestName: `${firstName} ${lastName}`,
        guestEmail: email,
        propertyTitle: prop ? propLabel(prop) : "Unknown",
        propertyCity: prop?.city ?? "",
        propertyCountry: prop?.country ?? "",
        checkIn,
        checkOut,
        nights,
        adults: parseInt(adults, 10),
        children: parseInt(children, 10),
        total,
        currency: "GBP",
        operatorEmail: operator?.contact_email ?? undefined,
      });

      toast({
        title: bookingType === "direct" ? "Reservation confirmed" : "Reservation request created",
        description: `Email sent to ${email}.`,
      });

      navigate("/nfstay/reservations");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create reservation.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-feature="NFSTAY__OP_CREATE_RESERVATION" className="p-6 max-w-2xl">
      <button
        onClick={() => navigate("/nfstay/reservations")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to reservations
      </button>

      <h1 className="text-2xl font-bold tracking-tight mb-2">Create Reservation</h1>
      <p className="text-sm text-muted-foreground mb-6">Manually add a reservation for a guest.</p>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5">

        {/* Property */}
        <div data-feature="NFSTAY__OP_CREATE_PROPERTY">
          <Label>Property</Label>
          {propertiesLoading ? (
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading properties...
            </div>
          ) : (
            <Select value={propertyId} onValueChange={v => { setPropertyId(v); setCheckInDate(undefined); setCheckOutDate(undefined); }}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select property" /></SelectTrigger>
              <SelectContent>
                {properties && properties.length > 0 ? (
                  properties.map((p: { id: string; public_title?: string | null }) => (
                    <SelectItem key={p.id} value={p.id}>{propLabel(p)}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="__none" disabled>No properties found</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Booking type */}
        <div>
          <Label className="mb-2 block">Booking Type</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["direct", "request"] as const).map(type => (
              <label
                key={type}
                className={cn(
                  "flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors",
                  bookingType === type ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                )}
              >
                <input
                  type="radio"
                  name="bookingType"
                  value={type}
                  checked={bookingType === type}
                  onChange={() => setBookingType(type)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">
                    {type === "direct" ? "Direct booking" : "Request to book"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {type === "direct"
                      ? "Reservation is confirmed immediately. Guest receives confirmation email."
                      : "Reservation stays pending until you approve. Guest receives request email."}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Guest details */}
        <div data-feature="NFSTAY__OP_CREATE_GUEST" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Guest First Name</Label>
            <Input placeholder="John" className="mt-1.5" required value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label>Guest Last Name</Label>
            <Input placeholder="Doe" className="mt-1.5" required value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <div>
            <Label>Guest Email</Label>
            <Input type="email" placeholder="john@example.com" className="mt-1.5" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Guest Phone</Label>
            <Input placeholder="+44 7700 900000" className="mt-1.5" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          {/* Check-in Calendar */}
          <div>
            <Label>Check-in</Label>
            <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "mt-1.5 w-full flex items-center gap-2 border border-input rounded-md px-3 h-10 text-sm text-left",
                    !checkInDate && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="w-4 h-4 shrink-0" />
                  {checkInDate ? format(checkInDate, "MMM d, yyyy") : "Select date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkInDate}
                  onSelect={d => { setCheckInDate(d); if (checkOutDate && d && d >= checkOutDate) setCheckOutDate(undefined); setCheckInOpen(false); }}
                  disabled={[{ before: new Date() }, ...blockedRanges]}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Check-out Calendar */}
          <div>
            <Label>Check-out</Label>
            <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "mt-1.5 w-full flex items-center gap-2 border border-input rounded-md px-3 h-10 text-sm text-left",
                    !checkOutDate && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="w-4 h-4 shrink-0" />
                  {checkOutDate ? format(checkOutDate, "MMM d, yyyy") : "Select date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkOutDate}
                  onSelect={d => { setCheckOutDate(d); setCheckOutOpen(false); }}
                  disabled={[
                    { before: checkInDate ?? new Date() },
                    ...blockedRanges,
                  ]}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Adults</Label>
            <Input type="number" min="1" className="mt-1.5" required value={adults} onChange={e => setAdults(e.target.value)} />
          </div>
          <div>
            <Label>Children</Label>
            <Input type="number" min="0" className="mt-1.5" value={children} onChange={e => setChildren(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Total Amount (GBP)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              className="mt-1.5"
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the agreed amount. If greater than 0 and booking is Direct, payment status will be set to paid.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => navigate("/nfstay/reservations")}>
            Cancel
          </Button>
          <Button data-feature="NFSTAY__OP_CREATE_SUBMIT" type="submit" className="rounded-lg" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating...</span>
            ) : (
              bookingType === "direct" ? "Confirm Reservation" : "Create Request"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
