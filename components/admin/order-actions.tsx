"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type AdminActionResult,
  revertOrderStatus,
  setOrderPaid,
  updateOrderStatus,
} from "@/lib/orders/admin-actions";
import {
  isFinalStatus,
  nextStatus,
  type OrderStatusValue,
  type OrderTypeValue,
} from "@/lib/orders/status";

const NEXT_LABEL: Partial<Record<OrderStatusValue, string>> = {
  ACCEPTED: "accept",
  READY: "ready",
  ON_THE_WAY: "onTheWay",
  COMPLETED: "complete",
};

export function OrderActions({
  orderId,
  number,
  status,
  type,
  paid,
  compact,
}: {
  orderId: string;
  number: number;
  status: OrderStatusValue;
  type: OrderTypeValue;
  paid: boolean;
  /** List row: only the main "next step" button */
  compact?: boolean;
}) {
  const t = useTranslations("adminOrders");
  const [pending, startTransition] = useTransition();
  // Which button is busy — the spinner shows on that one, all are disabled
  const [busy, setBusy] = useState<"next" | "paid" | "cancel" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const next = nextStatus(status, type);

  function run(
    which: "next" | "paid" | "cancel",
    action: () => Promise<AdminActionResult>,
    onDone?: () => void,
  ) {
    setBusy(which);
    startTransition(async () => {
      const result = await action();
      setBusy(null);
      if (result.ok) {
        onDone?.();
      } else {
        toast.error(t(`errors.${result.error}`));
      }
    });
  }

  function advance(to: OrderStatusValue) {
    run(
      "next",
      () => updateOrderStatus(orderId, to),
      () =>
        // A mistaken tap is easy to make in a busy kitchen — offer a way back
        toast.success(t("statusChanged", { number }), {
          duration: 6000,
          action: {
            label: t("undo"),
            onClick: async () => {
              const result = await revertOrderStatus(orderId, to, status);
              if (!result.ok) toast.error(t(`errors.${result.error}`));
            },
          },
        }),
    );
  }

  if (compact) {
    if (!next) return null;
    return (
      <Button disabled={pending} onClick={() => advance(next)} className="h-10 min-w-24">
        {busy === "next" && <Loader2 className="animate-spin" />}
        {t(NEXT_LABEL[next] ?? "complete")}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next && (
        <Button size="sm" disabled={pending} onClick={() => advance(next)}>
          {busy === "next" && <Loader2 className="animate-spin" />}
          {t(NEXT_LABEL[next] ?? "complete")}
        </Button>
      )}

      <Button
        size="sm"
        variant={paid ? "secondary" : "outline"}
        disabled={pending}
        onClick={() =>
          run(
            "paid",
            () => setOrderPaid(orderId, !paid),
            () => toast.success(t("saved")),
          )
        }
      >
        {busy === "paid" && <Loader2 className="animate-spin" />}
        {paid ? t("markUnpaid") : t("markPaid")}
      </Button>

      {!isFinalStatus(status) && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={pending}
            onClick={() => setConfirmCancel(true)}
          >
            {t("cancel")}
          </Button>
          <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
            <DialogContent>
              <DialogTitle>{t("cancelTitle", { number })}</DialogTitle>
              <DialogDescription>{t("cancelHint")}</DialogDescription>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>{t("keep")}</DialogClose>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    run(
                      "cancel",
                      () => updateOrderStatus(orderId, "CANCELLED"),
                      () => {
                        setConfirmCancel(false);
                        toast.success(t("saved"));
                      },
                    )
                  }
                >
                  {busy === "cancel" && <Loader2 className="animate-spin" />}
                  {t("cancel")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
