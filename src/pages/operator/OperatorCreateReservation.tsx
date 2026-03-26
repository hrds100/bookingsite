import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNfsOperatorProperties } from "@/hooks/useNfsOperator";
import { supabase } from "@/lib/supabase";
import { notifyBookingEnquiry } from "@/lib/n8n";
import { differenceInDays, parseISO } from "date-fns";

export default function OperatorCreateReservation() {
  const navigate = useNavigate();
  const { operatorId } = useAuth();
  const { data: properties, isLoading: propertiesLoading } = useNfsOperatorProperties(operatorId);
  const [loading, setLoading] = useState(false);

  const [propertyId, setPropertyId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!propertyId) {
      toast({ title: "Select a property", description: "Please choose a property for this reservation.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("nfs_reservations")
        .insert({
          property_id: propertyId,
          guest_first_name: firstName,
          guest_last_name: lastName,
          guest_email: email,
          guest_phone: phone || null,
          check_in: checkIn,
          check_out: checkOut,
          adults: parseInt(adults, 10),
          children: parseInt(children, 10),
          infants: 0,
          status: "confirmed",
          payment_status: "pending",
          total_amount: 0,
          payment_currency: "GBP",
        });

      if (error) throw error;

      toast({ title: "Reservation created", description: "The reservation has been added." });

      // Fire n8n notification
      const prop = properties?.find(p => p.id === propertyId);
      const nights = checkIn && checkOut ? differenceInDays(parseISO(checkOut), parseISO(checkIn)) : 0;
      notifyBookingEnquiry({
        guestName: `${firstName} ${lastName}`,
        guestEmail: email,
        propertyTitle: prop?.public_title ?? "Unknown",
        propertyCity: prop?.city ?? "",
        propertyCountry: prop?.country ?? "",
        checkIn,
        checkOut,
        nights,
        adults: parseInt(adults, 10),
        children: parseInt(children, 10),
        total: 0,
        currency: "GBP",
      });

      navigate('/nfstay/reservations');
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create reservation.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-feature="NFSTAY__OP_CREATE_RESERVATION" className="p-6 max-w-2xl">
      <button onClick={() => navigate('/nfstay/reservations')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to reservations
      </button>

      <h1 className="text-2xl font-bold tracking-tight mb-2">Create Reservation</h1>
      <p className="text-sm text-muted-foreground mb-6">Manually add a reservation for a guest.</p>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div data-feature="NFSTAY__OP_CREATE_PROPERTY">
          <Label>Property</Label>
          {propertiesLoading ? (
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading properties...
            </div>
          ) : (
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select property" /></SelectTrigger>
              <SelectContent>
                {properties && properties.length > 0 ? (
                  properties.map((p: { id: string; public_title?: string }) => (
                    <SelectItem key={p.id} value={p.id}>{p.public_title ?? p.id}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="__none" disabled>No properties found</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

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
          <div>
            <Label>Check-in</Label>
            <Input type="date" className="mt-1.5" required value={checkIn} onChange={e => setCheckIn(e.target.value)} />
          </div>
          <div>
            <Label>Check-out</Label>
            <Input type="date" className="mt-1.5" required value={checkOut} onChange={e => setCheckOut(e.target.value)} />
          </div>
          <div>
            <Label>Adults</Label>
            <Input type="number" min="1" className="mt-1.5" required value={adults} onChange={e => setAdults(e.target.value)} />
          </div>
          <div>
            <Label>Children</Label>
            <Input type="number" min="0" className="mt-1.5" value={children} onChange={e => setChildren(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => navigate('/nfstay/reservations')}>Cancel</Button>
          <Button data-feature="NFSTAY__OP_CREATE_SUBMIT" type="submit" className="rounded-lg" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating...</span>
            ) : (
              'Create Reservation'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
