import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useNfsOperator } from "@/hooks/useNfsOperator";
import { useNfsOperatorReservations } from "@/hooks/useNfsReservations";
import { useNfsOperatorProperties } from "@/hooks/useNfsProperties";
import { useNfsBlockedDates, useNfsToggleBlockedDate } from "@/hooks/useNfsBlockedDates";
import { NfsMultiCalendar } from "@/components/nfs/NfsMultiCalendar";

export default function OperatorCalendar() {
  const { user } = useAuth();
  const { data: operator } = useNfsOperator(user?.id);

  const { data: properties = [], isLoading: propsLoading } =
    useNfsOperatorProperties(operator?.id ?? null);

  const { data: reservations = [], isLoading: resLoading } =
    useNfsOperatorReservations(operator?.id ?? null);

  const propertyIds = useMemo(() => properties.map((p) => p.id), [properties]);

  const { data: blockedDates = [], isLoading: blockedLoading } =
    useNfsBlockedDates(propertyIds);

  const toggleBlocked = useNfsToggleBlockedDate();

  const [search, setSearch] = useState("");

  const filteredProperties = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) =>
        p.public_title.toLowerCase().includes(q) ||
        (p.city ?? "").toLowerCase().includes(q) ||
        (p.country ?? "").toLowerCase().includes(q),
    );
  }, [properties, search]);

  const handleToggleBlock = async (
    propertyId: string,
    date: string,
    block: boolean,
  ) => {
    try {
      await toggleBlocked.mutateAsync({ propertyId, date, block });
      toast.success(block ? "Date blocked" : "Date unblocked");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update availability",
      );
    }
  };

  const isLoading = propsLoading || resLoading || blockedLoading;

  return (
    <div
      data-feature="NFSTAY__OP_CALENDAR"
      className="p-4 sm:p-6 space-y-5 max-w-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View reservations and manage availability across all properties
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties…"
            className="pl-9 rounded-full h-9 text-sm"
          />
        </div>
      </div>

      {/* Calendar */}
      <NfsMultiCalendar
        properties={filteredProperties}
        reservations={reservations}
        blockedDates={blockedDates}
        onToggleBlock={handleToggleBlock}
        loading={isLoading}
      />
    </div>
  );
}
