import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyBookingConfirmed } from "@/lib/n8n";

export default function NfsPaymentSuccess() {
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<any>(null);
  const notified = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('nfs_last_reservation');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setReservation(data);
        sessionStorage.removeItem('nfs_last_reservation');

        // Fire-and-forget n8n notification (once)
        if (!notified.current && data.guestEmail) {
          notified.current = true;
          notifyBookingConfirmed({
            reservationId: data.id || "",
            guestName: `${data.guestFirstName || ""} ${data.guestLastName || ""}`.trim(),
            guestEmail: data.guestEmail,
            propertyTitle: data.propertyTitle || "",
            propertyCity: data.propertyCity || "",
            propertyCountry: data.propertyCountry || "",
            checkIn: data.checkIn || "",
            checkOut: data.checkOut || "",
            nights: data.nights || 0,
            adults: data.adults || 0,
            children: data.children || 0,
            total: data.total || 0,
            currency: data.currency || "GBP",
          });
        }
      } catch {
        sessionStorage.removeItem('nfs_last_reservation');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-16 px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
          {reservation && (
            <p className="text-sm text-muted-foreground mt-2">
              Hi {reservation.guestFirstName}, your reservation is confirmed. A confirmation has been sent to {reservation.guestEmail}.
            </p>
          )}
        </div>

        {reservation && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <img src={reservation.propertyImage} alt={reservation.propertyTitle} className="h-40 w-full object-cover" />
            <div className="p-5 space-y-3">
              <div>
                <h3 className="font-semibold">{reservation.propertyTitle}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" />{reservation.propertyCity}, {reservation.propertyCountry}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                {reservation.checkIn} – {reservation.checkOut} · {reservation.nights} nights
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                {reservation.adults + reservation.children} guests ({reservation.adults} adults)
              </div>
              <hr className="border-border" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total paid</span>
                <span className="font-bold text-lg">{reservation.currencySymbol}{reservation.total}</span>
              </div>
              <p className="text-center font-mono text-xs text-muted-foreground">Reservation ID: {reservation.id}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate('/booking')}>
            View Booking Details
          </Button>
          <Button className="w-full rounded-xl" onClick={() => navigate('/search')}>
            Browse More Properties
          </Button>
        </div>
      </div>
    </div>
  );
}
