"use client";

import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useFormatMoney } from "@/components/currency-provider";
import { ProductImage } from "@/components/storefront/product-image";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { setProductAvailable } from "@/lib/menu/admin-actions";
import type { AdminMenuProduct } from "@/lib/menu/admin-data";
import { cn } from "@/lib/utils";

import { useMenuAction } from "./use-menu-action";

export function ProductRow({
  product,
  canMoveUp,
  canMoveDown,
  onMove,
  reordering,
}: {
  product: AdminMenuProduct;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: -1 | 1) => void;
  reordering: boolean;
}) {
  const formatMoney = useFormatMoney();
  const t = useTranslations("adminMenu");
  const { pending, run } = useMenuAction();
  const href = `/admin/menu/products/${product.id}`;

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        <ProductImage
          src={product.imageUrl}
          alt=""
          sizes="48px"
          className={cn("size-12 shrink-0 rounded-lg", !product.isAvailable && "grayscale")}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn("truncate font-medium", !product.isAvailable && "text-muted-foreground")}
          >
            {product.name}
          </p>
          <p className="text-muted-foreground text-sm">
            {formatMoney(product.price)}
            {product.optionGroupCount > 0 &&
              ` · ${t("variants", { count: product.optionGroupCount })}`}
          </p>
        </div>
        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
      </Link>

      <label className="text-muted-foreground flex w-24 shrink-0 flex-col items-center gap-1 text-xs">
        <Switch
          checked={product.isAvailable}
          disabled={pending}
          onCheckedChange={(isAvailable) => run(() => setProductAvailable(product.id, isAvailable))}
        />
        <span className={cn(!product.isAvailable && "font-medium text-amber-600")}>
          {product.isAvailable ? t("available") : t("unavailable")}
        </span>
      </label>

      <div className="hidden flex-col sm:flex">
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={t("moveUp")}
          disabled={reordering || !canMoveUp}
          onClick={() => onMove(-1)}
        >
          <ArrowUp />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={t("moveDown")}
          disabled={reordering || !canMoveDown}
          onClick={() => onMove(1)}
        >
          <ArrowDown />
        </Button>
      </div>
    </li>
  );
}
