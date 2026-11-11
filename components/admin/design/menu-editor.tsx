"use client";

import { ArrowDown, ArrowUp, Link2, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_NAV_LINKS, type NavLink, newNavLink } from "@/lib/nav";
import { cn } from "@/lib/utils";

function moved<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** ☰ menu links: label + URL, reorder, delete */
export function NavLinksEditor({
  value,
  onChange,
  errors,
}: {
  value: NavLink[];
  onChange: (next: NavLink[]) => void;
  errors?: (string | undefined)[];
}) {
  const t = useTranslations("design.menu");
  const update = (i: number, patch: Partial<NavLink>) =>
    onChange(value.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 && (
        <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-4 text-center text-sm">
          {t("noLinks")}
        </p>
      )}
      {value.map((link, i) => (
        <div
          key={link.id}
          className="bg-background flex flex-col gap-2 rounded-xl border p-2 sm:flex-row sm:items-center"
        >
          <Link2 className="text-muted-foreground hidden size-4 shrink-0 sm:block" aria-hidden />
          <Input
            aria-label={t("label")}
            placeholder={t("labelPlaceholder")}
            maxLength={40}
            value={link.label}
            onChange={(e) => update(i, { label: e.target.value })}
            className="h-9 sm:w-40"
          />
          <Input
            aria-label={t("url")}
            placeholder={t("urlPlaceholder")}
            maxLength={300}
            value={link.url}
            onChange={(e) => update(i, { url: e.target.value.trim() })}
            aria-invalid={!!errors?.[i]}
            className="h-9 min-w-0 flex-1"
          />
          <div className="flex shrink-0 justify-end gap-0.5">
            <Small
              label={t("up")}
              disabled={i === 0}
              onClick={() => onChange(moved(value, i, i - 1))}
            >
              <ArrowUp className="size-4" />
            </Small>
            <Small
              label={t("down")}
              disabled={i === value.length - 1}
              onClick={() => onChange(moved(value, i, i + 1))}
            >
              <ArrowDown className="size-4" />
            </Small>
            <Small
              label={t("delete")}
              danger
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Small>
          </div>
          {errors?.[i] && <p className="text-destructive text-xs sm:basis-full">{errors[i]}</p>}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        disabled={value.length >= MAX_NAV_LINKS}
        onClick={() => onChange([...value, newNavLink()])}
      >
        <Plus className="size-3.5" />
        {t("addLink")}
      </Button>
      <p className="text-muted-foreground text-xs">{t("linksHint")}</p>
    </div>
  );
}

/** Pinned categories (in order) + the rest with a Pin button */
export function PinnedCategoriesEditor({
  categories,
  value,
  onChange,
}: {
  categories: { id: string; name: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useTranslations("design.menu");
  const byId = new Map(categories.map((c) => [c.id, c]));
  const pinned = value.filter((id) => byId.has(id));
  const others = categories.filter((c) => !pinned.includes(c.id));

  if (categories.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noCategories")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {pinned.length > 0 && (
        <ol className="flex flex-col gap-1.5">
          {pinned.map((id, i) => (
            <li
              key={id}
              className="border-primary/30 bg-primary/5 flex items-center gap-2 rounded-xl border p-2 pl-3"
            >
              <Pin className="text-primary size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {byId.get(id)!.name}
              </span>
              <Small
                label={t("up")}
                disabled={i === 0}
                onClick={() => onChange(moved(pinned, i, i - 1))}
              >
                <ArrowUp className="size-4" />
              </Small>
              <Small
                label={t("down")}
                disabled={i === pinned.length - 1}
                onClick={() => onChange(moved(pinned, i, i + 1))}
              >
                <ArrowDown className="size-4" />
              </Small>
              <Small label={t("unpin")} onClick={() => onChange(pinned.filter((x) => x !== id))}>
                <PinOff className="size-4" />
              </Small>
            </li>
          ))}
        </ol>
      )}
      {others.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {others.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onChange([...pinned, c.id])}
                className="hover:bg-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
              >
                <Pin className="text-muted-foreground size-3.5" aria-hidden />
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Small({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "text-muted-foreground flex size-8 items-center justify-center rounded-lg disabled:pointer-events-none disabled:opacity-30",
        danger
          ? "hover:bg-destructive/10 hover:text-destructive"
          : "hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
