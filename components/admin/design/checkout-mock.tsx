"use client";

import { ChevronRight, TicketPercent } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormatMoney } from "@/components/currency-provider";
import { type EmailMode, TIP_PERCENTS, tipAmount } from "@/lib/orders/promo";
import type { MenuCategory } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

/**
 * What the checkout looks like with the Website → Checkout choices (Design preview only).
 * Not interactive — the real form is components/checkout/checkout-form.tsx.
 */
export function CheckoutMock({
  categories,
  email,
  note,
  promo,
  tips,
}: {
  categories: MenuCategory[];
  email: EmailMode;
  note: boolean;
  promo: boolean;
  tips: boolean;
}) {
  const t = useTranslations("checkout");
  const formatMoney = useFormatMoney();
  // Two real dishes as a sample cart
  const sample = categories.flatMap((c) => c.products).slice(0, 2);
  const subtotal = sample.reduce((sum, p) => sum + p.price, 0);
  const tip = tips ? tipAmount(subtotal, 10) : 0;

  return (
    <div className="flex flex-col gap-3 px-3 py-3" aria-hidden>
      <h1 className="px-1 text-lg font-bold">{t("title")}</h1>
      <Box title={t("summary")}>
        {sample.map((p) => (
          <div key={p.id} className="flex justify-between gap-2 text-sm">
            <span className="truncate">1 × {p.name}</span>
            <span className="tabular-nums">{formatMoney(p.price)}</span>
          </div>
        ))}
      </Box>
      <Box title={t("contact")}>
        <FakeInput label={t("name")} />
        <FakeInput label={t("phone")} />
        {email !== "off" && (
          <FakeInput
            label={t("email")}
            optional={email === "optional" ? t("optional") : undefined}
          />
        )}
      </Box>
      {note && (
        <Box>
          <FakeInput label={t("comment")} optional={t("optional")} tall />
        </Box>
      )}
      {promo && (
        <Box title={t("promo.title")}>
          <div className="flex gap-2">
            <span className="border-input text-muted-foreground flex h-10 flex-1 items-center gap-2 rounded-md border px-3 text-sm">
              <TicketPercent className="size-4" />
              {t("promo.placeholder")}
            </span>
            <span className="flex h-10 items-center rounded-md border px-3 text-sm font-medium">
              {t("promo.apply")}
            </span>
          </div>
        </Box>
      )}
      {tips && (
        <Box title={t("tip.title")}>
          <div className="grid grid-cols-4 gap-1.5">
            {TIP_PERCENTS.map((p) => (
              <span
                key={p}
                className={cn(
                  "flex h-11 items-center justify-center rounded-xl border text-sm font-semibold",
                  p === 10 && "border-primary bg-primary/5 text-primary",
                )}
              >
                {p === 0 ? t("tip.none") : `${p}%`}
              </span>
            ))}
          </div>
        </Box>
      )}
      <span className="bg-primary text-primary-foreground flex h-12 items-center justify-between rounded-2xl px-4 font-semibold">
        {t("submit")}
        <span className="flex items-center gap-1 tabular-nums">
          {formatMoney(subtotal + tip)}
          <ChevronRight className="size-4" />
        </span>
      </span>
    </div>
  );
}

function Box({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="bg-background flex flex-col gap-3 rounded-2xl p-4">
      {title && <h2 className="font-bold">{title}</h2>}
      {children}
    </section>
  );
}

function FakeInput({
  label,
  optional,
  tall,
}: {
  label: string;
  optional?: string;
  tall?: boolean;
}) {
  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {label}
        {optional && <span className="text-muted-foreground font-normal"> ({optional})</span>}
      </span>
      <span className={cn("border-input rounded-md border", tall ? "h-16" : "h-10")} />
    </span>
  );
}
