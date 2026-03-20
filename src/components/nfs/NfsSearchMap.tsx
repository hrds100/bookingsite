import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin } from "lucide-react";
import type { MockProperty } from "@/data/mock-properties";
import { CURRENCIES } from "@/lib/constants";

interface NfsSearchMapProps {
  properties: MockProperty[];
}

// ── Google Maps script loader (singleton) ──────────────────────────
let scriptLoaded = false;
let scriptPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (scriptLoaded && window.google?.maps) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Promise.reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY"));

  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      scriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => { scriptLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// ── Price label overlay ────────────────────────────────────────────
// Custom overlay that renders a price pill on the map
let PriceLabelOverlay: any = null;

function ensureOverlayClass() {
  if (PriceLabelOverlay) return;
  if (!window.google?.maps) return;

  PriceLabelOverlay = class extends window.google.maps.OverlayView {
    private position: google.maps.LatLng;
    private div: HTMLDivElement | null = null;
    private text: string;
    private onClick: () => void;

    constructor(position: google.maps.LatLng, text: string, map: google.maps.Map, onClick: () => void) {
      super();
      this.position = position;
      this.text = text;
      this.onClick = onClick;
      this.setMap(map);
    }

    onAdd() {
      this.div = document.createElement("div");
      this.div.style.position = "absolute";
      this.div.style.cursor = "pointer";
      this.div.style.transform = "translate(-50%, -50%)";
      this.div.innerHTML = `<span style="
        background: white;
        color: #1a1a1a;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 9999px;
        border: 1px solid #e5e5e5;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        white-space: nowrap;
        display: inline-block;
        transition: all 0.15s;
      ">${this.text}</span>`;

      this.div.addEventListener("mouseenter", () => {
        const span = this.div?.querySelector("span") as HTMLElement;
        if (span) { span.style.background = "#1a1a1a"; span.style.color = "white"; }
      });
      this.div.addEventListener("mouseleave", () => {
        const span = this.div?.querySelector("span") as HTMLElement;
        if (span) { span.style.background = "white"; span.style.color = "#1a1a1a"; }
      });
      this.div.addEventListener("click", this.onClick);

      const panes = this.getPanes();
      panes?.overlayMouseTarget.appendChild(this.div);
    }

    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(this.position);
      if (point) {
        this.div.style.left = `${point.x}px`;
        this.div.style.top = `${point.y}px`;
      }
    }

    onRemove() {
      if (this.div) {
        this.div.parentNode?.removeChild(this.div);
        this.div = null;
      }
    }
  };
}

// ── Placeholder fallback (shown when API key is missing) ───────────
function MapPlaceholder({ properties }: NfsSearchMapProps) {
  return (
    <div className="relative w-full h-full bg-muted overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-secondary opacity-60" />
      <button className="absolute top-4 right-4 z-10 bg-card text-foreground text-xs font-medium px-4 py-2 rounded-lg border border-border shadow-sm hover:shadow-md transition">
        Search this area
      </button>
      <div className="absolute inset-0">
        {properties.slice(0, 12).map((p, i) => {
          const currency = CURRENCIES.find(c => c.code === p.base_rate_currency);
          const top = 12 + ((i * 37 + 13) % 72);
          const left = 8 + ((i * 53 + 7) % 78);
          return (
            <div key={p.id} className="absolute group cursor-pointer" style={{ top: `${top}%`, left: `${left}%` }}>
              <div className="bg-card text-foreground text-xs font-semibold px-2.5 py-1.5 rounded-full border border-border shadow-sm hover:bg-foreground hover:text-background transition whitespace-nowrap">
                {currency?.symbol}{p.base_rate_amount}
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/60 flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        Map placeholder – Google Maps API key not set
      </div>
    </div>
  );
}

// ── Real Google Map ────────────────────────────────────────────────
export function NfsSearchMap({ properties }: NfsSearchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<any[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Load script
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!ready || !containerRef.current || !window.google?.maps) return;
    if (mapRef.current) return;

    mapRef.current = new window.google.maps.Map(containerRef.current, {
      center: { lat: 40, lng: 10 },
      zoom: 3,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });

    infoRef.current = new window.google.maps.InfoWindow();
    ensureOverlayClass();
  }, [ready]);

  // Update markers when properties change
  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !window.google?.maps || !PriceLabelOverlay) return;

    // Clear old overlays
    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];

    if (properties.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    properties.forEach((p) => {
      const currency = CURRENCIES.find(c => c.code === p.base_rate_currency);
      const position = new window.google.maps.LatLng(p.lat, p.lng);
      bounds.extend(position);

      const priceText = `${currency?.symbol ?? "£"}${p.base_rate_amount}`;

      const overlay = new PriceLabelOverlay(position, priceText, mapRef.current!, () => {
        const coverImg = p.images.find(img => img.is_cover)?.url ?? p.images[0]?.url ?? "";
        infoRef.current?.setContent(`
          <div style="max-width:220px;font-family:Inter,system-ui,sans-serif;">
            ${coverImg ? `<img src="${coverImg}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />` : ""}
            <div style="font-weight:600;font-size:13px;margin-bottom:2px;">${p.public_title}</div>
            <div style="font-size:11px;color:#737373;margin-bottom:4px;">${p.city}, ${p.country}</div>
            <div style="font-weight:700;font-size:14px;">${currency?.symbol ?? "£"}${p.base_rate_amount}<span style="font-weight:400;font-size:11px;color:#737373;"> / night</span></div>
          </div>
        `);
        infoRef.current?.setPosition(position);
        infoRef.current?.open(mapRef.current!);
      });

      overlaysRef.current.push(overlay);
    });

    // Fit bounds
    if (properties.length === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(13);
    } else {
      mapRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [properties]);

  useEffect(() => {
    if (ready) updateMarkers();
  }, [ready, updateMarkers]);

  // Fallback if no API key or load failed
  if (failed || !import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return <MapPlaceholder properties={properties} />;
  }

  return (
    <div className="relative w-full h-full">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
