"use client";

import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { setStoreAccepting } from "@/lib/settings/actions";
import { cn } from "@/lib/utils";

/**
 * "Accepting orders" switch in the admin sidebar — the most-used setting on a busy day.
 * Optimistic: flips at once, rolls back if saving fails.
 */
export function StoreOpenToggle({
  isOpen,
  compact = false,
}: {
  isOpen: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("admin");
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useOptimistic(isOpen);

  function change(next: boolean) {
    startTransition(async () => {
      setOpen(next);
      const result = await setStoreAccepting(next);
      if (!result.ok) toast.error(t("openToggleFailed"));
      else toast.success(next ? t("nowAccepting") : t("nowPaused"));
    });
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg text-sm font-medium",
        compact ? "" : "bg-muted/60 w-full justify-between px-3 py-2",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn("size-2 rounded-full", open ? "bg-emerald-500" : "bg-amber-500")}
          aria-hidden
        />
        <span className={cn(compact && "sr-only sm:not-sr-only")}>
          {open ? t("accepting") : t("paused")}
        </span>
      </span>
      <Switch
        checked={open}
        disabled={pending}
        onCheckedChange={change}
        aria-label={t("acceptingToggle")}
      />
    </label>
  );
}
