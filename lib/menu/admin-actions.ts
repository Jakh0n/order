"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { rateLimit, RULES } from "@/lib/rate-limit";
import { deleteMenuImage, MenuImageError, menuImagePrefix, uploadMenuImage } from "@/lib/storage";
import { storeCacheTag } from "@/lib/storefront";
import { categorySchema, type ProductFormInput, productSchema } from "@/lib/validators";

// Har bir action: requireOwner() → har bir so'rovda storeId → mijoz menyusi keshini yangilash.

export type MenuActionError =
  | "invalid"
  | "notFound"
  | "categoryNotEmpty"
  | "imageType"
  | "imageSize"
  | "upload"
  | "tooMany"
  | "server";

export type MenuActionResult<T = object> =
  ({ ok: true } & T) | { ok: false; error: MenuActionError; fieldErrors?: Record<string, string> };

const idSchema = z.string().min(1).max(50);
const idListSchema = z.array(idSchema).min(1).max(500);

/** Mijoz menyusi (getStorefront) darhol yangilansin + joriy admin sahifasi qayta chizilsin */
function menuChanged(slug: string) {
  updateTag(storeCacheTag(slug));
  refresh();
}

function issuesToFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const result: Record<string, string> = {};
  for (const issue of issues) result[issue.path.map(String).join(".")] ??= issue.message;
  return result;
}

// ---------- Kategoriyalar ----------

export async function createCategory(name: string): Promise<MenuActionResult> {
  const { store } = await requireOwner();
  const parsed = categorySchema.safeParse({ name });
  if (!parsed.success) return { ok: false, error: "invalid" };

  const last = await prisma.category.aggregate({
    where: { storeId: store.id },
    _max: { sort: true },
  });
  await prisma.category.create({
    data: { storeId: store.id, name: parsed.data.name, sort: (last._max.sort ?? -1) + 1 },
  });
  menuChanged(store.slug);
  return { ok: true };
}

export async function updateCategory(
  categoryId: string,
  patch: { name?: string; isActive?: boolean },
): Promise<MenuActionResult> {
  const { store } = await requireOwner();
  const id = idSchema.safeParse(categoryId);
  const data = z
    .object({ name: categorySchema.shape.name.optional(), isActive: z.boolean().optional() })
    .safeParse(patch);
  if (!id.success || !data.success) return { ok: false, error: "invalid" };

  const { count } = await prisma.category.updateMany({
    where: { id: id.data, storeId: store.id },
    data: data.data,
  });
  if (count === 0) return { ok: false, error: "notFound" };
  menuChanged(store.slug);
  return { ok: true };
}

export async function deleteCategory(categoryId: string): Promise<MenuActionResult> {
  const { store } = await requireOwner();
  const id = idSchema.safeParse(categoryId);
  if (!id.success) return { ok: false, error: "invalid" };

  const products = await prisma.product.count({
    where: { categoryId: id.data, storeId: store.id },
  });
  if (products > 0) return { ok: false, error: "categoryNotEmpty" };

  const { count } = await prisma.category.deleteMany({ where: { id: id.data, storeId: store.id } });
  if (count === 0) return { ok: false, error: "notFound" };
  menuChanged(store.slug);
  return { ok: true };
}

/** ids — yangi tartibda; hammasi shu do'konniki bo'lishi shart */
export async function reorderCategories(ids: string[]): Promise<MenuActionResult> {
  const { store } = await requireOwner();
  const parsed = idListSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const owned = await prisma.category.count({
    where: { id: { in: parsed.data }, storeId: store.id },
  });
  if (owned !== new Set(parsed.data).size) return { ok: false, error: "notFound" };

  await prisma.$transaction(
    parsed.data.map((id, sort) =>
      prisma.category.updateMany({ where: { id, storeId: store.id }, data: { sort } }),
    ),
  );
  menuChanged(store.slug);
  return { ok: true };
}

// ---------- Taomlar ----------

export async function setProductAvailable(
  productId: string,
  isAvailable: boolean,
): Promise<MenuActionResult> {
  const { store } = await requireOwner();
  const id = idSchema.safeParse(productId);
  if (!id.success || typeof isAvailable !== "boolean") return { ok: false, error: "invalid" };

  const { count } = await prisma.product.updateMany({
    where: { id: id.data, storeId: store.id },
    data: { isAvailable },
  });
  if (count === 0) return { ok: false, error: "notFound" };
  menuChanged(store.slug);
  return { ok: true };
}

export async function reorderProducts(
  categoryId: string,
  ids: string[],
): Promise<MenuActionResult> {
  const { store } = await requireOwner();
  const category = idSchema.safeParse(categoryId);
  const parsed = idListSchema.safeParse(ids);
  if (!category.success || !parsed.success) return { ok: false, error: "invalid" };

  const owned = await prisma.product.count({
    where: { id: { in: parsed.data }, storeId: store.id, categoryId: category.data },
  });
  if (owned !== new Set(parsed.data).size) return { ok: false, error: "notFound" };

  await prisma.$transaction(
    parsed.data.map((id, sort) =>
      prisma.product.updateMany({ where: { id, storeId: store.id }, data: { sort } }),
    ),
  );
  menuChanged(store.slug);
  return { ok: true };
}

export async function deleteProduct(productId: string): Promise<MenuActionResult> {
  const { store } = await requireOwner();
  const id = idSchema.safeParse(productId);
  if (!id.success) return { ok: false, error: "invalid" };

  const product = await prisma.product.findFirst({
    where: { id: id.data, storeId: store.id },
    select: { imageUrl: true },
  });
  if (!product) return { ok: false, error: "notFound" };

  // Variantlar cascade bilan o'chadi. Eski buyurtmalarda nom/narx snapshot — ular buzilmaydi.
  await prisma.product.deleteMany({ where: { id: id.data, storeId: store.id } });
  await deleteMenuImage(store.id, product.imageUrl);
  updateTag(storeCacheTag(store.slug));
  return { ok: true };
}

/** Rasm yuklash. Taom saqlanganda imageUrl sifatida yuboriladi. */
export async function uploadProductImage(
  formData: FormData,
): Promise<MenuActionResult<{ url: string }>> {
  const { store, user } = await requireOwner();
  if (!(await rateLimit(RULES.uploadUser, user.id))) return { ok: false, error: "tooMany" };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "invalid" };

  try {
    return { ok: true, url: await uploadMenuImage(store.id, file) };
  } catch (e) {
    if (e instanceof MenuImageError) return { ok: false, error: e.code };
    console.error("uploadProductImage failed", e);
    return { ok: false, error: "server" };
  }
}

/** Yaratish (productId yo'q) yoki tahrirlash. Variant guruhlari id bo'yicha moslanadi — mijoz savatidagi variantlar saqlanib qoladi. */
export async function saveProduct(
  productId: string | null,
  input: ProductFormInput,
): Promise<MenuActionResult<{ productId: string }>> {
  const { store } = await requireOwner();

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  }
  const data = parsed.data;

  // Rasm faqat shu do'konning papkasidan
  const prefix = menuImagePrefix(store.id);
  if (data.imageUrl && (!prefix || !data.imageUrl.startsWith(prefix))) {
    return { ok: false, error: "invalid", fieldErrors: { imageUrl: "imageInvalid" } };
  }

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, storeId: store.id },
    select: { id: true },
  });
  if (!category)
    return { ok: false, error: "invalid", fieldErrors: { categoryId: "categoryRequired" } };

  const existing = productId
    ? await prisma.product.findFirst({
        where: { id: productId, storeId: store.id },
        select: {
          id: true,
          imageUrl: true,
          categoryId: true,
          optionGroups: { select: { id: true, options: { select: { id: true } } } },
        },
      })
    : null;
  if (productId && !existing) return { ok: false, error: "notFound" };

  // Klientdan kelgan dbId lar shu taomga tegishli ekanini tekshiramiz
  const groupIds = new Set(existing?.optionGroups.map((g) => g.id));
  for (const g of data.optionGroups) {
    if (g.dbId && !groupIds.has(g.dbId)) return { ok: false, error: "invalid" };
    const optionIds = new Set(
      existing?.optionGroups.find((eg) => eg.id === g.dbId)?.options.map((o) => o.id),
    );
    for (const o of g.options) {
      if (o.dbId && !optionIds.has(o.dbId)) return { ok: false, error: "invalid" };
    }
  }

  const fields = {
    name: data.name,
    description: data.description,
    price: data.price,
    categoryId: category.id,
    isAvailable: data.isAvailable,
    imageUrl: data.imageUrl,
  };

  try {
    const savedId = await prisma.$transaction(
      async (tx) => {
        let id: string;
        if (existing) {
          id = existing.id;
          const movedCategory = existing.categoryId !== category.id;
          const sort = movedCategory
            ? ((
                await tx.product.aggregate({
                  where: { categoryId: category.id },
                  _max: { sort: true },
                })
              )._max.sort ?? -1) + 1
            : undefined;
          await tx.product.update({
            where: { id },
            data: { ...fields, ...(sort !== undefined && { sort }) },
          });
        } else {
          const last = await tx.product.aggregate({
            where: { categoryId: category.id },
            _max: { sort: true },
          });
          id = (
            await tx.product.create({
              data: { ...fields, storeId: store.id, sort: (last._max.sort ?? -1) + 1 },
              select: { id: true },
            })
          ).id;
        }

        // Olib tashlangan guruhlar (variantlari cascade bilan)
        const keptGroups = data.optionGroups.map((g) => g.dbId).filter(Boolean) as string[];
        await tx.optionGroup.deleteMany({ where: { productId: id, id: { notIn: keptGroups } } });

        for (const [gSort, g] of data.optionGroups.entries()) {
          const groupFields = {
            name: g.name,
            required: g.required,
            maxSelect: g.maxSelect,
            sort: gSort,
          };
          const groupId = g.dbId
            ? (
                await tx.optionGroup.update({
                  where: { id: g.dbId },
                  data: groupFields,
                  select: { id: true },
                })
              ).id
            : (
                await tx.optionGroup.create({
                  data: { ...groupFields, productId: id },
                  select: { id: true },
                })
              ).id;

          const keptOptions = g.options.map((o) => o.dbId).filter(Boolean) as string[];
          await tx.option.deleteMany({ where: { groupId, id: { notIn: keptOptions } } });
          for (const [oSort, o] of g.options.entries()) {
            const optionFields = { name: o.name, price: o.price, sort: oSort };
            if (o.dbId) await tx.option.update({ where: { id: o.dbId }, data: optionFields });
            else await tx.option.create({ data: { ...optionFields, groupId } });
          }
        }
        return id;
      },
      // Baza uzoqda bo'lsa (lokal dev) ko'p so'rovli tranzaksiya 5 soniyadan oshishi mumkin
      { timeout: 30_000, maxWait: 10_000 },
    );

    if (existing?.imageUrl && existing.imageUrl !== data.imageUrl) {
      await deleteMenuImage(store.id, existing.imageUrl);
    }
    updateTag(storeCacheTag(store.slug));
    return { ok: true, productId: savedId };
  } catch (e) {
    console.error("saveProduct failed", e);
    return { ok: false, error: "server" };
  }
}
