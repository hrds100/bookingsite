import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import { ArrowLeft, CalendarDays, Users, CreditCard, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";
import { useNfsReservationWithProperty, useNfsUpdateReservation } from "@/hooks/useNfsReservations";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "@/hooks/use-toast";
import { notifyBookingConfirmed, notifyBookingCancelled } from "@/lib/email";

export default function OperatorReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { data: res, isLoading, error } = useNfsReservationWithProperty(id);
  const updateReservation = useNfsUpdateReservation();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !res) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <NfsEmptyState icon={CalendarDays} title="Reservation not found" description="This reservation doesn't exist." actionLabel="View reservations" onAction={() => navigate('/nfstay/reservations')} />
      </div>
    );
  }

  const nights = differenceInDays(parseISO(res.check_out), parseISO(res.check_in));
  const isPendingApproval = res.status === 'pending_approval' || res.status === 'pending';

  const propertyTitle = res.nfs_properties?.public_title ?? res.property_id ?? "Property";
  const propertyCity = res.nfs_properties?.city ?? "";
  const propertyCountry = res.nfs_properties?.country ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const operatorEmail: string | undefined = (res.nfs_properties as any)?.nfs_operators?.contact_email ?? undefined;

  const handleAccept = async () => {
    try {
      await updateReservation.mutateAsync({ id: res.id, status: "confirmed", payment_status: "paid" });
      toast({ title: "Reservation accepted", description: "The guest has been notified." });
      notifyBookingConfirmed({
        reservationId: res.id,
        guestName: `${res.guest_first_name} ${res.guest_last_name}`,
        guestEmail: res.guest_email,
        propertyTitle,
        propertyCity,
        propertyCountry,
        checkIn: res.check_in,
        checkOut: res.check_out,
        nights,
        adults: res.adults,
        children: res.children,
        total: res.total_amount,
        currency: res.payment_currency,
        operatorEmail,
      });
    } catch {
      toast({ title: "Error", description: "Could not accept reservation. Try again.", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    try {
      await updateReservation.mutateAsync({ id: res.id, status: "rejected" });
      toast({ title: "Reservation rejected", description: rejectReason ? `Reason: ${rejectReason}` : "The guest has been notified." });
      notifyBookingCancelled({
        reservationId: res.id,
        guestName: `${res.guest_first_name} ${res.guest_last_name}`,
        guestEmail: res.guest_email,
        propertyTitle,
        propertyCity,
        propertyCountry,
        checkIn: res.check_in,
        checkOut: res.check_out,
        nights,
        adults: res.adults,
        children: res.children,
        total: res.total_amount,
        currency: res.payment_currency,
        operatorEmail,
      });
      setShowRejectForm(false);
    } catch {
      toast({ title: "Error", description: "Could not reject reservation. Try again.", variant: "destructive" });
    }
  };

  return (
    <div data-feature="NFSTAY__OP_RESERVATION_DETAIL" className="p-6 max-w-3xl">
      <button onClick={() => navigate('/nfstay/reservations')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to reservations
      </button>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Reservation</p>
            <p className="font-mono text-sm font-semibold">{res.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <NfsStatusBadge status={res.status} />
        </div>

        <hr className="border-border" />

        <div className="grid grid-cols-2 gap-4 text-sm">
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

        <div data-feature="NFSTAY__OP_RESERVATION_GUEST">
          <h3 className="text-sm font-semibold mb-2">Guest</h3>
          <p className="text-sm">{res.guest_first_name} {res.guest_last_name}</p>
          <p className="text-sm text-muted-foreground">{res.guest_email}</p>
          <p className="text-sm text-muted-foreground">{res.guest_phone}</p>
        </div>

        <hr className="border-border" />

        <div data-feature="NFSTAY__OP_RESERVATION_PAYMENT">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment</h3>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-lg">{formatPrice(res.total_amount)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Payment status</span>
            <NfsStatusBadge status={res.payment_status} />
          </div>
        </div>

        {/* Accept / Reject buttons — only for pending reservations */}
        {isPendingApproval && (
          <>
            <hr className="border-border" />
            <div data-feature="NFSTAY__OP_RESERVATION_ACTIONS" className="space-y-3">
              <h3 className="text-sm font-semibold">Actions</h3>

              {!showRejectForm ? (
                <div className="flex gap-3">
                  <Button
                    onClick={handleAccept}
                    disabled={updateReservation.isPending}
                    className="rounded-lg flex items-center gap-2"
                  >
                    {updateReservation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Accept
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectForm(true)}
                    disabled={updateReservation.isPending}
                    className="rounded-lg flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                  <p className="text-sm font-medium text-destructive">Reject this reservation?</p>
                  <Textarea
                    placeholder="Reason for rejection (optional)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleReject}
                      disabled={updateReservation.isPending}
                      className="rounded-lg"
                    >
                      {updateReservation.isPending ? "Rejecting..." : "Confirm Reject"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRejectForm(false)}
                      className="rounded-lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
