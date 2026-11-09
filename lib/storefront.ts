import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { JOIN, prisma } from "@/lib/db";
import type { CheckoutSettings, PaymentMethodValue, StorefrontData } from "@/lib/menu-types";

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

  // Uchalasi parallel: do'kon id sini kutmasdan, slug bo'yicha (bazaga bir marta borish)
  const [store, categories, products] = await Promise.all([
    prisma.store.findUnique({
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
        currency: true,
        timeZone: true,
        isBlocked: true,
      },
    }),
    prisma.category.findMany({
      where: { store: { slug }, isActive: true },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      ...JOIN,
      where: { store: { slug }, isAvailable: true, category: { isActive: true } },
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
  if (!store) return null;

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

/** Checkout uchun: qabul qilish usullari, to'lov usullari, tumanlar. */
export async function getCheckoutSettings(slug: string): Promise<CheckoutSettings | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(storeCacheTag(slug));

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      pickupEnabled: true,
      deliveryEnabled: true,
      acceptCash: true,
      acceptCardOnDelivery: true,
      acceptTransfer: true,
      transferDetails: true,
      deliveryFee: true,
    },
  });
  if (!store) return null;

  const paymentMethods: PaymentMethodValue[] = [];
  if (store.acceptCash) paymentMethods.push("CASH");
  if (store.acceptCardOnDelivery) paymentMethods.push("CARD_ON_DELIVERY");
  if (store.acceptTransfer) paymentMethods.push("TRANSFER");

  return {
    pickupEnabled: store.pickupEnabled,
    // Tuman bo'lmasa yetkazib berishni tanlab bo'lmaydi
    deliveryEnabled: store.deliveryEnabled,
    paymentMethods,
    transferDetails: store.transferDetails,
    deliveryFee: store.deliveryFee,
  };
}
