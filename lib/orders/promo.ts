// Promo codes and free delivery — pure functions shared by the client (preview) and the server (truth).

export type DiscountTypeValue = "PERCENT" | "FIXED";

export interface PromoRule {
  type: DiscountTypeValue;
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
}

export type PromoProblem = "promoInvalid" | "promoExpired" | "promoUsedUp" | "promoMinSubtotal";

/** What customers type → what is stored: "  summer-10 " → "SUMMER-10" */
export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export const PROMO_CODE_PATTERN = /^[A-Z0-9-]{3,20}$/;

/** Why the code can't be used for this subtotal right now (null = it can) */
export function promoProblem(
  promo: PromoRule | null,
  subtotal: number,
  now: Date = new Date(),
): PromoProblem | null {
  if (!promo || !promo.isActive) return "promoInvalid";
  if (promo.expiresAt && promo.expiresAt.getTime() <= now.getTime()) return "promoExpired";
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return "promoUsedUp";
  if (subtotal < promo.minSubtotal) return "promoMinSubtotal";
  return null;
}

/** Discount on the items subtotal (never more than the subtotal) */
export function promoDiscount(promo: Pick<PromoRule, "type" | "value">, subtotal: number): number {
  const raw =
    promo.type === "PERCENT"
      ? Math.floor((subtotal * Math.min(promo.value, 100)) / 100)
      : promo.value;
  return Math.max(0, Math.min(raw, subtotal));
}

/**
 * Delivery fee for an order. Free delivery is reached on the items subtotal
 * (before a promo discount), so the hint "add X more" doesn't move when a code is applied.
 */
export function deliveryFeeFor(
  type: "PICKUP" | "DELIVERY" | "DINE_IN",
  subtotal: number,
  fee: number,
  freeDeliveryFrom: number | null,
): number {
  if (type !== "DELIVERY") return 0;
  if (freeDeliveryFrom !== null && subtotal >= freeDeliveryFrom) return 0;
  return fee;
}

/** Tip choices on the checkout (percent of the items subtotal after a discount) */
export const TIP_PERCENTS = [0, 5, 10, 15] as const;
export type TipPercent = (typeof TIP_PERCENTS)[number];

export function tipAmount(subtotalAfterDiscount: number, percent: number): number {
  if (!(TIP_PERCENTS as readonly number[]).includes(percent) || percent === 0) return 0;
  return Math.round((Math.max(0, subtotalAfterDiscount) * percent) / 100);
}

export const EMAIL_MODES = ["off", "optional", "required"] as const;
export type EmailMode = (typeof EMAIL_MODES)[number];

export function asEmailMode(value: unknown): EmailMode {
  return EMAIL_MODES.includes(value as EmailMode) ? (value as EmailMode) : "off";
}
