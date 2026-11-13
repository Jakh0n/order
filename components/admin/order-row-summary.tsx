import type { Order, OrderItem } from "@prisma/client";
import { AlertTriangle, Armchair, Bike, CircleCheck, ShoppingBag } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { isFinalStatus } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

import { STATUS_STYLE } from "./order-card";

/** Compact row: number, status, waiting time, total; how / who; what */
export async function OrderRowSummary({
  order,
  timeZone,
  now,
  stale,
}: {
  order: Order & { items: OrderItem[] };
  timeZone: string;
  now: Date;
  stale: boolean;
}) {
  const [t, format] = await Promise.all([getTranslations(), getFormatter()]);
  const active = !isFinalStatus(order.status);
  const items = order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ");

  const how =
    order.type === "DINE_IN" ? (
      <span className="text-primary inline-flex items-center gap-1 font-semibold">
        <Armchair className="size-3.5" aria-hidden />
        {order.tableNumber ? t("table.label", { number: order.tableNumber }) : t("table.dineIn")}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1">
        {order.type === "DELIVERY" ? (
          <Bike className="size-3.5" aria-hidden />
        ) : (
          <ShoppingBag className="size-3.5" aria-hidden />
        )}
        {t(order.type === "DELIVERY" ? "checkout.delivery" : "checkout.pickup")}
      </span>
    );

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold tabular-nums">#{order.number}</span>
        <Badge className={cn("shrink-0", STATUS_STYLE[order.status])}>
          {t(`status.${order.status}`)}
        </Badge>
        <span
          className={cn(
            "flex min-w-0 items-center gap-1 truncate text-xs",
            stale ? "font-semibold text-amber-800 dark:text-amber-300" : "text-muted-foreground",
          )}
        >
          {stale && <AlertTriangle className="size-3.5 shrink-0" aria-hidden />}
          {active
            ? format.relativeTime(order.createdAt, now)
            : format.dateTime(order.createdAt, {
                dateStyle: "short",
                timeStyle: "short",
                timeZone,
              })}
        </span>
        <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums">
          {formatMoney(order.total, order.currency)}
        </span>
      </div>
      <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm">
        {how}
        <span aria-hidden>·</span>
        <span className="text-foreground truncate">{order.customerName}</span>
        {order.paymentStatus === "PAID" && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
            <CircleCheck className="size-3.5" aria-hidden />
            {t("payment.PAID")}
          </span>
        )}
      </div>
      <p className="text-muted-foreground truncate text-sm">{items}</p>
    </div>
  );
}
