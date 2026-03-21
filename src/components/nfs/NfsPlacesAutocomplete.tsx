import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PlaceResult {
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  lat: number;
  lng: number;
}

interface NfsPlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceResult) => void;
  defaultValue?: string;
  className?: string;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function extractAddressComponent(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string
): string {
  if (!components) return "";
  const match = components.find((c) => c.types.includes(type));
  return match?.long_name ?? "";
}

export default function NfsPlacesAutocomplete({
  onPlaceSelect,
  defaultValue = "",
  className,
}: NfsPlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState(defaultValue);

  // Sync defaultValue changes (e.g. when editing a property)
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (!API_KEY || !inputRef.current) return;

    let cancelled = false;

    async function init() {
      try {
        const { Loader } = await import("@googlemaps/js-api-loader");
        const loader = new Loader({
          apiKey: API_KEY!,
          version: "weekly",
          libraries: ["places"],
        });

        await loader.importLibrary("places");

        if (cancelled || !inputRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ["address"],
          fields: ["address_components", "formatted_address", "geometry"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry?.location) return;

          const components = place.address_components;
          const result: PlaceResult = {
            address: place.formatted_address ?? "",
            city:
              extractAddressComponent(components, "locality") ||
              extractAddressComponent(components, "postal_town"),
            state: extractAddressComponent(components, "administrative_area_level_1"),
            country: extractAddressComponent(components, "country"),
            postal_code: extractAddressComponent(components, "postal_code"),
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          setValue(result.address);
          onPlaceSelect(result);
        });

        autocompleteRef.current = autocomplete;
        setLoaded(true);
      } catch (err) {
        console.warn("Google Places Autocomplete failed to load:", err);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback: if no API key, render plain input
  if (!API_KEY) {
    return (
      <Input
        placeholder="Enter full address"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(className)}
      />
    );
  }

  return (
    <Input
      ref={inputRef}
      placeholder={loaded ? "Start typing an address..." : "Loading address search..."}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className={cn(className)}
    />
  );
}
