"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { type CartOption, useCart } from "@/lib/cart-store";
import type { MenuOptionGroup, MenuProduct } from "@/lib/menu-types";
import { formatUZS } from "@/lib/money";

import { ProductImage } from "./product-image";
import { QuantityStepper } from "./quantity-stepper";

export function ProductDialog({
  slug,
  product,
  open,
  onOpenChange,
}: {
  slug: string;
  product: MenuProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-md">
        {/* Har ochilishda tanlov qaytadan boshlanadi (Popup yopilganda unmount bo'ladi) */}
        <ProductForm slug={slug} product={product} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function optionPrice(price: number) {
  if (price === 0) return null;
  return price > 0 ? `+${formatUZS(price)}` : formatUZS(price);
}

function ProductForm({
  slug,
  product,
  onDone,
}: {
  slug: string;
  product: MenuProduct;
  onDone: () => void;
}) {
  const t = useTranslations("product");
  const add = useCart((s) => s.add);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);

  const chosen: CartOption[] = product.optionGroups.flatMap((g) =>
    g.options
      .filter((o) => selected[g.id]?.includes(o.id))
      .map((o) => ({ id: o.id, groupId: g.id, name: o.name, price: o.price })),
  );
  const unit = product.price + chosen.reduce((sum, o) => sum + o.price, 0);
  const isValid = product.optionGroups.every(
    (g) => !g.required || (selected[g.id]?.length ?? 0) > 0,
  );

  function toggle(group: MenuOptionGroup, optionId: string, checked: boolean) {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (!checked) return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      if (group.maxSelect === 1) return { ...prev, [group.id]: [optionId] };
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  function handleAdd() {
    if (!isValid) return;
    add(
      slug,
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
      {product.imageUrl && (
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          sizes="(min-width: 640px) 448px, 100vw"
          className="aspect-[4/3] w-full"
        />
      )}

      <div className="flex flex-col gap-1 p-4 pr-12">
        <DialogTitle className="text-lg font-semibold">{product.name}</DialogTitle>
        {product.description && (
          <DialogDescription className="text-muted-foreground text-sm">
            {product.description}
          </DialogDescription>
        )}
        <p className="font-semibold">{formatUZS(product.price)}</p>
      </div>

      {product.optionGroups.map((group) => {
        const values = selected[group.id] ?? [];
        const single = group.maxSelect === 1;
        return (
          <fieldset key={group.id} className="border-t px-4 py-3">
            <legend className="sr-only">{group.name}</legend>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{group.name}</p>
                <p className="text-muted-foreground text-xs">
                  {single ? t("chooseOne") : t("chooseUpTo", { count: group.maxSelect })}
                </p>
              </div>
              <Badge variant={group.required ? "default" : "secondary"}>
                {group.required ? t("required") : t("optional")}
              </Badge>
            </div>

            {single && group.required ? (
              <RadioGroup
                value={values[0] ?? null}
                onValueChange={(value) => toggle(group, String(value), true)}
                className="gap-0"
              >
                {group.options.map((o) => (
                  <label
                    key={o.id}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md py-2"
                  >
                    <RadioGroupItem value={o.id} />
                    <span className="flex-1">{o.name}</span>
                    <span className="text-muted-foreground text-sm">{optionPrice(o.price)}</span>
                  </label>
                ))}
              </RadioGroup>
            ) : (
              <div className="flex flex-col">
                {group.options.map((o) => {
                  const checked = values.includes(o.id);
                  const limitReached = !single && !checked && values.length >= group.maxSelect;
                  return (
                    <label
                      key={o.id}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md py-2 has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50"
                    >
                      <Checkbox
                        checked={checked}
                        disabled={limitReached}
                        onCheckedChange={(next) => toggle(group, o.id, next)}
                      />
                      <span className="flex-1">{o.name}</span>
                      <span className="text-muted-foreground text-sm">{optionPrice(o.price)}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        );
      })}

      <DialogFooter className="bg-popover sticky bottom-0 flex-row items-center gap-3 border-t p-4 sm:justify-between">
        <QuantityStepper value={quantity} onChange={setQuantity} min={1} />
        <Button className="h-10 flex-1" disabled={!isValid} onClick={handleAdd}>
          {t("addToCart", { price: formatUZS(unit * quantity) })}
        </Button>
      </DialogFooter>
    </>
  );
}
