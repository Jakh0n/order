"use client";

import {
  AlertTriangle,
  Camera,
  Check,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ImportDraft, MenuProgress } from "@/lib/ai/menu-schema";
import { importMenu } from "@/lib/menu/import-actions";
import { priceStep } from "@/lib/money";
import { shrinkImage } from "@/lib/shrink-image";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 5;
const ERRORS = { notConfigured: 1, invalid: 1, tooMany: 1, empty: 1, server: 1, unauthorized: 1 };
/** Server Actions accept 3 MB; leave room for the rest of the form */
const MAX_TOTAL_BYTES = 2.6 * 1024 * 1024;

type Photo = { file: File; url: string };
type Row = ImportDraft["categories"][number]["items"][number] & { include: boolean };
type Category = { name: string; items: Row[] };

/** Photo (or text) of a paper menu → AI draft → owner reviews → dishes added */
export function MenuImport({ configured, currency }: { configured: boolean; currency: string }) {
  const t = useTranslations("menuImport");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  // Dishes the AI has finished so far (live list while reading)
  const [progress, setProgress] = useState<MenuProgress | null>(null);
  const [saving, startSaving] = useTransition();

  // Free the preview URLs
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const room = MAX_PHOTOS - photos.length;
    const picked = [...list].filter((f) => f.type.startsWith("image/")).slice(0, room);
    const shrunk = await Promise.all(picked.map((f) => shrinkImage(f, 1600, 0.78)));
    setPhotos((prev) => [
      ...prev,
      ...shrunk.map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function read() {
    setError(null);
    setReading(true);
    setProgress(null);
    try {
      // Too big together → shrink harder before sending
      let files = photos.map((p) => p.file);
      if (files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) {
        files = await Promise.all(files.map((f) => shrinkImage(f, 1200, 0.7)));
      }
      if (files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) {
        setError(t("errors.tooLarge"));
        return;
      }
      const form = new FormData();
      files.forEach((f) => form.append("images", f));
      form.set("text", text);

      // NDJSON stream: progress events, then done / error (app/api/menu-import/route.ts)
      const res = await fetch("/api/menu-import", { method: "POST", body: form });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      const handle = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as
          | { type: "progress"; progress: MenuProgress }
          | { type: "done"; draft: ImportDraft }
          | { type: "error"; error: string };
        if (event.type === "progress") setProgress(event.progress);
        else if (event.type === "error") {
          setError(t(`errors.${event.error in ERRORS ? event.error : "server"}`));
          finished = true;
        } else {
          finished = true;
          setDraft(
            event.draft.categories.map((c) => ({
              name: c.name,
              items: c.items.map((i) => ({ ...i, include: true })),
            })),
          );
        }
      };
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(handle);
      }
      // A one-shot JSON answer (e.g. "tooMany") has no trailing newline
      handle(buffer + decoder.decode());
      if (!finished) setError(t("errors.server"));
    } catch {
      setError(t("errors.server"));
    } finally {
      setReading(false);
    }
  }

  function save() {
    if (!draft) return;
    const categories = draft
      .map((c) => ({
        name: c.name.trim(),
        items: c.items
          .filter((i) => i.include && i.name.trim())
          .map((i) => ({
            name: i.name,
            description: i.description,
            price: i.price,
            optionGroups: i.optionGroups,
          })),
      }))
      .filter((c) => c.name && c.items.length > 0);
    startSaving(async () => {
      const result = await importMenu({ categories });
      if (!result.ok) {
        toast.error(t(`errors.${result.error}`));
        return;
      }
      toast.success(t("done", { created: result.created, skipped: result.skipped }));
      router.push("/admin/menu");
    });
  }

  const update = (ci: number, ii: number, patch: Partial<Row>) =>
    setDraft((d) =>
      d!.map((c, x) =>
        x !== ci
          ? c
          : { ...c, items: c.items.map((it, y) => (y === ii ? { ...it, ...patch } : it)) },
      ),
    );
  const included = draft?.reduce((s, c) => s + c.items.filter((i) => i.include).length, 0) ?? 0;
  const noPrice =
    draft?.reduce((s, c) => s + c.items.filter((i) => i.include && !i.price).length, 0) ?? 0;

  if (!configured) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-center">
        {t("notConfigured")}
      </p>
    );
  }

  // ---------- Step 2: review ----------
  if (draft) {
    return (
      <div className="flex flex-col gap-4 pb-24">
        <div className="border-primary/25 bg-primary/5 flex items-start gap-3 rounded-xl border p-4">
          <Sparkles className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold">
              {t("found", {
                items: draft.reduce((s, c) => s + c.items.length, 0),
                categories: draft.length,
              })}
            </p>
            <p className="text-muted-foreground">{t("reviewHint")}</p>
          </div>
        </div>

        {noPrice > 0 && (
          <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {t("noPriceWarning", { count: noPrice })}
          </p>
        )}

        {draft.map((category, ci) => (
          <section key={ci} className="bg-card flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Input
                aria-label={t("categoryName")}
                value={category.name}
                maxLength={60}
                onChange={(e) =>
                  setDraft((d) => d!.map((c, x) => (x === ci ? { ...c, name: e.target.value } : c)))
                }
                className="h-10 font-semibold"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("removeCategory")}
                onClick={() => setDraft((d) => d!.filter((_, x) => x !== ci))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <ul className="flex flex-col divide-y">
              {category.items.map((item, ii) => (
                <li
                  key={ii}
                  className={cn(
                    "flex flex-col gap-2 py-3 sm:flex-row sm:items-start",
                    !item.include && "opacity-50",
                  )}
                >
                  <label className="flex shrink-0 items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      checked={item.include}
                      onChange={(e) => update(ci, ii, { include: e.target.checked })}
                      className="accent-primary size-4"
                      aria-label={t("include", { name: item.name })}
                    />
                  </label>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Input
                      aria-label={t("dishName")}
                      value={item.name}
                      maxLength={100}
                      onChange={(e) => update(ci, ii, { name: e.target.value })}
                      className="h-9"
                    />
                    <Input
                      aria-label={t("description")}
                      value={item.description ?? ""}
                      maxLength={500}
                      placeholder={t("descriptionPlaceholder")}
                      onChange={(e) => update(ci, ii, { description: e.target.value || null })}
                      className="text-muted-foreground h-8 text-xs"
                    />
                    {item.optionGroups.length > 0 && (
                      <p className="text-muted-foreground flex flex-wrap gap-1 text-xs">
                        {item.optionGroups.map((g, gi) => (
                          <span key={gi} className="bg-muted rounded-full px-2 py-0.5">
                            {g.name}: {g.options.map((o) => o.name).join(" / ")}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <div className="relative">
                      <Input
                        aria-label={t("price", { currency })}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={priceStep(currency)}
                        value={item.price}
                        onChange={(e) => update(ci, ii, { price: Number(e.target.value) || 0 })}
                        className={cn(
                          "h-9 w-32 pr-12 tabular-nums",
                          !item.price && item.include && "border-amber-400",
                        )}
                      />
                      <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                        {currency}
                      </span>
                    </div>
                    {!item.price && item.include && (
                      <span className="text-xs text-amber-700 dark:text-amber-400">
                        {t("noPrice")}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="bg-background/95 fixed inset-x-0 bottom-16 z-30 border-t px-4 py-3 backdrop-blur md:bottom-0 md:left-60">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDraft(null)}
              disabled={saving}
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              {t("startOver")}
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={saving || included === 0}
              className="gap-2"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {t("add", { count: included })}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Step 1: photos / text ----------
  return (
    <div className="flex flex-col gap-4">
      <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((p, i) => (
            <div
              key={p.url}
              className="bg-muted relative aspect-[3/4] overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob URL) */}
              <img src={p.url} alt={t("photo", { n: i + 1 })} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((list) => list.filter((_, j) => j !== i))}
                aria-label={t("removePhoto")}
                className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={reading}
              className="border-primary/40 text-primary hover:bg-primary/5 flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-center text-xs font-medium"
            >
              {photos.length === 0 ? (
                <Camera className="size-6" />
              ) : (
                <ImagePlus className="size-6" />
              )}
              {photos.length === 0 ? t("addPhotos") : t("addMore")}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void addFiles(e.target.files)}
        />
        <p className="text-muted-foreground text-xs">{t("photosHint", { max: MAX_PHOTOS })}</p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="menu-text">{t("orText")}</Label>
          <Textarea
            id="menu-text"
            rows={4}
            maxLength={8000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("textPlaceholder")}
          />
        </div>

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        <Button
          type="button"
          size="lg"
          onClick={() => void read()}
          disabled={reading || (photos.length === 0 && !text.trim())}
          className="gap-2"
        >
          {reading ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
          {reading ? t("reading") : t("read")}
        </Button>
        {reading && <ReadingProgress progress={progress} />}
      </section>
      <p className="text-muted-foreground text-xs">{t("privacy")}</p>
    </div>
  );
}

/** Live list of dishes the AI has read so far */
function ReadingProgress({ progress }: { progress: MenuProgress | null }) {
  const t = useTranslations("menuImport");
  const count = progress?.categories.reduce((n, c) => n + c.items.length, 0) ?? 0;
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <p className="text-muted-foreground text-center text-sm">
        {count > 0 ? t("readingCount", { count }) : t("readingHint")}
      </p>
      {progress && count > 0 && (
        <div className="bg-muted/50 flex max-h-72 flex-col gap-3 overflow-y-auto rounded-xl p-3">
          {progress.categories
            .filter((c) => c.items.length > 0)
            .map((c, ci) => (
              <div key={ci} className="flex flex-col gap-1">
                <p className="text-xs font-semibold tracking-wide uppercase">{c.name}</p>
                <ul className="flex flex-col gap-0.5">
                  {c.items.map((item, ii) => (
                    <li
                      key={ii}
                      className="animate-in fade-in slide-in-from-bottom-1 flex justify-between gap-3 text-sm duration-300"
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {item.price ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
