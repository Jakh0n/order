"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { MAX_QUANTITY } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  size = "default",
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  size?: "sm" | "default";
  className?: string;
}) {
  const t = useTranslations("product");
  const btn = size === "sm" ? "icon-sm" : "icon";
  // At 1 with min 0 the next tap removes the line — say so with a trash icon
  const removes = min === 0 && value === 1;

  return (
    <div className={cn("bg-background flex items-center gap-1 rounded-lg border", className)}>
      <Button
        type="button"
        variant="ghost"
        size={btn}
        aria-label={removes ? t("remove") : t("decrease")}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={cn(removes && "text-destructive hover:text-destructive")}
      >
        {removes ? <Trash2 /> : <Minus />}
      </Button>
      <span
        className={cn("min-w-6 text-center font-medium tabular-nums", size === "sm" && "text-sm")}
        aria-live="polite"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size={btn}
        aria-label={t("increase")}
        disabled={value >= MAX_QUANTITY}
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}
