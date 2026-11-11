"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { deletePromo, setPromoActive } from "@/lib/promos/actions";
import { cn } from "@/lib/utils";

export interface PromoItemView {
  id: string;
  code: string;
  /** "−10%" / "−₩2,000" */
  discount: string;
  /** Short conditions, already formatted on the server */
  conditions: string[];
  isActive: boolean;
  /** Can't be used anymore even if active */
  state: "active" | "off" | "expired" | "usedUp";
}

export function PromoItem({ promo }: { promo: PromoItemView }) {
  const t = useTranslations("adminPromos");
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function toggle(next: boolean) {
    startTransition(async () => {
      const result = await setPromoActive(promo.id, next);
      if (!result.ok) toast.error(t(`errors.${result.error}`));
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deletePromo(promo.id);
      setConfirmOpen(false);
      if (result.ok) toast.success(t("deleted"));
      else toast.error(t(`errors.${result.error}`));
    });
  }

  const usable = promo.state === "active";

  return (
    <li
      className={cn(
        "bg-card flex items-center gap-3 rounded-xl border p-3 sm:p-4",
        !usable && "opacity-70",
      )}
    >
      {/* Ticket-like discount badge */}
      <div
        className={cn(
          "flex h-14 min-w-20 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed px-2 text-center",
          usable ? "border-primary/40 bg-primary/5 text-primary" : "border-muted-foreground/30",
        )}
      >
        <span className="text-sm leading-none font-black whitespace-nowrap">{promo.discount}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-base font-bold tracking-wide">{promo.code}</p>
          {promo.state !== "active" && (
            <Badge variant="secondary">{t(`state.${promo.state}`)}</Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">{promo.conditions.join(" · ")}</p>
      </div>

      <Switch
        checked={promo.isActive}
        disabled={pending}
        onCheckedChange={toggle}
        aria-label={t("activeToggle", { code: promo.code })}
      />
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={t("delete")}
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg p-2"
      >
        <Trash2 className="size-4" />
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("deleteTitle", { code: promo.code })}
        description={t("deleteHint")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        pending={pending}
        onConfirm={remove}
      />
    </li>
  );
}
