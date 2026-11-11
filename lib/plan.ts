// Plans. Taking orders is NEVER limited — Pro unlocks growth tools.
// Store.plan = PAID is "Pro" while paidUntil is in the future (or empty = no end date).

export type PlanTier = "FREE" | "PRO";

/** Pro features (everything else is in Free) */
export type ProFeature =
  "promoCodes" | "freeDelivery" | "analyticsHistory" | "customers" | "fullHistory" | "noBranding";

/** Free keeps this many orders per month in history (active orders are always shown) */
export const FREE_MONTHLY_ORDERS = 100;
export const PRO_PRICE_USD = 15;

export function planOf(
  store: { plan: "FREE" | "PAID"; paidUntil: Date | null },
  now: Date = new Date(),
): PlanTier {
  if (store.plan !== "PAID") return "FREE";
  return !store.paidUntil || store.paidUntil.getTime() > now.getTime() ? "PRO" : "FREE";
}

export function isPro(store: { plan: "FREE" | "PAID"; paidUntil: Date | null }): boolean {
  return planOf(store) === "PRO";
}

/** Telegram chat with the platform owner, pre-filled (no online payment yet) */
export function upgradeLink(text: string): string | null {
  const user = process.env.SUPPORT_TELEGRAM?.trim().replace(/^@/, "");
  if (!user) return null;
  return `https://t.me/${user}?text=${encodeURIComponent(text)}`;
}
