import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/db";
import type { StorefrontData } from "@/lib/menu-types";

/** Admin menyu/do'konni o'zgartirganda: revalidateTag(storeCacheTag(slug)) */
export function storeCacheTag(slug: string) {
  return `store:${slug}`;
}

/**
 * Mijoz sahifasi uchun do'kon va menyu. Faqat faol kategoriyalar va mavjud taomlar.
 * Topilmasa null (notFound() ni chaqiruvchi qiladi).
 */
export async function getStorefront(slug: string): Promise<StorefrontData | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(storeCacheTag(slug));

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      phone: true,
      address: true,
      openTime: true,
      closeTime: true,
      isOpen: true,
      minOrder: true,
    },
  });
  if (!store) return null;

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { storeId: store.id, isAvailable: true, category: { isActive: true } },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        optionGroups: {
          orderBy: { sort: "asc" },
          select: {
            id: true,
            name: true,
            required: true,
            maxSelect: true,
            options: {
              orderBy: { sort: "asc" },
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    }),
  ]);

  return {
    store,
    categories: categories
      .map((c) => ({
        ...c,
        products: products
          .filter((p) => p.categoryId === c.id)
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            imageUrl: p.imageUrl,
            // Variantsiz guruhlar mijozga ko'rsatilmaydi
            optionGroups: p.optionGroups.filter((g) => g.options.length > 0),
          })),
      }))
      .filter((c) => c.products.length > 0),
  };
}
