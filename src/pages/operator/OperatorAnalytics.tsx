import { BarChart3 } from "lucide-react";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";

export default function OperatorAnalytics() {
  return (
    <div className="p-6 max-w-7xl">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Analytics</h1>
      <p className="text-sm text-muted-foreground mb-8">Track views, bookings, and revenue performance.</p>
      <NfsEmptyState
        icon={BarChart3}
        title="Analytics coming soon"
        description="Detailed page views, booking funnels, and revenue breakdowns will appear here once connected to the backend."
      />
    </div>
  );
}
