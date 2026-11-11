import "server-only";

import { Prisma } from "@prisma/client";

import { JOIN, prisma } from "@/lib/db";
import { type PricingItem, priceItems } from "@/lib/orders/pricing";
import { deliveryFeeFor, type PromoProblem, promoDiscount, promoProblem } from "@/lib/orders/promo";

// Mijoz checkout'i va admin "qo'lda buyurtma" uchun umumiy qism:
// tuman -> bazadagi narxlar -> raqam berib saqlash.

export interface InsertOrderInput {
  storeId: string;
  /** Store currency at order time (snapshot on the order) */
  currency: string;
  customerName: string;
  customerPhone: string;
  type: "PICKUP" | "DELIVERY" | "DINE_IN";
  /** DINE_IN only */
  tableNumber?: number;
  /** Store's flat delivery fee (minor units), applied to DELIVERY orders */
  deliveryFee: number;
  /** Free delivery from this items subtotal (null = off) */
  freeDeliveryFrom?: number | null;
  /** Customer-entered promo code (normalized); checked and counted here */
  promoCode?: string;
  latitude?: number;
  longitude?: number;
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
  | { ok: false; error: "unavailable" | "invalidOptions" | "minOrder" | PromoProblem };

/** Thrown inside the transaction when the code was used up by a parallel order */
class PromoUsedUpError extends Error {}

const MAX_NUMBER_RETRIES = 3;

export async function insertOrder(input: InsertOrderInput): Promise<InsertOrderResult> {
  // Prices from the database (client prices are never trusted)
  const products = await prisma.product.findMany({
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
  });

  // Both coordinates or neither
  const hasLocation =
    input.type === "DELIVERY" && input.latitude !== undefined && input.longitude !== undefined;

  const priced = priceItems(products, input.items);
  if (!priced.ok) return { ok: false, error: priced.error };

  // Minimal buyurtma (yetkazish narxisiz)
  if (input.minOrder !== null && priced.subtotal < input.minOrder) {
    return { ok: false, error: "minOrder" };
  }

  const deliveryFee = deliveryFeeFor(
    input.type,
    priced.subtotal,
    input.deliveryFee,
    input.freeDeliveryFrom ?? null,
  );

  // Promo code: checked against the DB; the use is counted inside the transaction
  const promo = input.promoCode
    ? await prisma.promoCode.findUnique({
        where: { storeId_code: { storeId: input.storeId, code: input.promoCode } },
      })
    : null;
  if (input.promoCode) {
    const problem = promoProblem(promo, priced.subtotal);
    if (problem) return { ok: false, error: problem };
  }
  const discount = promo ? promoDiscount(promo, priced.subtotal) : 0;

  // Raqam berish va saqlash — tranzaksiya ichida, to'qnashuvda qayta urinish
  for (let attempt = 1; ; attempt++) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        if (promo) {
          // Atomic: a parallel order can't push the code past maxUses
          const counted = await tx.promoCode.updateMany({
            where: {
              id: promo.id,
              isActive: true,
              ...(promo.maxUses !== null && { usedCount: { lt: promo.maxUses } }),
            },
            data: { usedCount: { increment: 1 } },
          });
          if (counted.count === 0) throw new PromoUsedUpError();
        }
        const last = await tx.order.aggregate({
          where: { storeId: input.storeId },
          _max: { number: true },
        });
        return tx.order.create({
          data: {
            storeId: input.storeId,
            currency: input.currency,
            number: (last._max.number ?? 0) + 1,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            type: input.type,
            tableNumber: input.type === "DINE_IN" ? (input.tableNumber ?? null) : null,
            latitude: hasLocation ? input.latitude : null,
            longitude: hasLocation ? input.longitude : null,
            address: input.type === "DELIVERY" ? input.address : null,
            landmark: input.type === "DELIVERY" ? input.landmark : null,
            scheduledFor: input.scheduledFor ?? null,
            comment: input.comment ?? null,
            paymentMethod: input.paymentMethod,
            paymentStatus: input.paymentStatus ?? "UNPAID",
            subtotal: priced.subtotal,
            deliveryFee,
            promoCode: promo?.code ?? null,
            discount,
            total: priced.subtotal - discount + deliveryFee,
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
      if (e instanceof PromoUsedUpError) return { ok: false, error: "promoUsedUp" };
      const duplicateNumber =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!duplicateNumber || attempt >= MAX_NUMBER_RETRIES) throw e;
    }
  }
}
