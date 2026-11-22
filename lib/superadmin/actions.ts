"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import { requireSuperadmin } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { isDemoStore } from "@/lib/demo";
import { reportError } from "@/lib/report-error";
import { deleteStoreFiles } from "@/lib/storage";
import { storeCacheTag } from "@/lib/storefront";

export type SuperadminResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalid" | "notFound" | "slugMismatch" | "activeSubscription" | "demoStore" | "server";
    };

const idSchema = z.string().min(1).max(50);

export async function setStoreBlocked(
  storeId: string,
  blocked: boolean,
): Promise<SuperadminResult> {
  await requireSuperadmin();
  const id = idSchema.safeParse(storeId);
  if (!id.success || typeof blocked !== "boolean") return { ok: false, error: "invalid" };

  const store = await prisma.store
    .update({ where: { id: id.data }, data: { isBlocked: blocked }, select: { slug: true } })
    .catch(() => null);
  if (!store) return { ok: false, error: "notFound" };

  // Mijoz menyusi darhol yopilsin/ochilsin
  updateTag(storeCacheTag(store.slug));
  refresh();
  return { ok: true };
}

/** Pullik tarifni uzaytirish: hozirgi muddat tugamagan bo'lsa, undan keyin qo'shiladi */
export async function extendPaidPlan(storeId: string, months: number): Promise<SuperadminResult> {
  await requireSuperadmin();
  const id = idSchema.safeParse(storeId);
  const m = z.number().int().min(1).max(24).safeParse(months);
  if (!id.success || !m.success) return { ok: false, error: "invalid" };

  const store = await prisma.store.findUnique({
    where: { id: id.data },
    select: { plan: true, paidUntil: true, slug: true },
  });
  if (!store) return { ok: false, error: "notFound" };

  const now = new Date();
  const from =
    store.plan === "PAID" && store.paidUntil && store.paidUntil > now ? store.paidUntil : now;
  const paidUntil = new Date(from);
  paidUntil.setMonth(paidUntil.getMonth() + m.data);

  await prisma.store.update({ where: { id: id.data }, data: { plan: "PAID", paidUntil } });
  // The store page caches plan-dependent bits (promo field, free delivery, branding)
  updateTag(storeCacheTag(store.slug));
  refresh();
  return { ok: true };
}

export async function setFreePlan(storeId: string): Promise<SuperadminResult> {
  await requireSuperadmin();
  const id = idSchema.safeParse(storeId);
  if (!id.success) return { ok: false, error: "invalid" };

  const store = await prisma.store
    .update({
      where: { id: id.data },
      data: { plan: "FREE", paidUntil: null },
      select: { slug: true },
    })
    .catch(() => null);
  if (!store) return { ok: false, error: "notFound" };
  updateTag(storeCacheTag(store.slug));
  refresh();
  return { ok: true };
}

/**
 * Deletes a store for good: orders, menu, promo codes, reviews, pages, its images and receipts,
 * and the owner's account (unless the owner is a superadmin or has another store).
 * The superadmin types the store's slug to confirm.
 */
export async function deleteStore(storeId: string, confirmSlug: string): Promise<SuperadminResult> {
  await requireSuperadmin();
  const id = idSchema.safeParse(storeId);
  if (!id.success || typeof confirmSlug !== "string") return { ok: false, error: "invalid" };

  const store = await prisma.store.findUnique({
    where: { id: id.data },
    select: {
      slug: true,
      plan: true,
      paidUntil: true,
      polarSubscriptionId: true,
      owner: { select: { id: true, email: true, role: true, _count: { select: { stores: true } } } },
    },
  });
  if (!store) return { ok: false, error: "notFound" };
  if (confirmSlug.trim().toLowerCase() !== store.slug) return { ok: false, error: "slugMismatch" };
  // The landing page links to the demo store
  if (isDemoStore(store.slug)) return { ok: false, error: "demoStore" };
  // A live Polar subscription would keep charging the owner — cancel it in Polar first
  const paying =
    store.plan === "PAID" &&
    !!store.polarSubscriptionId &&
    !!store.paidUntil &&
    store.paidUntil > new Date();
  if (paying) return { ok: false, error: "activeSubscription" };

  const deleteOwner = store.owner.role !== "SUPERADMIN" && store.owner._count.stores === 1;
  try {
    await prisma.$transaction(async (tx) => {
      const where = { storeId: id.data };
      // No cascade from Store for these (order items, options, promo codes, reviews, pages cascade)
      await tx.order.deleteMany({ where });
      await tx.product.deleteMany({ where });
      await tx.category.deleteMany({ where });
      await tx.deliveryZone.deleteMany({ where });
      await tx.store.delete({ where: { id: id.data } });
      if (deleteOwner) {
        await tx.user.delete({ where: { id: store.owner.id } });
        await tx.emailCode.deleteMany({ where: { email: store.owner.email } });
      }
    });
  } catch (e) {
    reportError(e, "deleteStore");
    return { ok: false, error: "server" };
  }

  // After the data is gone (a failed file delete must not leave a half-deleted store)
  await deleteStoreFiles(id.data);
  updateTag(storeCacheTag(store.slug));
  refresh();
  return { ok: true };
}

/** Sentry ulanganini tekshirish: server tomonda test xatosi (onRequestError orqali Sentry'ga tushadi) */
export async function triggerSentryTest(): Promise<never> {
  await requireSuperadmin();
  throw new Error(`Sentry test error (superadmin) ${new Date().toISOString()}`);
}
