import type { Order, OrderItem } from "@prisma/client";
import {
  AlertTriangle,
  Clock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Navigation,
  Phone,
  Receipt,
  Armchair,
  ChefHat,
  Printer,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { mapsLink } from "@/lib/maps";
import { isNextDaySlot } from "@/lib/store-hours";
import { cn } from "@/lib/utils";

import { OrderActions } from "./order-actions";

// Text contrast ≥ 4.5:1 for every badge (white on amber/sky/emerald-600 is too light)
const STATUS_STYLE: Record<Order["status"], string> = {
  NEW: "bg-blue-600 text-white",
  ACCEPTED: "bg-amber-400 text-amber-950",
  READY: "bg-violet-600 text-white",
  ON_THE_WAY: "bg-sky-700 text-white",
  COMPLETED: "bg-emerald-700 text-white",
  CANCELLED: "bg-muted text-muted-foreground",
};

function optionNames(options: unknown): string | null {
  if (!Array.isArray(options)) return null;
  const names = options
    .map((o) => (o && typeof o === "object" && "name" in o ? String(o.name) : null))
    .filter(Boolean);
  return names.length ? names.join(", ") : null;
}

/** Write to the customer in the store's channel, with a greeting ready */
function customerChatLink(channel: "TELEGRAM" | "WHATSAPP", phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  return channel === "TELEGRAM"
    ? `https://t.me/+${digits}`
    : `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export async function OrderCard({
  order,
  timeZone,
  storeName,
  channel,
  stale,
  receiptUrl,
}: {
  order: Order & { items: OrderItem[] };
  /** Store time zone for the order time */
  timeZone: string;
  storeName: string;
  channel: "TELEGRAM" | "WHATSAPP";
  /** Still NEW after 5+ minutes — the customer may not have sent the message */
  stale: boolean;
  /** Signed link to the customer's bank transfer receipt */
  receiptUrl?: string;
}) {
  const t = await getTranslations();
  const format = await getFormatter();
  const paid = order.paymentStatus === "PAID";
  const chatHref = customerChatLink(
    channel,
    order.customerPhone,
    t("adminOrders.messageText", {
      name: order.customerName,
      number: order.number,
      store: storeName,
    }),
  );
  const scheduled = order.scheduledFor
    ? isNextDaySlot(order.createdAt, order.scheduledFor, timeZone)
      ? t("checkout.tomorrowAt", { time: order.scheduledFor })
      : order.scheduledFor
    : null;

  return (
    <article
      className={cn(
        "bg-card flex flex-col gap-3 rounded-xl border p-4",
        order.status === "NEW" && "border-blue-300 ring-2 ring-blue-100 dark:ring-blue-950",
        order.status === "CANCELLED" && "opacity-70",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            #{order.number}
            {order.type === "DINE_IN" && order.tableNumber && (
              // Large and coloured: the kitchen needs the table at a glance
              <span className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm">
                <Armchair className="size-3.5" aria-hidden />
                {t("table.label", { number: order.tableNumber })}
              </span>
            )}
          </h2>
          <p className="text-muted-foreground text-xs">
            {format.dateTime(order.createdAt, { dateStyle: "short", timeStyle: "short", timeZone })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={STATUS_STYLE[order.status]}>{t(`status.${order.status}`)}</Badge>
          <Badge variant={paid ? "default" : "outline"}>
            {order.type === "DINE_IN"
              ? t(`table.pay.${order.paymentMethod}`)
              : t(`payment.${order.paymentMethod}`)}{" "}
            · {t(`payment.${order.paymentStatus}`)}
          </Badge>
        </div>
      </header>

      {stale && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("adminOrders.staleHint")}
        </p>
      )}

      <div className="flex flex-col gap-1 text-sm">
        <p className="font-medium">{order.customerName}</p>
        {order.customerPhone && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href={`tel:${order.customerPhone}`}
              className="text-primary flex items-center gap-1.5"
            >
              <Phone className="size-3.5" aria-hidden />
              {order.customerPhone}
            </a>
            <a
              href={chatHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary flex items-center gap-1.5 font-medium"
            >
              <MessageCircle className="size-3.5" aria-hidden />
              {t("adminOrders.messageCustomer")}
            </a>
          </div>
        )}
        <p className="text-muted-foreground flex items-start gap-1.5">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {order.type === "DELIVERY"
              ? [order.zoneName, order.address, order.landmark].filter(Boolean).join(", ")
              : order.type === "DINE_IN"
                ? t("table.dineIn")
                : t("checkout.pickup")}
          </span>
        </p>
        {mapsLink(order.latitude, order.longitude) && (
          <a
            href={mapsLink(order.latitude, order.longitude)!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary flex items-center gap-1.5 font-medium"
          >
            <Navigation className="size-3.5 shrink-0" />
            {t("order.openMap")}
          </a>
        )}
        {order.type !== "DINE_IN" && (
          <p className="text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0" />
            {scheduled ?? t("checkout.asap")}
          </p>
        )}
        {order.comment && (
          <p className="bg-muted flex items-start gap-1.5 rounded-md px-2 py-1 text-sm">
            <MessageSquare className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden />
            {order.comment}
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-1 border-t pt-3 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span className="min-w-0">
              {item.quantity} × {item.name}
              {optionNames(item.options) && (
                <span className="text-muted-foreground"> ({optionNames(item.options)})</span>
              )}
            </span>
            <span className="shrink-0 tabular-nums">
              {formatMoney(item.lineTotal, order.currency)}
            </span>
          </li>
        ))}
        {order.deliveryFee > 0 && (
          <li className="text-muted-foreground flex justify-between">
            <span>{t("checkout.deliveryFee")}</span>
            <span className="tabular-nums">{formatMoney(order.deliveryFee, order.currency)}</span>
          </li>
        )}
        <li className="flex justify-between font-semibold">
          <span>{t("checkout.total")}</span>
          <span className="tabular-nums">{formatMoney(order.total, order.currency)}</span>
        </li>
      </ul>

      {order.paymentMethod === "TRANSFER" && (receiptUrl || !paid) && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border p-2 text-sm",
            receiptUrl &&
              !paid &&
              "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
          )}
        >
          {receiptUrl ? (
            <>
              <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL */}
                <img
                  src={receiptUrl}
                  alt={t("receipt.adminView")}
                  className="size-14 rounded-md border object-cover"
                />
              </a>
              <div className="flex min-w-0 flex-col gap-0.5">
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium"
                >
                  {t("receipt.adminView")}
                </a>
                {!paid && (
                  <p className="text-muted-foreground text-xs">{t("receipt.adminCheck")}</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground flex items-center gap-1.5">
              <Receipt className="size-3.5 shrink-0" />
              {t("receipt.adminNone")}
            </p>
          )}
        </div>
      )}

      {/* 80 mm printer: kitchen ticket and customer receipt (opens the print dialog) */}
      <div className="flex gap-2">
        {(
          [
            ["kitchen", ChefHat],
            ["receipt", Printer],
          ] as const
        ).map(([type, Icon]) => (
          <a
            key={type}
            href={`/admin/print/${order.id}?type=${type}&auto=1`}
            target="_blank"
            rel="noopener"
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors"
          >
            <Icon className="size-3.5" aria-hidden />
            {t(`print.${type}`)}
          </a>
        ))}
      </div>

      <OrderActions
        orderId={order.id}
        number={order.number}
        status={order.status}
        type={order.type}
        paid={paid}
      />
    </article>
  );
}
