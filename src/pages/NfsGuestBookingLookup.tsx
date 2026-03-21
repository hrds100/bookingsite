import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, MapPin, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";
import { getReservationProperty } from "@/data/mock-reservations";
import { useNfsReservations } from "@/hooks/useNfsReservations";
import type { ReservationWithProperty } from "@/hooks/useNfsReservations";

function BookingCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex gap-4">
      <Skeleton className="w-24 h-20 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

function getPropertyDisplay(r: ReservationWithProperty) {
  if (r.nfs_properties) {
    const p = r.nfs_properties;
    return {
      title: p.public_title ?? "Unknown Property",
      image: p.images?.[0]?.url ?? "",
      city: p.city ?? "",
      country: p.country ?? "",
    };
  }
  return getReservationProperty(r);
}

export default function NfsGuestBookingLookup() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [searchEmail, setSearchEmail] = useState<string | undefined>(undefined);

  const { data: results, isLoading, error } = useNfsReservations(searchEmail);

  const handleSearch = () => {
    if (email.trim()) {
      setSearchEmail(email.trim().toLowerCase());
    }
  };

  const hasSearched = searchEmail !== undefined;

  return (
    <div className="max-w-lg mx-auto px-4 pt-16 pb-20">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Find your booking</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email to see all reservations linked to it
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          className="rounded-[10px] h-11"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button
          onClick={handleSearch}
          disabled={!email || isLoading}
          className="rounded-xl h-11 px-6"
        >
          {isLoading ? "Searching..." : "Find bookings"}
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </div>
      )}

      {error && hasSearched && (
        <NfsEmptyState
          icon={AlertCircle}
          title="Something went wrong"
          description="We couldn't load your bookings. Please try again."
          actionLabel="Retry"
          onAction={handleSearch}
        />
      )}

      {!isLoading && !error && hasSearched && results && results.length === 0 && (
        <NfsEmptyState
          icon={Search}
          title="No bookings found"
          description="Double-check your email address or contact support"
        />
      )}

      {!isLoading && !error && hasSearched && results && results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => {
            const prop = getPropertyDisplay(r);
            return (
              <div
                key={r.id}
                className="bg-card border border-border rounded-2xl p-4 flex gap-4 hover:shadow-md transition"
              >
                <img
                  src={prop.image}
                  alt={prop.title}
                  className="w-24 h-20 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold truncate">{prop.title}</h3>
                    <NfsStatusBadge status={r.status} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <MapPin className="w-3 h-3" />
                    {prop.city}, {prop.country}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {r.check_in} → {r.check_out}
                  </div>
                  <p className="text-sm font-semibold mt-1">
                    {r.payment_currency === "GBP" ? "\u00A3" : r.payment_currency}{r.total_amount}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
