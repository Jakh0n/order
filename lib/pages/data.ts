import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/db";
import { storeCacheTag } from "@/lib/storefront";

/** Public page /{store}/p/{page} — published only, not for blocked stores */
export async function getPublishedPage(storeSlug: string, pageSlug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(storeCacheTag(storeSlug));
  return prisma.storePage.findFirst({
    where: {
      slug: pageSlug,
      isPublished: true,
      store: { slug: storeSlug, isBlocked: false },
    },
    select: { title: true, body: true, updatedAt: true },
  });
}

/** Admin list (this store only) */
export function listPages(storeId: string) {
  return prisma.storePage.findMany({
    where: { storeId },
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, title: true, body: true, isPublished: true, updatedAt: true },
  });
}
