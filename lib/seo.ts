import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/db";
import type { StorefrontData } from "@/lib/menu-types";
import { toMajor } from "@/lib/money";

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Product names to mention in the meta description — the first few, in menu order. */
export function topItemNames(data: StorefrontData, count = 4): string[] {
  return data.categories.flatMap((c) => c.products.map((p) => p.name)).slice(0, count);
}

/** First menu photo — used when the store has no logo. */
export function firstProductImage(data: StorefrontData): string | null {
  for (const c of data.categories) {
    for (const p of c.products) if (p.imageUrl) return p.imageUrl;
  }
  return null;
}

/**
 * schema.org FoodEstablishment with the full menu — lets search engines show the
 * store, its hours and dishes with prices. FoodEstablishment covers cafés, bakeries
 * and restaurants alike.
 */
export function storeJsonLd(data: StorefrontData, origin: string) {
  const { store, categories } = data;
  const url = `${origin}/${store.slug}`;
  const image = store.logoUrl ?? firstProductImage(data);

  return {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    "@id": url,
    name: store.name,
    url,
    ...(image && { image }),
    ...(store.phone && { telephone: store.phone }),
    ...(store.address && {
      address: { "@type": "PostalAddress", streetAddress: store.address },
    }),
    ...(store.openTime &&
      store.closeTime && {
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ALL_DAYS,
          opens: store.openTime,
          closes: store.closeTime,
        },
      }),
    currenciesAccepted: store.currency,
    hasMenu: {
      "@type": "Menu",
      url,
      hasMenuSection: categories.map((c) => ({
        "@type": "MenuSection",
        name: c.name,
        hasMenuItem: c.products.map((p) => ({
          "@type": "MenuItem",
          name: p.name,
          ...(p.description && { description: p.description }),
          ...(p.imageUrl && { image: p.imageUrl }),
          offers: {
            "@type": "Offer",
            price: toMajor(p.price, store.currency),
            priceCurrency: store.currency,
          },
        })),
      })),
    },
  };
}

/** Stores worth indexing: not blocked and with at least one dish on the menu. */
export async function getSitemapStores() {
  "use cache";
  cacheLife("hours");
  cacheTag("sitemap");

  const stores = await prisma.store.findMany({
    where: { isBlocked: false, products: { some: { isAvailable: true } } },
    select: {
      slug: true,
      updatedAt: true,
      products: {
        where: { isAvailable: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { updatedAt: true },
      },
    },
  });

  return stores.map((s) => {
    const productUpdated = s.products[0]?.updatedAt;
    const lastModified =
      productUpdated && productUpdated > s.updatedAt ? productUpdated : s.updatedAt;
    return { slug: s.slug, lastModified };
  });
}
