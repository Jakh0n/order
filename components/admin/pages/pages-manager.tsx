"use client";

import { Check, Copy, ExternalLink, FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deletePage, savePage } from "@/lib/pages/actions";
import { slugify } from "@/lib/slug";

export interface PageRow {
  id: string;
  slug: string;
  title: string;
  body: string;
  isPublished: boolean;
}

type Draft = Omit<PageRow, "id"> & { id?: string };
const EMPTY: Draft = { slug: "", title: "", body: "", isPublished: true };

/** Website → Pages: list + inline editor */
export function PagesManager({ storeSlug, pages }: { storeSlug: string; pages: PageRow[] }) {
  const t = useTranslations("pages");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [toDelete, setToDelete] = useState<PageRow | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const path = (slug: string) => `/${storeSlug}/p/${slug}`;

  function edit(next: Draft) {
    setDraft(next);
    setSlugTouched(!!next.id);
    setErrors({});
  }

  function save() {
    if (!draft) return;
    startTransition(async () => {
      const result = await savePage(draft);
      if (result.ok) {
        toast.success(t("saved"));
        setDraft(null);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      if (!result.fieldErrors) toast.error(t(`errors.${result.error}`));
    });
  }

  function remove() {
    if (!toDelete) return;
    startTransition(async () => {
      const result = await deletePage(toDelete.id);
      setToDelete(null);
      if (result.ok) toast.success(t("deleted"));
      else toast.error(t(`errors.${result.error}`));
    });
  }

  async function copy(slug: string) {
    try {
      await navigator.clipboard.writeText(path(slug));
      setCopied(slug);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard blocked — the path is visible to copy by hand
    }
  }

  const errorText = (key?: string) => (key ? t(`errors.${key}`) : null);

  return (
    <div className="flex flex-col gap-4">
      {draft ? (
        <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
          <h2 className="font-semibold">{draft.id ? t("editTitle") : t("newTitle")}</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="page-title">{t("title")}</Label>
            <Input
              id="page-title"
              maxLength={80}
              value={draft.title}
              placeholder={t("titlePlaceholder")}
              aria-invalid={!!errors.title}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  title: e.target.value,
                  // The address follows the title until edited by hand
                  slug: slugTouched ? draft.slug : slugify(e.target.value).slice(0, 50),
                })
              }
            />
            {errors.title && <p className="text-destructive text-sm">{errorText(errors.title)}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="page-slug">{t("slug")}</Label>
            <div className="border-input focus-within:ring-ring/50 flex h-10 items-center overflow-hidden rounded-md border focus-within:ring-3">
              <span className="text-muted-foreground bg-muted flex h-full items-center border-r px-3 text-sm">
                /{storeSlug}/p/
              </span>
              <input
                id="page-slug"
                value={draft.slug}
                maxLength={50}
                aria-invalid={!!errors.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setDraft({ ...draft, slug: e.target.value.toLowerCase() });
                }}
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
              />
            </div>
            {errors.slug && <p className="text-destructive text-sm">{errorText(errors.slug)}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="page-body">{t("body")}</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {draft.body.length}/5000
              </span>
            </div>
            <Textarea
              id="page-body"
              rows={10}
              maxLength={5000}
              value={draft.body}
              placeholder={t("bodyPlaceholder")}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            <p className="text-muted-foreground text-xs">{t("formatHint")}</p>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium">{t("published")}</span>
              <span className="text-muted-foreground text-xs">{t("publishedHint")}</span>
            </span>
            <Switch
              checked={draft.isPublished}
              onCheckedChange={(v) => setDraft({ ...draft, isPublished: v })}
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" onClick={save} disabled={pending} className="gap-2">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {t("save")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
              {t("cancel")}
            </Button>
          </div>
        </section>
      ) : (
        <Button type="button" onClick={() => edit(EMPTY)} className="w-fit gap-2">
          <Plus className="size-4" />
          {t("new")}
        </Button>
      )}

      {pages.length === 0 && !draft ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
          <FileText className="size-8 opacity-50" aria-hidden />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <ul className="bg-card divide-y rounded-xl border">
          {pages.map((page) => (
            <li key={page.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
              <FileText className="text-muted-foreground size-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{page.title}</span>
                  {!page.isPublished && <Badge variant="secondary">{t("draft")}</Badge>}
                </p>
                <p className="text-muted-foreground truncate font-mono text-xs">
                  {path(page.slug)}
                </p>
              </div>
              <div className="flex gap-1">
                <IconLink label={t("copyLink")} onClick={() => copy(page.slug)}>
                  {copied === page.slug ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </IconLink>
                {page.isPublished && (
                  <a
                    href={path(page.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("open")}
                    className="text-muted-foreground hover:bg-muted flex size-8 items-center justify-center rounded-lg"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}
                <IconLink label={t("edit")} onClick={() => edit(page)}>
                  <Pencil className="size-4" />
                </IconLink>
                <IconLink label={t("delete")} onClick={() => setToDelete(page)} danger>
                  <Trash2 className="size-4" />
                </IconLink>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground text-xs">{t("menuHint")}</p>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t("deleteTitle", { title: toDelete?.title ?? "" })}
        description={t("deleteHint")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}

function IconLink({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={
        danger
          ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex size-8 items-center justify-center rounded-lg"
          : "text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-lg"
      }
    >
      {children}
    </button>
  );
}
