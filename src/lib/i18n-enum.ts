/**
 * Translation helpers for predefined enum values (property_type, bed_type,
 * bathroom_type, amenities) and for operator-entered translated fields
 * (title_translations, description_translations).
 *
 * Design:
 * - All lookups normalize the value (lowercase + spaces→underscores) so that
 *   mock data ("Apartment", "WiFi") and real DB data ("apartment", "wifi")
 *   both resolve to the same key.
 * - Every lookup uses `defaultValue` fallback — if a locale key is missing,
 *   the original value is displayed (same as today's behavior, no regression).
 * - Null/undefined inputs return empty string (same as today's CSS-capitalize
 *   behavior on empty strings).
 * - Language lookups try both the full code ("pt-BR") and the base code ("pt")
 *   so operator-entered translations are found regardless of which variant
 *   the operator stored.
 */

type TFn = (key: string, options?: Record<string, unknown>) => string;

function normalize(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).toLowerCase().trim().replace(/\s+/g, "_");
}

/** Translate a property_type enum value (e.g. "apartment" → "Apartamento" in pt-BR). */
export function tPropertyType(value: string | null | undefined, t: TFn): string {
  if (!value) return "";
  const key = normalize(value);
  if (!key) return "";
  return t(`property_types.${key}`, { defaultValue: value });
}

/** Translate a bed_type enum value (e.g. "double" → "Cama de Casal"). */
export function tBedType(value: string | null | undefined, t: TFn): string {
  if (!value) return "";
  const key = normalize(value);
  if (!key) return "";
  return t(`bed_types.${key}`, { defaultValue: value });
}

/** Translate a bathroom_type enum value (ensuite / shared). */
export function tBathroomType(value: string | null | undefined, t: TFn): string {
  if (!value) return "";
  const key = normalize(value);
  if (!key) return "";
  return t(`bathroom_types.${key}`, { defaultValue: value });
}

/** Translate an amenity key (e.g. "wifi" → "WiFi", "smoke_detector" → "Detector de fumaça"). */
export function tAmenity(value: string | null | undefined, t: TFn): string {
  if (!value) return "";
  const key = normalize(value);
  if (!key) return "";
  return t(`amenities.${key}`, { defaultValue: value });
}

/**
 * Pick the best-matching translated string from an operator-entered map.
 * Tries the exact language code first, then the base language (e.g. "pt" if
 * passed "pt-BR"), then returns the fallback.
 */
export function pickTranslation(
  translations: Record<string, string> | null | undefined,
  lang: string | null | undefined,
  fallback: string | null | undefined,
): string {
  const fb = fallback || "";
  if (!translations || !lang) return fb;

  // Exact match first (e.g. "pt-BR")
  const exact = translations[lang];
  if (exact && exact.trim()) return exact;

  // Base-language match (e.g. "pt" when passed "pt-BR")
  const base = lang.split("-")[0];
  if (base && base !== lang) {
    const baseMatch = translations[base];
    if (baseMatch && baseMatch.trim()) return baseMatch;
  }

  return fb;
}
