"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  LayoutGrid,
  List,
  Loader2,
  RotateCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/menu/image-upload";
import { PREVIEW_MESSAGE } from "@/components/storefront/preview-bridge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BRAND_PRESETS, isHexColor, isLowContrast, PAGE_BACKGROUNDS } from "@/lib/design";
import { saveDesign } from "@/lib/settings/actions";
import { cn } from "@/lib/utils";
import { type DesignInput, designSchema } from "@/lib/validators";

const DEFAULT_BRAND = "#16a05d";
const BG_SWATCH = { gray: "#f4f4f5", white: "#ffffff", cream: "#faf6ee" } as const;

/** Design page: form + live phone preview of the real store page */
export function DesignForm({ slug, defaultValues }: { slug: string; defaultValues: DesignInput }) {
  const t = useTranslations("design");
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DesignInput>({ resolver: zodResolver(designSchema), defaultValues });
  const [brandColor, pageBackground, description, announcement] = useWatch({
    control,
    name: ["brandColor", "pageBackground", "description", "announcement"],
  });
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameKey, setFrameKey] = useState(0);
  const color = isHexColor(brandColor) ? brandColor : DEFAULT_BRAND;
  const errorText = (key?: string) => (key ? t(`errors.${key}`) : null);

  // Live colors in the preview (unsaved) — the store page applies them (PreviewBridge)
  useEffect(() => {
    const send = () =>
      frameRef.current?.contentWindow?.postMessage(
        { type: PREVIEW_MESSAGE, brandColor: color, pageBackground },
        window.location.origin,
      );
    send();
    const onReady = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === `${PREVIEW_MESSAGE}:ready`)
        send();
    };
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [color, pageBackground, frameKey]);

  async function onSubmit(values: DesignInput) {
    const result = await saveDesign(values);
    if (!result.ok) {
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof DesignInput, { message });
      }
      toast.error(t(`errors.${result.error}`));
      return;
    }
    toast.success(t("saved"));
    reset(values);
    // Text, images and layout show after saving: reload the preview
    setFrameKey((k) => k + 1);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Card title={t("profile")}>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <Field label={t("logo")}>
              <Controller
                control={control}
                name="logoUrl"
                render={({ field }) => (
                  <ImageUpload value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            <Field label={t("cover")} hint={t("coverHint")}>
              <Controller
                control={control}
                name="coverUrl"
                render={({ field }) => (
                  <ImageUpload value={field.value} onChange={field.onChange} wide />
                )}
              />
            </Field>
          </div>
          <Field label={t("name")} htmlFor="name" error={errorText(errors.name?.message)}>
            <Input id="name" maxLength={80} aria-invalid={!!errors.name} {...register("name")} />
          </Field>
          <Field
            label={t("description")}
            htmlFor="description"
            hint={t("formatHint")}
            error={errorText(errors.description?.message)}
            counter={`${description?.length ?? 0}/300`}
          >
            <Textarea
              id="description"
              rows={3}
              maxLength={300}
              placeholder={t("descriptionPlaceholder")}
              {...register("description")}
            />
          </Field>
          <Field
            label={t("announcement")}
            htmlFor="announcement"
            hint={t("announcementHint")}
            error={errorText(errors.announcement?.message)}
            counter={`${announcement?.length ?? 0}/160`}
          >
            <Input
              id="announcement"
              maxLength={160}
              placeholder={t("announcementPlaceholder")}
              {...register("announcement")}
            />
          </Field>
        </Card>

        <Card title={t("colors")}>
          <Field label={t("brandColor")} hint={t("brandColorHint")}>
            <div
              className="flex flex-wrap items-center gap-2"
              role="radiogroup"
              aria-label={t("brandColor")}
            >
              {BRAND_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  role="radio"
                  aria-checked={color === preset}
                  aria-label={preset}
                  onClick={() => setValue("brandColor", preset, { shouldDirty: true })}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full ring-offset-2 transition-transform hover:scale-110",
                    color === preset && "ring-foreground ring-2",
                  )}
                  style={{ backgroundColor: preset }}
                >
                  {color === preset && <Check className="size-4 text-white" aria-hidden />}
                </button>
              ))}
              {/* Any color: native picker + hex field */}
              <label className="ring-border relative flex h-9 items-center gap-2 rounded-full pr-3 pl-1 ring-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setValue("brandColor", e.target.value, { shouldDirty: true })}
                  aria-label={t("customColor")}
                  className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                />
                <span className="font-mono text-xs uppercase">{color}</span>
              </label>
            </div>
            {isLowContrast(color) && (
              <p className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                {t("lowContrast")}
              </p>
            )}
            {errors.brandColor && (
              <p className="text-destructive text-sm">{errorText(errors.brandColor.message)}</p>
            )}
          </Field>

          <Field label={t("background")}>
            <Controller
              control={control}
              name="pageBackground"
              render={({ field }) => (
                <div
                  className="grid grid-cols-3 gap-2"
                  role="radiogroup"
                  aria-label={t("background")}
                >
                  {PAGE_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      role="radio"
                      aria-checked={field.value === bg}
                      onClick={() => field.onChange(bg)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-2 text-sm font-medium transition-colors",
                        field.value === bg
                          ? "border-primary ring-primary/20 ring-2"
                          : "hover:bg-muted",
                      )}
                    >
                      <span
                        className="h-8 w-full rounded-lg ring-1 ring-black/10"
                        style={{ backgroundColor: BG_SWATCH[bg] }}
                      />
                      {t(`backgrounds.${bg}`)}
                    </button>
                  ))}
                </div>
              )}
            />
          </Field>
        </Card>

        <Card title={t("menuLayout")}>
          <Controller
            control={control}
            name="menuLayout"
            render={({ field }) => (
              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label={t("menuLayout")}
              >
                {(
                  [
                    ["list", List],
                    ["grid", LayoutGrid],
                  ] as const
                ).map(([value, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === value}
                    onClick={() => field.onChange(value)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                      field.value === value
                        ? "border-primary ring-primary/20 ring-2"
                        : "hover:bg-muted",
                    )}
                  >
                    <Icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
                    <span>
                      <span className="block text-sm font-semibold">{t(`layouts.${value}`)}</span>
                      <span className="text-muted-foreground text-xs">
                        {t(`layouts.${value}Hint`)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          />
        </Card>

        {/* Sticky save bar */}
        <div className="bg-background/95 sticky bottom-16 z-20 -mx-1 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm backdrop-blur md:bottom-3">
          <p className="text-muted-foreground text-sm">{isDirty ? t("unsaved") : t("allSaved")}</p>
          <Button type="submit" disabled={isSubmitting || !isDirty} className="gap-2">
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {t("save")}
          </Button>
        </div>
      </form>

      {/* Live preview — the real store page in a phone frame (desktop) */}
      <aside className="sticky top-6 hidden flex-col items-center gap-3 lg:flex">
        <div className="flex w-full items-center justify-between">
          <p className="text-sm font-semibold">{t("preview")}</p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("reload")}
              onClick={() => setFrameKey((k) => k + 1)}
            >
              <RotateCw className="size-4" />
            </Button>
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("openStore")}
              className="hover:bg-muted flex size-8 items-center justify-center rounded-lg"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
        <div className="rounded-[2.75rem] bg-neutral-900 p-3 shadow-xl">
          <iframe
            key={frameKey}
            ref={frameRef}
            src={`/${slug}`}
            title={t("preview")}
            className="h-[720px] w-[360px] rounded-[2rem] bg-white"
          />
        </div>
        <p className="text-muted-foreground text-center text-xs">{t("previewHint")}</p>
      </aside>

      {/* Phone: open the store instead of an embedded preview */}
      <a
        href={`/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary flex items-center justify-center gap-1.5 text-sm font-medium lg:hidden"
      >
        <ExternalLink className="size-4" />
        {t("openStore")}
      </a>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  counter,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {counter && <span className="text-muted-foreground text-xs tabular-nums">{counter}</span>}
      </div>
      {children}
      {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
