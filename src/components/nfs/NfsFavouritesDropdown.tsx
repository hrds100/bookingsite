import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useCurrency } from "@/contexts/CurrencyContext";

const STORAGE_KEY = "nfs_favourites";
const SUPABASE_CONFIGURED =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY;

interface FavProperty {
  id: string;
  public_title: string;
  city: string;
  country: string;
  base_rate_amount: number;
  base_rate_currency: string;
  images: { url: string; is_cover?: boolean }[];
  slug: string | null;
}

function readFavs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function NfsFavouritesDropdown() {
  const [open, setOpen] = useState(false);
  const [favIds, setFavIds] = useState<string[]>(readFavs);
  const [properties, setProperties] = useState<FavProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  // Sync with localStorage changes (from other components toggling favourites)
  useEffect(() => {
    const sync = () => setFavIds(readFavs());
    window.addEventListener("storage", sync);
    // Also poll on focus (same-tab changes don't fire storage event)
    const interval = setInterval(sync, 2000);
    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(interval);
    };
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch property data when favIds change
  useEffect(() => {
    if (favIds.length === 0) {
      setProperties([]);
      return;
    }
    if (!SUPABASE_CONFIGURED) return;

    setLoading(true);
    supabase
      .from("nfs_properties")
      .select(
        "id, public_title, city, country, base_rate_amount, base_rate_currency, images, slug"
      )
      .in("id", favIds)
      .then(({ data }) => {
        setProperties((data as FavProperty[]) || []);
        setLoading(false);
      });
  }, [favIds]);

  const handleRemove = useCallback(
    (e: React.MouseEvent, propertyId: string) => {
      e.stopPropagation();
      const next = favIds.filter((id) => id !== propertyId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setFavIds(next);
      setProperties((prev) => prev.filter((p) => p.id !== propertyId));
    },
    [favIds]
  );

  const handleClick = useCallback(
    (p: FavProperty) => {
      setOpen(false);
      navigate(`/property/${p.slug || p.id}`);
    },
    [navigate]
  );

  const count = favIds.length;

  // Flash badge when count increases
  const [flashBadge, setFlashBadge] = useState(false);
  const prevCountRef = useRef(count);
  useEffect(() => {
    if (count > prevCountRef.current) {
      setFlashBadge(true);
      const timer = setTimeout(() => setFlashBadge(false), 2000);
      prevCountRef.current = count;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [count]);

  return (
    <div data-feature="NFSTAY__FAVOURITES" ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex items-center gap-1 p-2 rounded-full transition-all duration-200 ${
          open
            ? "text-red-500 bg-red-50"
            : "text-muted-foreground hover:text-foreground hover:bg-gray-50"
        }`}
        title="Favourites"
      >
        <Heart
          className="w-[18px] h-[18px]"
          strokeWidth={1.8}
          fill={open || count > 0 ? "currentColor" : "none"}
        />
        {count > 0 && !open && (
          <span className="text-[11px] font-medium text-muted-foreground">
            {count}
          </span>
        )}
        {flashBadge && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          data-feature="NFSTAY__FAVOURITES_PANEL"
          className="absolute right-0 top-11 w-[340px] bg-white border border-border/40 rounded-xl shadow-2xl z-[200] overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/20">
            <span className="text-[13px] font-semibold text-foreground">
              Favourites
            </span>
            <span className="text-[11px] text-muted-foreground ml-2">
              {count} saved
            </span>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {loading && properties.length === 0 ? (
              <div className="py-8 text-center">
                <span className="text-sm text-muted-foreground">
                  Loading...
                </span>
              </div>
            ) : properties.length === 0 ? (
              <div className="py-10 text-center">
                <Heart className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No favourites yet
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  Click the heart on any property to save it here
                </p>
              </div>
            ) : (
              properties.map((p, i) => {
                const cover =
                  p.images?.find((img) => img.is_cover)?.url ??
                  p.images?.[0]?.url ??
                  "";
                const priceStr = formatPrice(p.base_rate_amount, p.base_rate_currency);
                return (
                  <div
                    key={p.id}
                    className={`group flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors cursor-pointer ${
                      i < properties.length - 1 ? "border-b border-border/10" : ""
                    }`}
                    onClick={() => handleClick(p)}
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={p.public_title}
                        className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Heart className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {p.public_title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.city}, {p.country}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 mr-1">
                      <p className="text-[12px] font-medium text-foreground">
                        {priceStr}
                        <span className="text-muted-foreground font-normal">
                          /night
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleRemove(e, p.id)}
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-muted-foreground hover:text-red-500"
                      title="Remove from favourites"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
