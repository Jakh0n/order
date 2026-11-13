import "server-only";

// Telegram Bot API — only for order notifications in a store's staff group (no ordering through the bot).
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET. Without them the feature is off.

export type InlineButton = { text: string; callback_data?: string; url?: string };
export type InlineKeyboard = InlineButton[][];

export class TelegramError extends Error {
  constructor(
    message: string,
    readonly code: number,
    /** Group became a supergroup: its chat id changed */
    readonly migrateToChatId?: number,
  ) {
    super(message);
  }
}

export function botUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") || null;
}

export function botEnabled(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && botUsername());
}

export function webhookSecret(): string | null {
  return process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || null;
}

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new TelegramError("Bot token is not set", 0);
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json().catch(() => null)) as {
    ok: boolean;
    result?: T;
    description?: string;
    error_code?: number;
    parameters?: { migrate_to_chat_id?: number };
  } | null;
  if (!data?.ok) {
    throw new TelegramError(
      data?.description ?? `HTTP ${res.status}`,
      data?.error_code ?? res.status,
      data?.parameters?.migrate_to_chat_id,
    );
  }
  return data.result as T;
}

/** The bot can no longer post there (removed, group deleted) — the link should be dropped */
export function isGoneError(e: unknown): boolean {
  if (!(e instanceof TelegramError)) return false;
  return (
    e.code === 403 ||
    (e.code === 400 && /chat not found|group chat was deactivated/i.test(e.message))
  );
}

/** Editing with the same text and buttons — harmless */
export function isNotModified(e: unknown): boolean {
  return e instanceof TelegramError && /message is not modified/i.test(e.message);
}
