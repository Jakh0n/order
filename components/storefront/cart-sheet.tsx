"use client";

import { Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

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
import type { MenuProduct, StorefrontStore } from "@/lib/menu-types";
import { useTable } from "@/lib/table-session";
import { cn } from "@/lib/utils";

import { ProductImage } from "./product-image";
import { QuantityStepper } from "./quantity-stepper";
import { validTable } from "./table-banner";
import { useStoreOpen, useTimeSlots } from "./use-store-open";

/** Pastdagi suzuvchi "Savatni ko'rish" tugmasi + savat varag'i. Savat bo'sh bo'lsa ko'rinmaydi. */
export function CartBar({ store, products }: { store: StorefrontStore; products: MenuProduct[] }) {
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
              {/* key → remounts on every change, so the badge "bumps" when something is added */}
              <span
                key={count}
                className="bg-background text-primary motion-safe:animate-in motion-safe:zoom-in-50 absolute -top-2 -right-2.5 flex size-5 items-center justify-center rounded-full text-xs font-bold motion-safe:duration-300"
              >
                {count}
              </span>
            </span>
            {t("view")}
          </span>
          <span className="font-semibold tabular-nums">{formatMoney(subtotal)}</span>
        </Button>
      </div>
      <CartSheet store={store} products={products} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Cheap one-tap items that close the gap to the minimum order */
function minOrderSuggestions(products: MenuProduct[], inCart: Set<string>, missing: number) {
  return products
    .filter((p) => p.isAvailable && p.optionGroups.length === 0 && !inCart.has(p.id))
    .sort((a, b) => {
      // First the cheapest item that covers the gap, then the closest ones below it
      const aCovers = a.price >= missing;
      const bCovers = b.price >= missing;
      if (aCovers !== bCovers) return aCovers ? -1 : 1;
      return aCovers ? a.price - b.price : b.price - a.price;
    })
    .slice(0, 3);
}

function CartSheet({
  store,
  products,
  open,
  onOpenChange,
}: {
  store: StorefrontStore;
  products: MenuProduct[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formatMoney = useFormatMoney();
  const t = useTranslations("cart");
  const lines = useCartLines(store.slug);
  const setQuantity = useCart((s) => s.setQuantity);
  const clear = useCart((s) => s.clear);
  const restore = useCart((s) => s.restore);
  const add = useCart((s) => s.add);
  const isOpenNow = useStoreOpen(store) ?? store.isOpen;
  // Closed now, but there are times to schedule for → pre-order
  const canPreorder = useTimeSlots(store).length > 0;

  // No minimum order at a table (QR) — same rule as the server
  const atTable = validTable(store, useTable(store.slug)) !== null;
  const minOrder = atTable ? 0 : store.minOrder;

  const subtotal = cartSubtotal(lines);
  const missing = Math.max(0, minOrder - subtotal);
  const progress = minOrder > 0 ? Math.min(100, (subtotal / minOrder) * 100) : 100;
  const canCheckout = lines.length > 0 && (isOpenNow || canPreorder) && missing === 0;
  const suggestions =
    missing > 0
      ? minOrderSuggestions(products, new Set(lines.map((l) => l.productId)), missing)
      : [];

  function clearWithUndo() {
    const snapshot = lines;
    clear(store.slug);
    onOpenChange(false);
    toast(t("cleared"), {
      action: { label: t("undo"), onClick: () => restore(store.slug, snapshot) },
      duration: 5000,
    });
  }

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
              onClick={clearWithUndo}
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
          {minOrder > 0 && missing > 0 && (
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
              {suggestions.length > 0 && (
                <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pt-1">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        add(store.slug, {
                          productId: p.id,
                          name: p.name,
                          imageUrl: p.imageUrl,
                          basePrice: p.price,
                          options: [],
                        })
                      }
                      className="hover:bg-muted flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors"
                    >
                      <Plus className="text-primary size-4" aria-hidden />
                      {p.name}
                      <span className="text-muted-foreground tabular-nums">
                        {formatMoney(p.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!isOpenNow &&
            (canPreorder ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">{t("preorder")}</p>
            ) : (
              <p className="text-destructive text-sm">{t("closed")}</p>
            ))}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span className="text-lg font-bold tabular-nums">{formatMoney(subtotal)}</span>
          </div>
          {store.deliveryEnabled && (
            <p className="text-muted-foreground -mt-2 text-xs">
              {store.deliveryFee > 0
                ? t("deliveryFee", { amount: formatMoney(store.deliveryFee) })
                : t("freeDelivery")}
            </p>
          )}
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
