import "server-only";

import webpush from "web-push";

import { isLocale, type Locale } from "@/i18n/config";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { reportError } from "@/lib/report-error";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";

const dictionaries: Record<Locale, typeof en> = { en, ru, uz };

let configured: boolean | null = null;

/** VAPID keys from env; without them push is simply off (dev without keys, previews) */
function configure(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://flami.org", publicKey, privateKey);
  return (configured = true);
}

/**
 * "New order #12 · ₩19,384" → every device of the store's owner.
 * Runs after the response (next/server `after`), so a slow push service never delays checkout.
 * Text is in the store's language (the owner set it in Settings).
 */
export async function notifyNewOrder(orderId: string): Promise<void> {
  if (!configure()) return;
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        storeId: true,
        number: true,
        total: true,
        currency: true,
        type: true,
        tableNumber: true,
        scheduledFor: true,
        items: { select: { name: true, quantity: true }, orderBy: { id: "asc" } },
        store: { select: { locale: true, pushSubscriptions: true } },
      },
    });
    if (!order || order.store.pushSubscriptions.length === 0) return;

    const t = dictionaries[isLocale(order.store.locale) ? order.store.locale : "en"].push;
    const items = order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ");
    const how =
      order.type === "DINE_IN" && order.tableNumber
        ? t.table.replace("{number}", String(order.tableNumber))
        : t[order.type];
    const when = order.scheduledFor ? ` · ${t.at.replace("{time}", order.scheduledFor)}` : "";

    const payload = JSON.stringify({
      title: t.title
        .replace("{number}", String(order.number))
        .replace("{total}", formatMoney(order.total, order.currency)),
      body: `${how}${when} — ${items}`.slice(0, 200),
      // One notification per order; a re-send replaces instead of stacking
      tag: `order-${orderId}`,
      url: "/admin/orders",
    });

    const results = await Promise.allSettled(
      order.store.pushSubscriptions.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60, urgency: "high" },
        ),
      ),
    );

    // 404 / 410: the browser dropped this subscription (uninstalled, permission revoked)
    const gone = order.store.pushSubscriptions.filter((s, i) => {
      const r = results[i];
      if (r.status === "fulfilled") return false;
      const code = (r.reason as { statusCode?: number })?.statusCode;
      if (code !== 404 && code !== 410) reportError(r.reason, "push.send");
      return code === 404 || code === 410;
    });
    if (gone.length) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: gone.map((s) => s.id) } } });
    }
  } catch (e) {
    reportError(e, "notifyNewOrder");
  }
}
