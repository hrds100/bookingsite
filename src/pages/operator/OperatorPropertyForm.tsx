import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Loader2, Plus, Trash2, Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { CANCELLATION_POLICIES } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNfsPropertyCreate, useNfsPropertyUpdate, type PropertyFields } from "@/hooks/useNfsPropertyMutation";
import { useNfsImageUpload } from "@/hooks/useNfsImageUpload";
import NfsPlacesAutocomplete, { type PlaceResult } from "@/components/nfs/NfsPlacesAutocomplete";
import { supabase } from "@/lib/supabase";
import {
  useNfsHospitableConnection,
  useNfsHospitableSyncedProperties,
  useNfsHospitableConnect,
  useNfsHospitableImport,
  type HospitableSyncedProperty,
} from "@/hooks/useNfsHospitable";

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

  // ── Hospitable sync state ──
  const [syncMode, setSyncMode] = useState<"manual" | "airbnb">("manual");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());

  const { data: hospConnection, isLoading: hospLoading } = useNfsHospitableConnection();
  const isHospConnected = hospConnection?.status === "connected" && hospConnection?.is_active;

  const { data: syncedProperties, isLoading: propsLoading, refetch: refetchSyncedProps } =
    useNfsHospitableSyncedProperties(operatorId, syncMode === "airbnb" && !!isHospConnected);

  const { connecting, error: connectError, initiateConnect, triggerResync } = useNfsHospitableConnect();
  const importMutation = useNfsHospitableImport();

  const togglePropertySelection = (propertyId: string) => {
    setSelectedPropertyIds((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
  };

  const importableProperties = (syncedProperties || []).filter((p) => p.status !== "listed");
  const alreadyImported = (syncedProperties || []).filter((p) => p.status === "listed");
  const selectedImportable = [...selectedPropertyIds].filter((id) =>
    importableProperties.some((p) => p.id === id)
  );

  const handleImportSelected = async () => {
    if (!selectedImportable.length) return;
    try {
      await importMutation.mutateAsync(selectedImportable);
      setSelectedPropertyIds(new Set());
      toast({ title: "Properties imported", description: `${selectedImportable.length} properties are now listed.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    }
  };

  const handleResync = async () => {
    const ok = await triggerResync();
    if (ok) {
      toast({ title: "Sync triggered", description: "Properties are being refreshed from Airbnb." });
      setTimeout(() => refetchSyncedProps(), 2000);
    }
  };

  // Form state
  const [publicTitle, setPublicTitle] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [rentalType, setRentalType] = useState("");
  const [description, setDescription] = useState("");
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
  const [cancellationPolicy, setCancellationPolicy] = useState("flexible");
  const [checkInTime, setCheckInTime] = useState("15:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [rules, setRules] = useState("");
  const [propertyAddons, setPropertyAddons] = useState<{ id: string; name: string; price: number; description: string }[]>([]);
  const [loadingProperty, setLoadingProperty] = useState(false);

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

  // Bathroom details handlers
  const addBathroomDetail = () => {
    setBathroomDetails((prev) => [...prev, { type: "ensuite" }]);
    setBathrooms((prev) => prev + 1);
  };

  const updateBathroomDetail = (idx: number, type: "ensuite" | "shared") => {
    setBathroomDetails((prev) => prev.map((bd, i) => i === idx ? { type } : bd));
  };

  const removeBathroomDetail = (idx: number) => {
    setBathroomDetails((prev) => prev.filter((_, i) => i !== idx));
    setBathrooms((prev) => Math.max(0, prev - 1));
  };

  // Extra rooms handler
  const toggleExtraRoom = (room: string) => {
    setExtraRooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    );
  };

  const buildFields = (): PropertyFields => ({
    public_title: publicTitle.trim(),
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
    cancellation_policy: cancellationPolicy,
    amenities,
    images,
    check_in_time: checkInTime,
    check_out_time: checkOutTime,
    rules,
    addons: propertyAddons,
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
        await createMutation.mutateAsync(fields);
        toast({ title: "Property created", description: "Your property has been created successfully." });
      }

      navigate("/nfstay/properties");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save property.";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    }
  };

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

      {/* ── Mode Toggle: Manual vs Airbnb Sync ── */}
      {!isEdit && (
        <div data-feature="NFSTAY__OP_PROPERTY_SYNC_TOGGLE" className="flex gap-2">
          <button
            type="button"
            onClick={() => setSyncMode("manual")}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              syncMode === "manual"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-accent/10"
            }`}
          >
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setSyncMode("airbnb")}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              syncMode === "airbnb"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-accent/10"
            }`}
          >
            Sync from Airbnb
          </button>
        </div>
      )}

      {/* ── Airbnb Sync Panel ── */}
      {syncMode === "airbnb" && !isEdit && (
        <div className="space-y-4">
          {hospLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !isHospConnected ? (
            /* ── Not connected ── */
            <div data-feature="NFSTAY__OP_PROPERTY_SYNC_CONNECT" className="rounded-2xl border border-border bg-card p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center">
                <WifiOff className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Connect your Airbnb account</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  Import your listings automatically from Airbnb via Hospitable.
                </p>
              </div>

              {connectError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {connectError}
                </div>
              )}

              <Button onClick={initiateConnect} disabled={connecting} className="w-full max-w-xs rounded-lg">
                {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                {connecting ? "Connecting..." : "Connect Airbnb"}
              </Button>

              {hospConnection?.status === "failed" && hospConnection?.last_error && (
                <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg text-left">
                  <p className="font-medium">Previous connection failed:</p>
                  <p>
                    {typeof hospConnection.last_error === "object" && hospConnection.last_error !== null
                      ? (hospConnection.last_error as Record<string, unknown>).message as string || "Unknown error"
                      : String(hospConnection.last_error)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ── Connected: show synced properties ── */
            <div data-feature="NFSTAY__OP_PROPERTY_SYNC_LIST" className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Connected to Airbnb</p>
                  <p className="text-xs text-muted-foreground">
                    {hospConnection.total_properties ?? 0} properties synced from Hospitable
                  </p>
                </div>
              </div>

              {propsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading properties...</span>
                </div>
              ) : (syncedProperties || []).length === 0 ? (
                <div className="py-6 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No properties found. Make sure your listings are active on Airbnb.
                  </p>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={handleResync}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium">Select properties to import:</p>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {/* Already imported */}
                    {alreadyImported.map((prop) => (
                      <div key={prop.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/40">
                        {prop.images?.[0]?.url ? (
                          <img src={prop.images[0].url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            No img
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{prop.public_title || "Untitled property"}</p>
                          <p className="text-xs text-muted-foreground">{[prop.city, prop.country].filter(Boolean).join(", ") || "No location"}</p>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium whitespace-nowrap">
                          <CheckCircle className="w-3.5 h-3.5" /> Already imported
                        </span>
                      </div>
                    ))}

                    {/* Importable */}
                    {importableProperties.map((prop) => (
                      <label
                        key={prop.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/10 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedPropertyIds.has(prop.id)}
                          onCheckedChange={() => togglePropertySelection(prop.id)}
                        />
                        {prop.images?.[0]?.url ? (
                          <img src={prop.images[0].url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            No img
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{prop.public_title || "Untitled property"}</p>
                          <p className="text-xs text-muted-foreground">{[prop.city, prop.country].filter(Boolean).join(", ") || "No location"}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {prop.property_type || "Property"}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      data-feature="NFSTAY__OP_PROPERTY_SYNC_IMPORT"
                      onClick={handleImportSelected}
                      disabled={!selectedImportable.length || importMutation.isPending}
                      className="rounded-lg"
                    >
                      {importMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Import Selected{selectedImportable.length > 0 ? ` (${selectedImportable.length})` : ""}
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={handleResync}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Manual Property Form ── */}
      {(syncMode === "manual" || isEdit) && (
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Property Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Stunning Marina View Apartment"
                className="mt-1.5"
                value={publicTitle}
                onChange={(e) => setPublicTitle(e.target.value)}
                required
              />
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
            <Label htmlFor="desc">Describe your property (max 2000 characters)</Label>
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
      )}
    </div>
  );
}
