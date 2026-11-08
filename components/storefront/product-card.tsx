"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { lineKey, useCart, useCartLines } from "@/lib/cart-store";
import type { MenuProduct } from "@/lib/menu-types";
import { formatUZS } from "@/lib/money";

import { ProductDialog } from "./product-dialog";
import { ProductImage } from "./product-image";
import { QuantityStepper } from "./quantity-stepper";

export function ProductCard({ slug, product }: { slug: string; product: MenuProduct }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const lines = useCartLines(slug);
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);

  const hasOptions = product.optionGroups.length > 0;
  const inCart = lines
    .filter((l) => l.productId === product.id)
    .reduce((sum, l) => sum + l.quantity, 0);
  const simpleKey = lineKey(product.id, []);

  function quickAdd() {
    if (hasOptions) {
      setOpen(true);
      return;
    }
    add(slug, {
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      basePrice: product.price,
      options: [],
    });
  }

  return (
    <article className="flex gap-3 py-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
      >
        <h3 className="font-medium">{product.name}</h3>
        {product.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">{product.description}</p>
        )}
        <p className="mt-auto pt-1 font-semibold">{formatUZS(product.price)}</p>
        {hasOptions && inCart > 0 && (
          <p className="text-primary text-xs">{t("product.inCart", { count: inCart })}</p>
        )}
      </button>

      <div className="flex w-24 shrink-0 flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block size-24 overflow-hidden rounded-xl"
          aria-label={product.name}
        >
          <ProductImage src={product.imageUrl} alt="" sizes="96px" className="size-full" />
        </button>

        {!hasOptions && inCart > 0 ? (
          <QuantityStepper
            size="sm"
            value={inCart}
            onChange={(q) => setQuantity(slug, simpleKey, q)}
          />
        ) : (
          <Button size="sm" variant="secondary" className="w-full" onClick={quickAdd}>
            <Plus />
            {t("menu.add")}
          </Button>
        )}
      </div>

      <ProductDialog slug={slug} product={product} open={open} onOpenChange={setOpen} />
    </article>
  );
}
