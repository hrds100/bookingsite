import { Link } from "react-router-dom";
import { Building2, CalendarDays, TrendingUp, Star, ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { mockOperatorStats, mockMonthlyRevenue, mockOccupancyData } from "@/data/mock-operator";
import { getReservationProperty } from "@/data/mock-reservations";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { useNfsOperator, useNfsOperatorProperties } from "@/hooks/useNfsOperator";
import { useNfsOperatorReservations } from "@/hooks/useNfsReservations";
import { format, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const stats = mockOperatorStats;

export default function OperatorDashboard() {
  const { formatPrice } = useCurrency();
  const { operatorId } = useAuth();
  const { data: operator } = useNfsOperator();
  const { data: realProperties } = useNfsOperatorProperties(operatorId);
  const { data: realReservations } = useNfsOperatorReservations(operatorId);
  const recentReservations = (realReservations ?? []).slice(0, 5);

  const propCount = realProperties?.length ?? 0;
  const resCount = realReservations?.length ?? 0;

  const statCards = [
    { label: "Total Revenue", value: formatPrice(0), icon: TrendingUp, change: "—", sub: "coming soon" },
    { label: "Active Listings", value: propCount, icon: Building2, change: `${propCount} total`, sub: "properties" },
    { label: "Reservations", value: resCount, icon: CalendarDays, change: `${resCount} total`, sub: "reservations" },
    { label: "Avg Rating", value: "—", icon: Star, change: "—", sub: "coming soon" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back{operator?.brand_name ? `, ${operator.brand_name}` : ""}! Here's your property overview.
          </p>
        </div>
        <Button asChild className="rounded-lg gap-2">
          <Link to="/nfstay/properties/new"><Plus className="w-4 h-4" /> Add Property</Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-primary font-medium">{s.change}</span> {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Monthly Revenue</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockMonthlyRevenue}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="revenue" fill="hsl(145, 63%, 42%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Occupancy Rate (%)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mockOccupancyData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="hsl(145, 63%, 42%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(145, 63%, 42%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Reservations */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Recent Reservations</h2>
          <Button variant="ghost" size="sm" asChild className="text-primary gap-1">
            <Link to="/nfstay/reservations">View all <ArrowUpRight className="w-3 h-3" /></Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-medium text-muted-foreground">Guest</th>
                <th className="pb-3 font-medium text-muted-foreground">Property</th>
                <th className="pb-3 font-medium text-muted-foreground">Dates</th>
                <th className="pb-3 font-medium text-muted-foreground">Amount</th>
                <th className="pb-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentReservations.map((r) => {
                const prop = getReservationProperty(r);
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-3 font-medium">{r.guest_first_name} {r.guest_last_name}</td>
                    <td className="py-3 text-muted-foreground truncate max-w-[160px]">{prop.title}</td>
                    <td className="py-3 text-muted-foreground whitespace-nowrap">{format(parseISO(r.check_in), 'MMM d')} – {format(parseISO(r.check_out), 'MMM d')}</td>
                    <td className="py-3 font-medium">{formatPrice(r.total_amount)}</td>
                    <td className="py-3"><NfsStatusBadge status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
