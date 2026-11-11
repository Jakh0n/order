"use server";

import { Prisma } from "@prisma/client";
import { refresh, updateTag } from "next/cache";

import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { toMinor } from "@/lib/money";
import { reportError } from "@/lib/report-error";
import { startOfDayInZone } from "@/lib/store-hours";
import { storeCacheTag } from "@/lib/storefront";
import { type PromoFormInput, promoFormSchema } from "@/lib/validators";

export type PromoResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalid" | "codeTaken" | "notFound" | "server";
      fieldErrors?: Record<string, string>;
    };

/** "2026-11-30" → the end of that day in the store's time zone */
function endOfDay(date: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  // Noon UTC falls on the same calendar day in every zone from UTC−12 to UTC+11
  const start = startOfDayInZone(timeZone, new Date(Date.UTC(y, m - 1, d, 12)));
  return new Date(start.getTime() + 24 * 60 * 60_000);
}

export async function createPromo(input: PromoFormInput): Promise<PromoResult> {
  const { store } = await requireOwner();
  const parsed = promoFormSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.map(String).join(".")] ??= issue.message;
    }
    return { ok: false, error: "invalid", fieldErrors };
  }
  const v = parsed.data;

  try {
    await prisma.promoCode.create({
      data: {
        storeId: store.id,
        code: v.code,
        type: v.type,
        value: v.type === "PERCENT" ? v.value : toMinor(v.value, store.currency),
        minSubtotal: toMinor(v.minSubtotal, store.currency),
        maxUses: v.maxUses,
        expiresAt: v.expiresOn ? endOfDay(v.expiresOn, store.timeZone) : null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "codeTaken", fieldErrors: { code: "codeTaken" } };
    }
    reportError(e, "createPromo");
    return { ok: false, error: "server" };
  }
  done(store.slug);
  return { ok: true };
}

export async function setPromoActive(id: string, isActive: boolean): Promise<PromoResult> {
  const { store } = await requireOwner();
  try {
    const { count } = await prisma.promoCode.updateMany({
      where: { id: String(id), storeId: store.id },
      data: { isActive: Boolean(isActive) },
    });
    if (count === 0) return { ok: false, error: "notFound" };
  } catch (e) {
    reportError(e, "setPromoActive");
    return { ok: false, error: "server" };
  }
  done(store.slug);
  return { ok: true };
}

/** Orders keep the code text and discount as a snapshot, so deleting is safe */
export async function deletePromo(id: string): Promise<PromoResult> {
  const { store } = await requireOwner();
  try {
    const { count } = await prisma.promoCode.deleteMany({
      where: { id: String(id), storeId: store.id },
    });
    if (count === 0) return { ok: false, error: "notFound" };
  } catch (e) {
    reportError(e, "deletePromo");
    return { ok: false, error: "server" };
  }
  done(store.slug);
  return { ok: true };
}

/** Checkout shows the code field only when the store has active codes (cached) */
function done(slug: string) {
  updateTag(storeCacheTag(slug));
  refresh();
}
