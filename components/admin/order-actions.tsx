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
}: {
  orderId: string;
  number: number;
  status: OrderStatusValue;
  type: OrderTypeValue;
  paid: boolean;
}) {
  const t = useTranslations("adminOrders");
  const [pending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const next = nextStatus(status, type);

  function run(action: () => Promise<AdminActionResult>, onDone?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(t("saved"));
        onDone?.();
      } else {
        toast.error(t(`errors.${result.error}`));
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => updateOrderStatus(orderId, next))}
        >
          {pending && <Loader2 className="animate-spin" />}
          {t(NEXT_LABEL[next] ?? "complete")}
        </Button>
      )}

      <Button
        size="sm"
        variant={paid ? "secondary" : "outline"}
        disabled={pending}
        onClick={() => run(() => setOrderPaid(orderId, !paid))}
      >
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
                      () => updateOrderStatus(orderId, "CANCELLED"),
                      () => setConfirmCancel(false),
                    )
                  }
                >
                  {pending && <Loader2 className="animate-spin" />}
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
