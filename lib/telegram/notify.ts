import "server-only";

import type { OrderStatus, Prisma } from "@prisma/client";

import { isLocale, type Locale } from "@/i18n/config";
import { siteOrigin } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { buildOrderMessage } from "@/lib/order-message";
import { nextStatus } from "@/lib/orders/status";
import { reportError } from "@/lib/report-error";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";

import {
  botEnabled,
  type InlineKeyboard,
  isGoneError,
  isNotModified,
  tg,
  TelegramError,
} from "./api";

const dictionaries: Record<Locale, typeof en> = { en, ru, uz };

export function dictFor(locale: string) {
  return dictionaries[isLocale(locale) ? locale : "en"];
}

/** Everything the group card needs (one query, JOIN) */
export const cardOrderSelect = {
  id: true,
  number: true,
  status: true,
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  type: true,
  tableNumber: true,
  zoneName: true,
  address: true,
  landmark: true,
  latitude: true,
  longitude: true,
  scheduledFor: true,
  comment: true,
  paymentMethod: true,
  paymentStatus: true,
  receiptPath: true,
  subtotal: true,
  discount: true,
  promoCode: true,
  tip: true,
  deliveryFee: true,
  total: true,
  currency: true,
  telegramMessageId: true,
  items: {
    select: { name: true, quantity: true, lineTotal: true, options: true },
    orderBy: { id: "asc" },
  },
  store: {
    select: { id: true, name: true, slug: true, locale: true, telegramChatId: true },
  },
} satisfies Prisma.OrderSelect;

export type CardOrder = Prisma.OrderGetPayload<{ select: typeof cardOrderSelect }>;

const STATUS_ICON: Record<OrderStatus, string> = {
  NEW: "🆕",
  ACCEPTED: "✅",
  READY: "🍽",
  ON_THE_WAY: "🚚",
  COMPLETED: "🏁",
  CANCELLED: "❌",
};

/** Public https origin for links in the card; Telegram rejects localhost / http button URLs */
function publicOrigin(): string | undefined {
  const origin = siteOrigin();
  return origin.startsWith("https://") ? origin : undefined;
}

/** Card text: status line (+ who changed it) and the same order text the customer sends */
export function cardText(order: CardOrder, by?: string): string {
  const d = dictFor(order.store.locale);
  const status = `${STATUS_ICON[order.status]} ${d.status[order.status]}${by ? ` · ${by}` : ""}`;
  const body = buildOrderMessage(
    order,
    { name: order.store.name, slug: order.store.slug },
    isLocale(order.store.locale) ? order.store.locale : "en",
    publicOrigin(),
    "PLAIN",
  );
  // Telegram's limit is 4096 characters
  return `${status}\n\n${body}`.slice(0, 4000);
}

function nextLabel(next: OrderStatus, locale: string): string {
  const t = dictFor(locale).adminOrders;
  if (next === "ACCEPTED") return `✅ ${t.accept}`;
  if (next === "READY") return `🍽 ${t.ready}`;
  if (next === "ON_THE_WAY") return `🚚 ${t.onTheWay}`;
  return `🏁 ${t.complete}`;
}

/** Buttons for the current status; `confirmCancel` swaps them for "Yes, cancel / Back" */
export function cardKeyboard(order: CardOrder, confirmCancel = false): InlineKeyboard {
  const d = dictFor(order.store.locale);
  const rows: InlineKeyboard = [];
  if (confirmCancel) {
    rows.push([
      { text: `❌ ${d.telegramBot.cancelYes}`, callback_data: `st:${order.id}:CANCELLED` },
      { text: d.telegramBot.back, callback_data: `back:${order.id}` },
    ]);
    return rows;
  }
  const next = nextStatus(order.status, order.type);
  if (next) {
    rows.push([
      { text: nextLabel(next, order.store.locale), callback_data: `st:${order.id}:${next}` },
      { text: d.adminOrders.cancel, callback_data: `ask:${order.id}` },
    ]);
  }
  const origin = publicOrigin();
  if (origin) rows.push([{ text: d.telegramBot.open, url: `${origin}/admin/orders` }]);
  return rows;
}

/** Drop the group link when the bot can no longer post there */
export async function forgetChat(chatId: string) {
  await prisma.store.updateMany({
    where: { telegramChatId: chatId },
    data: { telegramChatId: null, telegramChatTitle: null },
  });
}

/** A group upgraded to a supergroup gets a new id */
export async function moveChat(from: string, to: string) {
  await prisma.store.updateMany({ where: { telegramChatId: from }, data: { telegramChatId: to } });
}

/** sendMessage that follows a supergroup migration once */
export async function sendToChat(
  chatId: string,
  text: string,
  keyboard?: InlineKeyboard,
): Promise<number> {
  const send = (id: string) =>
    tg<{ message_id: number }>("sendMessage", {
      chat_id: id,
      text,
      link_preview_options: { is_disabled: true },
      ...(keyboard?.length ? { reply_markup: { inline_keyboard: keyboard } } : {}),
    });
  try {
    return (await send(chatId)).message_id;
  } catch (e) {
    if (e instanceof TelegramError && e.migrateToChatId) {
      const to = String(e.migrateToChatId);
      await moveChat(chatId, to);
      return (await send(to)).message_id;
    }
    if (isGoneError(e)) await forgetChat(chatId);
    throw e;
  }
}

/**
 * New order → the store's staff group. Runs after the response (`after()` in createOrder),
 * so Telegram being slow or down never affects checkout.
 */
export async function sendOrderToGroup(orderId: string): Promise<void> {
  if (!botEnabled()) return;
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: cardOrderSelect });
    const chatId = order?.store.telegramChatId;
    if (!order || !chatId) return;
    const messageId = await sendToChat(chatId, cardText(order), cardKeyboard(order));
    await prisma.order.update({ where: { id: order.id }, data: { telegramMessageId: messageId } });
  } catch (e) {
    if (!isGoneError(e)) reportError(e, "telegram.sendOrder");
  }
}

/** Status changed (admin panel or a group button) → update the card in the group */
export async function syncOrderCard(orderId: string, by?: string): Promise<void> {
  if (!botEnabled()) return;
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: cardOrderSelect });
    const chatId = order?.store.telegramChatId;
    if (!order || !chatId || !order.telegramMessageId) return;
    await editCard(chatId, order.telegramMessageId, order, by);
  } catch (e) {
    if (!isGoneError(e)) reportError(e, "telegram.syncOrder");
  }
}

export async function editCard(chatId: string, messageId: number, order: CardOrder, by?: string) {
  try {
    await tg("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: cardText(order, by),
      link_preview_options: { is_disabled: true },
      reply_markup: { inline_keyboard: cardKeyboard(order) },
    });
  } catch (e) {
    if (isNotModified(e)) return;
    if (isGoneError(e)) await forgetChat(chatId);
    throw e;
  }
}
