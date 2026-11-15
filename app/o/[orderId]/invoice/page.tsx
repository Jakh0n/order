import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { mapsLink } from "@/lib/maps";
import { formatMoney } from "@/lib/money";
import { orderHashtag } from "@/lib/order-message";
import { getOrderForCustomer } from "@/lib/orders/get-order";

export const metadata: Metadata = { robots: { index: false, follow: false } };

function optionNames(options: unknown): string {
  if (!Array.isArray(options)) return "";
  return options
    .map((o) => (o && typeof o === "object" && "name" in o ? String(o.name) : ""))
    .filter(Boolean)
    .join(", ");
}

/**
 * The invoice the order message links to ("See invoice", Take App style): invoice number, date,
 * items, totals, customer and delivery details with a map button. No login — like /o/[id], the
 * order id in the link is the secret. Not indexed.
 */
export default function InvoicePage({ params }: PageProps<"/o/[orderId]/invoice">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto my-6 h-[600px] w-full max-w-xl" />}>
      <Invoice params={params} />
    </Suspense>
  );
}

async function Invoice({ params }: Pick<PageProps<"/o/[orderId]/invoice">, "params">) {
  const { orderId } = await params;
  const order = await getOrderForCustomer(orderId);
  if (!order) notFound();

  const [t, format] = await Promise.all([getTranslations(), getFormatter()]);
  const { store } = order;
  const money = (minor: number) => formatMoney(minor, order.currency);
  const qty = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const date = format.dateTime(order.createdAt, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: store.timeZone,
  });
  // GPS pin when the customer shared it; otherwise a search for the typed address
  const map =
    mapsLink(order.latitude, order.longitude) ??
    (order.type === "DELIVERY" && order.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`
      : null);
  const service =
    order.type === "DINE_IN"
      ? order.tableNumber
        ? t("table.label", { number: order.tableNumber })
        : t("table.dineIn")
      : order.type === "DELIVERY"
        ? t("checkout.delivery")
        : t("checkout.pickup");
  const payment =
    order.type === "DINE_IN"
      ? t(`table.pay.${order.paymentMethod}`)
      : t(`payment.${order.paymentMethod}`);

  return (
    <main className="bg-muted/40 min-h-dvh px-3 py-6 sm:py-10">
      <article className="bg-background mx-auto w-full max-w-xl rounded-2xl p-6 shadow-sm sm:p-8">
        {/* Store */}
        <header className="flex items-center gap-3 border-b pb-5">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small logo, any host
            <img src={store.logoUrl} alt="" className="size-12 rounded-xl object-cover" />
          ) : (
            <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl text-lg font-bold">
              {store.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{store.name}</p>
            {store.phone && <p className="text-muted-foreground text-sm">{store.phone}</p>}
          </div>
        </header>

        {/* Invoice number and date */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 border-b py-5 text-sm">
          <dt className="text-muted-foreground">{t("orderInvoice.number")}</dt>
          <dd className="font-medium">{orderHashtag(store, order.number)}</dd>
          <dt className="text-muted-foreground">{t("orderInvoice.date")}</dt>
          <dd className="font-medium">{date}</dd>
        </dl>

        {/* Items */}
        <section className="border-b py-5">
          <h1 className="text-lg font-bold">{t("orderInvoice.items")}</h1>
          <ul className="mt-3 divide-y">
            {order.items.map((item) => {
              const opts = optionNames(item.options);
              return (
                <li key={item.id} className="flex items-start gap-3 py-3 text-[15px]">
                  <span className="text-muted-foreground w-7 shrink-0 tabular-nums">
                    {item.quantity}x
                  </span>
                  <span className="min-w-0 flex-1">
                    {item.name}
                    {opts && <span className="text-muted-foreground block text-sm">{opts}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums">{money(item.lineTotal)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Totals */}
        <section className="flex flex-col gap-2 border-b py-5 text-[15px]">
          <Row label={`${t("orderInvoice.itemsTotal")} (${qty})`} value={money(order.subtotal)} />
          {order.discount > 0 && (
            <Row
              label={`${t("orderInvoice.discount")}${order.promoCode ? ` (${order.promoCode})` : ""}`}
              value={`−${money(order.discount)}`}
              muted
            />
          )}
          {order.deliveryFee > 0 && (
            <Row label={t("orderInvoice.delivery")} value={money(order.deliveryFee)} muted />
          )}
          {order.tip > 0 && <Row label={t("orderInvoice.tip")} value={money(order.tip)} muted />}
          <div className="mt-2 flex justify-between border-t pt-4 text-lg font-bold">
            <span>{t("orderInvoice.total")}</span>
            <span className="tabular-nums">{money(order.total)}</span>
          </div>
        </section>

        {/* Order details */}
        <section className="flex flex-col gap-4 py-5 text-[15px]">
          <h2 className="text-lg font-bold">{t("orderInvoice.details")}</h2>
          <Detail label={t("orderInvoice.customer")}>
            {order.customerName}
            {order.customerPhone && ` / ${order.customerPhone}`}
          </Detail>
          <Detail label={service}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {order.type === "DELIVERY" && order.address && <p>{order.address}</p>}
                {order.type === "DELIVERY" && order.landmark && (
                  <p className="text-muted-foreground">{order.landmark}</p>
                )}
                <p className="text-muted-foreground">
                  {order.scheduledFor ?? (order.type !== "DINE_IN" ? t("checkout.asap") : "")}
                </p>
              </div>
              {map && (
                <a
                  href={map}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:bg-muted flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold"
                >
                  <MapPin className="size-4" aria-hidden />
                  {t("orderInvoice.map")}
                </a>
              )}
            </div>
          </Detail>
          <Detail label={t("orderInvoice.payment")}>
            {payment} · {t(`payment.${order.paymentStatus}`)}
          </Detail>
          {order.comment && <Detail label={t("orderInvoice.note")}>{order.comment}</Detail>}
        </section>

        {store.description && (
          <p className="text-muted-foreground border-t pt-5 text-center text-sm">
            {store.description}
          </p>
        )}
      </article>
    </main>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className={muted ? "text-muted-foreground" : undefined}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-sm">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
