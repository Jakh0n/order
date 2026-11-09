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
  slug: string;
  channel: Channel;
  telegramUsername: string | null;
  whatsappNumber: string | null;
}

/** Ready-made message link for the store's channel; null when the contact isn't set up. */
/** origin — getRequestOrigin() (xabardagi buyurtma havolasi localhost bo'lib qolmasligi uchun) */
export function orderSendLink(
  order: OrderMessageOrder & { lang: string },
  store: SendStore,
  origin: string,
): { channel: Channel; href: string } | null {
  const lang = isLocale(order.lang) ? order.lang : "en";

  if (store.channel === "WHATSAPP" && store.whatsappNumber) {
    const text = buildOrderMessage(order, store, lang, origin, "WHATSAPP");
    return { channel: "WHATSAPP", href: whatsappLink(store.whatsappNumber, text) };
  }
  if (store.channel === "TELEGRAM" && store.telegramUsername) {
    const text = buildOrderMessage(order, store, lang, origin, "TELEGRAM");
    return { channel: "TELEGRAM", href: telegramLink(store.telegramUsername, text) };
  }
  return null;
}
