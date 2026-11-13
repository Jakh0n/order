import { timingSafeEqual } from "node:crypto";

import { connection } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { canTransition } from "@/lib/orders/status";
import { reportError } from "@/lib/report-error";
import { botEnabled, tg, webhookSecret } from "@/lib/telegram/api";
import {
  cardKeyboard,
  cardOrderSelect,
  dictFor,
  editCard,
  forgetChat,
  moveChat,
  sendToChat,
} from "@/lib/telegram/notify";

/**
 * Telegram bot webhook (registered with `npm run telegram:webhook`).
 * Handles: linking a staff group (/start <token> from the "add to group" link),
 * order buttons in the group (Accept / Ready / … / Cancel), and the bot being removed.
 * Anyone in the linked group can press the buttons — the group is the store's staff.
 * Always answers 200 so Telegram doesn't retry the same update forever.
 */

type Chat = { id: number; type: string; title?: string };
type Update = {
  message?: {
    chat: Chat;
    text?: string;
    migrate_to_chat_id?: number;
  };
  my_chat_member?: { chat: Chat; new_chat_member: { status: string } };
  callback_query?: {
    id: string;
    from: { first_name?: string; last_name?: string; username?: string };
    data?: string;
    message?: { message_id: number; chat: Chat };
  };
};

const statusSchema = z.enum(["NEW", "ACCEPTED", "READY", "ON_THE_WAY", "COMPLETED", "CANCELLED"]);

function secretMatches(given: string | null): boolean {
  const expected = webhookSecret();
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  await connection();
  if (!botEnabled() || !secretMatches(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const update = (await request.json()) as Update;
    if (update.callback_query) await onButton(update.callback_query);
    else if (update.message) await onMessage(update.message);
    else if (update.my_chat_member) await onMembership(update.my_chat_member);
  } catch (e) {
    reportError(e, "telegram.webhook");
  }
  return new Response("ok");
}

/** No store known yet (private chat, expired link) — say it in every UI language */
function inAllLanguages(key: "privateHint" | "linkExpired"): string {
  return (["uz", "ru", "en"] as const).map((l) => dictFor(l).telegramBot[key]).join("\n\n");
}

const isGroup = (chat: Chat) => chat.type === "group" || chat.type === "supergroup";

async function onMessage(message: NonNullable<Update["message"]>) {
  const chatId = String(message.chat.id);

  if (message.migrate_to_chat_id) {
    await moveChat(chatId, String(message.migrate_to_chat_id));
    return;
  }

  // "/start abc" or "/start@FlamiBot abc"
  const match = message.text?.match(/^\/start(?:@\w+)?(?:\s+([\w-]{8,64}))?\s*$/);
  if (!match) return;
  const token = match[1];

  if (!isGroup(message.chat)) {
    await sendToChat(chatId, inAllLanguages("privateHint"));
    return;
  }
  if (!token) return;

  const store = await prisma.store.findUnique({
    where: { telegramLinkToken: token },
    select: { id: true, name: true, locale: true },
  });
  if (!store) {
    await sendToChat(chatId, inAllLanguages("linkExpired"));
    return;
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      telegramChatId: chatId,
      telegramChatTitle: message.chat.title?.slice(0, 120) ?? null,
      telegramLinkToken: null,
    },
  });
  await sendToChat(
    chatId,
    dictFor(store.locale).telegramBot.connected.replace("{store}", store.name),
  );
}

async function onMembership(update: NonNullable<Update["my_chat_member"]>) {
  if (["left", "kicked"].includes(update.new_chat_member.status)) {
    await forgetChat(String(update.chat.id));
  }
}

function personName(from: NonNullable<Update["callback_query"]>["from"]): string {
  const full = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
  return (full || (from.username ? `@${from.username}` : "")).slice(0, 40);
}

async function onButton(query: NonNullable<Update["callback_query"]>) {
  const answer = (text?: string) =>
    tg("answerCallbackQuery", { callback_query_id: query.id, ...(text ? { text } : {}) });

  const [action, orderId, value] = (query.data ?? "").split(":");
  const message = query.message;
  if (!message || !orderId || orderId.length > 50) return answer();
  const chatId = String(message.chat.id);

  // Only orders of the store this group is linked to
  const order = await prisma.order.findFirst({
    where: { id: orderId, store: { telegramChatId: chatId } },
    select: cardOrderSelect,
  });
  if (!order) return answer(dictFor("en").adminOrders.errors.notFound);
  const d = dictFor(order.store.locale);

  if (action === "ask" || action === "back") {
    await tg("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: message.message_id,
      reply_markup: { inline_keyboard: cardKeyboard(order, action === "ask") },
    });
    return answer();
  }

  const next = statusSchema.safeParse(value);
  if (action !== "st" || !next.success) return answer();

  if (!canTransition(order.status, next.data, order.type)) {
    // Someone else was faster — just show the current state
    await editCard(chatId, message.message_id, order);
    return answer(d.adminOrders.errors.invalidTransition);
  }

  // Same guard as the admin panel: only if the status hasn't changed since we read it
  const { count } = await prisma.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: next.data, telegramMessageId: message.message_id },
  });
  if (count === 0) return answer(d.adminOrders.errors.invalidTransition);

  await editCard(chatId, message.message_id, { ...order, status: next.data }, personName(query.from));
  await answer(d.telegramBot.done);
}
