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

interface ContactStore {
  channel: Channel;
  telegramUsername: string | null;
  whatsappNumber: string | null;
  extraWhatsappNumbers: string[];
  extraTelegramUsernames: string[];
}

/**
 * Order rolling (Pro): the main contact of the store's channel, then the extra ones, without
 * duplicates. Orders take turns over this list (pickContact). Free: the main contact only.
 */
export function orderContacts(store: ContactStore, pro: boolean): string[] {
  const main = store.channel === "WHATSAPP" ? store.whatsappNumber : store.telegramUsername;
  if (!main) return [];
  const extras = !pro
    ? []
    : store.channel === "WHATSAPP"
      ? store.extraWhatsappNumbers
      : store.extraTelegramUsernames;
  return [...new Set([main, ...extras].filter(Boolean))];
}

/** 1st order → 1st contact, 2nd → 2nd, … then round again (even split, no counter needed) */
export function pickContact(contacts: string[], orderNumber: number): string | null {
  if (contacts.length === 0) return null;
  return contacts[(Math.max(orderNumber, 1) - 1) % contacts.length];
}

const PHONE_RE = /^\+[1-9]\d{6,14}$/;

/** Ready-made message link for the store's channel; null when the contact isn't set up. */
/** origin — getRequestOrigin() (xabardagi buyurtma havolasi localhost bo'lib qolmasligi uchun) */
export function orderSendLink(
  order: OrderMessageOrder & { lang: string; sentTo?: string | null },
  store: SendStore,
  origin: string,
): { channel: Channel; href: string } | null {
  const lang = isLocale(order.lang) ? order.lang : "en";

  // The contact picked when the order was placed (order rolling), if it fits the current channel
  const sentTo = order.sentTo ?? null;
  const isPhone = !!sentTo && PHONE_RE.test(sentTo);

  if (store.channel === "WHATSAPP" && store.whatsappNumber) {
    const text = buildOrderMessage(order, store, lang, origin, "WHATSAPP");
    const to = isPhone ? sentTo! : store.whatsappNumber;
    return { channel: "WHATSAPP", href: whatsappLink(to, text) };
  }
  if (store.channel === "TELEGRAM" && store.telegramUsername) {
    const text = buildOrderMessage(order, store, lang, origin, "TELEGRAM");
    const to = sentTo && !isPhone ? sentTo : store.telegramUsername;
    return { channel: "TELEGRAM", href: telegramLink(to, text) };
  }
  return null;
}
