"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Camera,
  Check,
  ExternalLink,
  ImagePlus,
  LayoutGrid,
  List,
  Loader2,
  Palette,
  PanelsTopLeft,
  RotateCw,
  ShoppingBag,
  Store,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useImageUpload } from "@/components/admin/menu/image-upload";
import { PREVIEW_MESSAGE } from "@/components/admin/design/design-preview";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  BRAND_PRESETS,
  CORNER_STYLES,
  FONT_STYLES,
  FONTS,
  HEADER_STYLES,
  isHexColor,
  isLowContrast,
  PAGE_BACKGROUNDS,
} from "@/lib/design";
import { saveDesign } from "@/lib/settings/actions";
import { cn } from "@/lib/utils";
import { type DesignInput, designSchema } from "@/lib/validators";

const DEFAULT_BRAND = "#16a05d";
/** Website editor tabs = routes /admin/website/<tab> (the form lives in their shared layout) */
export const EDITOR_TABS = [
  { key: "storefront", icon: Store },
  { key: "checkout", icon: ShoppingBag },
  { key: "appearance", icon: Palette },
  { key: "menu", icon: PanelsTopLeft },
] as const;
export type EditorTab = (typeof EDITOR_TABS)[number]["key"];
const RADIUS_PX = { sharp: 4, soft: 12, round: 20 } as const;

/** Design page: tabs on the left, the real store page in a phone frame on the right */
export function DesignForm({ slug, defaultValues }: { slug: string; defaultValues: DesignInput }) {
  const t = useTranslations("design");
  const pathname = usePathname();
  const tab: EditorTab =
    EDITOR_TABS.find((x) => pathname.endsWith(`/${x.key}`))?.key ?? "storefront";
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DesignInput>({ resolver: zodResolver(designSchema), defaultValues });
  // Every field, for the live preview (and the few the form itself shows)
  const draft = useWatch({ control });
  const { brandColor, name, logoUrl, coverUrl, description, announcement } = draft;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameKey, setFrameKey] = useState(0);
  const color = isHexColor(brandColor) ? brandColor : DEFAULT_BRAND;
  const errorText = (key?: string) => (key ? t(`errors.${key}`) : null);

  // The preview draws the store from these unsaved values — every change shows instantly
  useEffect(() => {
    const send = () =>
      frameRef.current?.contentWindow?.postMessage(
        { type: PREVIEW_MESSAGE, draft: { ...draft, brandColor: color } },
        window.location.origin,
      );
    send();
    const onReady = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === `${PREVIEW_MESSAGE}:ready`) {
        send();
      }
    };
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [draft, color, frameKey]);

  async function onSubmit(values: DesignInput) {
    const result = await saveDesign(values);
    if (!result.ok) {
      const fields = Object.entries(result.fieldErrors ?? {});
      for (const [field, message] of fields) setError(field as keyof DesignInput, { message });
      toast.error(t(`errors.${result.error}`));
      return;
    }
    toast.success(t("saved"));
    reset(values);
  }

  const saveButton = (
    <Button type="submit" disabled={isSubmitting || !isDirty} className="gap-2">
      {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      {t("save")}
    </Button>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {/* Title + actions; stays visible on desktop */}
      <div className="bg-muted/80 -mx-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 backdrop-blur md:sticky md:top-0 md:z-20 md:-mx-6 md:px-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("lead")}</p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-muted-foreground hidden items-center gap-1.5 text-sm sm:flex">
              <span className="size-2 rounded-full bg-amber-500" aria-hidden />
              {t("unsaved")}
            </span>
          )}
          <a
            href={`/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", className: "gap-2" })}
          >
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">{t("openStore")}</span>
          </a>
          <div className="hidden md:block">{saveButton}</div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Tabs */}
          <div
            role="tablist"
            className="bg-background grid grid-cols-2 gap-1 rounded-xl border p-1 sm:grid-cols-4"
          >
            {EDITOR_TABS.map(({ key, icon: Icon }) => (
              <Link
                key={key}
                href={`/admin/website/${key}`}
                scroll={false}
                role="tab"
                aria-selected={tab === key}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
                  tab === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {t(`tabs.${key}`)}
              </Link>
            ))}
          </div>

          {/* All tabs stay mounted (hidden), so typed values survive switching tabs */}
          <div className={cn("flex flex-col gap-4", tab !== "appearance" && "hidden")}>
            <Card title={t("header")} hint={t("headerHint")}>
              <HeaderEditor
                name={name ?? ""}
                logoUrl={logoUrl ?? null}
                coverUrl={coverUrl ?? null}
                onLogo={(url) => setValue("logoUrl", url, { shouldDirty: true })}
                onCover={(url) => setValue("coverUrl", url, { shouldDirty: true })}
              />
            </Card>

            <Card title={t("text")}>
              <Field label={t("name")} htmlFor="name" error={errorText(errors.name?.message)}>
                <Input
                  id="name"
                  maxLength={80}
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
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

            <Card title={t("social")} hint={t("socialHint")}>
              {(
                [
                  ["instagram", "instagram.com/"],
                  ["telegramChannel", "t.me/"],
                  ["tiktok", "tiktok.com/@"],
                ] as const
              ).map(([field, prefix]) => (
                <Field
                  key={field}
                  label={t(`socials.${field}`)}
                  htmlFor={field}
                  error={errorText(errors[field]?.message)}
                >
                  <div className="border-input focus-within:ring-ring/50 flex h-10 items-center overflow-hidden rounded-md border focus-within:ring-3">
                    <span className="text-muted-foreground bg-muted flex h-full items-center border-r px-3 text-sm">
                      {prefix}
                    </span>
                    <input
                      id={field}
                      autoComplete="off"
                      placeholder={t("socialPlaceholder")}
                      className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                      {...register(field)}
                    />
                  </div>
                </Field>
              ))}
            </Card>
          </div>

          <div className={cn("flex flex-col gap-4", tab !== "appearance" && "hidden")}>
            <Card title={t("brandColor")} hint={t("brandColorHint")}>
              <div
                className="flex flex-wrap items-center gap-2.5"
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
                      "ring-offset-background flex size-10 items-center justify-center rounded-full ring-offset-2 transition-transform hover:scale-110",
                      color === preset && "ring-foreground ring-2",
                    )}
                    style={{ backgroundColor: preset }}
                  >
                    {color === preset && <Check className="size-4 text-white" aria-hidden />}
                  </button>
                ))}
                <label className="ring-border hover:bg-muted flex h-10 cursor-pointer items-center gap-2 rounded-full pr-3.5 pl-1.5 ring-1">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setValue("brandColor", e.target.value, { shouldDirty: true })}
                    aria-label={t("customColor")}
                    className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                  />
                  <span className="text-sm font-medium">{t("customColor")}</span>
                  <span className="text-muted-foreground font-mono text-xs uppercase">{color}</span>
                </label>
              </div>
              {isLowContrast(color) && (
                <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  {t("lowContrast")}
                </p>
              )}
            </Card>

            <Card title={t("background")}>
              <Controller
                control={control}
                name="pageBackground"
                render={({ field }) => (
                  <OptionGrid cols={4} label={t("background")}>
                    {PAGE_BACKGROUNDS.map((bg) => (
                      <Option
                        key={bg}
                        selected={field.value === bg}
                        onSelect={() => field.onChange(bg)}
                      >
                        <span
                          className="h-10 w-full rounded-md ring-1 ring-black/10"
                          style={{
                            background:
                              bg === "tint"
                                ? `color-mix(in oklab, ${color} 7%, white)`
                                : { gray: "#f4f4f5", white: "#ffffff", cream: "#faf6ee" }[bg],
                          }}
                        />
                        <span className="text-sm font-medium">{t(`backgrounds.${bg}`)}</span>
                      </Option>
                    ))}
                  </OptionGrid>
                )}
              />
            </Card>

            <Card title={t("font")}>
              <Controller
                control={control}
                name="fontStyle"
                render={({ field }) => (
                  <OptionGrid cols={5} label={t("font")}>
                    {FONT_STYLES.map((f) => (
                      <Option
                        key={f}
                        selected={field.value === f}
                        onSelect={() => field.onChange(f)}
                      >
                        <span
                          className="text-3xl leading-none"
                          style={{ fontFamily: `${FONTS[f].heading}, ui-sans-serif` }}
                        >
                          Aa
                        </span>
                        <span className="text-xs font-medium">{t(`fonts.${f}`)}</span>
                      </Option>
                    ))}
                  </OptionGrid>
                )}
              />
            </Card>

            <Card title={t("corners")}>
              <Controller
                control={control}
                name="cornerStyle"
                render={({ field }) => (
                  <OptionGrid cols={3} label={t("corners")}>
                    {CORNER_STYLES.map((c) => (
                      <Option
                        key={c}
                        selected={field.value === c}
                        onSelect={() => field.onChange(c)}
                      >
                        <span
                          className="bg-primary/15 border-primary/40 h-9 w-14 border-2"
                          style={{ borderRadius: RADIUS_PX[c] }}
                        />
                        <span className="text-sm font-medium">{t(`cornerStyles.${c}`)}</span>
                      </Option>
                    ))}
                  </OptionGrid>
                )}
              />
            </Card>
          </div>

          <div className={cn("flex flex-col gap-4", tab !== "storefront" && "hidden")}>
            <Card title={t("headerStyle")}>
              <Controller
                control={control}
                name="headerStyle"
                render={({ field }) => (
                  <OptionGrid cols={3} label={t("headerStyle")}>
                    {HEADER_STYLES.map((h) => (
                      <Option
                        key={h}
                        selected={field.value === h}
                        onSelect={() => field.onChange(h)}
                      >
                        <HeaderSketch kind={h} />
                        <span className="text-sm font-medium">{t(`headerStyles.${h}`)}</span>
                      </Option>
                    ))}
                  </OptionGrid>
                )}
              />
            </Card>

            <Card title={t("menuLayout")}>
              <Controller
                control={control}
                name="menuLayout"
                render={({ field }) => (
                  <OptionGrid cols={2} label={t("menuLayout")}>
                    {(
                      [
                        ["list", List],
                        ["grid", LayoutGrid],
                      ] as const
                    ).map(([value, Icon]) => (
                      <Option
                        key={value}
                        selected={field.value === value}
                        onSelect={() => field.onChange(value)}
                      >
                        <MenuSketch kind={value} />
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <Icon className="size-4" aria-hidden />
                          {t(`layouts.${value}`)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {t(`layouts.${value}Hint`)}
                        </span>
                      </Option>
                    ))}
                  </OptionGrid>
                )}
              />
            </Card>

            <Card title={t("show")}>
              {(["showSearch", "showDescriptions"] as const).map((key) => (
                <Controller
                  key={key}
                  control={control}
                  name={key}
                  render={({ field }) => (
                    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
                      <span>
                        <span className="block text-sm font-medium">{t(`toggles.${key}`)}</span>
                        <span className="text-muted-foreground text-xs">
                          {t(`toggles.${key}Hint`)}
                        </span>
                      </span>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </label>
                  )}
                />
              ))}
            </Card>
          </div>
        </div>

        {/* Live preview — the real store page in a phone frame (desktop) */}
        <aside className="sticky top-24 hidden flex-col items-center gap-3 lg:flex">
          <div className="flex w-full items-center justify-between px-1">
            <p className="text-sm font-semibold">{t("preview")}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setFrameKey((k) => k + 1)}
            >
              <RotateCw className="size-3.5" />
              {t("reload")}
            </Button>
          </div>
          <div className="rounded-[3rem] bg-neutral-900 p-2.5 shadow-2xl ring-1 ring-black/10">
            <iframe
              key={frameKey}
              ref={frameRef}
              src="/admin/preview"
              title={t("preview")}
              className="h-[740px] w-[370px] rounded-[2.4rem] bg-white"
            />
          </div>
          <p className="text-muted-foreground max-w-[340px] text-center text-xs">
            {t("previewHint")}
          </p>
        </aside>
      </div>

      {/* Phone: save button above the tab bar, only when something changed */}
      {isDirty && (
        <div className="fixed inset-x-4 bottom-20 z-40 md:hidden">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="h-12 w-full gap-2 shadow-lg"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {t("save")}
          </Button>
        </div>
      )}
    </form>
  );
}

/** Cover with the logo on top — edited in place, like the store header */
function HeaderEditor({
  name,
  logoUrl,
  coverUrl,
  onLogo,
  onCover,
}: {
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  onLogo: (url: string | null) => void;
  onCover: (url: string | null) => void;
}) {
  const t = useTranslations("design");
  // Destructured: the React compiler treats a whole object holding a ref as a ref
  const {
    inputRef: coverInput,
    pending: coverPending,
    handleFile: coverFile,
  } = useImageUpload(onCover);
  const {
    inputRef: logoInput,
    pending: logoPending,
    handleFile: logoFile,
  } = useImageUpload(onLogo);

  return (
    <div className="flex flex-col gap-3">
      <div className="from-primary/80 via-primary to-primary/70 relative aspect-[3/1] overflow-hidden rounded-xl bg-gradient-to-br">
        {coverUrl && <Image src={coverUrl} alt="" fill sizes="640px" className="object-cover" />}
        {!coverUrl && (
          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            className="text-primary-foreground/90 absolute inset-0 flex flex-col items-center justify-center gap-1 text-sm font-medium"
          >
            <ImagePlus className="size-6" aria-hidden />
            {t("addCover")}
          </button>
        )}
        {coverPending && <Busy />}
        <div className="absolute top-2 right-2 flex gap-1.5">
          {coverUrl && (
            <>
              <OverlayButton onClick={() => coverInput.current?.click()} disabled={coverPending}>
                <Camera className="size-3.5" />
                {t("changeCover")}
              </OverlayButton>
              <OverlayButton onClick={() => onCover(null)} label={t("removeCover")}>
                <Trash2 className="size-3.5" />
              </OverlayButton>
            </>
          )}
        </div>
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => coverFile(e.target.files?.[0])}
        />
      </div>

      <div className="-mt-12 flex items-end gap-3 px-3">
        <div className="relative">
          <div className="border-background bg-background relative size-20 overflow-hidden rounded-2xl border-4 shadow-md">
            {logoUrl ? (
              <Image src={logoUrl} alt="" fill sizes="80px" className="object-cover" />
            ) : (
              <span className="bg-primary text-primary-foreground flex size-full items-center justify-center text-2xl font-bold">
                {name?.charAt(0).toUpperCase() || "?"}
              </span>
            )}
            {logoPending && <Busy />}
          </div>
          <button
            type="button"
            onClick={() => logoInput.current?.click()}
            disabled={logoPending}
            aria-label={logoUrl ? t("changeLogo") : t("addLogo")}
            className="bg-foreground text-background absolute -right-1.5 -bottom-1.5 flex size-8 items-center justify-center rounded-full shadow-md ring-2 ring-white"
          >
            <Camera className="size-4" />
          </button>
          <input
            ref={logoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => logoFile(e.target.files?.[0])}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 pb-1">
          <button
            type="button"
            onClick={() => logoInput.current?.click()}
            className="text-primary text-sm font-medium"
          >
            {logoUrl ? t("changeLogo") : t("addLogo")}
          </button>
          {logoUrl && (
            <button
              type="button"
              onClick={() => onLogo(null)}
              className="text-muted-foreground hover:text-destructive text-sm"
            >
              {t("removeLogo")}
            </button>
          )}
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{t("imagesHint")}</p>
    </div>
  );
}

function OverlayButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs font-semibold text-neutral-900 shadow-sm backdrop-blur hover:bg-white"
    >
      {children}
    </button>
  );
}

function Busy() {
  return (
    <div className="bg-background/70 absolute inset-0 flex items-center justify-center">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

/** Mini drawings of the three header styles */
function HeaderSketch({ kind }: { kind: "cover" | "centered" | "compact" }) {
  return (
    <span className="bg-background flex h-16 w-full flex-col overflow-hidden rounded-md ring-1 ring-black/10">
      {kind !== "compact" && <span className="bg-primary/60 h-6 w-full" />}
      <span
        className={cn(
          "flex gap-1 px-2",
          kind === "cover" && "-mt-2.5 items-end",
          kind === "centered" && "-mt-3 flex-col items-center",
          kind === "compact" && "mt-2 items-center",
        )}
      >
        <span className="bg-primary size-5 rounded-[4px] ring-2 ring-white" />
        <span
          className={cn(
            "bg-foreground/70 h-1.5 rounded-full",
            kind === "centered" ? "w-10" : "w-8",
          )}
        />
      </span>
      <span
        className={cn(
          "bg-foreground/20 mx-2 mt-1.5 h-1 rounded-full",
          kind === "centered" ? "mx-auto w-12" : "w-14",
        )}
      />
    </span>
  );
}

function MenuSketch({ kind }: { kind: "list" | "grid" }) {
  return kind === "list" ? (
    <span className="bg-background flex h-16 w-full flex-col justify-center gap-1.5 rounded-md p-2 ring-1 ring-black/10">
      {[0, 1].map((i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="flex flex-1 flex-col gap-1">
            <span className="bg-foreground/60 h-1.5 w-3/4 rounded-full" />
            <span className="bg-foreground/20 h-1 w-1/2 rounded-full" />
          </span>
          <span className="bg-primary/40 size-5 rounded" />
        </span>
      ))}
    </span>
  ) : (
    <span className="bg-background grid h-16 w-full grid-cols-2 gap-1.5 rounded-md p-2 ring-1 ring-black/10">
      {[0, 1].map((i) => (
        <span key={i} className="flex flex-col gap-1">
          <span className="bg-primary/40 flex-1 rounded" />
          <span className="bg-foreground/60 h-1.5 w-3/4 rounded-full" />
        </span>
      ))}
    </span>
  );
}

function OptionGrid({
  cols,
  label,
  children,
}: {
  cols: 2 | 3 | 4 | 5;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "grid gap-2",
        {
          2: "grid-cols-2",
          3: "grid-cols-3",
          4: "grid-cols-2 sm:grid-cols-4",
          5: "grid-cols-3 sm:grid-cols-5",
        }[cols],
      )}
    >
      {children}
    </div>
  );
}

function Option({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors",
        selected ? "border-primary bg-primary/5 ring-primary/20 ring-2" : "hover:bg-muted",
      )}
    >
      {selected && (
        <span className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full">
          <Check className="size-3" aria-hidden />
        </span>
      )}
      {children}
    </button>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </div>
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
