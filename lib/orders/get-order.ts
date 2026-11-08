import "server-only";

import { prisma } from "@/lib/db";

/** Mijoz buyurtma sahifasi uchun. Keshlanmaydi — holat o'zgarib turadi. */
export async function getOrderForCustomer(id: string) {
  if (!/^[a-z0-9]{20,40}$/i.test(id)) return null;

  return prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: "asc" } },
      store: {
        select: {
          slug: true,
          name: true,
          phone: true,
          channel: true,
          telegramUsername: true,
          whatsappNumber: true,
          transferDetails: true,
        },
      },
    },
  });
}

export type CustomerOrder = NonNullable<Awaited<ReturnType<typeof getOrderForCustomer>>>;
