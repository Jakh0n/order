import { CalendarClock, CheckCircle2, Phone, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CopyButton } from "@/components/copy-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { StoreTheme } from "@/components/storefront/store-theme";
import { AutoRefresh } from "@/components/order/auto-refresh";
import { ReceiptUpload } from "@/components/order/receipt-upload";
import { ReorderButton } from "@/components/order/reorder-button";
import { SendMessage } from "@/components/order/send-message";
import { StatusWatcher } from "@/components/order/status-watcher";
import { StatusSteps } from "@/components/order/status-steps";
import { MenuSkeleton } from "@/components/storefront/menu-skeleton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { type CustomerOrder, getOrderForCustomer } from "@/lib/orders/get-order";
import { mapsLink } from "@/lib/maps";
import { orderSendLink } from "@/lib/orders/send-link";
import { getRequestOrigin } from "@/lib/app-url";
import { isNextDaySlot } from "@/lib/store-hours";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false } };

export default function OrderPage({ params }: PageProps<"/o/[orderId]">) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <Order params={params} />
    </Suspense>
  );
}

async function Order({ params }: { params: PageProps<"/o/[orderId]">["params"] }) {
  const { orderId } = await params;
  const order = await getOrderForCustomer(orderId);
  if (!order) notFound();

  const t = await getTranslations();
  const format = await getFormatter();
  const send = orderSendLink(order, order.store, await getRequestOrigin());
  const money = (minor: number) => formatMoney(minor, order.currency);
  const isFinal = order.status === "COMPLETED" || order.status === "CANCELLED";
  const scheduled = order.scheduledFor
    ? isNextDaySlot(order.createdAt, order.scheduledFor, order.store.timeZone)
      ? t("checkout.tomorrowAt", { time: order.scheduledFor })
      : order.scheduledFor
    : null;
  // The most important line for a waiting customer: when
  const scheduledBanner = scheduled && !isFinal && (
    <p className="bg-primary/5 text-primary flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium">
      <CalendarClock className="size-4 shrink-0" aria-hidden />
      {t("order.scheduledFor", { time: scheduled })}
    </p>
  );

  return (
    <div className="flex-1 bg-(--store-bg)">
      <StoreTheme
        brandColor={order.store.brandColor}
        pageBackground={order.store.pageBackground}
        fontStyle={order.store.fontStyle}
        cornerStyle={order.store.cornerStyle}
      />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 pt-3 pb-8">
        <title>{t("order.title", { number: order.number })}</title>

        <div className="flex items-center justify-between gap-2 px-1">
          <Link
            href={`/${order.store.slug}`}
            className="text-muted-foreground truncate text-sm font-medium"
          >
            ← {order.store.name}
          </Link>
          <LanguageSwitcher />
        </div>

        {/* Yangi buyurtma: muvaffaqiyat + asosiy harakat — xabarni yuborish */}
        {order.status === "NEW" && send ? (
          <section className="bg-background flex flex-col items-center gap-3 rounded-2xl p-5 text-center">
            <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full">
              <CheckCircle2 className="size-8" />
            </span>
            <h1 className="text-xl font-bold">{t("order.savedTitle", { number: order.number })}</h1>
            {scheduledBanner}
            <SendMessage orderId={order.id} href={send.href} channel={send.channel} />
            <p className="text-muted-foreground text-xs">
              {format.dateTime(order.createdAt, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: order.store.timeZone,
              })}
            </p>
          </section>
        ) : (
          <section className="bg-background rounded-2xl p-5">
            <h1 className="text-xl font-bold">
              {t("order.statusTitle", { number: order.number })}
            </h1>
            <p className="text-muted-foreground text-sm">
              {format.dateTime(order.createdAt, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: order.store.timeZone,
              })}
            </p>
            {scheduledBanner && <div className="mt-3">{scheduledBanner}</div>}
          </section>
        )}

        <StatusWatcher orderId={order.id} number={order.number} status={order.status}>
          <Card title={t("order.status")}>
            <StatusSteps status={order.status} type={order.type} />
            {!isFinal && <p className="text-muted-foreground text-xs">{t("order.autoRefresh")}</p>}
          </Card>
        </StatusWatcher>

        <Card title={t("order.items")}>
          <ul className="flex flex-col gap-2 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="text-muted-foreground">{item.quantity} × </span>
                  {item.name}
                  {optionNames(item.options) && (
                    <span className="text-muted-foreground block text-xs">
                      {optionNames(item.options)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums">{money(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 border-t pt-3 text-sm">
            <Row label={t("checkout.subtotal")} value={money(order.subtotal)} />
            {order.discount > 0 && (
              <Row
                label={t("checkout.promo.discountRow", { code: order.promoCode ?? "" })}
                value={`−${money(order.discount)}`}
              />
            )}
            {order.type === "DELIVERY" && (
              <Row label={t("checkout.deliveryFee")} value={money(order.deliveryFee)} />
            )}
            <Row label={t("checkout.total")} value={money(order.total)} strong />
          </dl>
        </Card>

        <Card title={t("order.details")}>
          <dl className="flex flex-col gap-2 text-sm">
            <Row
              label={t("checkout.type")}
              value={
                order.type === "DELIVERY"
                  ? t("checkout.delivery")
                  : order.type === "DINE_IN"
                    ? t("table.dineIn")
                    : t("checkout.pickup")
              }
            />
            {order.tableNumber && (
              <Row
                label={t("table.table")}
                value={t("table.label", { number: order.tableNumber })}
              />
            )}
            {order.zoneName && <Row label={t("checkout.zone")} value={order.zoneName} />}
            {order.address && <Row label={t("checkout.address")} value={order.address} />}
            {order.landmark && <Row label={t("checkout.landmark")} value={order.landmark} />}
            {mapsLink(order.latitude, order.longitude) && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground shrink-0">{t("order.location")}</dt>
                <dd>
                  <a
                    href={mapsLink(order.latitude, order.longitude)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium"
                  >
                    {t("order.openMap")}
                  </a>
                </dd>
              </div>
            )}
            {order.type !== "DINE_IN" && (
              <Row label={t("checkout.time")} value={scheduled ?? t("checkout.asap")} />
            )}
            {order.comment && <Row label={t("checkout.comment")} value={order.comment} />}
            <Row label={t("checkout.name")} value={order.customerName} />
            {order.customerPhone && <Row label={t("checkout.phone")} value={order.customerPhone} />}
          </dl>
        </Card>

        <Card title={t("order.payment")}>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span>
              {order.type === "DINE_IN"
                ? t(`table.pay.${order.paymentMethod}`)
                : t(`payment.${order.paymentMethod}`)}
            </span>
            <Badge variant={order.paymentStatus === "PAID" ? "default" : "secondary"}>
              {t(`payment.${order.paymentStatus}`)}
            </Badge>
          </div>
          <TransferDetails order={order} label={t("checkout.transferDetails")} />
          {order.paymentMethod === "TRANSFER" && order.paymentStatus === "UNPAID" && !isFinal && (
            <ReceiptUpload orderId={order.id} sent={!!order.receiptPath} />
          )}
        </Card>

        <div className="flex flex-col gap-2">
          {/* Finished or cancelled → the natural next step is ordering again */}
          {isFinal && <ReorderButton orderId={order.id} variant="default" />}
          {order.status !== "NEW" && send && !isFinal && (
            <a
              href={send.href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              <Send />
              {t("order.sendAgain")}
            </a>
          )}
          {order.store.phone && (
            <a
              href={`tel:${order.store.phone.replace(/\s/g, "")}`}
              className={cn(buttonVariants({ variant: "outline" }), "bg-background")}
            >
              <Phone />
              {t("order.callStore")}
            </a>
          )}
          <Link href={`/${order.store.slug}`} className={buttonVariants({ variant: "ghost" })}>
            {t("order.backToMenu")}
          </Link>
        </div>

        {!isFinal && <AutoRefresh />}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-background flex flex-col gap-3 rounded-2xl p-4">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

function TransferDetails({ order, label }: { order: CustomerOrder; label: string }) {
  if (order.paymentMethod !== "TRANSFER" || order.paymentStatus === "PAID") return null;
  if (!order.store.transferDetails) return null;
  return (
    <div className="bg-muted rounded-lg p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{label}</p>
        <CopyButton text={order.store.transferDetails} />
      </div>
      <p className="mt-1 whitespace-pre-line select-all">{order.store.transferDetails}</p>
    </div>
  );
}

function optionNames(options: unknown): string | null {
  if (!Array.isArray(options)) return null;
  const names = options
    .map((o) => (o && typeof o === "object" && "name" in o ? String(o.name) : null))
    .filter(Boolean);
  return names.length ? names.join(", ") : null;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4", strong && "text-base font-semibold")}>
      <dt className={strong ? undefined : "text-muted-foreground shrink-0"}>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}
