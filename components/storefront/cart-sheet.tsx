"use client";

import { ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

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
import { formatUZS } from "@/lib/money";
import { cn } from "@/lib/utils";

import { ProductImage } from "./product-image";
import { QuantityStepper } from "./quantity-stepper";
import { useStoreOpen } from "./use-store-open";

/** Pastki "Savat" paneli + savat oynasi. Savat bo'sh bo'lsa ko'rinmaydi. */
export function CartBar({ store }: { store: StorefrontStore }) {
  const t = useTranslations("cart");
  const [open, setOpen] = useState(false);
  const lines = useCartLines(store.slug);
  const count = cartCount(lines);
  const subtotal = cartSubtotal(lines);

  if (count === 0) return null;

  return (
    <>
      <div className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <Button
          size="lg"
          className="mx-auto flex h-12 w-full max-w-2xl justify-between px-4 text-base"
          onClick={() => setOpen(true)}
          aria-label={t("open")}
        >
          <span className="flex items-center gap-2">
            <ShoppingBag />
            {t("items", { count })}
          </span>
          <span className="font-semibold">{formatUZS(subtotal)}</span>
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
  const t = useTranslations("cart");
  const lines = useCartLines(store.slug);
  const setQuantity = useCart((s) => s.setQuantity);
  const clear = useCart((s) => s.clear);
  const isOpenNow = useStoreOpen(store) ?? store.isOpen;

  const subtotal = cartSubtotal(lines);
  const missing = Math.max(0, store.minOrder - subtotal);
  const canCheckout = lines.length > 0 && isOpenNow && missing === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85dvh] w-full max-w-2xl gap-0 rounded-t-2xl"
      >
        <SheetHeader className="flex-row items-center justify-between gap-2 border-b pr-12">
          <SheetTitle>{t("title")}</SheetTitle>
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
          <SheetDescription className="sr-only">
            {t("items", { count: cartCount(lines) })}
          </SheetDescription>
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
                sizes="56px"
                className="size-14 shrink-0 rounded-lg"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="font-medium">{line.name}</p>
                {line.options.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {line.options.map((o) => o.name).join(", ")}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <QuantityStepper
                    size="sm"
                    value={line.quantity}
                    onChange={(q) => setQuantity(store.slug, line.key, q)}
                  />
                  <span className="font-semibold tabular-nums">
                    {formatUZS(unitPrice(line) * line.quantity)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <SheetFooter className="gap-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span className="text-lg font-semibold tabular-nums">{formatUZS(subtotal)}</span>
          </div>
          <p className="text-muted-foreground text-xs">{t("deliveryNote")}</p>
          {!isOpenNow && <p className="text-destructive text-sm">{t("closed")}</p>}
          {isOpenNow && missing > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              {t("addMore", { amount: formatUZS(missing) })}
            </p>
          )}
          {canCheckout ? (
            <Link
              href={`/${store.slug}/checkout`}
              className={cn(buttonVariants({ size: "lg" }), "h-12 text-base")}
              onClick={() => onOpenChange(false)}
            >
              {t("checkout")}
            </Link>
          ) : (
            <Button size="lg" className="h-12 text-base" disabled>
              {t("checkout")}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
