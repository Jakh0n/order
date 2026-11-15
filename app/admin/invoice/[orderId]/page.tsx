import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PrintButton } from "@/components/admin/print-button";
import { buttonVariants } from "@/components/ui/button";
import { requireOwner } from "@/lib/auth/owner";
import { JOIN, prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { robots: { index: false } };

function optionNames(options: unknown): string {
  if (!Array.isArray(options)) return "";
  return options
    .map((o) => (o && typeof o === "object" && "name" in o ? String(o.name) : ""))
    .filter(Boolean)
    .join(", ");
}

/**
 * A4 invoice for one order (print or "Save as PDF" in the browser): store, customer, items,
 * totals and payment. Owner only; outside the (panel) layout so only the invoice prints.
 */
export default function InvoicePage({ params }: PageProps<"/admin/invoice/[orderId]">) {
  return (
    <Suspense>
      <Invoice params={params} />
    </Suspense>
  );
}

async function Invoice({ params }: Pick<PageProps<"/admin/invoice/[orderId]">, "params">) {
  const { orderId } = await params;
  const { store } = await requireOwner(`/admin/invoice/${orderId}`);

  const [order, settings, t, format] = await Promise.all([
    prisma.order.findFirst({
      ...JOIN,
      where: { id: orderId, storeId: store.id },
      include: { items: { orderBy: { id: "asc" } } },
    }),
    prisma.store.findUnique({
      where: { id: store.id },
      select: { name: true, address: true, phone: true, logoUrl: true, timeZone: true },
    }),
    getTranslations(),
    getFormatter(),
  ]);
  if (!order || !settings) notFound();

  const money = (minor: number) => formatMoney(minor, order.currency);
  const date = format.dateTime(order.createdAt, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: settings.timeZone,
  });
  const service =
    order.type === "DINE_IN" && order.tableNumber
      ? t("table.label", { number: order.tableNumber })
      : order.type === "DELIVERY"
        ? t("checkout.delivery")
        : t("checkout.pickup");
  const payment =
    order.type === "DINE_IN"
      ? t(`table.pay.${order.paymentMethod}`)
      : t(`payment.${order.paymentMethod}`);
  const paid = order.paymentStatus === "PAID";

  return (
    <div className="bg-muted/50 min-h-dvh print:min-h-0 print:bg-white">
      <style>{`@page { size: A4; margin: 14mm; }`}</style>

      {/* Toolbar (screen only) */}
      <div className="bg-background sticky top-0 z-10 flex items-center justify-between gap-2 border-b px-4 py-3 print:hidden">
        <Link
          href={`/admin/order/${order.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5" })}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("invoice.back")}
        </Link>
        <PrintButton label={t("invoice.print")} />
      </div>

      <article className="mx-auto my-6 w-full max-w-[210mm] bg-white p-8 text-[13px] leading-relaxed text-black shadow-sm sm:p-12 print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-5">
          <div className="flex items-center gap-3">
            {settings.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- printed as is
              <img src={settings.logoUrl} alt="" className="size-14 rounded-lg object-cover" />
            )}
            <div>
              <p className="text-lg font-bold">{settings.name}</p>
              {settings.address && <p>{settings.address}</p>}
              {settings.phone && <p>{settings.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold">{t("invoice.title", { number: order.number })}</h1>
            <p className="text-neutral-600">
              {t("invoice.date")}: {date}
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
              {t("invoice.billTo")}
            </p>
            <p className="mt-1 font-semibold">{order.customerName}</p>
            {order.customerPhone && <p>{order.customerPhone}</p>}
            {order.customerEmail && <p>{order.customerEmail}</p>}
            {order.type === "DELIVERY" && order.address && <p>{order.address}</p>}
            {order.type === "DELIVERY" && order.landmark && (
              <p className="text-neutral-600">{order.landmark}</p>
            )}
          </div>
          <div className="sm:text-right print:text-right">
            <p className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
              {t("invoice.service")}
            </p>
            <p className="mt-1 font-semibold">{service}</p>
            {order.scheduledFor && <p>{order.scheduledFor}</p>}
          </div>
        </section>

        <table className="mt-8 w-full border-collapse">
          <thead>
            <tr className="border-b border-black text-left text-[11px] tracking-wider text-neutral-500 uppercase">
              <th className="py-2 font-semibold">{t("invoice.item")}</th>
              <th className="py-2 text-right font-semibold">{t("invoice.qty")}</th>
              <th className="py-2 text-right font-semibold">{t("invoice.price")}</th>
              <th className="py-2 text-right font-semibold">{t("invoice.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const opts = optionNames(item.options);
              return (
                <tr key={item.id} className="border-b border-neutral-200 align-top">
                  <td className="py-2 pr-3">
                    {item.name}
                    {opts && <span className="block text-neutral-500">{opts}</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{money(item.unitPrice)}</td>
                  <td className="py-2 text-right tabular-nums">{money(item.lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-full max-w-xs">
          <Row label={t("invoice.subtotal")} value={money(order.subtotal)} />
          {order.discount > 0 && (
            <Row
              label={`${t("invoice.discount")}${order.promoCode ? ` (${order.promoCode})` : ""}`}
              value={`−${money(order.discount)}`}
            />
          )}
          {order.deliveryFee > 0 && (
            <Row label={t("invoice.delivery")} value={money(order.deliveryFee)} />
          )}
          {order.tip > 0 && <Row label={t("invoice.tip")} value={money(order.tip)} />}
          <div className="mt-2 flex justify-between border-t-2 border-black pt-2 text-base font-bold">
            <span>{t("invoice.total")}</span>
            <span className="tabular-nums">{money(order.total)}</span>
          </div>
        </div>

        <section className="mt-8 flex flex-wrap gap-x-10 gap-y-2 border-t border-neutral-200 pt-4">
          <p>
            <span className="text-neutral-500">{t("invoice.payment")}:</span> {payment}
          </p>
          <p>
            <span className="text-neutral-500">{t("invoice.status")}:</span>{" "}
            <b className={paid ? undefined : "text-red-700"}>
              {t(`payment.${order.paymentStatus}`)}
            </b>
          </p>
        </section>
        {order.comment && <p className="mt-3 text-neutral-600">“{order.comment}”</p>}

        <footer className="mt-12 text-center text-[11px] text-neutral-400">
          {t("invoice.footer")}
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-neutral-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
