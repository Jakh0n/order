import "server-only";

import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/db";
import { storeCacheTag } from "@/lib/storefront";

/** The subscription fields we read from Polar webhooks (snake_case, as in the payload) */
export type PolarSubscription = {
  id: string;
  status: string;
  current_period_end: string;
  ended_at: string | null;
  metadata: Record<string, unknown>;
  customer: { external_id?: string | null };
};

/** Renewal webhooks can arrive a little after the period ends — Pro must not flicker off */
const GRACE_MS = 2 * 24 * 60 * 60 * 1000;

/** Still paid for: active (also when canceled at period end) or in trial */
const LIVE = new Set(["active", "trialing"]);
/** Polar is retrying the payment: keep the current paidUntil, decide on the next event */
const WAITING = new Set(["past_due", "incomplete"]);

function storeIdOf(sub: PolarSubscription): string | null {
  const id = sub.customer.external_id ?? sub.metadata.storeId;
  return typeof id === "string" && id ? id : null;
}

/**
 * Store.plan / paidUntil follow the Polar subscription (idempotent: same event twice → same result).
 * planOf() then decides Pro by paidUntil, so a canceled subscription stays Pro until its period ends.
 */
export async function syncSubscription(sub: PolarSubscription): Promise<void> {
  const storeId = storeIdOf(sub);
  if (!storeId) return;
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { slug: true, polarSubscriptionId: true },
  });
  if (!store || WAITING.has(sub.status)) return;

  if (LIVE.has(sub.status)) {
    const paidUntil = new Date(new Date(sub.current_period_end).getTime() + GRACE_MS);
    await prisma.store.update({
      where: { id: storeId },
      data: { plan: "PAID", paidUntil, polarSubscriptionId: sub.id },
    });
  } else {
    // Ended (revoked, unpaid, expired). Only the store's current subscription may end Pro:
    // an old monthly one ending after a switch to yearly must not downgrade the store.
    if (store.polarSubscriptionId !== sub.id) return;
    const end = sub.ended_at ? new Date(sub.ended_at) : new Date();
    await prisma.store.update({ where: { id: storeId }, data: { paidUntil: end } });
  }
  // The store page caches plan-dependent bits (promo field, free delivery, branding)
  revalidateTag(storeCacheTag(store.slug), { expire: 0 });
}
