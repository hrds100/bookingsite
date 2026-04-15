import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Download, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { useNfsOperatorReservations, type ReservationWithProperty } from "@/hooks/useNfsReservations";
import { format, parseISO, isFuture, isPast } from "date-fns";

function exportToCsv(reservations: ReservationWithProperty[]) {
  const headers = ["ID", "Guest Name", "Guest Email", "Guest Phone", "Property", "Check-in", "Check-out", "Nights", "Adults", "Children", "Total Amount", "Currency", "Status", "Payment Status", "Booked At"];
  const rows = reservations.map(r => {
    const checkIn = parseISO(r.check_in);
    const checkOut = parseISO(r.check_out);
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return [
      r.id,
      `${r.guest_first_name} ${r.guest_last_name}`,
      r.guest_email ?? "",
      r.guest_phone ?? "",
      r.nfs_properties?.public_title ?? r.property_id ?? "",
      format(checkIn, "yyyy-MM-dd"),
      format(checkOut, "yyyy-MM-dd"),
      nights,
      r.adults,
      r.children,
      r.total_amount,
      r.payment_currency ?? "GBP",
      r.status,
      r.payment_status,
      format(parseISO(r.created_at), "yyyy-MM-dd HH:mm"),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reservations-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OperatorReservations() {
  const { formatPrice } = useCurrency();
  const { operatorId } = useAuth();
  const { data: realReservations, isLoading } = useNfsOperatorReservations(operatorId);
  const [search, setSearch] = useState("");

  // Show operator's real reservations only — no mock fallback
  const all: ReservationWithProperty[] = realReservations ?? [];

  const pending = all.filter(r => r.status === 'pending' || r.status === 'pending_approval');
  // Running = already checked in, not yet checked out
  const running = all.filter(r => !isFuture(parseISO(r.check_in)) && !isPast(parseISO(r.check_out)) && r.status !== 'cancelled');
  // Upcoming = check-in is still in the future
  const upcoming = all.filter(r => isFuture(parseISO(r.check_in)) && r.status !== 'cancelled' && r.status !== 'pending' && r.status !== 'pending_approval');
  const past = all.filter(r => isPast(parseISO(r.check_out)) && r.status !== 'cancelled');
  const cancelled = all.filter(r => r.status === 'cancelled');

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
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 items-center">
                        <NfsStatusBadge status={r.payment_status} />
                        {(r as any).payment_method === 'cash' && (
                          <NfsStatusBadge status="cash" />
                        )}
                      </div>
                    </td>
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
          <Button variant="outline" className="rounded-lg gap-2" onClick={() => exportToCsv(all)} disabled={all.length === 0}><Download className="w-4 h-4" /> Export CSV</Button>
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
          <TabsTrigger value="running">Running ({running.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4"><ReservationTable data={all} /></TabsContent>
        <TabsContent value="running" className="mt-4"><ReservationTable data={running} /></TabsContent>
        <TabsContent value="pending" className="mt-4"><ReservationTable data={pending} /></TabsContent>
        <TabsContent value="upcoming" className="mt-4"><ReservationTable data={upcoming} /></TabsContent>
        <TabsContent value="past" className="mt-4"><ReservationTable data={past} /></TabsContent>
        <TabsContent value="cancelled" className="mt-4"><ReservationTable data={cancelled} /></TabsContent>
      </Tabs>
      )}
    </div>
  );
}
