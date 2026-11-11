"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadProductImage } from "@/lib/menu/admin-actions";
import { shrinkImage } from "@/lib/shrink-image";
import { cn } from "@/lib/utils";

export function ImageUpload({
  value,
  onChange,
  wide = false,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Wide preview (store cover) instead of a square */
  wide?: boolean;
}) {
  const t = useTranslations("adminMenu");
  const { inputRef, pending, handleFile } = useImageUpload(onChange);

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "bg-muted relative shrink-0 overflow-hidden rounded-xl border",
          wide ? "aspect-[3/1] w-40 sm:w-56" : "size-24",
        )}
      >
        {value ? (
          <Image src={value} alt="" fill sizes={wide ? "224px" : "96px"} className="object-cover" />
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

/**
 * Upload logic without UI (shrink in the browser → store's folder in Supabase).
 * Render your own button (onClick: inputRef.current?.click()) and a hidden
 * <input type="file" ref={inputRef} onChange={…handleFile} />.
 */
export function useImageUpload(onChange: (url: string) => void) {
  const t = useTranslations("adminMenu");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File | undefined) {
    if (!file) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", await shrinkImage(file));
      const result = await uploadProductImage(formData);
      if (result.ok) onChange(result.url);
      else toast.error(t(`errors.${result.error}`));
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return { inputRef, pending, handleFile };
}
