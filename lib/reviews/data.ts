import "server-only";

import { prisma } from "@/lib/db";

export interface ReviewSummary {
  average: number;
  count: number;
  /** Latest visible reviews with a comment (store page section) */
  recent: { id: string; rating: number; comment: string; name: string; createdAt: Date }[];
}

/** Visible reviews only. Called inside the cached storefront read. */
export async function getReviewSummary(storeSlug: string): Promise<ReviewSummary> {
  const where = { store: { slug: storeSlug }, isHidden: false };
  const [agg, recent] = await Promise.all([
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: true }),
    prisma.review.findMany({
      where: { ...where, comment: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, rating: true, comment: true, customerName: true, createdAt: true },
    }),
  ]);
  return {
    average: Math.round((agg._avg.rating ?? 0) * 10) / 10,
    count: agg._count,
    recent: recent.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? "",
      name: r.customerName,
      createdAt: r.createdAt,
    })),
  };
}

/** Admin list (this store only) */
export function listReviews(storeId: string) {
  return prisma.review.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      rating: true,
      comment: true,
      customerName: true,
      isHidden: true,
      createdAt: true,
      order: { select: { id: true, number: true } },
    },
  });
}
