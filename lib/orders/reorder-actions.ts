"use server";

import { JOIN, prisma } from "@/lib/db";
import type { NewCartLine } from "@/lib/cart-store";
import { clientIp, rateLimit, RULES } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";

export type ReorderResult =
  | { ok: true; slug: string; lines: (NewCartLine & { quantity: number })[]; skipped: number }
  | { ok: false; error: "notFound" | "tooMany" | "server" };

type Snapshot = { id?: string; group?: string; name?: string };

/**
 * "Order again" from the order page (no login — the order id is the secret, like /o/[id]).
 * Matches the order's items against today's menu: sold-out / deleted items and changed
 * options are skipped. Prices come from the menu — the cart re-syncs them anyway.
 */
export async function getReorderLines(orderId: string): Promise<ReorderResult> {
  if (typeof orderId !== "string" || !/^[a-z0-9]{20,40}$/i.test(orderId)) {
    return { ok: false, error: "notFound" };
  }
  if (!(await rateLimit(RULES.reorderIp, await clientIp()))) return { ok: false, error: "tooMany" };

  try {
    const order = await prisma.order.findUnique({
      ...JOIN,
      where: { id: orderId },
      select: {
        storeId: true,
        store: { select: { slug: true } },
        items: {
          orderBy: { id: "asc" },
          select: { productId: true, quantity: true, options: true },
        },
      },
    });
    if (!order) return { ok: false, error: "notFound" };

    const productIds = order.items.flatMap((i) => (i.productId ? [i.productId] : []));
    const products = await prisma.product.findMany({
      ...JOIN,
      where: {
        id: { in: productIds },
        storeId: order.storeId,
        isAvailable: true,
        category: { isActive: true },
      },
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        optionGroups: {
          select: {
            id: true,
            name: true,
            options: { select: { id: true, name: true, price: true } },
          },
        },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines: (NewCartLine & { quantity: number })[] = [];
    let skipped = 0;
    for (const item of order.items) {
      const product = item.productId ? byId.get(item.productId) : undefined;
      if (!product) {
        skipped++;
        continue;
      }
      const all = product.optionGroups.flatMap((g) =>
        g.options.map((o) => ({ ...o, groupId: g.id, groupName: g.name })),
      );
      const wanted = (Array.isArray(item.options) ? item.options : []) as Snapshot[];
      const options = wanted.map((w) =>
        all.find((o) => (w.id ? o.id === w.id : o.groupName === w.group && o.name === w.name)),
      );
      if (options.some((o) => !o)) {
        skipped++;
        continue;
      }
      lines.push({
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        basePrice: product.price,
        options: options.map((o) => ({
          id: o!.id,
          groupId: o!.groupId,
          name: o!.name,
          price: o!.price,
        })),
        quantity: item.quantity,
      });
    }
    return { ok: true, slug: order.store.slug, lines, skipped };
  } catch (e) {
    reportError(e, "getReorderLines");
    return { ok: false, error: "server" };
  }
}
