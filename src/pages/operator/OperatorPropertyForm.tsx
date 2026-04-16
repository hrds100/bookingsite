import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Loader2, Plus, Trash2, RefreshCw, CalendarRange, Ban, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Calendar as DayCalendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import type { DateRange } from "react-day-picker";
import {
  format as fmtDate, parseISO as parseDateISO, startOfDay,
  eachDayOfInterval, differenceInDays, addDays,
} from "date-fns";
import { CANCELLATION_POLICIES } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNfsPropertyCreate, useNfsPropertyUpdate, type PropertyFields } from "@/hooks/useNfsPropertyMutation";
import { useNfsImageUpload } from "@/hooks/useNfsImageUpload";
import NfsPlacesAutocomplete, { type PlaceResult } from "@/components/nfs/NfsPlacesAutocomplete";
import { supabase } from "@/lib/supabase";
import { notifyNewProperty } from "@/lib/email";
import { useNfsPropertyBlockedDatesList, useNfsBlockDateRange } from "@/hooks/useNfsBlockedDates";
import { useNfsPropertyDateOverrides, useNfsUpsertDateOverrides, useNfsClearDateOverrides } from "@/hooks/useNfsDateOverrides";
import { SITE_LANGUAGES, dbLangToLocale } from "@/components/nfs/NfsLanguageSelector";
import { useNfsOperator } from "@/hooks/useNfsOperator";
import { useNfsIcalProperty, useNfsIcalFeedsUpdate, useNfsIcalSync, buildIcalExportUrl, type IcalFeed } from "@/hooks/useNfsIcal";

// --- Constants ---

const PROPERTY_TYPE_OPTIONS = [
  "apartment", "house", "villa", "studio", "cabin", "cottage", "townhouse", "condo", "loft", "other",
] as const;

const RENTAL_TYPE_OPTIONS = [
  { value: "entire_place", label: "Entire place" },
  { value: "private_room", label: "Private room" },
  { value: "shared_room", label: "Shared room" },
] as const;

const CURRENCY_OPTIONS = ["GBP", "USD", "EUR"] as const;

const BED_TYPE_OPTIONS = [
  "Single", "Double", "Queen", "King", "Sofa bed", "Bunk bed",
] as const;

const EXTRA_ROOM_OPTIONS = [
  "Living room", "Dining room", "Kitchen", "Office/workspace", "Balcony", "Terrace", "Garden",
] as const;

const AMENITY_CATEGORIES: Record<string, { label: string; items: { key: string; label: string }[] }> = {
  essentials: {
    label: "Essentials",
    items: [
      { key: "wifi", label: "WiFi" },
      { key: "parking", label: "Free parking" },
      { key: "ac", label: "Air conditioning" },
      { key: "heating", label: "Heating" },
      { key: "washer", label: "Washer" },
      { key: "dryer", label: "Dryer" },
      { key: "kitchen", label: "Kitchen" },
    ],
  },
  safety: {
    label: "Safety",
    items: [
      { key: "smoke_alarm", label: "Smoke alarm" },
      { key: "fire_extinguisher", label: "Fire extinguisher" },
      { key: "first_aid", label: "First aid kit" },
    ],
  },
  outdoor: {
    label: "Outdoor",
    items: [
      { key: "pool", label: "Pool" },
      { key: "hot_tub", label: "Hot tub" },
      { key: "garden", label: "Garden" },
      { key: "bbq", label: "BBQ grill" },
    ],
  },
  entertainment: {
    label: "Entertainment",
    items: [
      { key: "tv", label: "TV" },
      { key: "gym", label: "Gym" },
      { key: "game_room", label: "Game room" },
    ],
  },
  other: {
    label: "Other",
    items: [
      { key: "elevator", label: "Elevator" },
      { key: "wheelchair_access", label: "Wheelchair accessible" },
      { key: "ev_charger", label: "EV charger" },
    ],
  },
};

// --- Types ---

interface ImageItem {
  url: string;
  caption: string;
  order: number;
}

interface BedDetail {
  type: string;
  count: number;
}

interface BathroomDetail {
  type: "ensuite" | "shared";
}

// --- Component ---

export default function OperatorPropertyForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { operatorId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useNfsPropertyCreate();
  const updateMutation = useNfsPropertyUpdate();
  const { upload, uploading: imageUploading } = useNfsImageUpload();

  // Operator's default language for form labels & translation filters
  const { data: operatorProfile } = useNfsOperator();
  const defaultLangCode = operatorProfile?.default_language
    ? dbLangToLocale(operatorProfile.default_language)
    : 'en';
  const defaultLangInfo = SITE_LANGUAGES.find(l => l.code === defaultLangCode) ?? SITE_LANGUAGES[0];


  // ── iCal sync state ──
  const { data: icalData, refetch: refetchIcal } = useNfsIcalProperty(isEdit ? id : null);
  const icalFeedsUpdate = useNfsIcalFeedsUpdate();
  const icalSyncMutation = useNfsIcalSync();
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");

  // Form state
  const [publicTitle, setPublicTitle] = useState("");
  const [internalName, setInternalName] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [rentalType, setRentalType] = useState("");
  const [description, setDescription] = useState("");
  const [titleTranslations, setTitleTranslations] = useState<Record<string, string>>({});
  const [descriptionTranslations, setDescriptionTranslations] = useState<Record<string, string>>({});
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [maxGuests, setMaxGuests] = useState(2);
  const [bedrooms, setBedrooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [bedDetails, setBedDetails] = useState<BedDetail[]>([]);
  const [bathroomDetails, setBathroomDetails] = useState<BathroomDetail[]>([]);
  const [extraRooms, setExtraRooms] = useState<string[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [amenities, setAmenities] = useState<Record<string, boolean>>({});
  const [baseRateAmount, setBaseRateAmount] = useState<number | "">("");
  const [baseRateCurrency, setBaseRateCurrency] = useState("GBP");
  const [cleaningFeeEnabled, setCleaningFeeEnabled] = useState(false);
  const [cleaningFeeAmount, setCleaningFeeAmount] = useState<number | "">(0);
  const [minimumStay, setMinimumStay] = useState(1);
  const [weeklyDiscount, setWeeklyDiscount] = useState(0);
  const [monthlyDiscount, setMonthlyDiscount] = useState(0);
  const [dayPricesEnabled, setDayPricesEnabled] = useState(false);
  const [dayPrices, setDayPrices] = useState<Record<string, number | "">>({}); // keys "0"–"6"
  const [cancellationPolicy, setCancellationPolicy] = useState("flexible");
  const [checkInTime, setCheckInTime] = useState("15:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [rules, setRules] = useState("");
  const [propertyAddons, setPropertyAddons] = useState<{ id: string; name: string; price: number; description: string }[]>([]);
  const [loadingProperty, setLoadingProperty] = useState(false);

  // Availability pre-blocking (new properties) — stores "YYYY-MM-DD" strings
  const [pendingBlockedDates, setPendingBlockedDates] = useState<string[]>([]);
  const blockDateRange = useNfsBlockDateRange();

  // For edit mode: fetch existing blocked dates
  const { data: existingBlockedDates = [] } = useNfsPropertyBlockedDatesList(isEdit ? id : undefined);

  // Availability modal state (used for both create + edit modes)
  const [availModalOpen, setAvailModalOpen] = useState(false);
  const [availRange, setAvailRange] = useState<DateRange | undefined>(undefined);
  const [availSubmitting, setAvailSubmitting] = useState(false);
  const [availMode, setAvailMode] = useState<"block" | "price" | "minstay">("block");
  const [availCustomPrice, setAvailCustomPrice] = useState<number | "">("");
  const [availMinStay, setAvailMinStay] = useState<number | "">(1);

  // Per-date overrides (edit mode only)
  const { data: dateOverrides = [] } = useNfsPropertyDateOverrides(isEdit ? id : undefined);
  const upsertOverrides = useNfsUpsertDateOverrides();
  const clearOverrides  = useNfsClearDateOverrides();

  // Drag-to-select refs for availability calendar
  const isDragCalRef = useRef(false);
  const dragCalStartRef = useRef<Date | null>(null);

  const saving = createMutation.isPending || updateMutation.isPending;

  // Fetch property for edit mode
  useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;

    async function fetchProperty() {
      setLoadingProperty(true);
      try {
        const { data, error } = await (supabase.from("nfs_properties") as any)
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error || !data || cancelled) {
          if (!cancelled) {
            toast({ title: "Error", description: "Property not found.", variant: "destructive" });
            navigate("/nfstay/properties");
          }
          return;
        }

        setPublicTitle(data.public_title || "");
        setInternalName(data.internal_name || "");
        setTitleTranslations(data.title_translations && typeof data.title_translations === 'object' ? data.title_translations : {});
        setDescriptionTranslations(data.description_translations && typeof data.description_translations === 'object' ? data.description_translations : {});
        setPropertyType(data.property_type || "");
        setRentalType(data.rental_type || "");
        setDescription(data.description || "");
        setAddress(data.address || "");
        setCity(data.city || "");
        setState(data.state || "");
        setCountry(data.country || "");
        setPostalCode(data.postal_code || "");
        setLat(data.lat ?? null);
        setLng(data.lng ?? null);
        setMaxGuests(data.max_guests ?? 2);

        const rc = data.room_counts ?? {};
        setBedrooms(rc.bedrooms ?? 1);
        setBeds(rc.beds ?? 1);
        setBathrooms(rc.bathrooms ?? 1);
        setBedDetails(Array.isArray(rc.bed_details) ? rc.bed_details : []);
        setBathroomDetails(Array.isArray(rc.bathroom_details) ? rc.bathroom_details : []);
        setExtraRooms(Array.isArray(rc.extra_rooms) ? rc.extra_rooms : []);

        setImages(Array.isArray(data.images) ? data.images : []);
        setAmenities(typeof data.amenities === "object" && data.amenities ? data.amenities : {});
        setBaseRateAmount(data.base_rate_amount ?? "");
        setBaseRateCurrency(data.base_rate_currency || "GBP");

        const cf = data.cleaning_fee ?? {};
        setCleaningFeeEnabled(cf.enabled ?? false);
        setCleaningFeeAmount(cf.amount ?? 0);

        setMinimumStay(data.minimum_stay ?? 1);
        setWeeklyDiscount(data.weekly_discount ?? 0);
        setMonthlyDiscount(data.monthly_discount ?? 0);
        setDayPricesEnabled(data.day_prices_enabled ?? false);
        setDayPrices(
          typeof data.day_prices === "object" && data.day_prices
            ? data.day_prices
            : {},
        );
        setCancellationPolicy(data.cancellation_policy || "flexible");
        setCheckInTime(data.check_in_time || "15:00");
        setCheckOutTime(data.check_out_time || "11:00");
        setRules(data.rules || "");
        setPropertyAddons(Array.isArray(data.addons) ? data.addons : []);
      } catch (err) {
        if (!cancelled) {
          toast({ title: "Error", description: "Failed to load property data.", variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoadingProperty(false);
      }
    }

    fetchProperty();
    return () => { cancelled = true; };
  }, [id, isEdit, navigate]);

  // Drag-to-select: release drag on mouseup anywhere in doc
  useEffect(() => {
    const onMouseUp = () => {
      isDragCalRef.current = false;
      dragCalStartRef.current = null;
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  // --- Handlers ---

  const handlePlaceSelect = (place: PlaceResult) => {
    setAddress(place.address);
    setCity(place.city);
    setState(place.state);
    setCountry(place.country);
    setPostalCode(place.postal_code);
    setLat(place.lat);
    setLng(place.lng);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !operatorId) return;

    const propertyId = id || "new";

    for (let i = 0; i < files.length; i++) {
      try {
        const url = await upload(files[i], operatorId, propertyId);
        if (url) {
          setImages((prev) => [
            ...prev,
            { url, caption: "", order: prev.length },
          ]);
        }
      } catch {
        toast({ title: "Upload failed", description: `Failed to upload ${files[i].name}.`, variant: "destructive" });
      }
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx).map((img, i) => ({ ...img, order: i })));
  };

  const handleSetCover = (idx: number) => {
    setImages((prev) => {
      const updated = [...prev];
      const [chosen] = updated.splice(idx, 1);
      updated.unshift(chosen);
      return updated.map((img, i) => ({ ...img, order: i }));
    });
  };

  const toggleAmenity = (key: string) => {
    setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Bed details handlers
  const addBedDetail = () => {
    setBedDetails((prev) => [...prev, { type: "Double", count: 1 }]);
  };

  const updateBedDetail = (idx: number, field: keyof BedDetail, value: string | number) => {
    setBedDetails((prev) => prev.map((bd, i) => i === idx ? { ...bd, [field]: value } : bd));
  };

  const removeBedDetail = (idx: number) => {
    setBedDetails((prev) => prev.filter((_, i) => i !== idx));
  };

  // Auto-calculate total beds from bed_details
  const totalBedsFromDetails = bedDetails.reduce((sum, bd) => sum + bd.count, 0);

  // Sync beds count when bedDetails change
  useEffect(() => {
    if (bedDetails.length > 0) {
      setBeds(totalBedsFromDetails);
    }
  }, [totalBedsFromDetails, bedDetails.length]);

  // Sync bathroom count to number of detail entries (mirrors how beds work)
  useEffect(() => {
    if (bathroomDetails.length > 0) {
      setBathrooms(bathroomDetails.length);
    }
  }, [bathroomDetails.length]);

  // Bathroom details handlers
  const addBathroomDetail = () => {
    setBathroomDetails((prev) => [...prev, { type: "ensuite" }]);
    // count synced by useEffect above — do NOT increment here
  };

  const updateBathroomDetail = (idx: number, type: "ensuite" | "shared") => {
    setBathroomDetails((prev) => prev.map((bd, i) => i === idx ? { type } : bd));
  };

  const removeBathroomDetail = (idx: number) => {
    setBathroomDetails((prev) => prev.filter((_, i) => i !== idx));
    // count synced by useEffect above — do NOT decrement here
  };

  // Extra rooms handler
  const toggleExtraRoom = (room: string) => {
    setExtraRooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    );
  };

  const buildFields = (): PropertyFields => ({
    public_title: publicTitle.trim(),
    internal_name: internalName.trim() || null,
    property_type: propertyType,
    rental_type: rentalType,
    description: description.trim(),
    address,
    city,
    state,
    country,
    postal_code: postalCode,
    lat,
    lng,
    max_guests: maxGuests,
    room_counts: { bedrooms, beds, bathrooms, bed_details: bedDetails, bathroom_details: bathroomDetails, extra_rooms: extraRooms },
    base_rate_amount: typeof baseRateAmount === "number" ? baseRateAmount : 0,
    base_rate_currency: baseRateCurrency,
    cleaning_fee: { enabled: cleaningFeeEnabled, amount: typeof cleaningFeeAmount === "number" ? cleaningFeeAmount : 0 },
    minimum_stay: minimumStay,
    weekly_discount: weeklyDiscount,
    monthly_discount: monthlyDiscount,
    day_prices_enabled: dayPricesEnabled,
    day_prices: dayPricesEnabled
      ? Object.fromEntries(
          Object.entries(dayPrices).map(([k, v]) => [k, v === "" ? null : Number(v)])
        )
      : {},
    cancellation_policy: cancellationPolicy,
    amenities,
    images,
    check_in_time: checkInTime,
    check_out_time: checkOutTime,
    rules,
    addons: propertyAddons,
    title_translations: titleTranslations,
    description_translations: descriptionTranslations,
  } as PropertyFields & { addons: typeof propertyAddons });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicTitle.trim()) {
      toast({ title: "Validation error", description: "Property title is required.", variant: "destructive" });
      return;
    }

    if (!propertyType) {
      toast({ title: "Validation error", description: "Please select a property type.", variant: "destructive" });
      return;
    }

    if (!rentalType) {
      toast({ title: "Validation error", description: "Please select a rental type.", variant: "destructive" });
      return;
    }

    if (typeof baseRateAmount !== "number" || baseRateAmount <= 0) {
      toast({ title: "Validation error", description: "Base rate must be greater than 0.", variant: "destructive" });
      return;
    }

    try {
      const fields = buildFields();

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, fields });
        toast({ title: "Property updated", description: "Your property has been updated successfully." });
      } else {
        const created = await createMutation.mutateAsync(fields);
        // Save any pre-blocked dates after the property is created
        const newId = (created as any)?.id;
        if (newId && pendingBlockedDates.length > 0) {
          try {
            await blockDateRange.mutateAsync({ propertyId: newId, dates: pendingBlockedDates, block: true });
          } catch {
            // non-blocking — operator can manage via Calendar
          }
        }
        toast({ title: "Property created", description: "Your property has been created successfully." });
        // Notify admin about new property listing
        notifyNewProperty({
          propertyName: publicTitle.trim(),
          operatorName: operatorId || "",
          city: city || "",
        });
      }

      navigate("/nfstay/properties");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save property.";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    }
  };

  // --- Availability helpers ---

  /** Group sorted "YYYY-MM-DD" strings into consecutive ranges */
  function groupDatesIntoRanges(dates: string[]): { from: string; to: string }[] {
    if (dates.length === 0) return [];
    const sorted = [...dates].sort();
    const ranges: { from: string; to: string }[] = [];
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const prevDate = parseDateISO(prev);
      const currDate = parseDateISO(sorted[i]);
      if (differenceInDays(currDate, prevDate) === 1) {
        prev = sorted[i];
      } else {
        ranges.push({ from: start, to: prev });
        start = sorted[i];
        prev = sorted[i];
      }
    }
    ranges.push({ from: start, to: prev });
    return ranges;
  }

  function fmtRange(from: string, to: string) {
    const f = parseDateISO(from);
    const t = parseDateISO(to);
    if (from === to) return fmtDate(f, "MMM d, yyyy");
    if (f.getFullYear() === t.getFullYear())
      return `${fmtDate(f, "MMM d")} – ${fmtDate(t, "MMM d, yyyy")}`;
    return `${fmtDate(f, "MMM d, yyyy")} – ${fmtDate(t, "MMM d, yyyy")}`;
  }

  /** Drag-to-select on availability calendar: mousedown on a day button */
  const handleCalMouseDown = (e: React.MouseEvent) => {
    const btn = (e.target as Element).closest('button[aria-label]') as HTMLElement | null;
    if (!btn) return;
    const label = btn.getAttribute('aria-label') ?? '';
    const parsed = new Date(label);
    if (isNaN(parsed.getTime())) return;
    const day = startOfDay(parsed);
    isDragCalRef.current = true;
    dragCalStartRef.current = day;
    setAvailRange({ from: day, to: day });
  };

  /** Drag-to-select on availability calendar: mouse enters a new day while dragging */
  const handleCalDayMouseEnter = (day: Date) => {
    if (!isDragCalRef.current || !dragCalStartRef.current) return;
    const start = dragCalStartRef.current;
    const end = startOfDay(day);
    setAvailRange(start <= end ? { from: start, to: end } : { from: end, to: start });
  };

  /** Handle custom-price or min-stay override save/clear — edit mode */
  const handleAvailOverrideConfirm = async (clear: boolean) => {
    if (!availRange?.from || !id) return;
    const from  = availRange.from;
    const to    = availRange.to ?? availRange.from;
    const dates = eachDayOfInterval({ start: from, end: to }).map((d) =>
      fmtDate(d, "yyyy-MM-dd"),
    );
    setAvailSubmitting(true);
    try {
      if (clear) {
        await clearOverrides.mutateAsync({
          propertyId: id,
          dates,
          field: availMode === "price" ? "custom_price" : "min_stay",
        });
        toast({
          title: availMode === "price" ? "Custom prices cleared" : "Min stay cleared",
          description: `${dates.length} date${dates.length === 1 ? "" : "s"} reset to default`,
        });
      } else {
        const value = availMode === "price" ? availCustomPrice : availMinStay;
        if (value === "" || value === undefined) {
          toast({ title: "Please enter a value", variant: "destructive" });
          return;
        }
        await upsertOverrides.mutateAsync({
          propertyId: id,
          dates,
          ...(availMode === "price" ? { custom_price: Number(value) } : { min_stay: Number(value) }),
        });
        toast({
          title: availMode === "price" ? "Custom prices saved" : "Min stay saved",
          description: `${dates.length} date${dates.length === 1 ? "" : "s"} updated`,
        });
      }
      setAvailModalOpen(false);
      setAvailRange(undefined);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save overrides",
        variant: "destructive",
      });
    } finally {
      setAvailSubmitting(false);
    }
  };

  /** Handle block/unblock from the modal — edit mode */
  const handleAvailEditConfirm = async (block: boolean) => {
    if (!availRange?.from || !id) return;
    const from = availRange.from;
    const to = availRange.to ?? availRange.from;
    const dates = eachDayOfInterval({ start: from, end: to }).map((d) =>
      fmtDate(d, "yyyy-MM-dd"),
    );
    setAvailSubmitting(true);
    try {
      await blockDateRange.mutateAsync({ propertyId: id, dates, block });
      toast({
        title: block ? "Dates blocked" : "Dates unblocked",
        description: `${dates.length} date${dates.length !== 1 ? "s" : ""} updated.`,
      });
      setAvailModalOpen(false);
      setAvailRange(undefined);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update availability.",
        variant: "destructive",
      });
    } finally {
      setAvailSubmitting(false);
    }
  };

  /** Handle block confirmation — create mode (accumulates into pendingBlockedDates) */
  const handleAvailCreateConfirm = () => {
    if (!availRange?.from) return;
    const from = availRange.from;
    const to = availRange.to ?? availRange.from;
    const newDates = eachDayOfInterval({ start: from, end: to }).map((d) =>
      fmtDate(d, "yyyy-MM-dd"),
    );
    setPendingBlockedDates((prev) => {
      const set = new Set(prev);
      newDates.forEach((d) => set.add(d));
      return Array.from(set).sort();
    });
    setAvailModalOpen(false);
    setAvailRange(undefined);
  };

  const availDayCount =
    availRange?.from
      ? differenceInDays(availRange.to ?? availRange.from, availRange.from) + 1
      : 0;

  // --- Loading state ---

  if (loadingProperty) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading property...</span>
      </div>
    );
  }

  // --- Render ---

  return (
    <div data-feature="NFSTAY__OP_PROPERTY_FORM" className="p-4 md:p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button data-feature="NFSTAY__OP_PROPERTY_BACK" onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Property" : "Add New Property"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Update your property listing details." : "Fill in the details for your new listing."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">
                Property Title * <span className="text-muted-foreground font-normal text-xs">({defaultLangInfo.flag} {defaultLangInfo.name})</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Stunning Marina View Apartment"
                className="mt-1.5"
                value={publicTitle}
                onChange={(e) => setPublicTitle(e.target.value)}
                required
              />
              {/* Internal name (dashboard-only nickname) */}
              <div className="mt-3">
                <Label htmlFor="internal-name" className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  Internal name <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-normal">Dashboard only</span>
                </Label>
                <Input
                  id="internal-name"
                  placeholder="e.g., Manchester Skyscraper 2Bed — private nickname for easy search"
                  className="mt-1 h-8 text-sm"
                  value={internalName}
                  onChange={(e) => setInternalName(e.target.value)}
                />
              </div>

              {/* Translations for other languages */}
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Translations (optional)</p>
                <div className="flex flex-wrap gap-1.5">
                  {SITE_LANGUAGES.filter(l => l.code !== defaultLangCode).map(lang => (
                    <div key={lang.code} className="flex-1 min-w-[140px]">
                      <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <span>{lang.flag}</span> {lang.name}
                      </label>
                      <Input
                        placeholder={`Title in ${lang.name}`}
                        className="text-sm h-8"
                        value={titleTranslations[lang.code] || ""}
                        onChange={(e) => setTitleTranslations(prev => ({ ...prev, [lang.code]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="property-type">Property Type *</Label>
              <Select value={propertyType} onValueChange={setPropertyType} required>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rental-type">Rental Type *</Label>
              <Select value={rentalType} onValueChange={setRentalType} required>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {RENTAL_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Location</h2>
          <div>
            <Label>Address *</Label>
            <NfsPlacesAutocomplete
              onPlaceSelect={handlePlaceSelect}
              defaultValue={address}
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. London" className="mt-1.5" />
            </div>
            <div>
              <Label>State / Region</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. England" className="mt-1.5" />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. United Kingdom" className="mt-1.5" />
            </div>
            <div>
              <Label>Postal Code</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="e.g. SW1A 1AA" className="mt-1.5" />
            </div>
          </div>
        </section>

        {/* Rooms & Capacity */}
        <section className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Rooms & Capacity</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Bedrooms</Label>
              <Input
                type="number"
                min={0}
                value={bedrooms}
                onChange={(e) => setBedrooms(parseInt(e.target.value) || 0)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Total Beds</Label>
              <Input
                type="number"
                min={1}
                value={beds}
                onChange={(e) => setBeds(parseInt(e.target.value) || 1)}
                className="mt-1.5"
                disabled={bedDetails.length > 0}
              />
              {bedDetails.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Auto-calculated from bed details</p>
              )}
            </div>
            <div>
              <Label>Bathrooms</Label>
              <Input
                type="number"
                min={0}
                value={bathrooms}
                onChange={(e) => setBathrooms(parseInt(e.target.value) || 0)}
                className="mt-1.5"
                disabled={bathroomDetails.length > 0}
              />
              {bathroomDetails.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Auto-calculated from bathroom details</p>
              )}
            </div>
            <div>
              <Label>Max Guests</Label>
              <Input
                type="number"
                min={1}
                value={maxGuests}
                onChange={(e) => setMaxGuests(parseInt(e.target.value) || 1)}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Bed type breakdown */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Bed Details</Label>
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={addBedDetail}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add bed type
              </Button>
            </div>
            {bedDetails.map((bd, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Select value={bd.type} onValueChange={(v) => updateBedDetail(idx, "type", v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BED_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={bd.count}
                  onChange={(e) => updateBedDetail(idx, "count", parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <button type="button" onClick={() => removeBedDetail(idx)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Bathroom details */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Bathroom Details</Label>
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={addBathroomDetail}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add bathroom
              </Button>
            </div>
            {bathroomDetails.map((bd, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Select value={bd.type} onValueChange={(v) => updateBathroomDetail(idx, v as "ensuite" | "shared")}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ensuite">Ensuite</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground whitespace-nowrap">Bathroom {idx + 1}</span>
                <button type="button" onClick={() => removeBathroomDetail(idx)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Extra rooms */}
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Extra Rooms</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {EXTRA_ROOM_OPTIONS.map((room) => (
                <label
                  key={room}
                  className="flex items-center gap-2 cursor-pointer text-sm rounded-lg border border-border px-3 py-2 hover:bg-accent transition-colors"
                >
                  <Checkbox
                    checked={extraRooms.includes(room)}
                    onCheckedChange={() => toggleExtraRoom(room)}
                  />
                  {room}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Photos */}
        <section className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Photos</h2>

          {/* Uploaded previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div key={img.url} className="relative group rounded-lg overflow-hidden border border-border">
                  <img
                    src={img.url}
                    alt={img.caption || `Photo ${idx + 1}`}
                    className="w-full h-24 object-cover"
                  />
                  {idx === 0 ? (
                    <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetCover(idx)}
                      className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Set as cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload area */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {imageUploading ? (
              <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-3 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            )}
            <p className="text-sm text-muted-foreground">
              {imageUploading ? "Uploading..." : "Drag and drop photos or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG up to 10MB each. First photo will be the cover.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </section>

        {/* Amenities */}
        <section className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-5">
          <h2 className="text-lg font-semibold">Amenities</h2>
          {Object.entries(AMENITY_CATEGORIES).map(([catKey, cat]) => (
            <div key={catKey}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{cat.label}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {cat.items.map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 cursor-pointer text-sm rounded-lg border border-border px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <Checkbox
                      checked={!!amenities[item.key]}
                      onCheckedChange={() => toggleAmenity(item.key)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Description */}
        <section className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Description</h2>
          <div>
            <Label htmlFor="desc">
              Describe your property (max 2000 characters) <span className="text-muted-foreground font-normal text-xs">({defaultLangInfo.flag} {defaultLangInfo.name})</span>
            </Label>
            <Textarea
              id="desc"
              placeholder="Tell guests what makes your property special..."
              rows={5}
              className="mt-1.5"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{description.length}/2000</p>
            {/* Description translations for other languages */}
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Description Translations (optional)</p>
              {SITE_LANGUAGES.filter(l => l.code !== defaultLangCode).map(lang => (
                <div key={lang.code}>
                  <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <span>{lang.flag}</span> {lang.name}
                  </label>
                  <Textarea
                    placeholder={`Description in ${lang.name}...`}
                    rows={3}
                    className="text-sm"
                    value={descriptionTranslations[lang.code] || ""}
                    onChange={(e) => setDescriptionTranslations(prev => ({ ...prev, [lang.code]: e.target.value.slice(0, 2000) }))}
                    maxLength={2000}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Base Rate (per night) *</Label>
              <Input
                type="number"
                min={1}
                step={0.01}
                placeholder="100"
                className="mt-1.5"
                value={baseRateAmount}
                onChange={(e) => setBaseRateAmount(e.target.value ? parseFloat(e.target.value) : "")}
                required
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={baseRateCurrency} onValueChange={setBaseRateCurrency}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Minimum Stay (nights)</Label>
              <Input
                type="number"
                min={1}
                value={minimumStay}
                onChange={(e) => setMinimumStay(parseInt(e.target.value) || 1)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch
              checked={cleaningFeeEnabled}
              onCheckedChange={setCleaningFeeEnabled}
            />
            <Label>Cleaning fee</Label>
            {cleaningFeeEnabled && (
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0"
                className="w-32"
                value={cleaningFeeAmount}
                onChange={(e) => setCleaningFeeAmount(e.target.value ? parseFloat(e.target.value) : "")}
              />
            )}
          </div>

          {/* ── Length-of-stay discounts ── */}
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-medium">Length-of-stay discounts</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Weekly discount (%) <span className="font-normal">· 7+ nights</span>
                </Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    step={1}
                    placeholder="0"
                    className="w-24"
                    value={weeklyDiscount || ""}
                    onChange={(e) => setWeeklyDiscount(Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  {weeklyDiscount > 0 && typeof baseRateAmount === "number" && (
                    <span className="text-xs text-primary">
                      ≈ {baseRateCurrency} {Math.round(baseRateAmount * 7 * (1 - weeklyDiscount / 100))}/week
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Monthly discount (%) <span className="font-normal">· 30+ nights</span>
                </Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    step={1}
                    placeholder="0"
                    className="w-24"
                    value={monthlyDiscount || ""}
                    onChange={(e) => setMonthlyDiscount(Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  {monthlyDiscount > 0 && typeof baseRateAmount === "number" && (
                    <span className="text-xs text-primary">
                      ≈ {baseRateCurrency} {Math.round(baseRateAmount * 30 * (1 - monthlyDiscount / 100))}/month
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Custom day pricing ── */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={dayPricesEnabled} onCheckedChange={setDayPricesEnabled} />
              <div>
                <Label className="text-sm font-medium">Custom day pricing</Label>
                <p className="text-xs text-muted-foreground">
                  Set a different price for specific days of the week. Leave blank to use base rate.
                </p>
              </div>
            </div>
            {dayPricesEnabled && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
                {[
                  { label: "Mon", key: "1" },
                  { label: "Tue", key: "2" },
                  { label: "Wed", key: "3" },
                  { label: "Thu", key: "4" },
                  { label: "Fri", key: "5" },
                  { label: "Sat", key: "6" },
                  { label: "Sun", key: "0" },
                ].map(({ label, key }) => (
                  <div key={key} className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <div className="relative w-full">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        {baseRateCurrency[0]}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder={String(typeof baseRateAmount === "number" ? baseRateAmount : "")}
                        className="pl-5 h-9 text-sm text-center"
                        value={dayPrices[key] ?? ""}
                        onChange={(e) =>
                          setDayPrices((prev) => ({
                            ...prev,
                            [key]: e.target.value ? parseFloat(e.target.value) : "",
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Guest Add-ons */}
        <section className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Guest Add-ons</h2>
              <p className="text-xs text-muted-foreground">Optional extras guests can add during booking</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() =>
                setPropertyAddons((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), name: "", price: 0, description: "" },
                ])
              }
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          {propertyAddons.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No add-ons configured. Click "Add" to create one.
            </p>
          )}

          <div className="space-y-3">
            {propertyAddons.map((addon, idx) => (
              <div key={addon.id} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      placeholder="e.g. Early check-in"
                      className="mt-1"
                      value={addon.name}
                      onChange={(e) =>
                        setPropertyAddons((prev) =>
                          prev.map((a, i) => (i === idx ? { ...a, name: e.target.value } : a))
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Price ({baseRateCurrency})</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0"
                      className="mt-1"
                      value={addon.price || ""}
                      onChange={(e) =>
                        setPropertyAddons((prev) =>
                          prev.map((a, i) =>
                            i === idx ? { ...a, price: e.target.value ? parseFloat(e.target.value) : 0 } : a
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      placeholder="e.g. Check in from 10 AM"
                      className="mt-1"
                      value={addon.description}
                      onChange={(e) =>
                        setPropertyAddons((prev) =>
                          prev.map((a, i) => (i === idx ? { ...a, description: e.target.value } : a))
                        )
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPropertyAddons((prev) => prev.filter((_, i) => i !== idx))}
                  className="mt-6 p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Policies & Rules */}
        <section className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Policies & Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Cancellation Policy</Label>
              <Select value={cancellationPolicy} onValueChange={setCancellationPolicy}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CANCELLATION_POLICIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label} — {v.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Check-in Time</Label>
                <Input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Check-out Time</Label>
                <Input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>
          <div>
            <Label>House Rules</Label>
            <Textarea
              placeholder="No smoking, no parties, quiet hours after 10pm..."
              rows={3}
              className="mt-1.5"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
            />
          </div>
        </section>

        {/* Availability */}
        <section className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Availability</h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full gap-1.5"
              onClick={() => { setAvailRange(undefined); setAvailModalOpen(true); }}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              {isEdit ? "Manage Availability" : "Block Dates"}
            </Button>
          </div>

          {isEdit ? (
            /* Edit mode: grouped range display */
            (() => {
              const ranges = groupDatesIntoRanges(existingBlockedDates);
              return (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {existingBlockedDates.length > 0
                      ? `${existingBlockedDates.length} date${existingBlockedDates.length !== 1 ? "s" : ""} blocked across ${ranges.length} range${ranges.length !== 1 ? "s" : ""}.`
                      : "No dates are currently blocked for this property."}
                  </p>
                  {ranges.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {ranges.map((r) => (
                        <span
                          key={`${r.from}-${r.to}`}
                          className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-600 border border-rose-200 rounded-md px-2.5 py-1"
                        >
                          <Ban className="w-2.5 h-2.5 flex-shrink-0" />
                          {fmtRange(r.from, r.to)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            /* Create mode: pending blocked ranges */
            (() => {
              const pendingRanges = groupDatesIntoRanges(pendingBlockedDates);
              return (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {pendingBlockedDates.length > 0
                      ? `${pendingBlockedDates.length} date${pendingBlockedDates.length !== 1 ? "s" : ""} selected to block before publishing.`
                      : "Optionally block dates before publishing. Blocked dates will be unavailable for booking."}
                  </p>
                  {pendingRanges.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {pendingRanges.map((r) => (
                        <span
                          key={`${r.from}-${r.to}`}
                          className="inline-flex items-center gap-1.5 text-xs bg-rose-50 text-rose-600 border border-rose-200 rounded-md px-2.5 py-1"
                        >
                          <Ban className="w-2.5 h-2.5 flex-shrink-0" />
                          {fmtRange(r.from, r.to)}
                          <button
                            type="button"
                            className="ml-0.5 hover:text-rose-800"
                            title="Remove this range"
                            onClick={() => {
                              const from = parseDateISO(r.from);
                              const to = parseDateISO(r.to);
                              const toRemove = new Set(
                                eachDayOfInterval({ start: from, end: to }).map((d) =>
                                  fmtDate(d, "yyyy-MM-dd"),
                                ),
                              );
                              setPendingBlockedDates((prev) =>
                                prev.filter((d) => !toRemove.has(d)),
                              );
                            }}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        className="text-xs text-destructive hover:underline"
                        onClick={() => setPendingBlockedDates([])}
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </section>

        {/* ── iCal / Calendar Sync ── (edit mode only) */}
        {isEdit && (
        <section className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-primary" />
              Calendar Sync (iCal)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Export your calendar to Airbnb, Booking.com, VRBO and more. Import external calendars to auto-block dates.
            </p>
          </div>

          {/* Export */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Export your calendar</h3>
            <p className="text-xs text-muted-foreground">
              Add this URL on any platform that supports iCal. It updates automatically with new bookings and blocked dates.
            </p>
            {icalData ? (
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={buildIcalExportUrl(id!, icalData.ical_token)}
                  className="flex-1 text-xs bg-muted border border-border rounded-lg px-3 py-2 font-mono truncate"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(buildIcalExportUrl(id!, icalData.ical_token));
                    toast({ title: "Copied!", description: "iCal URL copied to clipboard." });
                  }}
                >
                  Copy
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Save the property first to get your iCal URL.</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { name: "Airbnb", color: "bg-[#FF5A5F]/10 text-[#FF5A5F] border-[#FF5A5F]/30" },
                { name: "Booking.com", color: "bg-blue-50 text-blue-600 border-blue-200" },
                { name: "VRBO", color: "bg-blue-50 text-blue-700 border-blue-200" },
                { name: "Google Calendar", color: "bg-green-50 text-green-700 border-green-200" },
                { name: "Apple Calendar", color: "bg-gray-50 text-gray-700 border-gray-200" },
              ].map((p) => (
                <span key={p.name} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${p.color}`}>
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* Import feeds */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Import external calendars</h3>
            <p className="text-xs text-muted-foreground">
              Paste the iCal URL from Airbnb, VRBO, Booking.com, Google Calendar, or any platform. Dates will be auto-blocked on sync.
            </p>

            {/* Existing feeds */}
            {(icalData?.ical_feeds ?? []).length > 0 && (
              <div className="space-y-2">
                {(icalData!.ical_feeds).map((feed, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{feed.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                      {feed.last_synced && (
                        <p className="text-xs text-muted-foreground">
                          Last synced: {new Date(feed.last_synced).toLocaleString()}
                        </p>
                      )}
                      {!feed.last_synced && (
                        <p className="text-xs text-amber-600">Never synced</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg shrink-0"
                      disabled={icalSyncMutation.isPending}
                      onClick={async () => {
                        try {
                          const result = await icalSyncMutation.mutateAsync(id!);
                          toast({ title: "Synced!", description: `${result.imported} dates imported.` });
                          refetchIcal();
                        } catch (e) {
                          toast({ title: "Sync failed", description: String(e), variant: "destructive" });
                        }
                      }}
                    >
                      {icalSyncMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-lg shrink-0 text-destructive hover:text-destructive"
                      onClick={async () => {
                        const updated = icalData!.ical_feeds.filter((_, i) => i !== idx);
                        try {
                          await icalFeedsUpdate.mutateAsync({ propertyId: id!, feeds: updated });
                          toast({ title: "Feed removed" });
                        } catch (e) {
                          toast({ title: "Error", description: String(e), variant: "destructive" });
                        }
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}

                {/* Sync all button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={icalSyncMutation.isPending}
                  onClick={async () => {
                    try {
                      const result = await icalSyncMutation.mutateAsync(id!);
                      const errMsg = result.errors.length ? ` (${result.errors.length} error${result.errors.length > 1 ? "s" : ""})` : "";
                      toast({ title: "Sync complete", description: `${result.imported} dates imported${errMsg}.` });
                      refetchIcal();
                    } catch (e) {
                      toast({ title: "Sync failed", description: String(e), variant: "destructive" });
                    }
                  }}
                >
                  {icalSyncMutation.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Syncing…</>
                    : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync All Feeds</>}
                </Button>
              </div>
            )}

            {/* Quick-add platform presets */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Quick-add from:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Airbnb", hint: "www.airbnb.com/calendar/ical/…" },
                  { name: "VRBO", hint: "www.vrbo.com/…/ical" },
                  { name: "Booking.com", hint: "admin.booking.com/…/ical" },
                  { name: "Google Calendar", hint: "calendar.google.com/calendar/ical/…" },
                  { name: "Other", hint: "" },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className="text-xs px-2.5 py-1 rounded-full border border-border bg-background hover:bg-muted transition-colors"
                    onClick={() => {
                      setNewFeedName(preset.name);
                      setNewFeedUrl("");
                    }}
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Add feed form */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-2 items-end">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Calendar name</label>
                <input
                  value={newFeedName}
                  onChange={(e) => setNewFeedName(e.target.value)}
                  placeholder="e.g. Airbnb"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">iCal URL (.ics)</label>
                <input
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                />
              </div>
              <Button
                type="button"
                className="rounded-lg"
                size="sm"
                disabled={!newFeedName.trim() || !newFeedUrl.trim() || icalFeedsUpdate.isPending}
                onClick={async () => {
                  const updated: IcalFeed[] = [
                    ...(icalData?.ical_feeds ?? []),
                    { name: newFeedName.trim(), url: newFeedUrl.trim(), last_synced: null },
                  ];
                  try {
                    await icalFeedsUpdate.mutateAsync({ propertyId: id!, feeds: updated });
                    setNewFeedName("");
                    setNewFeedUrl("");
                    toast({ title: "Feed added", description: "Click Sync to import dates." });
                  } catch (e) {
                    toast({ title: "Error", description: String(e), variant: "destructive" });
                  }
                }}
              >
                {icalFeedsUpdate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                Add
              </Button>
            </div>
          </div>
        </section>
        )}

        {/* Availability modal */}
        <Dialog
          open={availModalOpen}
          onOpenChange={(open) => {
            if (!open && !availSubmitting) {
              setAvailModalOpen(false);
              setAvailRange(undefined);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {isEdit ? "Manage Availability" : "Block Date Range"}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Select a date range, then choose what to do with it."
                  : "Select a date range to mark as unavailable before publishing."}
              </DialogDescription>
            </DialogHeader>

            {/* Mode tabs — only in edit mode */}
            {isEdit && (
              <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                {(
                  [
                    { id: "block",   label: "Block / Unblock" },
                    { id: "price",   label: "Custom Price"    },
                    { id: "minstay", label: "Min Stay"        },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAvailMode(tab.id)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      availMode === tab.id
                        ? "bg-primary text-white"
                        : "bg-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col items-center gap-3 py-2">
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground self-start px-1">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-rose-100 border border-rose-300" />
                  Blocked
                </span>
                {isEdit && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-300" />
                      Custom price
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" />
                      Min stay
                    </span>
                  </>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-primary" />
                  Selection
                </span>
              </div>

              {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
              <div onMouseDown={handleCalMouseDown} className="select-none">
                <DayCalendar
                  mode="range"
                  selected={availRange}
                  onSelect={setAvailRange}
                  onDayMouseEnter={handleCalDayMouseEnter}
                  numberOfMonths={1}
                  disabled={{ before: startOfDay(new Date()) }}
                  modifiers={{
                    blocked: (isEdit ? existingBlockedDates : pendingBlockedDates).map((d) => {
                      const [y, m, day] = d.split("-").map(Number);
                      return new Date(y, m - 1, day);
                    }),
                    ...(isEdit
                      ? {
                          has_price: dateOverrides
                            .filter((o) => o.custom_price != null)
                            .map((o) => { const [y,m,day] = o.date.split("-").map(Number); return new Date(y, m-1, day); }),
                          has_minstay: dateOverrides
                            .filter((o) => o.min_stay != null)
                            .map((o) => { const [y,m,day] = o.date.split("-").map(Number); return new Date(y, m-1, day); }),
                        }
                      : {}),
                  }}
                  modifiersClassNames={{
                    blocked:     "bg-rose-100 text-rose-700 font-semibold rounded-md",
                    has_price:   "bg-amber-50 text-amber-700 rounded-md",
                    has_minstay: "bg-blue-50 text-blue-700 rounded-md",
                  }}
                  className="rounded-md border"
                />
              </div>

              {availRange?.from && (
                <p className="text-sm text-muted-foreground">
                  {availDayCount === 1
                    ? `1 day: ${fmtDate(availRange.from, "MMM d, yyyy")}`
                    : `${availDayCount} days: ${fmtDate(availRange.from, "MMM d")} – ${fmtDate(availRange.to ?? availRange.from, "MMM d, yyyy")}`}
                </p>
              )}

              {/* Value inputs for price / minstay modes */}
              {isEdit && availMode === "price" && (
                <div className="flex items-center gap-2 w-full">
                  <Label className="shrink-0 text-sm">Price ({baseRateCurrency})</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    placeholder={`e.g. ${typeof baseRateAmount === "number" ? baseRateAmount : 100}`}
                    className="flex-1 h-9"
                    value={availCustomPrice}
                    onChange={(e) => setAvailCustomPrice(e.target.value ? parseFloat(e.target.value) : "")}
                  />
                  <span className="text-xs text-muted-foreground">/night</span>
                </div>
              )}
              {isEdit && availMode === "minstay" && (
                <div className="flex items-center gap-2 w-full">
                  <Label className="shrink-0 text-sm">Min nights</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="e.g. 3"
                    className="flex-1 h-9"
                    value={availMinStay}
                    onChange={(e) => setAvailMinStay(e.target.value ? parseInt(e.target.value) : "")}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setAvailModalOpen(false); setAvailRange(undefined); }}
                disabled={availSubmitting}
                className="rounded-full"
              >
                Cancel
              </Button>

              {/* Block mode footer */}
              {(!isEdit || availMode === "block") && (
                isEdit ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAvailEditConfirm(false)}
                      disabled={availSubmitting || !availRange?.from}
                      className="rounded-full border-primary text-primary hover:bg-primary/10"
                    >
                      {availSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
                      Unblock
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleAvailEditConfirm(true)}
                      disabled={availSubmitting || !availRange?.from}
                      className="rounded-full"
                    >
                      {availSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
                      Block
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={handleAvailCreateConfirm}
                    disabled={!availRange?.from}
                    className="rounded-full"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Add to Block List
                  </Button>
                )
              )}

              {/* Custom price footer */}
              {isEdit && availMode === "price" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAvailOverrideConfirm(true)}
                    disabled={availSubmitting || !availRange?.from}
                    className="rounded-full text-muted-foreground"
                  >
                    {availSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Clear Prices
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleAvailOverrideConfirm(false)}
                    disabled={availSubmitting || !availRange?.from || availCustomPrice === ""}
                    className="rounded-full"
                  >
                    {availSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Set Price
                  </Button>
                </>
              )}

              {/* Min stay footer */}
              {isEdit && availMode === "minstay" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAvailOverrideConfirm(true)}
                    disabled={availSubmitting || !availRange?.from}
                    className="rounded-full text-muted-foreground"
                  >
                    {availSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Clear Min Stay
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleAvailOverrideConfirm(false)}
                    disabled={availSubmitting || !availRange?.from || availMinStay === ""}
                    className="rounded-full"
                  >
                    {availSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Set Min Stay
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Submit */}
        <div className="flex gap-3 justify-end pb-8">
          <Button variant="outline" type="button" className="rounded-lg" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button data-feature="NFSTAY__OP_PROPERTY_SAVE" type="submit" className="rounded-lg" disabled={saving || imageUploading}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              "Update Property"
            ) : (
              "Create Property"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
