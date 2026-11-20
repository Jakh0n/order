import { describe, expect, it } from "vitest";

import { currencyDigits, formatMoney, isValidCurrency, priceStep, toMajor, toMinor } from "@/lib/money";

describe("currencyDigits", () => {
  it("knows minor units", () => {
    expect(currencyDigits("USD")).toBe(2);
    expect(currencyDigits("jpy")).toBe(0);
    expect(currencyDigits("KWD")).toBe(3);
    expect(currencyDigits("UZS")).toBe(2);
  });
});

describe("toMinor / toMajor", () => {
  it("round-trips without float drift", () => {
    expect(toMinor(8.99, "USD")).toBe(899);
    expect(toMinor(0.1 + 0.2, "USD")).toBe(30);
    expect(toMinor(1500, "JPY")).toBe(1500);
    expect(toMajor(899, "USD")).toBe(8.99);
    expect(toMinor(45000, "UZS")).toBe(4500000);
  });
  it("priceStep follows the currency", () => {
    expect(priceStep("USD")).toBe(0.01);
    expect(priceStep("JPY")).toBe(1);
  });
});

describe("formatMoney", () => {
  it("formats in the order's currency", () => {
    expect(formatMoney(899, "USD")).toBe("$8.99");
    expect(formatMoney(1500, "JPY")).toBe("¥1,500");
  });
  it("UZS and friends show whole units only", () => {
    expect(formatMoney(4500000, "UZS")).toMatch(/^UZS\s45,000$/);
    expect(formatMoney(10573333, "UZS")).toMatch(/^UZS\s105,733$/);
  });
  it("keeps the sign", () => {
    expect(formatMoney(-500, "USD")).toBe("-$5.00");
  });
});

describe("isValidCurrency", () => {
  it("ISO 4217 codes only", () => {
    expect(isValidCurrency("UZS")).toBe(true);
    expect(isValidCurrency("usd")).toBe(false);
    expect(isValidCurrency("ABCD")).toBe(false);
  });
});
