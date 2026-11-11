import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AutoPrint } from "@/components/admin/auto-print";
import { PrintButton } from "@/components/admin/print-button";
import { getRequestOrigin } from "@/lib/app-url";
import { requireOwner } from "@/lib/auth/owner";
import { JOIN, prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { isNextDaySlot } from "@/lib/store-hours";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false } };

type PrintType = "kitchen" | "receipt";

/**
 * 80 mm thermal paper: kitchen ticket (no prices, big table / number) or customer receipt.
 * Outside the (panel) layout so only the ticket prints.
 */
export default function OrderPrintPage({
  params,
  searchParams,
}: PageProps<"/admin/print/[orderId]">) {
  return (
    <Suspense>
      <OrderPrint params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderPrint({
  params,
  searchParams,
}: Pick<PageProps<"/admin/print/[orderId]">, "params" | "searchParams">) {
  const [{ store }, { orderId }, query] = await Promise.all([requireOwner(), params, searchParams]);
  const type: PrintType = query.type === "receipt" ? "receipt" : "kitchen";

  const [order, settings, origin, t, format] = await Promise.all([
    // Only this store's orders
    prisma.order.findFirst({
      ...JOIN,
      where: { id: orderId, storeId: store.id },
      include: { items: { orderBy: { id: "asc" } } },
    }),
    prisma.store.findUnique({
      where: { id: store.id },
      select: { name: true, address: true, phone: true, timeZone: true },
    }),
    getRequestOrigin(),
    getTranslations(),
    getFormatter(),
  ]);
  if (!order || !settings) notFound();

  const timeZone = settings.timeZone;
  const placedAt = format.dateTime(order.createdAt, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  });
  const scheduled = order.scheduledFor
    ? isNextDaySlot(order.createdAt, order.scheduledFor, timeZone)
      ? t("checkout.tomorrowAt", { time: order.scheduledFor })
      : order.scheduledFor
    : null;
  const money = (minor: number) => formatMoney(minor, order.currency);
  const service =
    order.type === "DINE_IN" && order.tableNumber
      ? t("table.label", { number: order.tableNumber })
      : order.type === "DELIVERY"
        ? t("checkout.delivery")
        : t("checkout.pickup");
  const paymentLabel =
    order.type === "DINE_IN"
      ? t(`table.pay.${order.paymentMethod}`)
      : t(`payment.${order.paymentMethod}`);

  return (
    <div className="bg-muted/50 min-h-dvh print:min-h-0 print:bg-white">
      <style>{`@page { size: 80mm auto; margin: 0; }`}</style>
      {query.auto === "1" && <AutoPrint />}

      {/* Toolbar (screen only) */}
      <div className="bg-background sticky top-0 z-10 flex flex-wrap items-center justify-center gap-2 border-b px-4 py-3 print:hidden">
        <div className="bg-muted flex rounded-xl p-1">
          {(["kitchen", "receipt"] as const).map((key) => (
            <Link
              key={key}
              href={`/admin/print/${order.id}?type=${key}`}
              replace
              aria-current={key === type ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                key === type
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`print.${key}`)}
            </Link>
          ))}
        </div>
        <PrintButton label={t("print.print")} />
      </div>

      {/* Paper: 80 mm roll, ~72 mm printable. Black only — thermal printers have no grey. */}
      <main className="mx-auto my-6 w-[80mm] bg-white px-[4mm] py-[5mm] text-[12px] leading-snug text-black shadow-md print:my-0 print:shadow-none">
        {type === "kitchen" ? (
          <>
            <p className="text-center text-[11px] font-semibold uppercase">{settings.name}</p>
            <p className="mt-1 text-center text-[40px] leading-none font-black">#{order.number}</p>
            <p className="mt-2 bg-black px-2 py-1.5 text-center text-[22px] leading-none font-black text-white uppercase [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
              {service}
            </p>
            <p className="mt-2 text-center">{placedAt}</p>
            {order.type !== "DINE_IN" && (
              <p
                className={cn(
                  "mt-1 text-center font-bold",
                  scheduled && "border-2 border-black py-1 text-[16px]",
                )}
              >
                {t("checkout.time")}: {scheduled ?? t("checkout.asap")}
              </p>
            )}

            <Divider />
            <ul className="flex flex-col gap-2">
              {order.items.map((item) => (
                <li key={item.id}>
                  <p className="text-[16px] leading-tight font-bold">
                    {item.quantity} × {item.name}
                  </p>
                  {optionNames(item.options).map((name) => (
                    <p key={name} className="pl-[6mm] text-[13px]">
                      + {name}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
            <Divider />

            {order.comment && (
              <p className="mb-2 border-2 border-black p-1.5 text-[14px] font-bold">
                {t("checkout.comment")}: {order.comment}
              </p>
            )}
            <p>
              {t("print.customer")}: <b>{order.customerName}</b>
              {order.customerPhone && ` · ${order.customerPhone}`}
            </p>
            {order.type === "DELIVERY" && order.address && (
              <p className="mt-1">
                {order.address}
                {order.landmark && ` (${order.landmark})`}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-center text-[16px] font-black">{settings.name}</p>
            {settings.address && <p className="text-center">{settings.address}</p>}
            {settings.phone && <p className="text-center">{settings.phone}</p>}
            <Divider />
            <div className="flex justify-between gap-2 font-bold">
              <span>{t("print.receiptTitle", { number: order.number })}</span>
              <span>{service}</span>
            </div>
            <p>{placedAt}</p>
            {order.type === "DELIVERY" && order.address && <p>{order.address}</p>}

            <Divider />
            <ul className="flex flex-col gap-1.5">
              {order.items.map((item) => (
                <li key={item.id}>
                  <div className="flex justify-between gap-2">
                    <span>
                      {item.quantity} × {item.name}
                    </span>
                    <span className="shrink-0 tabular-nums">{money(item.lineTotal)}</span>
                  </div>
                  {optionNames(item.options).length > 0 && (
                    <p className="pl-[4mm] text-[11px]">{optionNames(item.options).join(", ")}</p>
                  )}
                </li>
              ))}
            </ul>
            <Divider />

            <Line label={t("checkout.subtotal")} value={money(order.subtotal)} />
            {order.deliveryFee > 0 && (
              <Line label={t("checkout.deliveryFee")} value={money(order.deliveryFee)} />
            )}
            <div className="mt-1 flex justify-between gap-2 text-[16px] font-black">
              <span>{t("checkout.total")}</span>
              <span className="tabular-nums">{money(order.total)}</span>
            </div>
            <Line
              label={t("checkout.payment")}
              value={`${paymentLabel} · ${t(`payment.${order.paymentStatus}`)}`}
            />

            <Divider />
            <p className="text-center font-bold">{t("print.thanks")}</p>
            <p className="mt-1 text-center text-[10px]">{new URL(origin).host}</p>
          </>
        )}
      </main>
    </div>
  );
}

function Divider() {
  return <hr className="my-2 border-0 border-t border-dashed border-black" />;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  );
}

function optionNames(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((o) => (o && typeof o === "object" && "name" in o ? String(o.name) : null))
    .filter((n): n is string => Boolean(n));
}
