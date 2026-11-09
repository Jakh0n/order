"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useFormatMoney } from "@/components/currency-provider";
import { lineKey, useCart, useCartLines } from "@/lib/cart-store";
import type { MenuProduct } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

import { ProductDialog } from "./product-dialog";
import { ProductImage } from "./product-image";

export function ProductCard({ cartKey, product }: { cartKey: string; product: MenuProduct }) {
  const formatMoney = useFormatMoney();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const lines = useCartLines(cartKey);
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);

  const hasOptions = product.optionGroups.length > 0;
  const inCart = lines
    .filter((l) => l.productId === product.id)
    .reduce((sum, l) => sum + l.quantity, 0);
  const simpleKey = lineKey(product.id, []);
  const showStepper = !hasOptions && inCart > 0;
  const soldOut = !product.isAvailable;

  function quickAdd() {
    if (hasOptions) {
      setOpen(true);
      return;
    }
    add(cartKey, {
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      basePrice: product.price,
      options: [],
    });
  }

  return (
    <article className="relative flex gap-3 py-3">
      {/* Butun kartochka bosiladi — tafsilot oynasi */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute inset-0 z-0 rounded-lg"
        aria-label={soldOut ? `${product.name} — ${t("menu.unavailable")}` : product.name}
      />

      <div
        className={cn(
          "pointer-events-none relative flex min-w-0 flex-1 flex-col gap-1",
          soldOut && "opacity-60",
        )}
      >
        <h3 className="leading-snug font-semibold">{product.name}</h3>
        {product.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">{product.description}</p>
        )}
        <p className="mt-auto flex flex-wrap items-center gap-x-2 pt-1 font-semibold">
          <span className={cn(soldOut && "text-muted-foreground line-through")}>
            {formatMoney(product.price)}
          </span>
          {soldOut && (
            <span className="text-muted-foreground text-xs font-medium">
              {t("menu.unavailable")}
            </span>
          )}
        </p>
      </div>

      <div className="relative shrink-0">
        <ProductImage
          src={product.imageUrl}
          alt=""
          sizes="104px"
          className={cn(
            "pointer-events-none size-26 rounded-xl",
            soldOut && "opacity-50 grayscale",
          )}
        />

        {hasOptions && inCart > 0 && (
          <span
            className="bg-primary text-primary-foreground pointer-events-none absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full text-xs font-bold"
            aria-label={t("product.inCart", { count: inCart })}
          >
            {inCart}
          </span>
        )}

        {/* Rasm ustidagi "+" yoki −/+ (take.app kabi). Tugagan taomda tugma yo'q */}
        <div className={cn("absolute -right-1 -bottom-2 z-10", soldOut && "hidden")}>
          {showStepper ? (
            <div className="bg-background ring-border flex items-center rounded-full shadow-md ring-1">
              <StepButton
                label={inCart === 1 ? t("cart.remove") : t("product.decrease")}
                onClick={() => setQuantity(cartKey, simpleKey, inCart - 1)}
              >
                {inCart === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
              </StepButton>
              <span className="min-w-5 text-center text-sm font-semibold tabular-nums">
                {inCart}
              </span>
              <StepButton
                label={t("product.increase")}
                onClick={() => setQuantity(cartKey, simpleKey, inCart + 1)}
              >
                <Plus className="size-4" />
              </StepButton>
            </div>
          ) : (
            <StepButton
              label={t("menu.add")}
              onClick={quickAdd}
              className="bg-background ring-border shadow-md ring-1"
            >
              <Plus className="size-5" />
            </StepButton>
          )}
        </div>
      </div>

      <ProductDialog cartKey={cartKey} product={product} open={open} onOpenChange={setOpen} />
    </article>
  );
}

function StepButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "text-primary hover:bg-primary/10 flex size-9 items-center justify-center rounded-full transition-colors active:scale-95",
        className,
      )}
    >
      {children}
    </button>
  );
}
