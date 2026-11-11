"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { insertOrder } from "@/lib/orders/insert";
import { canRevert, canTransition } from "@/lib/orders/status";
import { type ManualOrderInput, manualOrderSchema } from "@/lib/validators";
import { reportError } from "@/lib/report-error";

// Har bir action: requireOwner() + har bir so'rovda storeId — boshqa do'kon buyurtmasiga tegib bo'lmaydi.

export type AdminActionResult =
  { ok: true } | { ok: false; error: "notFound" | "invalidTransition" | "invalid" | "server" };

const idSchema = z.string().min(1).max(50);
const statusSchema = z.enum(["NEW", "ACCEPTED", "READY", "ON_THE_WAY", "COMPLETED", "CANCELLED"]);

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<AdminActionResult> {
  const { store } = await requireOwner();
  const id = idSchema.safeParse(orderId);
  const next = statusSchema.safeParse(status);
  if (!id.success || !next.success) return { ok: false, error: "invalid" };

  const order = await prisma.order.findFirst({
    where: { id: id.data, storeId: store.id },
    select: { status: true, type: true },
  });
  if (!order) return { ok: false, error: "notFound" };
  if (!canTransition(order.status, next.data, order.type)) {
    return { ok: false, error: "invalidTransition" };
  }

  // Parallel o'zgarishdan himoya: holat o'qilgandan beri o'zgarmagan bo'lsa
  const { count } = await prisma.order.updateMany({
    where: { id: id.data, storeId: store.id, status: order.status },
    data: { status: next.data },
  });
  if (count === 0) return { ok: false, error: "invalidTransition" };

  refresh();
  return { ok: true };
}

/** Undo a status change: only if the order is still in `from` and `to` is an earlier step */
export async function revertOrderStatus(
  orderId: string,
  from: string,
  to: string,
): Promise<AdminActionResult> {
  const { store } = await requireOwner();
  const id = idSchema.safeParse(orderId);
  const prev = statusSchema.safeParse(from);
  const next = statusSchema.safeParse(to);
  if (!id.success || !prev.success || !next.success) return { ok: false, error: "invalid" };

  const order = await prisma.order.findFirst({
    where: { id: id.data, storeId: store.id },
    select: { status: true, type: true },
  });
  if (!order) return { ok: false, error: "notFound" };
  if (order.status !== prev.data || !canRevert(prev.data, next.data, order.type)) {
    return { ok: false, error: "invalidTransition" };
  }

  const { count } = await prisma.order.updateMany({
    where: { id: id.data, storeId: store.id, status: prev.data },
    data: { status: next.data },
  });
  if (count === 0) return { ok: false, error: "invalidTransition" };

  refresh();
  return { ok: true };
}

export async function setOrderPaid(orderId: string, paid: boolean): Promise<AdminActionResult> {
  const { store } = await requireOwner();
  const id = idSchema.safeParse(orderId);
  if (!id.success || typeof paid !== "boolean") return { ok: false, error: "invalid" };

  const { count } = await prisma.order.updateMany({
    where: { id: id.data, storeId: store.id },
    data: { paymentStatus: paid ? "PAID" : "UNPAID" },
  });
  if (count === 0) return { ok: false, error: "notFound" };

  refresh();
  return { ok: true };
}

export type ManualOrderResult =
  | { ok: true; orderId: string; number: number }
  | {
      ok: false;
      error: "invalid" | "unavailable" | "invalidOptions" | "server";
      fieldErrors?: Record<string, string>;
    };

export async function createManualOrder(input: ManualOrderInput): Promise<ManualOrderResult> {
  const { store } = await requireOwner();
  const settings = await prisma.store.findUniqueOrThrow({
    where: { id: store.id },
    select: { deliveryFee: true, freeDeliveryFrom: true },
  });

  const parsed = manualOrderSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.map(String).join(".")] ??= issue.message;
    }
    return { ok: false, error: "invalid", fieldErrors };
  }
  const { markPaid, ...data } = parsed.data;

  try {
    const result = await insertOrder({
      ...data,
      storeId: store.id,
      currency: store.currency,
      deliveryFee: settings.deliveryFee,
      freeDeliveryFrom: settings.freeDeliveryFrom,
      // Promo codes are for customers; a manual order has none
      promoCode: undefined,
      paymentStatus: markPaid ? "PAID" : "UNPAID",
      minOrder: null,
    });
    if (!result.ok) {
      // minOrder admin uchun tekshirilmaydi; promo kod yo'q
      const error =
        result.error === "unavailable" || result.error === "invalidOptions"
          ? result.error
          : "server";
      return { ok: false, error };
    }
    return { ok: true, orderId: result.orderId, number: result.number };
  } catch (e) {
    reportError(e, "createManualOrder");
    return { ok: false, error: "server" };
  }
}
