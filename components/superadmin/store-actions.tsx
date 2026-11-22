"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  deleteStore,
  extendPaidPlan,
  setFreePlan,
  setStoreBlocked,
  type SuperadminResult,
} from "@/lib/superadmin/actions";

export function StoreActions({
  storeId,
  name,
  slug,
  plan,
  isBlocked,
}: {
  storeId: string;
  name: string;
  slug: string;
  plan: "FREE" | "PAID";
  isBlocked: boolean;
}) {
  const t = useTranslations("superadmin");
  const [pending, startTransition] = useTransition();
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typedSlug, setTypedSlug] = useState("");

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

      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        disabled={pending}
        onClick={() => {
          setTypedSlug("");
          setConfirmDelete(true);
        }}
      >
        {t("delete")}
      </Button>

      {/* Type the slug to confirm: deleting can't be undone */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle>{t("deleteTitle", { name })}</DialogTitle>
          <DialogDescription>{t("deleteHint")}</DialogDescription>
          <label className="flex flex-col gap-1.5 text-sm">
            {t.rich("deleteTypeSlug", {
              slug,
              b: (chunks) => <span className="font-mono font-semibold">{chunks}</span>,
            })}
            <Input
              value={typedSlug}
              onChange={(e) => setTypedSlug(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-10 font-mono"
            />
          </label>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t("cancel")}</DialogClose>
            <Button
              variant="destructive"
              disabled={pending || typedSlug.trim().toLowerCase() !== slug}
              onClick={() =>
                run(
                  () => deleteStore(storeId, typedSlug),
                  () => setConfirmDelete(false),
                )
              }
            >
              {pending && <Loader2 className="animate-spin" />}
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
