import type { OrderType, PaymentMethod, PaymentStatus } from "@prisma/client";

import { mapsLink } from "@/lib/maps";
import { formatMoney } from "@/lib/money";
import type { Locale } from "@/i18n/config";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";

// The message is written in the customer's language (Order.lang). New locale → add its messages here.
export type Lang = Locale;

const dictionaries: Record<Lang, typeof en> = { en, ru, uz };

export interface OrderMessageItem {
  name: string;
  quantity: number;
  lineTotal: number;
  /** Snapshot: [{ name, price }] */
  options?: unknown;
}

export interface OrderMessageOrder {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string;
  type: OrderType;
  zoneName?: string | null;
  /** DINE_IN */
  tableNumber?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  landmark?: string | null;
  scheduledFor?: string | null;
  comment?: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  /** Bank transfer receipt uploaded by the customer (adds a link for the store owner) */
  receiptPath?: string | null;
  subtotal: number;
  /** Promo discount (minor units) and the code text */
  discount?: number;
  promoCode?: string | null;
  tip?: number;
  customerEmail?: string | null;
  deliveryFee: number;
  total: number;
  /** Order currency snapshot (ISO 4217) */
  currency: string;
  items: OrderMessageItem[];
}

export interface OrderMessageStore {
  name: string;
  /** For the store link in the footer */
  slug?: string;
}

function optionNames(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((o) => (o && typeof o === "object" && "name" in o ? String(o.name) : null))
    .filter((n): n is string => Boolean(n));
}

/** origin — saytning haqiqiy manzili (getRequestOrigin), xabar oxiridagi buyurtma havolasi uchun */
/**
 * Order message the customer sends to the store (Take App style).
 * WhatsApp formats *bold* / _italic_; Telegram uses **bold** / __italic__ — so the markup depends on the channel.
 */
export function buildOrderMessage(
  order: OrderMessageOrder,
  store: OrderMessageStore,
  lang: Lang = "en",
  origin?: string,
  channel: "TELEGRAM" | "WHATSAPP" = "WHATSAPP",
): string {
  const t = dictionaries[lang].orderMessage;
  const money = (minor: number) => formatMoney(minor, order.currency);
  const bold = (text: string) => (channel === "TELEGRAM" ? `**${text}**` : `*${text}*`);
  const italic = (text: string) => (channel === "TELEGRAM" ? `__${text}__` : `_${text}_`);
  const base = origin?.replace(/\/$/, "");
  const lines: string[] = [];

  const tableLabel =
    order.type === "DINE_IN" && order.tableNumber
      ? t.table.replace("{number}", String(order.tableNumber))
      : null;
  // The table goes in the first line — the first thing the kitchen reads
  const header = t.header.replace("{number}", String(order.number));
  lines.push(bold(tableLabel ? `${header} · ${tableLabel}` : header));
  lines.push("");

  // *1x* Chicken Doner Wrap (Large, Cheese) $10.99
  for (const item of order.items) {
    const opts = optionNames(item.options);
    const suffix = opts.length ? ` (${opts.join(", ")})` : "";
    lines.push(`${bold(`${item.quantity}x`)} ${item.name}${suffix} ${money(item.lineTotal)}`);
  }
  lines.push("");

  const qty = order.items.reduce((sum, i) => sum + i.quantity, 0);
  lines.push(`${t.itemTotal}: ${money(order.subtotal)} (${t.qty}: ${qty})`);
  if (order.discount) {
    const code = order.promoCode ? ` (${order.promoCode})` : "";
    lines.push(`${t.discount}${code}: −${money(order.discount)}`);
  }
  if (order.deliveryFee > 0) lines.push(`${t.deliveryFee}: ${money(order.deliveryFee)}`);
  if (order.tip) lines.push(`${t.tip}: ${money(order.tip)}`);
  lines.push(bold(`${t.total}: ${money(order.total)}`));
  lines.push("");

  lines.push(`${t.customer}: ${bold(order.customerName)} ${order.customerPhone}`.trimEnd());
  if (order.customerEmail) lines.push(`└ ${order.customerEmail}`);
  lines.push("");

  if (order.type === "DELIVERY") {
    const fee = order.deliveryFee > 0 ? ` ${money(order.deliveryFee)}` : "";
    lines.push(`${t.service}: ${bold(`${t.DELIVERY}${fee}`)}`);
    if (order.zoneName) lines.push(`└ ${t.zone}: ${order.zoneName}`);
    if (order.address) lines.push(`└ ${order.address}`);
    if (order.landmark) lines.push(`└ ${order.landmark}`);
    const map = mapsLink(order.latitude, order.longitude);
    if (map) lines.push(`└ 📍 ${map}`);
  } else if (order.type === "DINE_IN") {
    lines.push(`${t.service}: ${bold(tableLabel ? `${t.DINE_IN} · ${tableLabel}` : t.DINE_IN)}`);
  } else {
    lines.push(`${t.service}: ${bold(t.PICKUP)}`);
  }
  if (order.type !== "DINE_IN") lines.push(`${t.time}: ${order.scheduledFor ?? t.asap}`);
  if (order.comment) lines.push(`${t.comment}: ${order.comment}`);
  lines.push("");

  lines.push(
    `${t.payment}: ${bold((order.type === "DINE_IN" ? t.paymentMethodsDineIn : t.paymentMethods)[order.paymentMethod])} (${t.paymentStatus[order.paymentStatus ?? "UNPAID"]})`,
  );

  if (base && order.paymentMethod === "TRANSFER" && order.receiptPath) {
    lines.push(`🧾 ${t.receipt}: ${base}/admin/receipt/${order.id}`);
  }

  if (base) {
    lines.push("");
    lines.push(`${t.seeOrder} ${base}/o/${order.id}`);
  }

  lines.push("");
  lines.push(italic(t.sentFrom.replace("{store}", store.name)));
  if (base && store.slug) lines.push(`${base}/${store.slug}`);

  return lines.join("\n");
}

export function telegramLink(username: string, text: string): string {
  const user = username
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/t\.me\//, "");
  return `https://t.me/${user}?text=${encodeURIComponent(text)}`;
}

export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Google Maps link for a customer's location (opens the native maps app on phones) */
