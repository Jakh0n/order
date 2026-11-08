import type { Order, OrderItem } from "@prisma/client";
import { Clock, MapPin, Phone } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { formatUZS } from "@/lib/money";
import { cn } from "@/lib/utils";

import { OrderActions } from "./order-actions";

const STATUS_STYLE: Record<Order["status"], string> = {
  NEW: "bg-blue-600 text-white",
  ACCEPTED: "bg-amber-500 text-white",
  READY: "bg-violet-600 text-white",
  ON_THE_WAY: "bg-sky-600 text-white",
  COMPLETED: "bg-emerald-600 text-white",
  CANCELLED: "bg-muted text-muted-foreground",
};

function optionNames(options: unknown): string | null {
  if (!Array.isArray(options)) return null;
  const names = options
    .map((o) => (o && typeof o === "object" && "name" in o ? String(o.name) : null))
    .filter(Boolean);
  return names.length ? names.join(", ") : null;
}

export async function OrderCard({ order }: { order: Order & { items: OrderItem[] } }) {
  const t = await getTranslations();
  const format = await getFormatter();
  const paid = order.paymentStatus === "PAID";

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
          <h2 className="text-lg font-semibold">#{order.number}</h2>
          <p className="text-muted-foreground text-xs">
            {format.dateTime(order.createdAt, { dateStyle: "short", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={STATUS_STYLE[order.status]}>{t(`status.${order.status}`)}</Badge>
          <Badge variant={paid ? "default" : "outline"}>
            {t(`payment.${order.paymentMethod}`)} · {t(`payment.${order.paymentStatus}`)}
          </Badge>
        </div>
      </header>

      <div className="flex flex-col gap-1 text-sm">
        <p className="font-medium">{order.customerName}</p>
        <a href={`tel:${order.customerPhone}`} className="text-primary flex items-center gap-1.5">
          <Phone className="size-3.5" />
          {order.customerPhone}
        </a>
        <p className="text-muted-foreground flex items-start gap-1.5">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {order.type === "DELIVERY"
              ? [order.zoneName, order.address, order.landmark].filter(Boolean).join(", ")
              : t("checkout.pickup")}
          </span>
        </p>
        <p className="text-muted-foreground flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" />
          {order.scheduledFor ?? t("checkout.asap")}
        </p>
        {order.comment && (
          <p className="bg-muted rounded-md px-2 py-1 text-sm">💬 {order.comment}</p>
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
            <span className="shrink-0 tabular-nums">{formatUZS(item.lineTotal)}</span>
          </li>
        ))}
        {order.deliveryFee > 0 && (
          <li className="text-muted-foreground flex justify-between">
            <span>{t("checkout.deliveryFee")}</span>
            <span className="tabular-nums">{formatUZS(order.deliveryFee)}</span>
          </li>
        )}
        <li className="flex justify-between font-semibold">
          <span>{t("checkout.total")}</span>
          <span className="tabular-nums">{formatUZS(order.total)}</span>
        </li>
      </ul>

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
