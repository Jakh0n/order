import "server-only";

import type { OrderSource } from "@prisma/client";

import { readSession } from "@/lib/auth/session";

const digits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

/**
 * A store-page order is the owner testing when they are signed in as this store's owner,
 * or ordered with the store's own phone / WhatsApp number. Platform metrics count only ONLINE.
 * (Same phone rule as the backfill in the 20261120100000_measurement migration.)
 */
export async function storefrontOrderSource(
  store: { ownerId: string; phone: string | null; whatsappNumber: string | null },
  customerPhone: string,
): Promise<OrderSource> {
  const phone = digits(customerPhone);
  const ownPhone =
    phone.length >= 7 && (phone === digits(store.phone) || phone === digits(store.whatsappNumber));
  if (ownPhone) return "OWNER_TEST";
  // Signed cookie only, no DB read
  return (await readSession()) === store.ownerId ? "OWNER_TEST" : "ONLINE";
}
