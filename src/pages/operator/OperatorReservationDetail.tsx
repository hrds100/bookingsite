import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import { ArrowLeft, CalendarDays, Users, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";
import { mockReservations, getReservationProperty } from "@/data/mock-reservations";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function OperatorReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const res = mockReservations.find(r => r.id === id);

  if (!res) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <NfsEmptyState icon={CalendarDays} title="Reservation not found" description="This reservation doesn't exist." actionLabel="View reservations" onAction={() => navigate('/nfstay/reservations')} />
      </div>
    );
  }

  const prop = getReservationProperty(res);
  const nights = differenceInDays(parseISO(res.check_out), parseISO(res.check_in));

  return (
    <div className="p-6 max-w-3xl">
      <button onClick={() => navigate('/nfstay/reservations')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to reservations
      </button>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Reservation</p>
            <p className="font-mono text-sm font-semibold">{res.id.toUpperCase()}</p>
          </div>
          <NfsStatusBadge status={res.status} />
        </div>

        <hr className="border-border" />

        <div>
          <h2 className="text-lg font-semibold">{prop.title}</h2>
          <p className="text-sm text-muted-foreground">{prop.city}, {prop.country}</p>
        </div>

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

        <div>
          <h3 className="text-sm font-semibold mb-2">Guest</h3>
          <p className="text-sm">{res.guest_first_name} {res.guest_last_name}</p>
          <p className="text-sm text-muted-foreground">{res.guest_email}</p>
          <p className="text-sm text-muted-foreground">{res.guest_phone}</p>
        </div>

        <hr className="border-border" />

        <div>
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
      </div>
    </div>
  );
}
