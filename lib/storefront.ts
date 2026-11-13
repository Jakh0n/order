import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { JOIN, prisma } from "@/lib/db";
import { distancePricingOf } from "@/lib/delivery-distance";
import { asEmailMode } from "@/lib/orders/promo";
import { isPro } from "@/lib/plan";
import { parseNavLinks, parsePinned } from "@/lib/nav";
import { getReviewSummary } from "@/lib/reviews/data";
import { parsePopup } from "@/lib/popup";
import { parseSections } from "@/lib/sections";
import type { CheckoutSettings, PaymentMethodValue, StorefrontData } from "@/lib/menu-types";

/** Admin menyu/do'konni o'zgartirganda: revalidateTag(storeCacheTag(slug)) */
export function storeCacheTag(slug: string) {
  return `store:${slug}`;
}

/** Store page default language (null if the store doesn't exist). Used by i18n/request.ts. */
export async function getStoreLocale(slug: string): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(storeCacheTag(slug));
  const store = await prisma.store.findUnique({ where: { slug }, select: { locale: true } });
  return store?.locale ?? null;
}

/**
 * Mijoz sahifasi uchun do'kon va menyu. Faqat faol kategoriyalar; tugagan taomlar isAvailable=false bilan.
 * Topilmasa null (notFound() ni chaqiruvchi qiladi).
 */
export async function getStorefront(slug: string): Promise<StorefrontData | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(storeCacheTag(slug));

  // Uchalasi parallel: do'kon id sini kutmasdan, slug bo'yicha (bazaga bir marta borish)
  const [store, categories, products, reviews] = await Promise.all([
    prisma.store.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        coverUrl: true,
        description: true,
        announcement: true,
        brandColor: true,
        pageBackground: true,
        menuLayout: true,
        fontStyle: true,
        cornerStyle: true,
        headerStyle: true,
        showSearch: true,
        showDescriptions: true,
        sections: true,
        popup: true,
        navLinks: true,
        pinnedCategoryIds: true,
        instagram: true,
        telegramChannel: true,
        tiktok: true,
        phone: true,
        address: true,
        openTime: true,
        closeTime: true,
        isOpen: true,
        minOrder: true,
        currency: true,
        timeZone: true,
        isBlocked: true,
        deliveryEnabled: true,
        deliveryFee: true,
        dineInEnabled: true,
        tableCount: true,
        freeDeliveryFrom: true,
        plan: true,
        paidUntil: true,
      },
    }),
    prisma.category.findMany({
      where: { store: { slug }, isActive: true },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      ...JOIN,
      // Sold-out items are shown greyed out ("Sold out today"), not hidden
      where: { store: { slug }, category: { isActive: true } },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        isAvailable: true,
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
    getReviewSummary(slug),
  ]);
  if (!store) return null;

  // Plan is resolved here (cached for minutes): Pro-only settings are dropped on Free
  const { plan, paidUntil, ...rest } = store;
  const pro = isPro({ plan, paidUntil });
  return {
    store: {
      ...rest,
      sections: parseSections(rest.sections),
      popup: parsePopup(rest.popup),
      navLinks: parseNavLinks(rest.navLinks),
      pinnedCategoryIds: parsePinned(rest.pinnedCategoryIds),
      freeDeliveryFrom: pro ? store.freeDeliveryFrom : null,
      showBranding: !pro,
      rating: { average: reviews.average, count: reviews.count },
    },
    reviews: reviews.recent,
    categories: categories
      .map((c) => ({
        ...c,
        products: products
          .filter((p) => p.categoryId === c.id)
          // Sold out at the end of the category (stable sort keeps the menu order)
          .sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable))
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            imageUrl: p.imageUrl,
            isAvailable: p.isAvailable,
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
      freeDeliveryFrom: true,
      deliveryByDistance: true,
      deliveryTiers: true,
      latitude: true,
      longitude: true,
      plan: true,
      paidUntil: true,
      checkoutEmail: true,
      checkoutNote: true,
      checkoutPromo: true,
      tipsEnabled: true,
      _count: { select: { promoCodes: { where: { isActive: true } } } },
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
    // Pro-only on Free: no free-delivery threshold, no promo field
    freeDeliveryFrom: isPro(store) ? store.freeDeliveryFrom : null,
    distance: distancePricingOf(store, isPro(store)),
    hasPromoCodes: isPro(store) && store.checkoutPromo && store._count.promoCodes > 0,
    emailField: asEmailMode(store.checkoutEmail),
    showNote: store.checkoutNote,
    tipsEnabled: store.tipsEnabled,
  };
}

/** Meta Pixel ID for the store pages — only on Pro and only for an open (not blocked) store */
export async function getStorePixel(slug: string): Promise<string | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(storeCacheTag(slug));
  const store = await prisma.store.findUnique({
    where: { slug },
    select: { metaPixelId: true, plan: true, paidUntil: true, isBlocked: true },
  });
  if (!store?.metaPixelId || store.isBlocked || !isPro(store)) return null;
  return store.metaPixelId;
}
