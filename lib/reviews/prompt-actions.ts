"use server";

import { JOIN, prisma } from "@/lib/db";
import { clientIp, rateLimit, RULES } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";

/**
 * Store page, returning customer: should we ask them to rate their last order?
 * No login — the order id (from this browser's localStorage) is the secret, like /o/[id].
 * Answers only yes / no, nothing about the order itself.
 */
export async function shouldAskForReview(orderId: string, storeSlug: string): Promise<boolean> {
  if (typeof orderId !== "string" || !/^[a-z0-9]{20,40}$/i.test(orderId)) return false;
  if (typeof storeSlug !== "string" || storeSlug.length > 60) return false;
  try {
    if (!(await rateLimit(RULES.reviewPromptIp, await clientIp()))) return false;
    const order = await prisma.order.findUnique({
      ...JOIN,
      where: { id: orderId },
      select: { status: true, store: { select: { slug: true } }, review: { select: { id: true } } },
    });
    return (
      !!order && order.store.slug === storeSlug && order.status === "COMPLETED" && !order.review
    );
  } catch (e) {
    reportError(e, "shouldAskForReview");
    return false;
  }
}
