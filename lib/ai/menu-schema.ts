import { z } from "zod";

// What the AI returns when it reads a paper menu. Prices are in the menu's MAJOR units (8.99);
// they're converted with toMinor(…, store.currency) on import.
// OpenAI strict structured output: every field present → nullable instead of optional.

const extractedOption = z.object({
  name: z.string(),
  /** Added to the dish price; 0 when the menu shows no extra price */
  price: z.number(),
});

const extractedGroup = z.object({
  name: z.string(),
  required: z.boolean(),
  maxSelect: z.number().int(),
  options: z.array(extractedOption),
});

const extractedItem = z.object({
  name: z.string(),
  description: z.string().nullable(),
  /** null when the menu shows no price for the dish */
  price: z.number().nullable(),
  optionGroups: z.array(extractedGroup),
});

export const extractedMenuSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string(),
      items: z.array(extractedItem),
    }),
  ),
});

export type ExtractedMenu = z.infer<typeof extractedMenuSchema>;

/** Dishes read so far (names + prices), for the live "reading…" screen */
export interface MenuProgress {
  categories: { name: string; items: { name: string; price: number | null }[] }[];
}

// ---------- Review screen → import (what the owner confirms) ----------

export const importItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable(),
  /** Major units, as shown in the review form */
  price: z.number().finite().min(0).max(100_000_000),
  optionGroups: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        required: z.boolean(),
        maxSelect: z.number().int().min(1).max(20),
        options: z
          .array(z.object({ name: z.string().trim().min(1).max(60), price: z.number().finite() }))
          .min(1)
          .max(30),
      }),
    )
    .max(10),
});

export const importDraftSchema = z.object({
  categories: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        items: z.array(importItemSchema).max(200),
      }),
    )
    .max(50),
});

export type ImportDraft = z.infer<typeof importDraftSchema>;

/**
 * Overlapping crops can repeat a category or a dish: same-named categories are merged and a
 * dish name appears once per category.
 */
function dedupe(menu: ExtractedMenu): ExtractedMenu {
  const byName = new Map<string, ExtractedMenu["categories"][number]>();
  for (const c of menu.categories) {
    const key = c.name.trim().toLowerCase();
    const target = byName.get(key) ?? { name: c.name, items: [] };
    const seen = new Set(target.items.map((i) => i.name.trim().toLowerCase()));
    for (const item of c.items) {
      const k = item.name.trim().toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        target.items.push(item);
      }
    }
    byName.set(key, target);
  }
  return { categories: [...byName.values()] };
}

/** AI output → a draft the owner can edit (clamps odd values instead of failing) */
export function toDraft(raw: ExtractedMenu): ImportDraft {
  const menu = dedupe(raw);
  return {
    categories: menu.categories
      .map((c) => ({
        name: c.name.trim().slice(0, 60) || "Menu",
        items: c.items
          .filter((i) => i.name.trim())
          .slice(0, 200)
          .map((i) => ({
            name: i.name.trim().slice(0, 100),
            description: i.description?.trim().slice(0, 500) || null,
            price: i.price !== null && Number.isFinite(i.price) && i.price > 0 ? i.price : 0,
            optionGroups: i.optionGroups
              .filter((g) => g.name.trim() && g.options.length > 0)
              .slice(0, 10)
              .map((g) => {
                const options = g.options
                  .filter((o) => o.name.trim())
                  .slice(0, 30)
                  .map((o) => ({
                    name: o.name.trim().slice(0, 60),
                    price: Number.isFinite(o.price) ? o.price : 0,
                  }));
                return {
                  name: g.name.trim().slice(0, 60),
                  required: g.required,
                  maxSelect: Math.min(Math.max(1, g.maxSelect || 1), options.length || 1),
                  options,
                };
              })
              .filter((g) => g.options.length > 0),
          })),
      }))
      .filter((c) => c.items.length > 0)
      .slice(0, 50),
  };
}
