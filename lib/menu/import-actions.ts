"use server";

import { refresh, updateTag } from "next/cache";

import { type ImportDraft, importDraftSchema, toDraft } from "@/lib/ai/menu-schema";
import { aiConfigured, readMenu } from "@/lib/ai/openai";
import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { toMinor } from "@/lib/money";
import { isPro } from "@/lib/plan";
import { rateLimit, RULES } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";
import { storeCacheTag } from "@/lib/storefront";
import { productSchema } from "@/lib/validators";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // after the browser shrinks them
const MAX_TEXT = 8000;

export type ExtractResult =
  | { ok: true; draft: ImportDraft }
  | { ok: false; error: "notConfigured" | "invalid" | "tooMany" | "empty" | "server" };

/**
 * Step 1: read a paper menu (photos and/or pasted text) with AI. Nothing is saved —
 * the owner reviews the draft first. Rate limited per store (OpenAI costs money).
 */
export async function extractMenu(formData: FormData): Promise<ExtractResult> {
  const { store } = await requireOwner();
  if (!aiConfigured()) return { ok: false, error: "notConfigured" };

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const text = String(formData.get("text") ?? "")
    .trim()
    .slice(0, MAX_TEXT);
  if ((files.length === 0 && !text) || files.length > MAX_IMAGES) {
    return { ok: false, error: "invalid" };
  }
  if (files.some((f) => !f.type.startsWith("image/") || f.size > MAX_IMAGE_BYTES)) {
    return { ok: false, error: "invalid" };
  }

  try {
    const rule = isPro(store) ? RULES.menuImportPro : RULES.menuImportFree;
    if (!(await rateLimit(rule, store.id))) return { ok: false, error: "tooMany" };

    const images = await Promise.all(
      files.map(
        async (f) =>
          `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString("base64")}`,
      ),
    );
    const menu = await readMenu({ images, text, currency: store.currency });
    const draft = toDraft(menu);
    if (draft.categories.length === 0) return { ok: false, error: "empty" };
    return { ok: true, draft };
  } catch (e) {
    reportError(e, "extractMenu");
    return { ok: false, error: "server" };
  }
}

export type ImportResult =
  | { ok: true; created: number; skipped: number; categories: number }
  | { ok: false; error: "invalid" | "server" };

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
    const result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.category.findMany({
          where: { storeId: store.id },
          select: { id: true, name: true, sort: true, products: { select: { name: true } } },
        });
        let nextSort = existing.reduce((m, c) => Math.max(m, c.sort), -1) + 1;
        let created = 0;
        let skipped = 0;
        let newCategories = 0;

        for (const c of planned) {
          let category = existing.find((e) => e.name.toLowerCase() === c.name.toLowerCase());
          if (!category) {
            const row = await tx.category.create({
              data: { storeId: store.id, name: c.name, sort: nextSort++ },
              select: { id: true, name: true, sort: true },
            });
            category = { ...row, products: [] };
            existing.push(category);
            newCategories++;
          }
          const names = new Set(category.products.map((p) => p.name.toLowerCase()));
          let sort = category.products.length;

          for (const item of c.items) {
            if (names.has(item.name.toLowerCase())) {
              skipped++;
              continue;
            }
            names.add(item.name.toLowerCase());
            await tx.product.create({
              data: {
                storeId: store.id,
                categoryId: category.id,
                name: item.name,
                description: item.description,
                price: item.price,
                isAvailable: true,
                sort: sort++,
                optionGroups: {
                  create: item.optionGroups.map((g, gi) => ({
                    name: g.name,
                    required: g.required,
                    maxSelect: g.maxSelect,
                    sort: gi,
                    options: {
                      create: g.options.map((o, oi) => ({
                        name: o.name,
                        price: o.price,
                        sort: oi,
                      })),
                    },
                  })),
                },
              },
            });
            created++;
          }
        }
        return { created, skipped, categories: newCategories };
      },
      { timeout: 30_000 },
    );
    updateTag(storeCacheTag(store.slug));
    refresh();
    return { ok: true, ...result };
  } catch (e) {
    reportError(e, "importMenu");
    return { ok: false, error: "server" };
  }
}
