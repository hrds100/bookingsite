import { useState, useMemo } from "react";
import { Search, Building2, Phone, Mail, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminOperators } from "@/hooks/useAdminOperators";
import type { AdminOperator } from "@/hooks/useAdminOperators";

function OperatorCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

function OperatorCard({ op }: { op: AdminOperator }) {
  const statusLabel = op.onboarding_completed ? "completed" : "pending";
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-base">{op.brand_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registered {op.created_at?.split("T")[0] ?? "—"}
          </p>
        </div>
        <NfsStatusBadge status={statusLabel} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{op.contact_email ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{op.contact_phone ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          {op.property_count} {op.property_count === 1 ? "property" : "properties"}
        </div>
      </div>
    </div>
  );
}

export default function AdminOperators() {
  const [search, setSearch] = useState("");
  const { data: operators, isLoading, error } = useAdminOperators();

  const filtered = useMemo(() => {
    if (!operators) return [];
    const q = search.toLowerCase();
    if (!q) return operators;
    return operators.filter(
      (o) =>
        o.brand_name.toLowerCase().includes(q) ||
        (o.contact_email?.toLowerCase().includes(q) ?? false)
    );
  }, [operators, search]);

  const onboarded = useMemo(() => filtered.filter((o) => o.onboarding_completed), [filtered]);
  const inProgress = useMemo(() => filtered.filter((o) => !o.onboarding_completed), [filtered]);

  const renderList = (list: AdminOperator[]) => {
    if (list.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-8">
          No operators found.
        </p>
      );
    }
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {list.map((op) => (
          <OperatorCard key={op.id} op={op} />
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-6 max-w-7xl">
        <NfsEmptyState
          icon={AlertCircle}
          title="Failed to load operators"
          description="Something went wrong while fetching operator data. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Operator Management</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : `${operators?.length ?? 0} registered operators`}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search operators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-lg"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OperatorCardSkeleton />
          <OperatorCardSkeleton />
          <OperatorCardSkeleton />
        </div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
            <TabsTrigger value="onboarded">Onboarded ({onboarded.length})</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress ({inProgress.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            {renderList(filtered)}
          </TabsContent>
          <TabsContent value="onboarded" className="mt-4">
            {renderList(onboarded)}
          </TabsContent>
          <TabsContent value="in-progress" className="mt-4">
            {renderList(inProgress)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
