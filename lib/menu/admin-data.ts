import "server-only";

import { JOIN, prisma } from "@/lib/db";

/** Admin menyusi: hamma kategoriya va taomlar (nofaol / "bugun yo'q" ham). Keshlanmaydi. */
export async function getAdminMenu(storeId: string) {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { storeId },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
    prisma.product.findMany({
      where: { storeId },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: {
        id: true,
        categoryId: true,
        name: true,
        price: true,
        imageUrl: true,
        isAvailable: true,
        _count: { select: { optionGroups: true } },
      },
    }),
  ]);

  return categories.map((c) => ({
    ...c,
    products: products
      .filter((p) => p.categoryId === c.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl,
        isAvailable: p.isAvailable,
        optionGroupCount: p._count.optionGroups,
      })),
  }));
}

export type AdminMenuCategory = Awaited<ReturnType<typeof getAdminMenu>>[number];
export type AdminMenuProduct = AdminMenuCategory["products"][number];

export async function getAdminCategories(storeId: string) {
  return prisma.category.findMany({
    where: { storeId },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

/** Tahrirlash formasi uchun (faqat shu do'konniki) */
export async function getAdminProduct(storeId: string, productId: string) {
  return prisma.product.findFirst({
    ...JOIN,
    where: { id: productId, storeId },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      categoryId: true,
      isAvailable: true,
      imageUrl: true,
      optionGroups: {
        orderBy: { sort: "asc" },
        select: {
          id: true,
          name: true,
          required: true,
          maxSelect: true,
          options: { orderBy: { sort: "asc" }, select: { id: true, name: true, price: true } },
        },
      },
    },
  });
}
