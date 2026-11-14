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
import { FOUNDING_PRO_MONTHS } from "@/lib/plan";

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
      {/* Yearly Pro was paid ($150) */}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => extendPaidPlan(storeId, 12))}
      >
        {t("extendYear")}
      </Button>
      {/* Founding offer (first stores): free Pro for a few months, one tap instead of six */}
      {plan === "FREE" && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => extendPaidPlan(storeId, FOUNDING_PRO_MONTHS))}
        >
          {t("founding", { months: FOUNDING_PRO_MONTHS })}
        </Button>
      )}
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
