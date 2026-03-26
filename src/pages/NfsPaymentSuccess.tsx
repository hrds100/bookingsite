import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Clock, MapPin, Calendar, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyBookingConfirmed } from "@/lib/n8n";
import { supabase } from "@/lib/supabase";

export default function NfsPaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const notified = useRef(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");

    async function fetchFromStripeSession() {
      if (!sessionId) return null;

      try {
        const { data, error } = await supabase
          .from("nfs_reservations")
          .select("*, nfs_properties!inner(public_title, city, country, images, base_rate_currency)")
          .eq("stripe_session_id", sessionId)
          .single();

        if (error || !data) return null;

        const nights = Math.ceil(
          (new Date(data.check_out).getTime() - new Date(data.check_in).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const currencySymbols: Record<string, string> = {
          GBP: "\u00a3", USD: "$", EUR: "\u20ac", AED: "AED ", SGD: "S$",
        };

        return {
          id: data.id,
          status: data.status as string,
          guestFirstName: data.guest_first_name,
          guestLastName: data.guest_last_name,
          guestEmail: data.guest_email,
          propertyTitle: data.nfs_properties?.public_title || "",
          propertyCity: data.nfs_properties?.city || "",
          propertyCountry: data.nfs_properties?.country || "",
          propertyImage: data.nfs_properties?.images?.[0] || "",
          checkIn: data.check_in,
          checkOut: data.check_out,
          nights,
          adults: data.adults || 1,
          children: data.children || 0,
          total: data.total_amount || 0,
          currency: data.nfs_properties?.base_rate_currency || "GBP",
          currencySymbol: currencySymbols[data.nfs_properties?.base_rate_currency || "GBP"] || "\u00a3",
        };
      } catch {
        return null;
      }
    }

    function fetchFromSessionStorage() {
      const raw = sessionStorage.getItem("nfs_last_reservation");
      if (!raw) return null;
      try {
        const data = JSON.parse(raw);
        sessionStorage.removeItem("nfs_last_reservation");
        return data;
      } catch {
        sessionStorage.removeItem("nfs_last_reservation");
        return null;
      }
    }

    async function load() {
      // Try Stripe session first, fall back to sessionStorage (mock flow)
      let data = await fetchFromStripeSession();
      if (!data) {
        data = fetchFromSessionStorage();
      }

      if (data) {
        setReservation(data);

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
      }

      setLoading(false);
    }

    load();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-feature="NFSTAY__SUCCESS" className="min-h-screen bg-background flex items-start justify-center pt-16 px-4">
      <div className="max-w-md w-full space-y-6">
        <div data-feature="NFSTAY__SUCCESS_MESSAGE" className="text-center">
          {reservation?.status === "pending_approval" ? (
            <>
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold">Request Sent!</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Hi {reservation.guestFirstName}, your booking request has been sent to the host. They typically respond within 24 hours. We have sent a confirmation to {reservation.guestEmail}.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
              {reservation && (
                <p className="text-sm text-muted-foreground mt-2">
                  Hi {reservation.guestFirstName}, your reservation is confirmed. A confirmation has been sent to {reservation.guestEmail}.
                </p>
              )}
              {!reservation && (
                <p className="text-sm text-muted-foreground mt-2">
                  Your payment was received. You will receive a confirmation email shortly.
                </p>
              )}
            </>
          )}
        </div>

        {reservation && (
          <div data-feature="NFSTAY__SUCCESS_SUMMARY" className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {reservation.propertyImage && (
              <img src={reservation.propertyImage} alt={reservation.propertyTitle} className="h-40 w-full object-cover" />
            )}
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
          <Button data-feature="NFSTAY__SUCCESS_BROWSE" className="w-full rounded-xl" onClick={() => navigate('/search')}>
            Browse More Properties
          </Button>
        </div>
      </div>
    </div>
  );
}
