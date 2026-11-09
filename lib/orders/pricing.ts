// Buyurtma qatorlarini BAZADAGI narxlar bo'yicha hisoblash. Sof funksiya — test qilish oson.

export interface PricingProduct {
  id: string;
  name: string;
  price: number;
  optionGroups: {
    id: string;
    name: string;
    required: boolean;
    maxSelect: number;
    options: { id: string; name: string; price: number }[];
  }[];
}

export interface PricingItem {
  productId: string;
  quantity: number;
  optionIds: string[];
}

/** OrderItem.options snapshot (type — Prisma Json bilan mos bo'lishi uchun interface emas) */
export type OrderOptionSnapshot = {
  /** Option id (for "Order again"; missing on older orders — matched by group + name) */
  id: string;
  group: string;
  name: string;
  price: number;
};

export interface PricedLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  options: OrderOptionSnapshot[];
  lineTotal: number;
}

export type PricingResult =
  | { ok: true; lines: PricedLine[]; subtotal: number }
  | { ok: false; error: "unavailable" | "invalidOptions" };

/**
 * `products` — faqat shu do'konning, mavjud (isAvailable) taomlari.
 * Ro'yxatda yo'q taom => "unavailable".
 */
export function priceItems(products: PricingProduct[], items: PricingItem[]): PricingResult {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: PricedLine[] = [];

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) return { ok: false, error: "unavailable" };

    const optionIds = new Set(item.optionIds);
    if (optionIds.size !== item.optionIds.length) return { ok: false, error: "invalidOptions" };

    const snapshot: OrderOptionSnapshot[] = [];
    let matched = 0;
    for (const group of product.optionGroups) {
      // Bo'sh guruh mijozga ko'rsatilmaydi (getStorefront), shuning uchun talab ham qilinmaydi
      if (group.options.length === 0) continue;
      const chosen = group.options.filter((o) => optionIds.has(o.id));
      if (group.required && chosen.length === 0) return { ok: false, error: "invalidOptions" };
      if (chosen.length > Math.max(1, group.maxSelect)) {
        return { ok: false, error: "invalidOptions" };
      }
      matched += chosen.length;
      snapshot.push(
        ...chosen.map((o) => ({ id: o.id, group: group.name, name: o.name, price: o.price })),
      );
    }
    // Boshqa taomning yoki o'chirilgan variant
    if (matched !== optionIds.size) return { ok: false, error: "invalidOptions" };

    const unitPrice = product.price + snapshot.reduce((sum, o) => sum + o.price, 0);
    if (unitPrice < 0) return { ok: false, error: "invalidOptions" };

    lines.push({
      productId: product.id,
      name: product.name,
      unitPrice,
      quantity: item.quantity,
      options: snapshot,
      lineTotal: unitPrice * item.quantity,
    });
  }

  return { ok: true, lines, subtotal: lines.reduce((sum, l) => sum + l.lineTotal, 0) };
}
