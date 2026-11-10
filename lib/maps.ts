/** Google Maps link for an order location (client-safe — no message dictionaries). */
export function mapsLink(latitude?: number | null, longitude?: number | null): string | null {
  if (latitude == null || longitude == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}
