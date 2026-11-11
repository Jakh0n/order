import "server-only";

import { prisma } from "@/lib/db";

/** Admin promo list (this store only), newest first */
export function listPromos(storeId: string) {
  return prisma.promoCode.findMany({
    where: { storeId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
}

export type AdminPromo = Awaited<ReturnType<typeof listPromos>>[number];
