"use client";

import { ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useFormatMoney } from "@/components/currency-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cartCount, cartSubtotal, unitPrice, useCart, useCartLines } from "@/lib/cart-store";
import type { StorefrontStore } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

import { ProductImage } from "./product-image";
import { QuantityStepper } from "./quantity-stepper";
import { useStoreOpen } from "./use-store-open";

/** Pastdagi suzuvchi "Savatni ko'rish" tugmasi + savat varag'i. Savat bo'sh bo'lsa ko'rinmaydi. */
export function CartBar({ store }: { store: StorefrontStore }) {
  const formatMoney = useFormatMoney();
  const t = useTranslations("cart");
  const [open, setOpen] = useState(false);
  const lines = useCartLines(store.slug);
  const count = cartCount(lines);
  const subtotal = cartSubtotal(lines);

  if (count === 0) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          size="lg"
          className="pointer-events-auto mx-auto flex h-14 w-full max-w-2xl justify-between rounded-2xl px-4 text-base shadow-lg"
          onClick={() => setOpen(true)}
        >
          <span className="flex items-center gap-3">
            <span className="relative">
              <ShoppingBag className="size-5" />
              <span className="bg-background text-primary absolute -top-2 -right-2.5 flex size-5 items-center justify-center rounded-full text-xs font-bold">
                {count}
              </span>
            </span>
            {t("view")}
          </span>
          <span className="font-semibold tabular-nums">{formatMoney(subtotal)}</span>
        </Button>
      </div>
      <CartSheet store={store} open={open} onOpenChange={setOpen} />
    </>
  );
}

function CartSheet({
  store,
  open,
  onOpenChange,
}: {
  store: StorefrontStore;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formatMoney = useFormatMoney();
  const t = useTranslations("cart");
  const lines = useCartLines(store.slug);
  const setQuantity = useCart((s) => s.setQuantity);
  const clear = useCart((s) => s.clear);
  const isOpenNow = useStoreOpen(store) ?? store.isOpen;

  const subtotal = cartSubtotal(lines);
  const missing = Math.max(0, store.minOrder - subtotal);
  const progress = store.minOrder > 0 ? Math.min(100, (subtotal / store.minOrder) * 100) : 100;
  const canCheckout = lines.length > 0 && isOpenNow && missing === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[88dvh] w-full max-w-2xl gap-0 rounded-t-3xl"
      >
        <div
          className="bg-muted-foreground/30 mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full"
          aria-hidden
        />
        <SheetHeader className="flex-row items-center justify-between gap-2 border-b pr-12">
          <div>
            <SheetTitle className="text-lg">{t("title")}</SheetTitle>
            <SheetDescription>{store.name}</SheetDescription>
          </div>
          {lines.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                clear(store.slug);
                onOpenChange(false);
              }}
            >
              <Trash2 />
              {t("clear")}
            </Button>
          )}
        </SheetHeader>

        <ul className="flex-1 divide-y overflow-y-auto px-4">
          {lines.length === 0 && (
            <li className="text-muted-foreground py-10 text-center">{t("empty")}</li>
          )}
          {lines.map((line) => (
            <li key={line.key} className="flex gap-3 py-3">
              <ProductImage
                src={line.imageUrl}
                alt=""
                sizes="64px"
                className="size-16 shrink-0 rounded-xl"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="leading-snug font-medium">{line.name}</p>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatMoney(unitPrice(line) * line.quantity)}
                  </span>
                </div>
                {line.options.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {line.options.map((o) => o.name).join(", ")}
                  </p>
                )}
                <QuantityStepper
                  size="sm"
                  className="mt-1 self-start rounded-full"
                  value={line.quantity}
                  onChange={(q) => setQuantity(store.slug, line.key, q)}
                />
              </div>
            </li>
          ))}
        </ul>

        <SheetFooter className="gap-3 border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
          {store.minOrder > 0 && missing > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-muted-foreground text-sm">
                {t("addMore", { amount: formatMoney(missing) })}
              </p>
            </div>
          )}
          {!isOpenNow && <p className="text-destructive text-sm">{t("closed")}</p>}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span className="text-lg font-bold tabular-nums">{formatMoney(subtotal)}</span>
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">{t("deliveryNote")}</p>
          {canCheckout ? (
            <Link
              href={`/${store.slug}/checkout`}
              className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl text-base")}
              onClick={() => onOpenChange(false)}
            >
              {t("checkout")}
            </Link>
          ) : (
            <Button size="lg" className="h-12 rounded-2xl text-base" disabled>
              {t("checkout")}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
