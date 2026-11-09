import type { OrderType, PaymentMethod } from "@prisma/client";

import { formatMoney } from "@/lib/money";
import en from "@/messages/en.json";

// Add a language here (and its messages file) when the app supports more than English.
export type Lang = "en";

const dictionaries = { en } as const;

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
  address?: string | null;
  landmark?: string | null;
  scheduledFor?: string | null;
  comment?: string | null;
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  total: number;
  /** Order currency snapshot (ISO 4217) */
  currency: string;
  items: OrderMessageItem[];
}

export interface OrderMessageStore {
  name: string;
}

function optionNames(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((o) => (o && typeof o === "object" && "name" in o ? String(o.name) : null))
    .filter((n): n is string => Boolean(n));
}

/** origin — saytning haqiqiy manzili (getRequestOrigin), xabar oxiridagi buyurtma havolasi uchun */
export function buildOrderMessage(
  order: OrderMessageOrder,
  store: OrderMessageStore,
  lang: Lang = "en",
  origin?: string,
): string {
  const t = dictionaries[lang].orderMessage;
  const pay = dictionaries[lang].payment;
  const lines: string[] = [];
  const money = (minor: number) => formatMoney(minor, order.currency);

  lines.push(t.header.replace("{number}", String(order.number)));
  lines.push(`${t.store}: ${store.name}`);
  lines.push("");
  lines.push(`${t.name}: ${order.customerName}`);
  lines.push(`${t.phone}: ${order.customerPhone}`);
  lines.push(`${t.type}: ${t[order.type]}`);
  if (order.type === "DELIVERY") {
    if (order.zoneName) lines.push(`${t.zone}: ${order.zoneName}`);
    if (order.address) lines.push(`${t.address}: ${order.address}`);
    if (order.landmark) lines.push(`${t.landmark}: ${order.landmark}`);
  }
  if (order.scheduledFor) lines.push(`${t.time}: ${order.scheduledFor}`);
  if (order.comment) lines.push(`${t.comment}: ${order.comment}`);

  lines.push("");
  lines.push(`${t.items}:`);
  for (const item of order.items) {
    const opts = optionNames(item.options);
    const suffix = opts.length ? ` (${opts.join(", ")})` : "";
    lines.push(`• ${item.name}${suffix} × ${item.quantity} = ${money(item.lineTotal)}`);
  }

  lines.push("");
  lines.push(`${t.subtotal}: ${money(order.subtotal)}`);
  if (order.deliveryFee > 0) lines.push(`${t.deliveryFee}: ${money(order.deliveryFee)}`);
  lines.push(`${t.total}: ${money(order.total)}`);
  lines.push(`${t.payment}: ${pay[order.paymentMethod]}`);

  if (origin) {
    lines.push("");
    lines.push(`${t.link}: ${origin.replace(/\/$/, "")}/o/${order.id}`);
  }

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
