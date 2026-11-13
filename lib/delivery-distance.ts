// Delivery price by distance (Pro): "up to 5 km — 10 000, up to 10 km — 15 000".
// Distance is a straight line from the store to the customer's location (no routing service).
// One source for the checkout preview (client) and createOrder (server).

export const MAX_TIERS = 10;
export const MAX_DELIVERY_KM = 200;

/** Fee in minor units for orders up to `upToKm` away (tiers sorted by upToKm) */
export interface DeliveryTier {
  upToKm: number;
  fee: number;
}

export interface DistancePricing {
  latitude: number;
  longitude: number;
  tiers: DeliveryTier[];
}

/** Store.deliveryTiers JSON → valid tiers, sorted (bad entries dropped) */
export function parseDeliveryTiers(raw: unknown): DeliveryTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is DeliveryTier =>
        !!t &&
        typeof t === "object" &&
        Number.isFinite((t as DeliveryTier).upToKm) &&
        Number.isInteger((t as DeliveryTier).fee) &&
        (t as DeliveryTier).upToKm > 0 &&
        (t as DeliveryTier).upToKm <= MAX_DELIVERY_KM &&
        (t as DeliveryTier).fee >= 0,
    )
    .sort((a, b) => a.upToKm - b.upToKm)
    .slice(0, MAX_TIERS);
}

/** Great-circle distance in km (haversine) */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type DistanceQuote =
  | { kind: "flat"; fee: number }
  | { kind: "distance"; fee: number; km: number }
  | { kind: "tooFar"; km: number; maxKm: number };

/**
 * Base delivery fee before the free-delivery threshold.
 * No distance pricing, or no customer location → the store's flat fee.
 */
export function quoteDelivery(
  flatFee: number,
  pricing: DistancePricing | null,
  customer: { latitude?: number | null; longitude?: number | null },
): DistanceQuote {
  if (!pricing || pricing.tiers.length === 0) return { kind: "flat", fee: flatFee };
  if (customer.latitude == null || customer.longitude == null)
    return { kind: "flat", fee: flatFee };
  const km = distanceKm(pricing, { latitude: customer.latitude, longitude: customer.longitude });
  const tier = pricing.tiers.find((t) => km <= t.upToKm);
  if (!tier) return { kind: "tooFar", km, maxKm: pricing.tiers[pricing.tiers.length - 1].upToKm };
  return { kind: "distance", fee: tier.fee, km };
}

/** "3.4 km" style number for the UI (one decimal under 10 km, whole above) */
export function roundKm(km: number): number {
  return km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
}

/** The store's distance pricing if it's in effect (Pro + switched on + location + tiers), else null */
export function distancePricingOf(
  store: {
    deliveryByDistance: boolean;
    latitude: number | null;
    longitude: number | null;
    deliveryTiers: unknown;
  },
  pro: boolean,
): DistancePricing | null {
  if (!pro || !store.deliveryByDistance) return null;
  if (store.latitude === null || store.longitude === null) return null;
  const tiers = parseDeliveryTiers(store.deliveryTiers);
  if (tiers.length === 0) return null;
  return { latitude: store.latitude, longitude: store.longitude, tiers };
}
