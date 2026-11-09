"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";
import { getReorderLines } from "@/lib/orders/reorder-actions";

/** Puts this order's items back into the cart and opens the store menu */
export function ReorderButton({
  orderId,
  variant = "outline",
}: {
  orderId: string;
  variant?: "default" | "outline";
}) {
  const t = useTranslations("order");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function reorder() {
    startTransition(async () => {
      const result = await getReorderLines(orderId);
      if (!result.ok) {
        toast.error(t(`reorderErrors.${result.error}`));
        return;
      }
      if (result.lines.length === 0) {
        toast.error(t("reorderNone"));
        return;
      }
      // The cart may not be loaded from localStorage yet on this page
      await useCart.persist.rehydrate();
      const add = useCart.getState().add;
      for (const { quantity, ...line } of result.lines) add(result.slug, line, quantity);
      if (result.skipped > 0) toast(t("reorderSkipped", { count: result.skipped }));
      router.push(`/${result.slug}`);
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={variant === "outline" ? "bg-background" : undefined}
      disabled={pending}
      onClick={reorder}
    >
      {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
      {t("reorder")}
    </Button>
  );
}
