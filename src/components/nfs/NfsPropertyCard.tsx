import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, ChevronLeft, ChevronRight, MapPin, Users, BedDouble, Bath, Star } from "lucide-react";
import type { MockProperty } from "@/data/mock-properties";
import type { OperatorDomainInfo } from "@/hooks/useNfsOperator";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import { pickTranslation, tPropertyType } from "@/lib/i18n-enum";

interface NfsPropertyCardProps {
  property: MockProperty;
  onHover?: (id: string | null) => void;
  /** Map of operatorId → domain info, used to route clicks to the operator's own site */
  operatorDomains?: Record<string, OperatorDomainInfo>;
}

/** Resolve where a card click should navigate.
 *  - If the property's operator has a custom domain or subdomain → /forward?...
 *  - Otherwise → /property/:slug (stays on nfstay.app)
 */
function resolveCardHref(property: MockProperty, operatorDomains?: Record<string, OperatorDomainInfo>): string {
  const info = operatorDomains?.[property.operator_id];
  if (!info) return `/property/${property.slug || property.id}`;

  const { brand_name, subdomain, custom_domain, primary_domain_type } = info;

  let operatorHost: string | null = null;
  if (primary_domain_type === "custom" && custom_domain) {
    operatorHost = custom_domain;
  } else if (subdomain) {
    operatorHost = `${subdomain}.nfstay.app`;
  }

  if (!operatorHost) return `/property/${property.slug || property.id}`;

  const destination = `https://${operatorHost}/property/${property.slug || property.id}`;
  return `/forward?redirect_uri=${encodeURIComponent(destination)}&brand=${encodeURIComponent(brand_name)}`;
}

export function NfsPropertyCard({ property, onHover, operatorDomains }: NfsPropertyCardProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isFavourite, setIsFavourite] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { isWhiteLabel } = useWhiteLabel();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  // Operator-entered title translation (falls back to public_title when missing)
  const displayTitle = pickTranslation(property.title_translations, currentLang, property.public_title);
  // Translated property type label (falls back to raw value when key missing)
  const displayPropertyType = tPropertyType(property.property_type, t);

  const sortedImages = [...property.images].sort((a, b) => {
    if (a.is_cover && !b.is_cover) return -1;
    if (!a.is_cover && b.is_cover) return 1;
    return a.order - b.order;
  });

  const isNew = Date.now() - new Date(property.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  const { formatPrice } = useCurrency();
  // Only forward on the main nfstay.app site — not when already on an operator's domain
  const cardHref = isWhiteLabel
    ? `/property/${property.slug || property.id}`
    : resolveCardHref(property, operatorDomains);

  useEffect(() => {
    const favs: string[] = JSON.parse(localStorage.getItem('nfs_favourites') || '[]');
    setIsFavourite(favs.includes(property.id));
  }, [property.id]);

  const toggleFavourite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const favs: string[] = JSON.parse(localStorage.getItem('nfs_favourites') || '[]');
    const next = isFavourite ? favs.filter(id => id !== property.id) : [...favs, property.id];
    localStorage.setItem('nfs_favourites', JSON.stringify(next));
    setIsFavourite(!isFavourite);
  };

  return (
    <Link
      to={cardHref}
      className="group block"
      onMouseEnter={() => { setIsHovered(true); onHover?.(property.id); }}
      onMouseLeave={() => { setIsHovered(false); onHover?.(null); }}
    >
      {/* Image area */}
      <div className="relative aspect-[320/300] rounded-2xl overflow-hidden mb-2.5">
        <img
          src={sortedImages[currentImage]?.url}
          alt={sortedImages[currentImage]?.caption || property.public_title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />

        {/* Favourite */}
        <button
          data-feature="NFSTAY__CARD_FAVOURITE"
          onClick={toggleFavourite}
          className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition"
        >
          <Heart className={`w-4 h-4 ${isFavourite ? 'fill-destructive text-destructive' : 'text-foreground'}`} />
        </button>

        {/* New badge */}
        {isNew && (
          <span className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground text-xs font-medium px-2.5 py-1 rounded-md">
            New
          </span>
        )}

        {/* Image arrows */}
        {sortedImages.length > 1 && (
          <>
            {currentImage > 0 && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImage(currentImage - 1); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {currentImage < sortedImages.length - 1 && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImage(currentImage + 1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {/* Dots */}
        {sortedImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {sortedImages.slice(0, 5).map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition ${i === currentImage ? 'bg-card' : 'bg-card/50'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground truncate leading-tight">{displayTitle}</h3>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground capitalize">{displayPropertyType}</span>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-0.5 font-medium text-foreground">
            <Star className="w-3 h-3 fill-primary text-primary" />
            {(property as any).average_rating ?? '4.8'}
          </span>
          {isNew && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-primary font-medium">New</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{property.city}, {property.state ? `${property.state}, ` : ''}{property.country}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {property.max_guests}
            </span>
            <span className="flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5" />
              {property.room_counts.bedrooms}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5" />
              {property.room_counts.bathrooms}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-foreground">{formatPrice(property.base_rate_amount, property.base_rate_currency)}</span>
            <span className="text-xs text-muted-foreground block leading-tight">avg per night</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
