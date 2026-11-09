"use server";

import { refresh } from "next/cache";

import { prisma } from "@/lib/db";
import { clientIp, rateLimitAll, RULES } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";
import { deleteReceipt, MenuImageError, uploadReceipt } from "@/lib/storage";

export type ReceiptError =
  | "invalid"
  | "notFound"
  | "notAllowed"
  | "imageType"
  | "imageSize"
  | "tooMany"
  | "upload"
  | "server";

export type ReceiptResult = { ok: true } | { ok: false; error: ReceiptError };

/**
 * Customer attaches a bank transfer receipt photo to their order (no login — the order id
 * is the key, same as /o/{orderId}). Only for unpaid, still active TRANSFER orders.
 * Replacing a receipt removes the old file.
 */
export async function uploadOrderReceipt(formData: FormData): Promise<ReceiptResult> {
  const orderId = formData.get("orderId");
  const file = formData.get("file");
  if (typeof orderId !== "string" || !/^[a-z0-9]{20,40}$/i.test(orderId)) {
    return { ok: false, error: "invalid" };
  }
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "invalid" };

  try {
    const [allowed, order] = await Promise.all([
      rateLimitAll([
        [RULES.receiptIp, await clientIp()],
        [RULES.receiptOrder, orderId],
      ]),
      prisma.order.findUnique({
        where: { id: orderId },
        select: {
          storeId: true,
          paymentMethod: true,
          paymentStatus: true,
          status: true,
          receiptPath: true,
        },
      }),
    ]);
    if (!allowed) return { ok: false, error: "tooMany" };
    if (!order) return { ok: false, error: "notFound" };
    if (
      order.paymentMethod !== "TRANSFER" ||
      order.paymentStatus === "PAID" ||
      order.status === "CANCELLED" ||
      order.status === "COMPLETED"
    ) {
      return { ok: false, error: "notAllowed" };
    }

    const path = await uploadReceipt(order.storeId, orderId, file);
    await prisma.order.update({
      where: { id: orderId },
      data: { receiptPath: path, receiptAt: new Date() },
    });
    await deleteReceipt(order.storeId, order.receiptPath);

    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof MenuImageError) return { ok: false, error: e.code };
    reportError(e, "uploadOrderReceipt");
    return { ok: false, error: "server" };
  }
}
