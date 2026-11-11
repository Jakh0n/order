"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import { requireSuperadmin } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { storeCacheTag } from "@/lib/storefront";

export type SuperadminResult = { ok: true } | { ok: false; error: "invalid" | "notFound" };

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

/** Sentry ulanganini tekshirish: server tomonda test xatosi (onRequestError orqali Sentry'ga tushadi) */
export async function triggerSentryTest(): Promise<never> {
  await requireSuperadmin();
  throw new Error(`Sentry test error (superadmin) ${new Date().toISOString()}`);
}
