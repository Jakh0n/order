import type { Channel } from "@prisma/client";

import { isLocale } from "@/i18n/config";
import {
  buildOrderMessage,
  type OrderMessageOrder,
  telegramLink,
  whatsappLink,
} from "@/lib/order-message";

interface SendStore {
  name: string;
  channel: Channel;
  telegramUsername: string | null;
  whatsappNumber: string | null;
}

/** Do'kon kanaliga qarab tayyor xabarli havola. Kontakt sozlanmagan bo'lsa null. */
export function orderSendLink(
  order: OrderMessageOrder & { lang: string },
  store: SendStore,
): { channel: Channel; href: string } | null {
  const text = buildOrderMessage(order, store, isLocale(order.lang) ? order.lang : "uz");

  if (store.channel === "WHATSAPP" && store.whatsappNumber) {
    return { channel: "WHATSAPP", href: whatsappLink(store.whatsappNumber, text) };
  }
  if (store.channel === "TELEGRAM" && store.telegramUsername) {
    return { channel: "TELEGRAM", href: telegramLink(store.telegramUsername, text) };
  }
  return null;
}
