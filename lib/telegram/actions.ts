"use server";

import { randomBytes } from "node:crypto";

import { refresh } from "next/cache";

import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { reportError } from "@/lib/report-error";

import { botEnabled, botUsername, isGoneError } from "./api";
import { dictFor, sendToChat } from "./notify";

export type TelegramGroupResult =
  | { ok: true; url?: string }
  | { ok: false; error: "disabled" | "notConnected" | "gone" | "server" };

/** "Connect a group": one-time link that adds the bot to a group the owner picks */
export async function createTelegramGroupLink(): Promise<TelegramGroupResult> {
  const { store } = await requireOwner();
  const username = botUsername();
  if (!botEnabled() || !username) return { ok: false, error: "disabled" };
  try {
    const token = randomBytes(18).toString("base64url");
    await prisma.store.update({ where: { id: store.id }, data: { telegramLinkToken: token } });
    return { ok: true, url: `https://t.me/${username}?startgroup=${token}` };
  } catch (e) {
    reportError(e, "telegram.createLink");
    return { ok: false, error: "server" };
  }
}

export async function disconnectTelegramGroup(): Promise<TelegramGroupResult> {
  const { store } = await requireOwner();
  try {
    await prisma.store.update({
      where: { id: store.id },
      data: { telegramChatId: null, telegramChatTitle: null, telegramLinkToken: null },
    });
    refresh();
    return { ok: true };
  } catch (e) {
    reportError(e, "telegram.disconnect");
    return { ok: false, error: "server" };
  }
}

export async function sendTelegramTest(): Promise<TelegramGroupResult> {
  const { store } = await requireOwner();
  if (!botEnabled()) return { ok: false, error: "disabled" };
  const row = await prisma.store.findUnique({
    where: { id: store.id },
    select: { name: true, locale: true, telegramChatId: true },
  });
  if (!row?.telegramChatId) return { ok: false, error: "notConnected" };
  try {
    await sendToChat(
      row.telegramChatId,
      dictFor(row.locale).telegramBot.test.replace("{store}", row.name),
    );
    return { ok: true };
  } catch (e) {
    if (isGoneError(e)) {
      refresh();
      return { ok: false, error: "gone" };
    }
    reportError(e, "telegram.test");
    return { ok: false, error: "server" };
  }
}
