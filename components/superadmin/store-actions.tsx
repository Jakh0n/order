"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  extendPaidPlan,
  setFreePlan,
  setStoreBlocked,
  type SuperadminResult,
} from "@/lib/superadmin/actions";

export function StoreActions({
  storeId,
  name,
  plan,
  isBlocked,
}: {
  storeId: string;
  name: string;
  plan: "FREE" | "PAID";
  isBlocked: boolean;
}) {
  const t = useTranslations("superadmin");
  const [pending, startTransition] = useTransition();
  const [confirmBlock, setConfirmBlock] = useState(false);

  function run(action: () => Promise<SuperadminResult>, onDone?: () => void) {
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
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => extendPaidPlan(storeId, 1))}
      >
        {t("extend")}
      </Button>
      {plan === "PAID" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => setFreePlan(storeId))}
        >
          {t("makeFree")}
        </Button>
      )}
      {isBlocked ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => setStoreBlocked(storeId, false))}
        >
          {t("unblock")}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={pending}
          onClick={() => setConfirmBlock(true)}
        >
          {t("block")}
        </Button>
      )}

      <ConfirmDialog
        open={confirmBlock}
        onOpenChange={setConfirmBlock}
        title={t("blockTitle", { name })}
        description={t("blockHint")}
        confirmLabel={t("block")}
        cancelLabel={t("cancel")}
        pending={pending}
        onConfirm={() =>
          run(
            () => setStoreBlocked(storeId, true),
            () => setConfirmBlock(false),
          )
        }
      />
    </div>
  );
}
