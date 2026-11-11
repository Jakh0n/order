"use server";

import { prisma } from "@/lib/db";
import {
  type DiscountTypeValue,
  normalizePromoCode,
  PROMO_CODE_PATTERN,
  type PromoProblem,
  promoProblem,
} from "@/lib/orders/promo";
import { isPro } from "@/lib/plan";
import { clientIp, rateLimit, RULES } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";

export type CheckPromoResult =
  | {
      ok: true;
      /** What the client needs to recompute the discount as the cart changes */
      promo: { code: string; type: DiscountTypeValue; value: number; minSubtotal: number };
    }
  | {
      ok: false;
      error: PromoProblem | "tooMany" | "server";
      /** For "promoMinSubtotal": the amount the code needs */
      minSubtotal?: number;
    };

/**
 * Checkout preview: is this code usable for this cart? (public, rate limited)
 * The order itself re-checks the code and counts the use (insertOrder).
 */
export async function checkPromo(input: {
  storeSlug: string;
  code: string;
  subtotal: number;
}): Promise<CheckPromoResult> {
  const code = normalizePromoCode(String(input.code ?? ""));
  if (!PROMO_CODE_PATTERN.test(code)) return { ok: false, error: "promoInvalid" };
  const subtotal = Number.isFinite(input.subtotal) ? Math.max(0, Math.floor(input.subtotal)) : 0;

  try {
    const [allowed, promo] = await Promise.all([
      rateLimit(RULES.promoIp, await clientIp()),
      prisma.promoCode.findFirst({
        where: {
          code,
          store: { slug: String(input.storeSlug ?? "").slice(0, 100), isBlocked: false },
        },
        include: { store: { select: { plan: true, paidUntil: true } } },
      }),
    ]);
    if (!allowed) return { ok: false, error: "tooMany" };

    // Promo codes are a Pro feature: on Free they simply don't work
    const problem = promo && !isPro(promo.store) ? "promoInvalid" : promoProblem(promo, subtotal);
    if (problem || !promo) {
      return {
        ok: false,
        error: problem ?? "promoInvalid",
        minSubtotal: problem === "promoMinSubtotal" ? promo?.minSubtotal : undefined,
      };
    }
    return {
      ok: true,
      promo: {
        code: promo.code,
        type: promo.type,
        value: promo.value,
        minSubtotal: promo.minSubtotal,
      },
    };
  } catch (e) {
    reportError(e, "checkPromo");
    return { ok: false, error: "server" };
  }
}
