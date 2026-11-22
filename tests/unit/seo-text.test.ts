import { describe, expect, it } from "vitest";

import { clip, firstLine, isAlwaysOpen, plainText } from "@/lib/seo-text";

describe("plainText", () => {
  it("drops markup and joins lines", () => {
    expect(plainText("**Halal kebab, open 24/7.** Fresh.\n**할랄 케밥.** _new_ ~~old~~")).toBe(
      "Halal kebab, open 24/7. Fresh. 할랄 케밥. new old",
    );
  });
  it("keeps underscores inside words", () => {
    expect(plainText("snake_case_name")).toBe("snake_case_name");
  });
  it("handles empty", () => {
    expect(plainText(null)).toBe("");
  });
});

describe("firstLine", () => {
  it("takes the first non-empty line", () => {
    expect(firstLine("\n**Open 24/7.** Doner\nKorean line")).toBe("Open 24/7. Doner");
  });
});

describe("clip", () => {
  it("leaves short text", () => {
    expect(clip("Short text", 20)).toBe("Short text");
  });
  it("cuts at a word and adds an ellipsis", () => {
    expect(clip("Halal Turkish kebab, open day and night", 24)).toBe("Halal Turkish kebab…");
  });
});

describe("isAlwaysOpen", () => {
  it("is true without hours or with equal times", () => {
    expect(isAlwaysOpen({ openTime: null, closeTime: null })).toBe(true);
    expect(isAlwaysOpen({ openTime: "00:00", closeTime: "00:00" })).toBe(true);
    expect(isAlwaysOpen({ openTime: "10:00", closeTime: "22:00" })).toBe(false);
  });
});
