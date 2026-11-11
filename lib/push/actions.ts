"use server";

import { z } from "zod";

import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { reportError } from "@/lib/report-error";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000).startsWith("https://"),
  keys: z.object({
    p256dh: z.string().min(10).max(200),
    auth: z.string().min(10).max(100),
  }),
});

export type PushResult = { ok: true } | { ok: false; error: "invalid" | "server" };

/** This device starts getting new-order notifications for the owner's store */
export async function savePushSubscription(
  subscription: unknown,
  userAgent?: string,
): Promise<PushResult> {
  const { user, store } = await requireOwner();
  const parsed = subscriptionSchema.safeParse(subscription);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { endpoint, keys } = parsed.data;
  const data = {
    storeId: store.id,
    userId: user.id,
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: userAgent?.slice(0, 200) ?? null,
  };

  try {
    // The same browser re-subscribing (or another account on it) just takes the row over
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, ...data },
      update: data,
    });
    return { ok: true };
  } catch (e) {
    reportError(e, "savePushSubscription");
    return { ok: false, error: "server" };
  }
}

/** Turn notifications off on this device */
export async function deletePushSubscription(endpoint: string): Promise<PushResult> {
  const { store } = await requireOwner();
  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: String(endpoint).slice(0, 1000), storeId: store.id },
    });
    return { ok: true };
  } catch (e) {
    reportError(e, "deletePushSubscription");
    return { ok: false, error: "server" };
  }
}
