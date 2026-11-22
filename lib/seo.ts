import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/db";
import type { StorefrontData } from "@/lib/menu-types";
import { toMajor } from "@/lib/money";
import { isAlwaysOpen, plainText } from "@/lib/seo-text";

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Product names to mention in the meta description — the first few, in menu order. */
export function topItemNames(data: StorefrontData, count = 4): string[] {
  return data.categories
    .flatMap((c) => c.products.filter((p) => p.isAvailable).map((p) => p.name))
    .slice(0, count);
}

/**
 * A few menu photos for the link preview collage and JSON-LD: one per category first
 * (variety — a section often shares one photo), then the rest in menu order.
 */
export function productImages(data: StorefrontData, count: number): string[] {
  const perCategory = data.categories
    .map((c) => c.products.find((p) => p.imageUrl)?.imageUrl)
    .filter((u): u is string => !!u);
  // Neighbouring sections often look alike (wrap / cheesy wrap): skip ahead for the third
  const spread = perCategory.length >= 5 ? [0, 1, 4, 2, 3].map((i) => perCategory[i]) : perCategory;
  const all = data.categories.flatMap((c) => c.products.map((p) => p.imageUrl));
  return [...new Set([...spread, ...perCategory, ...all])]
    .filter((u): u is string => !!u)
    .slice(0, count);
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
  // Logo, cover and a few dishes — search engines pick the best fit
  const images = [store.logoUrl, store.coverUrl, ...productImages(data, 3)].filter(
    (u): u is string => !!u,
  );
  const description = plainText(store.description);

  return {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    "@id": url,
    name: store.name,
    url,
    ...(images.length > 0 && { image: images }),
    ...(description && { description }),
    ...(store.phone && { telephone: store.phone }),
    ...(store.address && {
      address: { "@type": "PostalAddress", streetAddress: store.address },
    }),
    // No hours set = open around the clock (schema.org: 00:00–23:59 every day)
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ALL_DAYS,
      opens: isAlwaysOpen(store) ? "00:00" : store.openTime,
      closes: isAlwaysOpen(store) ? "23:59" : store.closeTime,
    },
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
