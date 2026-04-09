import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Download, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockReservations, type MockReservation } from "@/data/mock-reservations";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { useNfsOperatorReservations, type ReservationWithProperty } from "@/hooks/useNfsReservations";
import { format, parseISO, isFuture, isPast } from "date-fns";

export default function OperatorReservations() {
  const { formatPrice } = useCurrency();
  const { operatorId } = useAuth();
  const { data: realReservations, isLoading } = useNfsOperatorReservations(operatorId);
  const [search, setSearch] = useState("");

  // Show operator's real reservations only — no mock fallback
  const all: ReservationWithProperty[] = realReservations ?? [];

  const upcoming = all.filter(r => isFuture(parseISO(r.check_in)) && r.status !== 'cancelled');
  const past = all.filter(r => isPast(parseISO(r.check_out)) || r.status === 'completed');
  const cancelled = all.filter(r => r.status === 'cancelled');
  const pending = all.filter(r => r.status === 'pending' || r.status === 'pending_approval');

  const filterList = (list: ReservationWithProperty[]) =>
    list.filter(r => {
      const propTitle = r.nfs_properties?.public_title ?? "";
      return `${r.guest_first_name} ${r.guest_last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        propTitle.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase());
    });

  const ReservationTable = ({ data }: { data: ReservationWithProperty[] }) => {
    const filtered = filterList(data);
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left bg-muted/30">
                <th className="p-4 font-medium text-muted-foreground">ID</th>
                <th className="p-4 font-medium text-muted-foreground">Guest</th>
                <th className="p-4 font-medium text-muted-foreground">Property</th>
                <th className="p-4 font-medium text-muted-foreground">Check-in</th>
                <th className="p-4 font-medium text-muted-foreground">Check-out</th>
                <th className="p-4 font-medium text-muted-foreground">Guests</th>
                <th className="p-4 font-medium text-muted-foreground">Amount</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Payment</th>
                <th className="p-4 font-medium text-muted-foreground w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No reservations found</td></tr>
              ) : filtered.map((r) => {
                const propTitle = r.nfs_properties?.public_title ?? r.property_id ?? "—";
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono text-xs">{r.id.slice(0, 8).toUpperCase()}</td>
                    <td className="p-4">
                      <p className="font-medium">{r.guest_first_name} {r.guest_last_name}</p>
                      <p className="text-xs text-muted-foreground">{r.guest_email}</p>
                    </td>
                    <td className="p-4 text-muted-foreground truncate max-w-[140px]">{propTitle}</td>
                    <td className="p-4 text-muted-foreground whitespace-nowrap">{format(parseISO(r.check_in), 'MMM d, yyyy')}</td>
                    <td className="p-4 text-muted-foreground whitespace-nowrap">{format(parseISO(r.check_out), 'MMM d, yyyy')}</td>
                    <td className="p-4 text-muted-foreground">{r.adults + r.children}</td>
                    <td className="p-4 font-medium">{formatPrice(r.total_amount)}</td>
                    <td className="p-4"><NfsStatusBadge status={r.status} /></td>
                    <td className="p-4"><NfsStatusBadge status={r.payment_status} /></td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                        <Link to={`/nfstay/reservations/${r.id}`}><Eye className="w-4 h-4" /></Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div data-feature="NFSTAY__OP_RESERVATIONS" className="p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
          <p className="text-sm text-muted-foreground">{all.length} total reservations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-lg gap-2"><Download className="w-4 h-4" /> Export CSV</Button>
          <Button asChild className="rounded-lg gap-2">
            <Link to="/nfstay/create-reservation"><Plus className="w-4 h-4" /> Create</Link>
          </Button>
        </div>
      </div>

      <div data-feature="NFSTAY__OP_RESERVATIONS_SEARCH" className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by guest, property, or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
      <Tabs defaultValue="all">
        <TabsList data-feature="NFSTAY__OP_RESERVATIONS_FILTER">
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4"><ReservationTable data={all} /></TabsContent>
        <TabsContent value="pending" className="mt-4"><ReservationTable data={pending} /></TabsContent>
        <TabsContent value="upcoming" className="mt-4"><ReservationTable data={upcoming} /></TabsContent>
        <TabsContent value="past" className="mt-4"><ReservationTable data={past} /></TabsContent>
        <TabsContent value="cancelled" className="mt-4"><ReservationTable data={cancelled} /></TabsContent>
      </Tabs>
      )}
    </div>
  );
}
