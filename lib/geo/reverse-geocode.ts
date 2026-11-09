import "server-only";

// Coordinates → human-readable address. Provider: OpenStreetMap Nominatim (free, no key).
// Nominatim's usage policy allows light use only (≈1 request/second, identifying User-Agent).
// For real traffic swap this function for a paid provider (Google, Mapbox, LocationIQ) — callers don't change.

const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
}

function format(a: NominatimAddress): string | null {
  const street = [a.road ?? a.pedestrian, a.house_number].filter(Boolean).join(" ");
  const area = a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district;
  const city = a.city ?? a.town ?? a.village ?? a.state;
  const parts = [street, area, city].filter((p): p is string => Boolean(p && p.trim()));
  return parts.length ? [...new Set(parts)].join(", ") : null;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  language = "en",
): Promise<string | null> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", latitude.toFixed(6));
  url.searchParams.set("lon", longitude.toFixed(6));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, {
    headers: {
      "User-Agent": `order-app/1.0 (${process.env.APP_URL || "https://flami.org"})`,
      "Accept-Language": language,
    },
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { address?: NominatimAddress; display_name?: string };
  return (
    (data.address && format(data.address)) ??
    data.display_name?.split(",").slice(0, 3).join(",") ??
    null
  );
}
