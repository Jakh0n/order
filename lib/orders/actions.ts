"use server";

import { prisma } from "@/lib/db";
import { insertOrder } from "@/lib/orders/insert";
import { clientIp, rateLimitAll, RULES } from "@/lib/rate-limit";
import { isStoreOpenNow } from "@/lib/store-hours";
import { checkoutSchema, type CheckoutInput } from "@/lib/validators";

export type CreateOrderError =
  | "invalid"
  | "storeNotFound"
  | "closed"
  | "blocked"
  | "typeUnavailable"
  | "paymentUnavailable"
  | "zoneInvalid"
  | "unavailable"
  | "invalidOptions"
  | "minOrder"
  | "tooMany"
  | "server";

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | {
      ok: false;
      error: CreateOrderError;
      /** maydon -> "checkout.errors.*" kaliti */
      fieldErrors?: Record<string, string>;
      minOrder?: number;
    };

/** Mijoz checkout'i */
export async function createOrder(input: CheckoutInput): Promise<CreateOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  // Soxta buyurtmalar oqimidan himoya: IP va (do'kon + telefon) bo'yicha
  const allowed = await rateLimitAll([
    [RULES.orderIp, await clientIp()],
    [RULES.orderPhone, `${data.storeSlug}:${data.customerPhone}`],
  ]);
  if (!allowed) return { ok: false, error: "tooMany" };

  try {
    const store = await prisma.store.findUnique({ where: { slug: data.storeSlug } });
    if (!store) return { ok: false, error: "storeNotFound" };
    if (store.isBlocked) return { ok: false, error: "blocked" };
    if (!isStoreOpenNow(store)) return { ok: false, error: "closed" };

    if (data.type === "PICKUP" && !store.pickupEnabled) {
      return { ok: false, error: "typeUnavailable" };
    }
    if (data.type === "DELIVERY" && !store.deliveryEnabled) {
      return { ok: false, error: "typeUnavailable" };
    }

    const paymentAllowed = {
      CASH: store.acceptCash,
      CARD_ON_DELIVERY: store.acceptCardOnDelivery,
      TRANSFER: store.acceptTransfer,
    }[data.paymentMethod];
    if (!paymentAllowed) return { ok: false, error: "paymentUnavailable" };

    const result = await insertOrder({ ...data, storeId: store.id, minOrder: store.minOrder });
    if (!result.ok) return { ok: false, error: result.error, minOrder: store.minOrder };
    return { ok: true, orderId: result.orderId };
  } catch (e) {
    console.error("createOrder failed", e);
    return { ok: false, error: "server" };
  }
}

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    result[key] ??= issue.message;
  }
  return result;
}
