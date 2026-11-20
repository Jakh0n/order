import { describe, expect, it } from "vitest";

import { landingLocale, landingPath } from "@/i18n/config";
import { planOf, upgradeLink } from "@/lib/plan";
import { RESERVED_SLUGS, slugError, slugify } from "@/lib/slug";
import { normalizePhone, phoneSchema } from "@/lib/validators";

describe("slugify", () => {
  it("latin and Uzbek apostrophes", () => {
    expect(slugify("Mening Oshxonam")).toBe("mening-oshxonam");
    expect(slugify("O'sh markazi")).toBe("osh-markazi");
    expect(slugify("Gʻijduvon  Kabob!!")).toBe("gijduvon-kabob");
  });
  it("Cyrillic, incl. Uzbek letters", () => {
    expect(slugify("Кафе Ўзбегим")).toBe("kafe-ozbegim");
    expect(slugify("Шашлычная №1")).toBe("shashlichnaya-no1");
  });
  it("no leading/trailing dashes", () => {
    expect(slugify("  --Cafe--  ")).toBe("cafe");
  });
});

describe("slugError", () => {
  it("reserved names, incl. landing languages", () => {
    for (const s of ["admin", "signup", "uz", "ru", "en"]) {
      expect(RESERVED_SLUGS.has(s)).toBe(true);
    }
    expect(slugError("admin")).toBe("slugReserved");
  });
  it("invalid shapes", () => {
    expect(slugError("Bad Slug")).toBe("slugInvalid");
    expect(slugError("a--b")).toBe("slugInvalid");
    expect(slugError("bahor-kafe")).toBeNull();
  });
});

describe("planOf", () => {
  const now = new Date("2026-11-20T00:00:00Z");
  it("Free unless PAID and not expired", () => {
    expect(planOf({ plan: "FREE", paidUntil: null }, now)).toBe("FREE");
    expect(planOf({ plan: "PAID", paidUntil: null }, now)).toBe("PRO");
    expect(planOf({ plan: "PAID", paidUntil: new Date("2026-12-01") }, now)).toBe("PRO");
    expect(planOf({ plan: "PAID", paidUntil: now }, now)).toBe("FREE");
  });
});

describe("upgradeLink", () => {
  it("Telegram link when SUPPORT_TELEGRAM is set", () => {
    const prev = process.env.SUPPORT_TELEGRAM;
    process.env.SUPPORT_TELEGRAM = "@tezda_support";
    expect(upgradeLink("Pro please")).toBe("https://t.me/tezda_support?text=Pro%20please");
    process.env.SUPPORT_TELEGRAM = "";
    expect(upgradeLink("x")).toBeNull();
    process.env.SUPPORT_TELEGRAM = prev;
  });
});

describe("landing locale URLs", () => {
  it("English at /, others prefixed", () => {
    expect(landingPath("en")).toBe("/");
    expect(landingPath("uz")).toBe("/uz");
    expect(landingLocale("/ru")).toBe("ru");
    expect(landingLocale("/uz/")).toBe("uz");
    expect(landingLocale("/en")).toBeNull();
    expect(landingLocale("/")).toBeNull();
    expect(landingLocale("/bahor-kafe")).toBeNull();
  });
});

describe("phone", () => {
  it("normalizes to international format", () => {
    expect(normalizePhone(" +998 (90) 123-45-67 ")).toBe("+998901234567");
    expect(normalizePhone("00998901234567")).toBe("+998901234567");
  });
  it("requires a country code", () => {
    expect(phoneSchema.safeParse("+998901234567").success).toBe(true);
    expect(phoneSchema.safeParse("901234567").success).toBe(false);
    expect(phoneSchema.safeParse("+0123456789").success).toBe(false);
  });
});
