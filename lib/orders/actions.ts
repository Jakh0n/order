"use server";

import { after } from "next/server";

import { prisma } from "@/lib/db";
import { insertOrder } from "@/lib/orders/insert";
import type { PromoProblem } from "@/lib/orders/promo";
import { isPro } from "@/lib/plan";
import { notifyNewOrder } from "@/lib/push/send";
import { clientIp, rateLimitAll, RULES } from "@/lib/rate-limit";
import { isStoreOpenNow, isValidSlot } from "@/lib/store-hours";
import { checkoutSchema, type CheckoutInput } from "@/lib/validators";
import { reportError } from "@/lib/report-error";

export type CreateOrderError =
  | "invalid"
  | "storeNotFound"
  | "closed"
  | "blocked"
  | "typeUnavailable"
  | "paymentUnavailable"
  | "unavailable"
  | "invalidOptions"
  | "minOrder"
  | "tooMany"
  | "timeUnavailable"
  | "tableUnavailable"
  | PromoProblem
  | "server";

export type CreateOrderResult =
  | { ok: true; orderId: string; number: number }
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

  // Soxta buyurtmalardan himoya (IP, do'kon + telefon) — do'kon bilan parallel o'qiladi
  const ip = await clientIp();
  try {
    const [allowed, store] = await Promise.all([
      rateLimitAll([
        [RULES.orderIp, ip],
        // Table orders have no phone — limit per table instead
        [
          RULES.orderPhone,
          `${data.storeSlug}:${data.customerPhone || `table-${data.tableNumber}`}`,
        ],
      ]),
      prisma.store.findUnique({ where: { slug: data.storeSlug } }),
    ]);
    if (!allowed) return { ok: false, error: "tooMany" };
    if (!store) return { ok: false, error: "storeNotFound" };
    if (store.isBlocked) return { ok: false, error: "blocked" };
    // Closed now → only a pre-order for a time inside the next opening session
    const now = new Date();
    if (!isStoreOpenNow(store, now)) {
      if (!store.isOpen) return { ok: false, error: "closed" };
      if (!data.scheduledFor) return { ok: false, error: "closed" };
    }
    if (data.type === "DINE_IN") {
      // At a table: only while open, only real tables, no pre-orders
      if (!store.dineInEnabled) return { ok: false, error: "typeUnavailable" };
      if (!data.tableNumber || data.tableNumber > store.tableCount) {
        return { ok: false, error: "tableUnavailable" };
      }
      if (!isStoreOpenNow(store, now)) return { ok: false, error: "closed" };
      data.scheduledFor = undefined;
    }
    if (data.promoCode && !isPro(store)) {
      return { ok: false, error: "promoInvalid", fieldErrors: { promoCode: "promoInvalid" } };
    }
    if (data.scheduledFor && !isValidSlot(store, data.scheduledFor, now)) {
      return {
        ok: false,
        error: "timeUnavailable",
        fieldErrors: { scheduledFor: "timeUnavailable" },
      };
    }

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

    const result = await insertOrder({
      ...data,
      storeId: store.id,
      currency: store.currency,
      deliveryFee: store.deliveryFee,
      // Pro-only: free delivery threshold and promo codes
      freeDeliveryFrom: isPro(store) ? store.freeDeliveryFrom : null,
      // No minimum at a table (a single coffee is a fine order); applies to pickup/delivery
      minOrder: data.type === "DINE_IN" ? null : store.minOrder,
    });
    if (!result.ok) {
      const promoField = result.error.startsWith("promo") ? { promoCode: result.error } : undefined;
      return { ok: false, error: result.error, minOrder: store.minOrder, fieldErrors: promoField };
    }
    // Owner's phone buzzes — after the response, so checkout never waits for push services
    after(() => notifyNewOrder(result.orderId));
    return { ok: true, orderId: result.orderId, number: result.number };
  } catch (e) {
    reportError(e, "createOrder", { store: data.storeSlug });
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
