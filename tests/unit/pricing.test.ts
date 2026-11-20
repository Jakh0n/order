import { describe, expect, it } from "vitest";

import { priceItems, type PricingProduct } from "@/lib/orders/pricing";

const burger: PricingProduct = {
  id: "burger",
  name: "Burger",
  price: 1000,
  optionGroups: [
    {
      id: "size",
      name: "Size",
      required: true,
      maxSelect: 1,
      options: [
        { id: "small", name: "Small", price: 0 },
        { id: "large", name: "Large", price: 300 },
      ],
    },
    {
      id: "extras",
      name: "Extras",
      required: false,
      maxSelect: 2,
      options: [
        { id: "cheese", name: "Cheese", price: 150 },
        { id: "bacon", name: "Bacon", price: 250 },
        { id: "egg", name: "Egg", price: 100 },
      ],
    },
    { id: "empty", name: "Empty", required: true, maxSelect: 1, options: [] },
  ],
};
const tea: PricingProduct = { id: "tea", name: "Tea", price: 500, optionGroups: [] };
const products = [burger, tea];

describe("priceItems", () => {
  it("prices from the database, options included", () => {
    const r = priceItems(products, [
      { productId: "burger", quantity: 2, optionIds: ["large", "cheese"] },
      { productId: "tea", quantity: 3, optionIds: [] },
    ]);
    expect(r).toEqual({
      ok: true,
      subtotal: 2 * 1450 + 3 * 500,
      lines: [
        {
          productId: "burger",
          name: "Burger",
          unitPrice: 1450,
          quantity: 2,
          lineTotal: 2900,
          options: [
            { id: "large", group: "Size", name: "Large", price: 300 },
            { id: "cheese", group: "Extras", name: "Cheese", price: 150 },
          ],
        },
        { productId: "tea", name: "Tea", unitPrice: 500, quantity: 3, lineTotal: 1500, options: [] },
      ],
    });
  });

  it("rejects a product that isn't on the list (other store, unavailable)", () => {
    expect(priceItems(products, [{ productId: "pizza", quantity: 1, optionIds: [] }])).toEqual({
      ok: false,
      error: "unavailable",
    });
  });

  it("requires a choice in a required group", () => {
    const r = priceItems(products, [{ productId: "burger", quantity: 1, optionIds: ["cheese"] }]);
    expect(r).toEqual({ ok: false, error: "invalidOptions" });
  });

  it("does not require an empty group", () => {
    const r = priceItems(products, [{ productId: "burger", quantity: 1, optionIds: ["small"] }]);
    expect(r.ok).toBe(true);
  });

  it("enforces maxSelect", () => {
    const r = priceItems(products, [
      { productId: "burger", quantity: 1, optionIds: ["small", "cheese", "bacon", "egg"] },
    ]);
    expect(r).toEqual({ ok: false, error: "invalidOptions" });
  });

  it("treats maxSelect 0 as 1", () => {
    const p: PricingProduct = {
      ...tea,
      optionGroups: [
        {
          id: "g",
          name: "Milk",
          required: false,
          maxSelect: 0,
          options: [
            { id: "a", name: "A", price: 0 },
            { id: "b", name: "B", price: 0 },
          ],
        },
      ],
    };
    expect(priceItems([p], [{ productId: "tea", quantity: 1, optionIds: ["a"] }]).ok).toBe(true);
    expect(priceItems([p], [{ productId: "tea", quantity: 1, optionIds: ["a", "b"] }]).ok).toBe(
      false,
    );
  });

  it("rejects two sizes in a single-choice group", () => {
    const r = priceItems(products, [
      { productId: "burger", quantity: 1, optionIds: ["small", "large"] },
    ]);
    expect(r).toEqual({ ok: false, error: "invalidOptions" });
  });

  it("rejects duplicate option ids (no double-charging tricks)", () => {
    const r = priceItems(products, [
      { productId: "burger", quantity: 1, optionIds: ["small", "cheese", "cheese"] },
    ]);
    expect(r).toEqual({ ok: false, error: "invalidOptions" });
  });

  it("rejects an option that belongs to another product or was deleted", () => {
    const r = priceItems(products, [
      { productId: "burger", quantity: 1, optionIds: ["small", "ghost"] },
    ]);
    expect(r).toEqual({ ok: false, error: "invalidOptions" });
  });

  it("rejects a negative unit price", () => {
    const p: PricingProduct = {
      ...tea,
      optionGroups: [
        {
          id: "g",
          name: "Discount",
          required: false,
          maxSelect: 1,
          options: [{ id: "neg", name: "Neg", price: -600 }],
        },
      ],
    };
    expect(priceItems([p], [{ productId: "tea", quantity: 1, optionIds: ["neg"] }])).toEqual({
      ok: false,
      error: "invalidOptions",
    });
  });

  it("an empty cart costs nothing", () => {
    expect(priceItems(products, [])).toEqual({ ok: true, lines: [], subtotal: 0 });
  });
});
