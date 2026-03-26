import { useParams, useNavigate, Navigate } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import { ArrowLeft, CalendarDays, MapPin, Users, CreditCard, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";
import { useNfsReservationWithProperty } from "@/hooks/useNfsReservations";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";

export default function TravelerReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { user, loading: authLoading } = useAuth();
  const { data: res, isLoading, error } = useNfsReservationWithProperty(id);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !res) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <NfsEmptyState icon={CalendarDays} title="Reservation not found" description="This reservation doesn't exist." actionLabel="View reservations" onAction={() => navigate('/traveler/reservations')} />
      </div>
    );
  }

  const propData = res.nfs_properties;
  const propTitle = propData?.public_title ?? "Unknown Property";
  const propImage = propData?.images?.[0]?.url ?? "";
  const propCity = propData?.city ?? "";
  const propCountry = propData?.country ?? "";

  const nights = differenceInDays(parseISO(res.check_out), parseISO(res.check_in));
  const canCancel = res.status === 'confirmed' || res.status === 'pending';

  return (
    <div data-feature="NFSTAY__TRAVELER_DETAIL" className="max-w-3xl mx-auto px-4 py-10">
      <button onClick={() => navigate('/traveler/reservations')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to reservations
      </button>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {propImage && (
          <div className="relative h-48">
            <img src={propImage} alt={propTitle} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-xl font-bold text-white">{propTitle}</h1>
              {(propCity || propCountry) && (
                <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
                  <MapPin className="w-3 h-3" />{[propCity, propCountry].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
        {!propImage && (
          <div className="p-6 pb-0">
            <h1 className="text-xl font-bold">{propTitle}</h1>
            {(propCity || propCountry) && (
              <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                <MapPin className="w-3 h-3" />{[propCity, propCountry].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        )}

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Reservation</p>
              <p className="font-mono text-sm font-semibold">{res.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <NfsStatusBadge status={res.status} />
          </div>

          <hr className="border-border" />

          <div data-feature="NFSTAY__TRAVELER_DETAIL_INFO" className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Check-in</p>
              <p className="font-semibold">{format(parseISO(res.check_in), 'EEE, MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Check-out</p>
              <p className="font-semibold">{format(parseISO(res.check_out), 'EEE, MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Guests</p>
              <p className="font-semibold">{res.adults} adults{res.children > 0 ? `, ${res.children} children` : ''}{res.infants > 0 ? `, ${res.infants} infants` : ''}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Duration</p>
              <p className="font-semibold">{nights} night{nights !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <hr className="border-border" />

          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment</h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-lg">{formatPrice(res.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Payment status</span>
              <NfsStatusBadge status={res.payment_status} />
            </div>
          </div>

          {canCancel && (
            <>
              <hr className="border-border" />
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Cancel reservation</p>
                    <p className="text-xs text-muted-foreground mt-1">Please review the cancellation policy before proceeding. Refund eligibility depends on the property's policy.</p>
                    <Button data-feature="NFSTAY__TRAVELER_DETAIL_CANCEL" variant="destructive" size="sm" className="mt-3 rounded-lg" onClick={() => alert('Cancellation request submitted (mock)')}>
                      Request cancellation
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 text-center">
        <Button data-feature="NFSTAY__TRAVELER_DETAIL_PROPERTY" variant="outline" className="rounded-xl" onClick={() => navigate(`/property/${res.property_id}`)}>
          View property
        </Button>
      </div>
    </div>
  );
}
