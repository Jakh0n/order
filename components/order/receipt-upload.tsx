"use client";

import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { type ReceiptResult, uploadOrderReceipt } from "@/lib/orders/receipt-actions";
import { shrinkImage } from "@/lib/shrink-image";

// Receipts must stay readable (amounts, account numbers) — larger than menu photos
const RECEIPT_MAX_SIDE = 2000;
const RECEIPT_QUALITY = 0.85;
// Must stay under serverActions.bodySizeLimit (next.config.ts) and RECEIPT_MAX_SIZE (lib/storage.ts)
const RECEIPT_MAX_BYTES = 3_000_000;

export function prepareReceipt(file: File) {
  return shrinkImage(file, RECEIPT_MAX_SIDE, RECEIPT_QUALITY);
}

/** Uploads a receipt to an existing order (used by checkout right after the order is saved) */
export async function sendReceipt(orderId: string, file: File): Promise<ReceiptResult> {
  if (!file.type.startsWith("image/")) return { ok: false, error: "imageType" };
  const prepared = await prepareReceipt(file);
  if (prepared.size > RECEIPT_MAX_BYTES) return { ok: false, error: "imageSize" };

  const formData = new FormData();
  formData.set("orderId", orderId);
  formData.set("file", prepared);
  try {
    return await uploadOrderReceipt(formData);
  } catch {
    // Network error / body too large — never throw (checkout must still open the order page)
    return { ok: false, error: "upload" };
  }
}

/**
 * Receipt picker with preview. Controlled: the parent decides when to upload
 * (checkout — after the order is created, order page — immediately).
 */
export function ReceiptPicker({
  file,
  onChange,
  pending,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  pending?: boolean;
}) {
  const t = useTranslations("receipt");
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        aria-label={t("choose")}
        className="bg-muted relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="text-muted-foreground size-7" />
        )}
        {pending && (
          <span className="bg-background/70 absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin" />
          </span>
        )}
      </button>
      <div className="flex min-w-0 flex-col items-start gap-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) onChange(picked);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? t("uploading") : file ? t("change") : t("choose")}
        </Button>
        {file && !pending && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onChange(null)}
          >
            <X />
            {t("remove")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Order page: receipt status + upload / replace */
export function ReceiptUpload({ orderId, sent }: { orderId: string; sent: boolean }) {
  const t = useTranslations("receipt");
  const [pending, startTransition] = useTransition();
  const [replacing, setReplacing] = useState(false);

  function upload(file: File | null) {
    if (!file) return;
    startTransition(async () => {
      const result = await sendReceipt(orderId, file);
      if (result.ok) {
        toast.success(t("uploaded"));
        setReplacing(false);
      } else {
        toast.error(t(`errors.${result.error}`));
      }
    });
  }

  if (sent && !replacing) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <p className="flex-1">{t("sent")}</p>
        <button
          type="button"
          onClick={() => setReplacing(true)}
          className="shrink-0 font-medium underline underline-offset-2"
        >
          {t("change")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{t("label")}</p>
      <p className="text-muted-foreground text-xs">{t("hint")}</p>
      <ReceiptPicker file={null} onChange={upload} pending={pending} />
    </div>
  );
}
