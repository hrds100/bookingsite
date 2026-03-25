import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { ArrowLeft, Share2, Heart, MapPin, Users, BedDouble, Bath, ChevronLeft, ChevronRight, X, Check, ShieldCheck, Clock, PawPrint, Search, Loader2, Star, MessageSquare, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CURRENCIES, CANCELLATION_POLICIES } from "@/lib/constants";
import { NfsBookingWidget } from "@/components/nfs/NfsBookingWidget";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";
import { useNfsProperty } from "@/hooks/useNfsProperties";
import { useNfsReviews } from "@/hooks/useNfsReviews";
import { useNfsOperatorPublic } from "@/hooks/useNfsOperatorPublic";

export default function NfsPropertyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: property, isLoading } = useNfsProperty(id);

  const [showMore, setShowMore] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const { addViewed } = useRecentlyViewed();
  const { reviews, averageRating, totalCount } = useNfsReviews(property?.id);
  const { data: hostInfo } = useNfsOperatorPublic(property?.operator_id);

  useEffect(() => {
    const favs: string[] = JSON.parse(localStorage.getItem('nfs_favourites') || '[]');
    setIsFavourite(id ? favs.includes(id) : false);
    if (id) addViewed(id);
  }, [id, addViewed]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <NfsEmptyState icon={Search} title="Property not found" description="This listing may have been removed or doesn't exist." actionLabel="Browse properties" onAction={() => navigate('/search')} />
      </div>
    );
  }

  const rawImages = Array.isArray(property.images) ? property.images : [];
  const sortedImages = [...rawImages].sort((a: any, b: any) => {
    if (a.is_cover && !b.is_cover) return -1;
    if (!a.is_cover && b.is_cover) return 1;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  const currency = CURRENCIES.find(c => c.code === property.base_rate_currency);
  const policy = CANCELLATION_POLICIES[property.cancellation_policy as keyof typeof CANCELLATION_POLICIES];
  const isNew = Date.now() - new Date(property.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  const amenityList = Object.entries(property.amenities ?? {}).filter(([, v]) => v).map(([k]) => k);

  const toggleFavourite = () => {
    const favs: string[] = JSON.parse(localStorage.getItem('nfs_favourites') || '[]');
    const next = isFavourite ? favs.filter(fid => fid !== property.id) : [...favs, property.id];
    localStorage.setItem('nfs_favourites', JSON.stringify(next));
    setIsFavourite(!isFavourite);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: property.public_title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div data-feature="NFSTAY__PROPERTY">
      {/* Top nav */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary"><ArrowLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium truncate max-w-[200px] md:max-w-md">{property.public_title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2 rounded-lg hover:bg-secondary"><Share2 className="w-4 h-4" /></button>
            <button onClick={toggleFavourite} className="p-2 rounded-lg hover:bg-secondary"><Heart className={`w-4 h-4 ${isFavourite ? 'fill-destructive text-destructive' : ''}`} /></button>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <div data-feature="NFSTAY__PROPERTY_PHOTOS" className="max-w-7xl mx-auto px-4 mt-4">
        {sortedImages.length <= 3 ? (
          <div className="hidden md:grid gap-2 h-[400px] md:h-[480px] lg:h-[500px] rounded-2xl overflow-hidden mb-10" style={{ gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr' }}>
            <div className="row-span-2 cursor-pointer" onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}>
              <img src={sortedImages[0]?.url} alt={sortedImages[0]?.caption} className="w-full h-full object-cover" />
            </div>
            {sortedImages.slice(1, 3).map((img, i) => (
              <div key={i} className="cursor-pointer" onClick={() => { setLightboxIndex(i + 1); setLightboxOpen(true); }}>
                <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
              </div>
            ))}
            {sortedImages.length === 2 && (
              <div className="bg-muted flex items-center justify-center cursor-pointer" onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}>
                <span className="text-muted-foreground text-sm">View photos</span>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[400px] md:h-[480px] lg:h-[500px] rounded-2xl overflow-hidden mb-10">
            <div className="col-span-2 row-span-2 cursor-pointer" onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}>
              <img src={sortedImages[0]?.url} alt={sortedImages[0]?.caption} className="w-full h-full object-cover" />
            </div>
            {sortedImages.slice(1, 5).map((img, i) => (
              <div key={i} className="relative cursor-pointer" onClick={() => { setLightboxIndex(i + 1); setLightboxOpen(true); }}>
                <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
                {i === 3 && sortedImages.length > 5 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white font-semibold">+{sortedImages.length - 5} more</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="md:hidden rounded-2xl overflow-hidden aspect-video cursor-pointer" onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}>
          <img src={sortedImages[0]?.url} alt={sortedImages[0]?.caption} className="w-full h-full object-cover" />
        </div>
        <button onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }} className="mt-2 text-xs font-semibold bg-card border border-border rounded-2xl px-3 py-1.5">
          View all {sortedImages.length} photos
        </button>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setLightboxOpen(false)} className="text-white/70 hover:text-white p-2"><X className="w-5 h-5" /></button>
            <span className="text-white/70 text-sm">{lightboxIndex + 1} / {sortedImages.length}</span>
            <div className="w-9" />
          </div>
          <div className="flex-1 flex items-center justify-center relative px-4">
            <button onClick={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))} className="absolute left-4 p-3 rounded-full bg-white/20 text-white hover:bg-white/30"><ChevronLeft className="w-5 h-5" /></button>
            <img src={sortedImages[lightboxIndex]?.url} alt="" className="max-h-[80vh] object-contain" />
            <button onClick={() => setLightboxIndex(Math.min(sortedImages.length - 1, lightboxIndex + 1))} className="absolute right-4 p-3 rounded-full bg-white/20 text-white hover:bg-white/30"><ChevronRight className="w-5 h-5" /></button>
          </div>
          {sortedImages[lightboxIndex]?.caption && <p className="text-center text-white/70 text-sm py-2">{sortedImages[lightboxIndex].caption}</p>}
          <div className="flex gap-2 justify-center py-4 overflow-x-auto px-4">
            {sortedImages.map((img, i) => (
              <button key={i} onClick={() => setLightboxIndex(i)} className={`w-14 h-14 rounded overflow-hidden shrink-0 ${i === lightboxIndex ? 'ring-2 ring-white' : 'opacity-50'}`}>
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col xl:flex-row gap-8 xl:gap-12 max-w-7xl mx-auto">
        <main className="flex-1 xl:max-w-4xl space-y-8">
          <div>
            <h1 data-feature="NFSTAY__PROPERTY_TITLE" className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight mb-4">{property.public_title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-gray-600 text-sm md:text-base">
              <MapPin className="w-4 h-4" />
              <span>{property.city}, {property.country}</span>
              <span>·</span>
              <span className="capitalize">{property.property_type}</span>
              <span>·</span>
              <span>{property.max_guests} guests</span>
              <span>·</span>
              <span>{property.room_counts?.bedrooms ?? 0} bedrooms</span>
              <span>·</span>
              <span>{property.room_counts?.bathrooms ?? 0} bathrooms</span>
              {totalCount > 0 ? (
                <><span>·</span><span className="flex items-center gap-1 text-primary font-medium"><Star className="w-3.5 h-3.5 fill-primary text-primary" />{averageRating} ({totalCount} {totalCount === 1 ? 'review' : 'reviews'})</span></>
              ) : isNew ? (
                <><span>·</span><span className="text-primary font-medium">★ New</span></>
              ) : null}
            </div>
          </div>
          {/* Room info merged into title area above */}
          <hr className="border-border" />
          <div>
            <h2 className="text-lg font-semibold mb-3">About this place</h2>
            <p className="text-sm text-foreground whitespace-pre-line">
              {showMore ? property.description : property.description.slice(0, 300)}{property.description.length > 300 && !showMore && '...'}
            </p>
            {property.description.length > 300 && (
              <button onClick={() => setShowMore(!showMore)} className="text-sm font-semibold text-primary mt-2 hover:underline">{showMore ? 'Show less' : 'Show more'}</button>
            )}
          </div>
          <hr className="border-border" />
          <div data-feature="NFSTAY__PROPERTY_AMENITIES">
            <h2 className="text-lg font-semibold mb-3">What this place offers</h2>
            <div className="grid grid-cols-2 gap-3">
              {amenityList.slice(0, showAllAmenities ? undefined : 10).map(a => (
                <div key={a} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary shrink-0" />{a}</div>
              ))}
            </div>
            {amenityList.length > 10 && (
              <Button variant="outline" className="mt-4 rounded-2xl" onClick={() => setShowAllAmenities(!showAllAmenities)}>
                {showAllAmenities ? 'Show fewer' : `Show all ${amenityList.length} amenities`}
              </Button>
            )}
          </div>
          <hr className="border-border" />
          <div data-feature="NFSTAY__PROPERTY_RULES">
            <h2 className="text-lg font-semibold mb-3">House rules</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" />Check-in after {property.check_in_time}</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" />Check-out before {property.check_out_time}</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" />Max {property.max_guests} guests</div>
              <div className="flex items-center gap-2"><PawPrint className="w-4 h-4 text-muted-foreground" />{property.max_pets > 0 ? `Pets allowed (max ${property.max_pets})` : 'No pets'}</div>
            </div>
            {property.rules && <p className="text-sm text-muted-foreground mt-3">{property.rules}</p>}
          </div>
          <hr className="border-border" />
          <div data-feature="NFSTAY__PROPERTY_PRICE">
            <h2 className="text-lg font-semibold mb-2">Cancellation policy</h2>
            {policy && (
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">{policy.label}</p>
                  <p className="text-sm text-muted-foreground">{policy.description}</p>
                </div>
              </div>
            )}
          </div>
          {hostInfo && (hostInfo.contact_whatsapp || hostInfo.contact_email) && (
            <>
              <hr className="border-border" />
              <div data-feature="NFSTAY__PROPERTY_HOST">
                <h2 className="text-lg font-semibold mb-4">Contact host</h2>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    {hostInfo.brand_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{hostInfo.brand_name}</p>
                    {hostInfo.first_name && <p className="text-sm text-muted-foreground">{hostInfo.first_name}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Member since {new Date(hostInfo.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </p>
                    {hostInfo.about_bio && <p className="text-sm text-muted-foreground mt-2">{hostInfo.about_bio}</p>}
                    <div className="flex flex-wrap gap-3 mt-4">
                      {hostInfo.contact_whatsapp && (
                        <a
                          href={`https://wa.me/${hostInfo.contact_whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${hostInfo.brand_name}, I'm interested in "${property.public_title}" in ${property.city}. Is it available?`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white text-sm font-medium rounded-xl hover:bg-[#20bd5a] transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </a>
                      )}
                      {hostInfo.contact_email && (
                        <a
                          href={`mailto:${hostInfo.contact_email}?subject=${encodeURIComponent(`Enquiry: ${property.public_title}`)}&body=${encodeURIComponent(`Hi ${hostInfo.brand_name},\n\nI'm interested in "${property.public_title}" in ${property.city}.\n\nCould you let me know about availability?\n\nThanks`)}`}
                          className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-sm font-medium rounded-xl hover:bg-secondary transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          Email
                        </a>
                      )}
                      {property.contact_phone && (
                        <a
                          href={`tel:${property.contact_phone}`}
                          className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-sm font-medium rounded-xl hover:bg-secondary transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          <hr className="border-border" />
          <div data-feature="NFSTAY__PROPERTY_MAP">
            <h2 className="text-lg font-semibold mb-2">Where you'll be</h2>
            <p className="text-sm text-muted-foreground mb-3">{property.city}, {property.state}, {property.country}</p>
            {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
              <iframe
                title="Property location"
                className="w-full h-[300px] rounded-2xl border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={
                  property.lat && property.lng
                    ? `https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${property.lat},${property.lng}&zoom=14`
                    : `https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(`${property.city}, ${property.country}`)}&zoom=12`
                }
              />
            ) : (
              <div className="bg-muted rounded-2xl h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{property.city}, {property.country}</p>
                </div>
              </div>
            )}
          </div>
          <hr className="border-border" />
          {/* Reviews Section */}
          <div data-testid="reviews-section" data-feature="NFSTAY__PROPERTY_REVIEWS">
            {totalCount > 0 ? (
              <>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 fill-primary text-primary" />
                  {averageRating} · {totalCount} {totalCount === 1 ? 'review' : 'reviews'}
                </h2>
                <div className="space-y-6">
                  {reviews.slice(0, showAllReviews ? undefined : 3).map((review) => (
                    <div key={review.id} data-testid="review-card" className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                          {review.guestAvatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{review.guestName}</span>
                            <span className="text-xs text-muted-foreground">{new Date(review.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-primary text-primary' : 'text-border'}`} />
                            ))}
                          </div>
                          <p className="text-sm text-foreground mt-2">{review.comment}</p>
                          {review.response && (
                            <div className="mt-3 ml-2 pl-3 border-l-2 border-border">
                              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> Host response
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">{review.response}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {totalCount > 3 && (
                  <Button
                    variant="outline"
                    className="mt-6 rounded-2xl"
                    onClick={() => setShowAllReviews(!showAllReviews)}
                  >
                    {showAllReviews ? 'Show fewer reviews' : `Show all ${totalCount} reviews`}
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No reviews yet</p>
              </div>
            )}
          </div>
        </main>
        <aside className="xl:w-96 xl:sticky xl:top-24 z-40 xl:self-start">
          <NfsBookingWidget data-feature="NFSTAY__PROPERTY_BOOKING" property={property} />
        </aside>
      </div>
    </div>
  );
}
