import "server-only";

import { Prisma } from "@prisma/client";

import { JOIN, prisma } from "@/lib/db";
import { type PricingItem, priceItems } from "@/lib/orders/pricing";

// Mijoz checkout'i va admin "qo'lda buyurtma" uchun umumiy qism:
// tuman -> bazadagi narxlar -> raqam berib saqlash.

export interface InsertOrderInput {
  storeId: string;
  customerName: string;
  customerPhone: string;
  type: "PICKUP" | "DELIVERY";
  zoneId?: string;
  address?: string;
  landmark?: string;
  scheduledFor?: string;
  comment?: string;
  paymentMethod: "CASH" | "CARD_ON_DELIVERY" | "TRANSFER";
  paymentStatus?: "UNPAID" | "PAID";
  lang: string;
  items: PricingItem[];
  /** null — tekshirilmaydi (admin) */
  minOrder: number | null;
}

export type InsertOrderResult =
  | { ok: true; orderId: string; number: number }
  | { ok: false; error: "zoneInvalid" | "unavailable" | "invalidOptions" | "minOrder" };

const MAX_NUMBER_RETRIES = 3;

export async function insertOrder(input: InsertOrderInput): Promise<InsertOrderResult> {
  // Tuman va bazadagi narxlar — parallel (bir-biriga bog'liq emas)
  const [zone, products] = await Promise.all([
    // Tuman narxi — faqat shu do'konning tumani
    input.type === "DELIVERY"
      ? prisma.deliveryZone.findFirst({ where: { id: input.zoneId, storeId: input.storeId } })
      : null,
    // Narxlar bazadan (klient narxiga ishonilmaydi)
    prisma.product.findMany({
      ...JOIN,
      where: {
        id: { in: [...new Set(input.items.map((i) => i.productId))] },
        storeId: input.storeId,
        isAvailable: true,
        category: { isActive: true },
      },
      select: {
        id: true,
        name: true,
        price: true,
        optionGroups: {
          select: {
            id: true,
            name: true,
            required: true,
            maxSelect: true,
            options: { select: { id: true, name: true, price: true } },
          },
        },
      },
    }),
  ]);

  if (input.type === "DELIVERY" && !zone) return { ok: false, error: "zoneInvalid" };
  const deliveryFee = zone?.fee ?? 0;
  const zoneName = zone?.name ?? null;

  const priced = priceItems(products, input.items);
  if (!priced.ok) return { ok: false, error: priced.error };

  // Minimal buyurtma (yetkazish narxisiz)
  if (input.minOrder !== null && priced.subtotal < input.minOrder) {
    return { ok: false, error: "minOrder" };
  }

  // Raqam berish va saqlash — tranzaksiya ichida, to'qnashuvda qayta urinish
  for (let attempt = 1; ; attempt++) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        const last = await tx.order.aggregate({
          where: { storeId: input.storeId },
          _max: { number: true },
        });
        return tx.order.create({
          data: {
            storeId: input.storeId,
            number: (last._max.number ?? 0) + 1,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            type: input.type,
            zoneName,
            address: input.type === "DELIVERY" ? input.address : null,
            landmark: input.type === "DELIVERY" ? input.landmark : null,
            scheduledFor: input.scheduledFor ?? null,
            comment: input.comment ?? null,
            paymentMethod: input.paymentMethod,
            paymentStatus: input.paymentStatus ?? "UNPAID",
            subtotal: priced.subtotal,
            deliveryFee,
            total: priced.subtotal + deliveryFee,
            lang: input.lang,
            // Bitta INSERT bilan (har bir taom uchun alohida emas)
            items: {
              createMany: {
                data: priced.lines.map((l) => ({
                  productId: l.productId,
                  name: l.name,
                  unitPrice: l.unitPrice,
                  quantity: l.quantity,
                  options: l.options.length ? l.options : Prisma.JsonNull,
                  lineTotal: l.lineTotal,
                })),
              },
            },
          },
          select: { id: true, number: true },
        });
      });
      return { ok: true, orderId: order.id, number: order.number };
    } catch (e) {
      const duplicateNumber =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!duplicateNumber || attempt >= MAX_NUMBER_RETRIES) throw e;
    }
  }
}
