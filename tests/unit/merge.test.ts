import { describe, expect, it } from "vitest";

import { mergeEdits, same } from "@/lib/settings/merge";

describe("same", () => {
  it("ignores key order and treats undefined as null", () => {
    expect(same({ a: 1, b: [1, { c: 2, d: 3 }] }, { b: [1, { d: 3, c: 2 }], a: 1 })).toBe(true);
    expect(same(undefined, null)).toBe(true);
    expect(same([1, 2], [2, 1])).toBe(false);
  });
});

describe("mergeEdits", () => {
  const base = { name: "Kebab", description: null as string | null, logoUrl: "a.png" };

  it("does not erase a field saved elsewhere that this form didn't touch", () => {
    // The bug: the editor was open, someone filled the description, the owner saved a logo
    const edited = { ...base, logoUrl: "b.png" };
    const current = { ...base, description: "Halal, 24/7" };
    expect(mergeEdits(base, edited, current)).toEqual({
      patch: { logoUrl: "b.png" },
      conflicts: [],
      kept: ["description"],
    });
  });

  it("reports a field changed in both places", () => {
    const edited = { ...base, description: "Mine" };
    const current = { ...base, description: "Theirs" };
    expect(mergeEdits(base, edited, current).conflicts).toEqual(["description"]);
  });

  it("is fine when both made the same change", () => {
    const edited = { ...base, name: "King" };
    const current = { ...base, name: "King" };
    expect(mergeEdits(base, edited, current)).toEqual({
      patch: { name: "King" },
      conflicts: [],
      kept: [],
    });
  });

  it("writes plain edits", () => {
    const edited = { ...base, name: "King", description: "New" };
    expect(mergeEdits(base, edited, base).patch).toEqual({ name: "King", description: "New" });
  });
});
