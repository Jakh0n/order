"use server";

import { z } from "zod";

import { reverseGeocode } from "@/lib/geo/reverse-geocode";
import { clientIp, rateLimit, RULES } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";

export type AddressLookup =
  { ok: true; address: string } | { ok: false; error: "invalid" | "tooMany" | "notFound" };

const coordsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/** Checkout "Use my current location": coordinates → street address (customer can still edit it). */
export async function lookupAddress(latitude: number, longitude: number): Promise<AddressLookup> {
  const parsed = coordsSchema.safeParse({ latitude, longitude });
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await rateLimit(RULES.geocodeIp, await clientIp()))) return { ok: false, error: "tooMany" };

  try {
    const address = await reverseGeocode(parsed.data.latitude, parsed.data.longitude);
    return address ? { ok: true, address } : { ok: false, error: "notFound" };
  } catch (e) {
    reportError(e, "lookupAddress");
    return { ok: false, error: "notFound" };
  }
}
