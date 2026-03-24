import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { MockProperty } from "@/data/mock-properties";
import { CURRENCIES } from "@/lib/constants";

interface NfsSearchMapProps {
  properties: MockProperty[];
  hoveredId: string | null;
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

// ── Placeholder fallback (shown when API key is missing) ───────────
function MapPlaceholder({ properties }: { properties: MockProperty[] }) {
  return (
    <div className="relative w-full h-full bg-muted overflow-hidden" style={{ borderRadius: 16 }}>
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-secondary opacity-60" />
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

// ── Real Google Map (marketplace10 DealsMap style) ──────────────────
export function NfsSearchMap({ properties, hoveredId }: NfsSearchMapProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const initialBoundsSetRef = useRef(false);
  const zoomIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Load script + init map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.maps) return;
        const map = new window.google.maps.Map(containerRef.current, {
          center: { lat: 40, lng: 10 },
          zoom: 3,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });
        mapRef.current = map;
        infoRef.current = new window.google.maps.InfoWindow();
        setReady(true);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  // Navigation callback
  const onNav = useCallback((slug: string) => navigate(`/property/${slug}`), [navigate]);

  // Helper: create a marker for a property at a given position
  const createMarker = useCallback((p: MockProperty, pos: { lat: number; lng: number }) => {
    if (!mapRef.current || !window.google?.maps) return;
    const map = mapRef.current;
    const g = window.google.maps;
    const existing = markersRef.current;

    if (existing.has(p.id)) return; // already created

    const currency = CURRENCIES.find(c => c.code === p.base_rate_currency);
    const icon: google.maps.Symbol = {
      path: g.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: "#00D084",
      fillOpacity: 1,
      strokeColor: "#fff",
      strokeWeight: 2.5,
    };
    const marker = new g.Marker({ map, position: pos, icon, zIndex: 1 });

    marker.addListener("click", () => {
      if (!infoRef.current) return;
      const coverImg = p.images?.find((img: { is_cover?: boolean; url: string }) => img.is_cover)?.url ?? p.images?.[0]?.url ?? "";
      infoRef.current.setContent(
        `<div style="font-family:Inter,system-ui,sans-serif;min-width:200px;max-width:240px;padding:4px">` +
        (coverImg ? `<img src="${coverImg}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px" />` : "") +
        `<p style="font-weight:600;font-size:13px;margin:0 0 2px">${p.public_title}</p>` +
        `<p style="color:#737373;font-size:11px;margin:0 0 6px">${p.city}, ${p.country}</p>` +
        `<p style="font-weight:700;font-size:14px;margin:0">${currency?.symbol ?? "£"}${p.base_rate_amount}<span style="font-weight:400;font-size:11px;color:#737373"> / night</span></p>` +
        `</div>`
      );
      infoRef.current.open(map, marker);
    });

    marker.addListener("dblclick", () => onNav((p as any).slug || p.id));
    existing.set(p.id, marker);
  }, [onNav]);

  // Sync markers when properties change
  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;
    const map = mapRef.current;
    const existing = markersRef.current;
    const g = window.google.maps;

    // Split properties into those with coords and those needing geocoding
    const withCoords = properties.filter(p => typeof p.lat === "number" && typeof p.lng === "number" && !isNaN(p.lat) && !isNaN(p.lng));
    const needsGeocode = properties.filter(p => (p.lat == null || p.lng == null || isNaN(p.lat) || isNaN(p.lng)) && p.city);

    // Remove stale markers
    const allIds = new Set(properties.map(p => p.id));
    existing.forEach((m, id) => {
      if (!allIds.has(id)) { m.setMap(null); existing.delete(id); }
    });

    // Create markers for properties with coordinates
    withCoords.forEach((p) => {
      if (!existing.has(p.id)) {
        createMarker(p, { lat: p.lat, lng: p.lng });
      } else {
        existing.get(p.id)!.setPosition({ lat: p.lat, lng: p.lng });
      }
    });

    // Geocode properties without coordinates
    if (needsGeocode.length > 0) {
      const geocoder = new g.Geocoder();
      needsGeocode.forEach((p) => {
        if (existing.has(p.id)) return; // already created via cache

        const cacheKey = `${p.city},${p.country}`;
        const cached = geocodeCacheRef.current.get(cacheKey);
        if (cached) {
          createMarker(p, cached);
          return;
        }

        geocoder.geocode({ address: `${p.city}, ${p.country}` }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            const loc = results[0].geometry.location;
            const pos = { lat: loc.lat(), lng: loc.lng() };
            geocodeCacheRef.current.set(cacheKey, pos);
            createMarker(p, pos);

            // Fit bounds after geocoding if initial bounds not yet set
            if (!initialBoundsSetRef.current) {
              const bounds = new g.LatLngBounds();
              existing.forEach((m) => {
                const mPos = m.getPosition();
                if (mPos) bounds.extend(mPos);
              });
              if (existing.size === 1) {
                map.setCenter(pos);
                map.setZoom(13);
              } else if (existing.size > 1) {
                map.fitBounds(bounds, 40);
              }
              initialBoundsSetRef.current = true;
            }
          }
        });
      });
    }

    // Fit bounds only on first load (for properties that already have coords)
    if (withCoords.length > 0 && !initialBoundsSetRef.current) {
      const bounds = new g.LatLngBounds();
      withCoords.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
      if (withCoords.length === 1 && needsGeocode.length === 0) {
        map.setCenter({ lat: withCoords[0].lat, lng: withCoords[0].lng });
        map.setZoom(13);
      } else {
        map.fitBounds(bounds, 40);
      }
      initialBoundsSetRef.current = true;
    }
  }, [properties, ready, createMarker]);

  // Hover — smooth pan + zoom to property, stay when mouse leaves
  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;
    const map = mapRef.current;
    const g = window.google.maps;

    // Clear any running zoom animation
    if (zoomIntervalRef.current) {
      clearInterval(zoomIntervalRef.current);
      zoomIntervalRef.current = null;
    }

    // Update all marker icons
    markersRef.current.forEach((marker, id) => {
      const hovered = hoveredId === id;
      marker.setIcon({
        path: g.SymbolPath.CIRCLE,
        scale: hovered ? 11 : 7,
        fillColor: hovered ? "#059669" : "#00D084",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: hovered ? 3 : 2.5,
      });
      marker.setZIndex(hovered ? 999 : 1);

      // Smooth fly-to: zoom out → pan → zoom in
      if (hovered) {
        const pos = marker.getPosition();
        if (pos) {
          const current = map.getZoom() ?? 3;
          const target = 14;
          const zoomOut = Math.min(current, 8); // zoom out to level 8 first

          // Phase 1: zoom out smoothly
          let step = current;
          zoomIntervalRef.current = setInterval(() => {
            if (step > zoomOut) {
              step -= 1;
              map.setZoom(step);
            } else {
              // Phase 2: pan to new location
              if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
              map.panTo(pos);

              // Phase 3: zoom in smoothly after a brief pause for the pan
              setTimeout(() => {
                let zoomStep = zoomOut;
                zoomIntervalRef.current = setInterval(() => {
                  zoomStep += 0.5;
                  map.setZoom(zoomStep);
                  if (zoomStep >= target) {
                    if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
                    zoomIntervalRef.current = null;
                  }
                }, 60);
              }, 300);
            }
          }, 50);
        }
      }
    });
    // When hoveredId is null (mouse left card) — map stays where it is
  }, [hoveredId, ready]);

  // Fallback
  if (failed || !import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return <MapPlaceholder properties={properties} />;
  }

  return (
    <div data-feature="NFSTAY__MAP" style={{ position: "relative", height: "100%", width: "100%", borderRadius: 16, overflow: "hidden" }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      {!ready && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--muted))" }}>
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
