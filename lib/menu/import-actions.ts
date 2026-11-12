"use server";

import { randomUUID } from "node:crypto";

import { refresh, updateTag } from "next/cache";

import { type ImportDraft, importDraftSchema } from "@/lib/ai/menu-schema";
import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { toMinor } from "@/lib/money";
import { reportError } from "@/lib/report-error";
import { storeCacheTag } from "@/lib/storefront";
import { productSchema } from "@/lib/validators";

export type ImportResult =
  | { ok: true; created: number; skipped: number; categories: number }
  | { ok: false; error: "invalid" | "saveFailed" };

/**
 * Step 2: save the reviewed draft. Categories are matched by name (case-insensitive) or created;
 * a dish whose name already exists in that category is skipped (re-importing is safe).
 */
export async function importMenu(input: ImportDraft): Promise<ImportResult> {
  const { store } = await requireOwner();
  const parsed = importDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  // Every dish goes through the same rules as the product form (minor units)
  const planned = parsed.data.categories.map((c) => ({
    name: c.name,
    items: c.items.map((i) => ({
      name: i.name,
      description: i.description,
      price: toMinor(i.price, store.currency),
      isAvailable: true,
      imageUrl: null,
      categoryId: "pending",
      optionGroups: i.optionGroups.map((g) => ({
        name: g.name,
        required: g.required,
        maxSelect: Math.min(g.maxSelect, g.options.length),
        options: g.options.map((o) => ({ name: o.name, price: toMinor(o.price, store.currency) })),
      })),
    })),
  }));
  for (const c of planned) {
    for (const item of c.items) {
      if (!productSchema.safeParse(item).success) return { ok: false, error: "invalid" };
    }
  }

  try {
    // Everything is prepared in memory, then written in 4 queries (one per table) inside one
    // transaction. Row-by-row creates took > 30 s for a big menu over the network.
    const existing = await prisma.category.findMany({
      where: { storeId: store.id },
      select: { id: true, name: true, sort: true, products: { select: { name: true } } },
    });
    let nextSort = existing.reduce((m, c) => Math.max(m, c.sort), -1) + 1;
    const newCategories: { id: string; storeId: string; name: string; sort: number }[] = [];
    const products: {
      id: string;
      storeId: string;
      categoryId: string;
      name: string;
      description: string | null;
      price: number;
      isAvailable: boolean;
      sort: number;
    }[] = [];
    const groups: {
      id: string;
      productId: string;
      name: string;
      required: boolean;
      maxSelect: number;
      sort: number;
    }[] = [];
    const options: { groupId: string; name: string; price: number; sort: number }[] = [];
    let skipped = 0;

    for (const c of planned) {
      let category = existing.find((e) => e.name.toLowerCase() === c.name.toLowerCase());
      if (!category) {
        category = { id: randomUUID(), name: c.name, sort: nextSort++, products: [] };
        newCategories.push({
          id: category.id,
          storeId: store.id,
          name: c.name,
          sort: category.sort,
        });
        existing.push(category);
      }
      const names = new Set(category.products.map((p) => p.name.toLowerCase()));
      let sort = category.products.length;

      for (const item of c.items) {
        if (names.has(item.name.toLowerCase())) {
          skipped++;
          continue;
        }
        names.add(item.name.toLowerCase());
        category.products.push({ name: item.name });
        const productId = randomUUID();
        products.push({
          id: productId,
          storeId: store.id,
          categoryId: category.id,
          name: item.name,
          description: item.description,
          price: item.price,
          isAvailable: true,
          sort: sort++,
        });
        item.optionGroups.forEach((g, gi) => {
          const groupId = randomUUID();
          groups.push({
            id: groupId,
            productId,
            name: g.name,
            required: g.required,
            maxSelect: g.maxSelect,
            sort: gi,
          });
          g.options.forEach((o, oi) =>
            options.push({ groupId, name: o.name, price: o.price, sort: oi }),
          );
        });
      }
    }

    await prisma.$transaction([
      prisma.category.createMany({ data: newCategories }),
      prisma.product.createMany({ data: products }),
      prisma.optionGroup.createMany({ data: groups }),
      prisma.option.createMany({ data: options }),
    ]);
    const result = { created: products.length, skipped, categories: newCategories.length };
    updateTag(storeCacheTag(store.slug));
    refresh();
    return { ok: true, ...result };
  } catch (e) {
    reportError(e, "importMenu");
    return { ok: false, error: "saveFailed" };
  }
}
