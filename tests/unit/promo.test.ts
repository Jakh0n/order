import { describe, expect, it } from "vitest";

import {
  asEmailMode,
  deliveryFeeFor,
  normalizePromoCode,
  PROMO_CODE_PATTERN,
  promoDiscount,
  promoProblem,
  type PromoRule,
  tipAmount,
} from "@/lib/orders/promo";

const now = new Date("2026-11-20T12:00:00Z");
const rule: PromoRule = {
  type: "PERCENT",
  value: 10,
  minSubtotal: 0,
  maxUses: null,
  usedCount: 0,
  expiresAt: null,
  isActive: true,
};

describe("normalizePromoCode", () => {
  it("trims, uppercases and drops spaces", () => {
    expect(normalizePromoCode("  summer 10 ")).toBe("SUMMER10");
    expect(normalizePromoCode("vip-5")).toBe("VIP-5");
  });
  it("pattern accepts 3–20 of A-Z 0-9 -", () => {
    expect(PROMO_CODE_PATTERN.test("AB")).toBe(false);
    expect(PROMO_CODE_PATTERN.test("ABC")).toBe(true);
    expect(PROMO_CODE_PATTERN.test("A".repeat(21))).toBe(false);
    expect(PROMO_CODE_PATTERN.test("SALE_1")).toBe(false);
  });
});

describe("promoProblem", () => {
  it("accepts a valid code", () => {
    expect(promoProblem(rule, 1000, now)).toBeNull();
  });
  it("unknown or switched off → invalid", () => {
    expect(promoProblem(null, 1000, now)).toBe("promoInvalid");
    expect(promoProblem({ ...rule, isActive: false }, 1000, now)).toBe("promoInvalid");
  });
  it("expired at exactly expiresAt", () => {
    expect(promoProblem({ ...rule, expiresAt: now }, 1000, now)).toBe("promoExpired");
    expect(promoProblem({ ...rule, expiresAt: new Date(now.getTime() + 1) }, 1000, now)).toBeNull();
  });
  it("used up when usedCount reaches maxUses", () => {
    expect(promoProblem({ ...rule, maxUses: 5, usedCount: 5 }, 1000, now)).toBe("promoUsedUp");
    expect(promoProblem({ ...rule, maxUses: 5, usedCount: 4 }, 1000, now)).toBeNull();
  });
  it("minimum subtotal is inclusive", () => {
    expect(promoProblem({ ...rule, minSubtotal: 1000 }, 999, now)).toBe("promoMinSubtotal");
    expect(promoProblem({ ...rule, minSubtotal: 1000 }, 1000, now)).toBeNull();
  });
});

describe("promoDiscount", () => {
  it("percent rounds down", () => {
    expect(promoDiscount({ type: "PERCENT", value: 10 }, 999)).toBe(99);
  });
  it("percent is capped at 100", () => {
    expect(promoDiscount({ type: "PERCENT", value: 150 }, 1000)).toBe(1000);
  });
  it("fixed never exceeds the subtotal", () => {
    expect(promoDiscount({ type: "FIXED", value: 500 }, 300)).toBe(300);
    expect(promoDiscount({ type: "FIXED", value: 500 }, 3000)).toBe(500);
  });
  it("never negative", () => {
    expect(promoDiscount({ type: "FIXED", value: -100 }, 1000)).toBe(0);
  });
});

describe("deliveryFeeFor", () => {
  it("only delivery pays", () => {
    expect(deliveryFeeFor("PICKUP", 100, 500, null)).toBe(0);
    expect(deliveryFeeFor("DINE_IN", 100, 500, null)).toBe(0);
    expect(deliveryFeeFor("DELIVERY", 100, 500, null)).toBe(500);
  });
  it("free from the threshold (inclusive)", () => {
    expect(deliveryFeeFor("DELIVERY", 9999, 500, 10000)).toBe(500);
    expect(deliveryFeeFor("DELIVERY", 10000, 500, 10000)).toBe(0);
  });
});

describe("tipAmount", () => {
  it("allowed percents only", () => {
    expect(tipAmount(1000, 10)).toBe(100);
    expect(tipAmount(1000, 15)).toBe(150);
    expect(tipAmount(1000, 0)).toBe(0);
    expect(tipAmount(1000, 50)).toBe(0);
  });
  it("rounds and ignores a negative base", () => {
    expect(tipAmount(1005, 5)).toBe(50);
    expect(tipAmount(-100, 10)).toBe(0);
  });
});

describe("asEmailMode", () => {
  it("falls back to off", () => {
    expect(asEmailMode("required")).toBe("required");
    expect(asEmailMode("yes")).toBe("off");
    expect(asEmailMode(undefined)).toBe("off");
  });
});
