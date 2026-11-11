"use server";

import { Prisma } from "@prisma/client";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, RULES } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";
import { storeCacheTag } from "@/lib/storefront";

const reviewSchema = z.object({
  orderId: z.string().regex(/^[a-z0-9]{20,40}$/i),
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null),
});

export type ReviewResult =
  { ok: true } | { ok: false; error: "invalid" | "notAllowed" | "tooMany" | "server" };

/**
 * Customer review from the order page (no login: the order id is the secret link).
 * Only completed orders, one review per order.
 */
export async function submitReview(input: {
  orderId: string;
  rating: number;
  comment?: string;
}): Promise<ReviewResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { orderId, rating, comment } = parsed.data;

  try {
    if (!(await rateLimit(RULES.reviewIp, await clientIp())))
      return { ok: false, error: "tooMany" };
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        storeId: true,
        customerName: true,
        store: { select: { slug: true } },
      },
    });
    if (!order || order.status !== "COMPLETED") return { ok: false, error: "notAllowed" };

    await prisma.review.create({
      data: {
        orderId,
        storeId: order.storeId,
        rating,
        comment,
        // Only the first name is ever shown publicly
        customerName: order.customerName.trim().split(/\s+/)[0].slice(0, 40),
      },
    });
    updateTag(storeCacheTag(order.store.slug));
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "notAllowed" }; // already reviewed
    }
    reportError(e, "submitReview");
    return { ok: false, error: "server" };
  }
}

/** Owner hides / shows a review on the store page */
export async function setReviewHidden(id: string, hidden: boolean): Promise<ReviewResult> {
  const { store } = await requireOwner();
  try {
    const { count } = await prisma.review.updateMany({
      where: { id: String(id), storeId: store.id },
      data: { isHidden: Boolean(hidden) },
    });
    if (count === 0) return { ok: false, error: "notAllowed" };
    updateTag(storeCacheTag(store.slug));
    refresh();
    return { ok: true };
  } catch (e) {
    reportError(e, "setReviewHidden");
    return { ok: false, error: "server" };
  }
}
