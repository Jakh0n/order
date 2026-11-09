"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useFormatMoney } from "@/components/currency-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { type CartOption, useCart } from "@/lib/cart-store";
import type { MenuOptionGroup, MenuProduct } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

import { ProductImage } from "./product-image";
import { QuantityStepper } from "./quantity-stepper";

/** Telefonda pastdan chiqadigan varaq, katta ekranda markazdagi oyna (take.app kabi) */
const SHEET_CLASS =
  // flex (not grid): in a height-limited grid the photo row gets squeezed and the title slides under it
  "flex flex-col [&>*]:shrink-0 " +
  "top-auto bottom-0 left-0 max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-b-none rounded-t-3xl p-0 " +
  "sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[88dvh] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl";

export function ProductDialog({
  cartKey,
  product,
  open,
  onOpenChange,
}: {
  cartKey: string;
  product: MenuProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={SHEET_CLASS}
        // Sichqoncha/barmoq bilan ochilganda birinchi variantga fokus qo'yilmasin —
        // aks holda u tanlangandek ko'rinadi. Klaviatura bilan ochilsa odatiy xatti-harakat.
        initialFocus={(type) => type === "keyboard"}
      >
        {/* Har ochilishda tanlov qaytadan boshlanadi (Popup yopilganda unmount bo'ladi) */}
        <ProductForm cartKey={cartKey} product={product} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function optionPrice(price: number, format: (minor: number) => string) {
  if (price === 0) return null;
  return price > 0 ? `+${format(price)}` : format(price);
}

function ProductForm({
  cartKey,
  product,
  onDone,
}: {
  cartKey: string;
  product: MenuProduct;
  onDone: () => void;
}) {
  const formatMoney = useFormatMoney();
  const t = useTranslations("product");
  const tMenu = useTranslations("menu");
  const add = useCart((s) => s.add);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  // Majburiy tanlov ogohlantirishi faqat "Qo'shish" bosilgandan keyin
  const [attempted, setAttempted] = useState(false);

  const chosen: CartOption[] = product.optionGroups.flatMap((g) =>
    g.options
      .filter((o) => selected[g.id]?.includes(o.id))
      .map((o) => ({ id: o.id, groupId: g.id, name: o.name, price: o.price })),
  );
  const unit = product.price + chosen.reduce((sum, o) => sum + o.price, 0);
  const missingRequired = product.optionGroups.filter(
    (g) => g.required && (selected[g.id]?.length ?? 0) === 0,
  );

  function toggle(group: MenuOptionGroup, optionId: string) {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (current.includes(optionId)) {
        // Majburiy bitta tanlovli guruhda tanlovni bekor qilib bo'lmaydi — faqat almashtirish
        if (group.required && group.maxSelect === 1) return prev;
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (group.maxSelect === 1) return { ...prev, [group.id]: [optionId] };
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  function handleAdd() {
    if (missingRequired.length > 0) {
      setAttempted(true);
      // Birinchi tanlanmagan majburiy guruhga olib boramiz va fokusni birinchi variantga qo'yamiz
      const group = document.getElementById(`group-${missingRequired[0].id}`);
      group?.scrollIntoView({ behavior: "smooth", block: "center" });
      group
        ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus({ preventScroll: true });
      return;
    }
    add(
      cartKey,
      {
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        basePrice: product.price,
        options: chosen,
      },
      quantity,
    );
    toast.success(t("added"), { description: product.name });
    onDone();
  }

  return (
    <>
      {/* Telefonda tortib yopish uchun ko'rinadigan tutqich */}
      <div
        className="bg-muted-foreground/30 mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full sm:hidden"
        aria-hidden
      />

      {product.imageUrl && (
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          sizes="(min-width: 640px) 448px, 100vw"
          className="mt-2 aspect-[4/3] w-full sm:mt-0"
        />
      )}

      <div className="flex flex-col gap-1.5 px-4 pt-4 pr-12 pb-3">
        <DialogTitle className="text-xl font-bold">{product.name}</DialogTitle>
        {product.description && (
          <DialogDescription className="text-muted-foreground text-sm">
            {product.description}
          </DialogDescription>
        )}
        <p className="text-lg font-semibold">{formatMoney(product.price)}</p>
      </div>

      {product.optionGroups.map((group) => {
        const values = selected[group.id] ?? [];
        const single = group.maxSelect === 1;
        const missing = attempted && missingRequired.includes(group);
        return (
          <fieldset
            key={group.id}
            id={`group-${group.id}`}
            className="border-muted border-t-8 px-4 py-4"
          >
            <legend className="sr-only">{group.name}</legend>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{group.name}</p>
                <p
                  className={cn(
                    "text-xs",
                    missing ? "font-medium text-amber-600" : "text-muted-foreground",
                  )}
                >
                  {single ? t("chooseOne") : t("chooseUpTo", { count: group.maxSelect })}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  group.required
                    ? values.length > 0
                      ? "bg-primary/10 text-primary"
                      : "bg-foreground text-background"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {group.required ? (
                  values.length > 0 ? (
                    <Check className="size-3.5" />
                  ) : (
                    t("required")
                  )
                ) : (
                  t("optional")
                )}
              </span>
            </div>

            <div className="flex flex-col gap-2" role={single ? "radiogroup" : "group"}>
              {group.options.map((o) => {
                const checked = values.includes(o.id);
                const disabled = !single && !checked && values.length >= group.maxSelect;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={single ? "radio" : "checkbox"}
                    aria-checked={checked}
                    disabled={disabled}
                    onClick={() => toggle(group, o.id)}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left transition-colors disabled:opacity-40",
                      checked ? "border-primary bg-primary/5" : "hover:bg-muted/60",
                      missing && !checked && "border-amber-300",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center border-2",
                        single ? "rounded-full" : "rounded-md",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                      aria-hidden
                    >
                      {checked &&
                        (single ? (
                          <span className="bg-primary-foreground size-2 rounded-full" />
                        ) : (
                          <Check className="size-3.5" />
                        ))}
                    </span>
                    <span className="flex-1">{o.name}</span>
                    <span className="text-muted-foreground text-sm">
                      {optionPrice(o.price, formatMoney)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="bg-popover sticky bottom-0 flex items-center gap-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {!product.isAvailable ? (
          <Button className="h-11 flex-1 rounded-full text-base" disabled>
            {tMenu("unavailable")}
          </Button>
        ) : (
          <>
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              min={1}
              className="rounded-full"
            />
            <Button
              className={cn(
                "h-11 flex-1 justify-between rounded-full px-5 text-base",
                missingRequired.length > 0 && "opacity-60",
              )}
              onClick={handleAdd}
            >
              <span>{t("addShort")}</span>
              <span className="font-semibold tabular-nums">{formatMoney(unit * quantity)}</span>
            </Button>
          </>
        )}
      </div>
    </>
  );
}
