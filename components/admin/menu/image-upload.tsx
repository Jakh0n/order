"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadProductImage } from "@/lib/menu/admin-actions";

const MAX_SIDE = 1200;
const QUALITY = 0.82;

/** Brauzerda kichraytirish (telefondagi 5-10 MB rasm → ~150-300 KB WebP). Bo'lmasa — asl fayl. */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY),
    );
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file; // masalan, brauzer HEIC ni o'qiy olmasa
  }
}

export function ImageUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const t = useTranslations("adminMenu");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File | undefined) {
    if (!file) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", await shrink(file));
      const result = await uploadProductImage(formData);
      if (result.ok) onChange(result.url);
      else toast.error(t(`errors.${result.error}`));
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted relative size-24 shrink-0 overflow-hidden rounded-xl border">
        {value ? (
          <Image src={value} alt="" fill sizes="96px" className="object-cover" />
        ) : (
          <ImagePlus className="text-muted-foreground/50 absolute inset-0 m-auto size-8" />
        )}
        {pending && (
          <div className="bg-background/70 absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}
      </div>
      <div className="flex flex-col items-start gap-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? t("uploading") : value ? t("changeImage") : t("uploadImage")}
        </Button>
        {value && !pending && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onChange(null)}
          >
            <X />
            {t("removeImage")}
          </Button>
        )}
        <p className="text-muted-foreground text-xs">{t("imageHint")}</p>
      </div>
    </div>
  );
}
