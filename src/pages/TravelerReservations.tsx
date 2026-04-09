import { Link, Navigate } from "react-router-dom";
import { format, parseISO, isFuture, isPast } from "date-fns";
import { CalendarDays, MapPin, Users, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";
import { getReservationProperty } from "@/data/mock-reservations";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { useNfsReservations, type ReservationWithProperty } from "@/hooks/useNfsReservations";

function getPropertyDisplay(r: ReservationWithProperty) {
  if (r.nfs_properties?.public_title) {
    return {
      title: r.nfs_properties.public_title,
      image: r.nfs_properties.images?.[0]?.url ?? "",
      city: r.nfs_properties.city ?? "",
      country: r.nfs_properties.country ?? "",
    };
  }
  return getReservationProperty(r);
}

function ReservationCard({ r }: { r: ReservationWithProperty }) {
  const { formatPrice } = useCurrency();
  const prop = getPropertyDisplay(r);
  return (
    <Link data-feature="NFSTAY__TRAVELER_CARD" to={`/traveler/reservation/${r.id}`} className="flex gap-4 bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group">
      <img src={prop.image} alt={prop.title} className="w-24 h-24 rounded-xl object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm truncate">{prop.title}</h3>
          <NfsStatusBadge status={r.status} />
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <MapPin className="w-3 h-3" />{prop.city}, {prop.country}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{format(parseISO(r.check_in), 'MMM d')} – {format(parseISO(r.check_out), 'MMM d, yyyy')}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{r.adults + r.children} guests</span>
        </div>
        <p className="text-sm font-semibold mt-2">{formatPrice(r.total_amount)}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground self-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}

export default function TravelerReservations() {
  const { user, loading } = useAuth();
  const { data: reservations, isLoading: reservationsLoading } = useNfsReservations(user?.email ?? undefined);

  if (loading || reservationsLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  const all: ReservationWithProperty[] = reservations ?? [];
  // Running = already checked in, not yet checked out
  const running = all.filter(r => !isFuture(parseISO(r.check_in)) && !isPast(parseISO(r.check_out)) && r.status !== 'cancelled');
  // Upcoming = check-in is still in the future
  const upcoming = all.filter(r => isFuture(parseISO(r.check_in)) && r.status !== 'cancelled');
  const past = all.filter(r => isPast(parseISO(r.check_out)) && r.status !== 'cancelled');
  const cancelled = all.filter(r => r.status === 'cancelled');

  const renderList = (list: ReservationWithProperty[]) =>
    list.length === 0
      ? <NfsEmptyState icon={CalendarDays} title="No reservations" description="You don't have any reservations in this category." />
      : <div className="space-y-3">{list.map(r => <ReservationCard key={r.id} r={r} />)}</div>;

  return (
    <div data-feature="NFSTAY__TRAVELER_RESERVATIONS" className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-6">My Reservations</h1>
      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
          <TabsTrigger value="running">Running ({running.length})</TabsTrigger>
          <TabsTrigger data-feature="NFSTAY__TRAVELER_UPCOMING" value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger data-feature="NFSTAY__TRAVELER_PAST" value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderList(all)}</TabsContent>
        <TabsContent value="running">{renderList(running)}</TabsContent>
        <TabsContent value="upcoming">{renderList(upcoming)}</TabsContent>
        <TabsContent value="past">{renderList(past)}</TabsContent>
        <TabsContent value="cancelled">{renderList(cancelled)}</TabsContent>
      </Tabs>
    </div>
  );
}
