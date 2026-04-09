import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, MapPin, Calendar, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface GuestReservation {
  id: string;
  status: string;
  payment_status: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_amount: number;
  payment_currency: string;
  created_at: string;
  nfs_properties?: {
    public_title?: string;
    city?: string;
    country?: string;
    images?: { url: string }[];
  } | null;
}

function useGuestLookup(email: string | undefined) {
  return useQuery({
    queryKey: ["nfs-guest-lookup", email],
    queryFn: async (): Promise<GuestReservation[]> => {
      if (!email) return [];
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/nfs-guest-lookup?email=${encodeURIComponent(email)}`
      );
      if (!res.ok) return [];
      const json = await res.json();
      return json.reservations ?? [];
    },
    enabled: !!email,
    staleTime: 30_000,
  });
}

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

export default function NfsGuestBookingLookup() {
  const [searchParams] = useSearchParams();
  const urlEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(urlEmail);
  const [searchEmail, setSearchEmail] = useState<string | undefined>(
    urlEmail ? urlEmail.trim().toLowerCase() : undefined
  );

  // Auto-search when email comes from URL (e.g. clicked from confirmation email)
  useEffect(() => {
    if (urlEmail && !searchEmail) {
      setSearchEmail(urlEmail.trim().toLowerCase());
    }
  }, [urlEmail]);

  const { data: results, isLoading, error } = useGuestLookup(searchEmail);

  const handleSearch = () => {
    if (email.trim()) {
      setSearchEmail(email.trim().toLowerCase());
    }
  };

  const hasSearched = searchEmail !== undefined;

  const currencySymbol = (c: string) =>
    ({ GBP: "£", USD: "$", EUR: "€", AED: "AED ", SGD: "S$" }[c] ?? c);

  return (
    <div data-feature="NFSTAY__LOOKUP" className="max-w-lg mx-auto px-4 pt-16 pb-20">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Find your booking</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter the email you used when booking to see your reservations
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        <Input
          data-feature="NFSTAY__LOOKUP_EMAIL"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          className="rounded-[10px] h-11"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button
          data-feature="NFSTAY__LOOKUP_SUBMIT"
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
        <div data-feature="NFSTAY__LOOKUP_RESULT" className="space-y-3">
          {results.map((r) => {
            const prop = r.nfs_properties;
            const image = prop?.images?.[0]?.url ?? "";
            const title = prop?.public_title ?? "Property";
            const city = prop?.city ?? "";
            const country = prop?.country ?? "";
            return (
              <div
                key={r.id}
                className="bg-card border border-border rounded-2xl p-4 flex gap-4 hover:shadow-md transition"
              >
                {image && (
                  <img
                    src={image}
                    alt={title}
                    className="w-24 h-20 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold truncate">{title}</h3>
                    <NfsStatusBadge status={r.status} />
                  </div>
                  {(city || country) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <MapPin className="w-3 h-3" />
                      {[city, country].filter(Boolean).join(", ")}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {r.check_in} → {r.check_out}
                  </div>
                  <p className="text-sm font-semibold mt-1">
                    {currencySymbol(r.payment_currency)}{r.total_amount}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Ref: {r.id.slice(0, 8).toUpperCase()}
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
