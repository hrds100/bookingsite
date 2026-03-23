import { Building2, CalendarDays, TrendingUp, Loader2 } from "lucide-react";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useNfsOperatorProperties } from "@/hooks/useNfsOperator";
import { useNfsOperatorReservations } from "@/hooks/useNfsReservations";
import { useOperatorMonthlyRevenue, useOperatorOccupancy, useOperatorTotalRevenue } from "@/hooks/useOperatorStats";
import { useCurrency } from "@/contexts/CurrencyContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";

export default function OperatorAnalytics() {
  const { formatPrice } = useCurrency();
  const { operatorId } = useAuth();
  const { data: properties } = useNfsOperatorProperties(operatorId);
  const { data: reservations } = useNfsOperatorReservations(operatorId);
  const { data: totalRevenue, isLoading: revLoading } = useOperatorTotalRevenue(operatorId);
  const { data: revenueData } = useOperatorMonthlyRevenue(operatorId);
  const { data: occupancyData } = useOperatorOccupancy(operatorId);

  const propCount = properties?.length ?? 0;
  const resCount = reservations?.length ?? 0;

  if (revLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (propCount === 0 && resCount === 0) {
    return (
      <div className="p-6 max-w-7xl">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Analytics</h1>
        <p className="text-sm text-muted-foreground mb-8">Track views, bookings, and revenue performance.</p>
        <NfsEmptyState
          icon={TrendingUp}
          title="No data yet"
          description="Analytics will appear here once you have properties and reservations."
        />
      </div>
    );
  }

  const statCards = [
    { label: "Total Revenue", value: formatPrice(totalRevenue ?? 0), icon: TrendingUp },
    { label: "Properties", value: propCount, icon: Building2 },
    { label: "Reservations", value: resCount, icon: CalendarDays },
  ];

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Track views, bookings, and revenue performance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Monthly Revenue</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData ?? []}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(164, 73%, 34%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(164, 73%, 34%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="hsl(164, 73%, 34%)" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Occupancy Rate (%)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={occupancyData ?? []}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="hsl(164, 73%, 34%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(164, 73%, 34%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bookings by month */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-4">Bookings per Month</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={revenueData ?? []}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="revenue" name="Revenue" fill="hsl(164, 73%, 34%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
