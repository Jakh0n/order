"use server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { priceItems } from "@/lib/orders/pricing";
import { isStoreOpenNow } from "@/lib/store-hours";
import { checkoutSchema, type CheckoutInput } from "@/lib/validators";

export type CreateOrderError =
  | "invalid"
  | "storeNotFound"
  | "closed"
  | "typeUnavailable"
  | "paymentUnavailable"
  | "zoneInvalid"
  | "unavailable"
  | "invalidOptions"
  | "minOrder"
  | "server";

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | {
      ok: false;
      error: CreateOrderError;
      /** maydon -> "checkout.errors.*" kaliti */
      fieldErrors?: Record<string, string>;
      minOrder?: number;
    };

const MAX_NUMBER_RETRIES = 3;

export async function createOrder(input: CheckoutInput): Promise<CreateOrderResult> {
  // 1. Validatsiya
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "invalid", fieldErrors };
  }
  const data = parsed.data;

  try {
    // 2. Do'kon va uning qoidalari
    const store = await prisma.store.findUnique({ where: { slug: data.storeSlug } });
    if (!store) return { ok: false, error: "storeNotFound" };
    if (!isStoreOpenNow(store)) return { ok: false, error: "closed" };

    if (data.type === "PICKUP" && !store.pickupEnabled) {
      return { ok: false, error: "typeUnavailable" };
    }
    if (data.type === "DELIVERY" && !store.deliveryEnabled) {
      return { ok: false, error: "typeUnavailable" };
    }

    const paymentAllowed = {
      CASH: store.acceptCash,
      CARD_ON_DELIVERY: store.acceptCardOnDelivery,
      TRANSFER: store.acceptTransfer,
    }[data.paymentMethod];
    if (!paymentAllowed) return { ok: false, error: "paymentUnavailable" };

    // 3. Tuman narxi — faqat shu do'konning tumani
    let deliveryFee = 0;
    let zoneName: string | null = null;
    if (data.type === "DELIVERY") {
      const zone = await prisma.deliveryZone.findFirst({
        where: { id: data.zoneId, storeId: store.id },
      });
      if (!zone) return { ok: false, error: "zoneInvalid" };
      deliveryFee = zone.fee;
      zoneName = zone.name;
    }

    // 4. Narxlar bazadan (klient narxiga ishonilmaydi)
    const products = await prisma.product.findMany({
      where: {
        id: { in: [...new Set(data.items.map((i) => i.productId))] },
        storeId: store.id,
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

    const priced = priceItems(products, data.items);
    if (!priced.ok) return { ok: false, error: priced.error };

    // 5. Minimal buyurtma (yetkazish narxisiz)
    if (priced.subtotal < store.minOrder) {
      return { ok: false, error: "minOrder", minOrder: store.minOrder };
    }

    // 6. Raqam berish va saqlash — tranzaksiya ichida, to'qnashuvda qayta urinish
    for (let attempt = 1; ; attempt++) {
      try {
        const order = await prisma.$transaction(async (tx) => {
          const last = await tx.order.aggregate({
            where: { storeId: store.id },
            _max: { number: true },
          });
          return tx.order.create({
            data: {
              storeId: store.id,
              number: (last._max.number ?? 0) + 1,
              customerName: data.customerName,
              customerPhone: data.customerPhone,
              type: data.type,
              zoneName,
              address: data.type === "DELIVERY" ? data.address : null,
              landmark: data.type === "DELIVERY" ? data.landmark : null,
              scheduledFor: data.scheduledFor ?? null,
              comment: data.comment ?? null,
              paymentMethod: data.paymentMethod,
              subtotal: priced.subtotal,
              deliveryFee,
              total: priced.subtotal + deliveryFee,
              lang: data.lang,
              items: {
                create: priced.lines.map((l) => ({
                  productId: l.productId,
                  name: l.name,
                  unitPrice: l.unitPrice,
                  quantity: l.quantity,
                  options: l.options.length ? l.options : Prisma.JsonNull,
                  lineTotal: l.lineTotal,
                })),
              },
            },
            select: { id: true },
          });
        });
        return { ok: true, orderId: order.id };
      } catch (e) {
        const duplicateNumber =
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
        if (!duplicateNumber || attempt >= MAX_NUMBER_RETRIES) throw e;
      }
    }
  } catch (e) {
    console.error("createOrder failed", e);
    return { ok: false, error: "server" };
  }
}
