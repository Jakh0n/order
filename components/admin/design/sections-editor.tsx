"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  Loader2,
  Megaphone,
  PanelTop,
  Plus,
  Star,
  Trash2,
  Type,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useImageUpload } from "@/components/admin/menu/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isBuiltIn, MAX_SECTIONS, newSection, type Section } from "@/lib/sections";
import { cn } from "@/lib/utils";

const ICONS = {
  announcement: Megaphone,
  header: PanelTop,
  menu: UtensilsCrossed,
  text: Type,
  image: ImageIcon,
  reviews: Star,
} as const;

/**
 * Store page sections: drag (desktop) or ↑↓ (touch, keyboard) to reorder, eye to hide,
 * trash for the owner's own blocks. Text / image blocks open for editing.
 */
export function SectionsEditor({
  value,
  onChange,
}: {
  value: Section[];
  onChange: (next: Section[]) => void;
}) {
  const t = useTranslations("design.sections");
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }
  const update = (i: number, patch: Partial<Section>) =>
    onChange(value.map((s, j) => (j === i ? ({ ...s, ...patch } as Section) : s)));
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  function add(type: "text" | "image" | "reviews") {
    const section = newSection(type);
    // Added just above the menu, where extra content is usually wanted
    const menuIndex = value.findIndex((s) => s.type === "menu");
    const next = [...value];
    next.splice(menuIndex === -1 ? next.length : menuIndex, 0, section);
    onChange(next);
    if (type !== "reviews") setOpenId(section.id);
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2">
        {value.map((section, i) => {
          const Icon = ICONS[section.type];
          const custom = !isBuiltIn(section);
          // The reviews block has nothing to edit; text / image open for editing
          const editable = section.type === "text" || section.type === "image";
          const open = editable && openId === section.id;
          const lockedVisible = section.type === "menu";
          return (
            <li
              key={section.id}
              draggable
              onDragStart={(e) => {
                setDragging(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(i);
              }}
              onDragLeave={() => setOver((o) => (o === i ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging !== null) move(dragging, i);
                setDragging(null);
                setOver(null);
              }}
              onDragEnd={() => {
                setDragging(null);
                setOver(null);
              }}
              className={cn(
                "bg-background rounded-xl border transition-shadow",
                dragging === i && "opacity-50",
                over === i && dragging !== i && "ring-primary ring-2",
              )}
            >
              <div className="flex items-center gap-2 p-2 pl-1">
                <GripVertical
                  className="text-muted-foreground size-4 shrink-0 cursor-grab"
                  aria-hidden
                />
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    section.hidden
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => setOpenId(open ? null : section.id)}
                  className="flex min-w-0 flex-1 items-center gap-1 text-left"
                >
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      section.hidden && "text-muted-foreground line-through",
                    )}
                  >
                    {section.type === "text" && section.title
                      ? section.title
                      : t(`types.${section.type}`)}
                  </span>
                  {editable && (
                    <ChevronDown
                      className={cn(
                        "text-muted-foreground size-4 shrink-0 transition-transform",
                        open && "rotate-180",
                      )}
                      aria-hidden
                    />
                  )}
                </button>
                <IconButton label={t("up")} disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ArrowUp className="size-4" />
                </IconButton>
                <IconButton
                  label={t("down")}
                  disabled={i === value.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowDown className="size-4" />
                </IconButton>
                <IconButton
                  label={section.hidden ? t("show") : t("hide")}
                  disabled={lockedVisible}
                  onClick={() => update(i, { hidden: !section.hidden })}
                >
                  {section.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </IconButton>
                {custom && (
                  <IconButton label={t("delete")} onClick={() => remove(i)} danger>
                    <Trash2 className="size-4" />
                  </IconButton>
                )}
              </div>

              {open && section.type === "text" && (
                <div className="flex flex-col gap-3 border-t p-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${section.id}-title`}>{t("title")}</Label>
                    <Input
                      id={`${section.id}-title`}
                      maxLength={60}
                      value={section.title}
                      placeholder={t("titlePlaceholder")}
                      onChange={(e) => update(i, { title: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${section.id}-body`}>{t("body")}</Label>
                    <Textarea
                      id={`${section.id}-body`}
                      rows={3}
                      maxLength={500}
                      value={section.body}
                      placeholder={t("bodyPlaceholder")}
                      onChange={(e) => update(i, { body: e.target.value })}
                    />
                  </div>
                </div>
              )}
              {open && section.type === "image" && (
                <ImageBlockEditor section={section} onChange={(patch) => update(i, patch)} />
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap gap-2">
        {(["text", "image", "reviews"] as const).map((type) => {
          const Icon = ICONS[type];
          return (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              disabled={
                value.length >= MAX_SECTIONS ||
                (type === "reviews" && value.some((s) => s.type === "reviews"))
              }
              onClick={() => add(type)}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              <Icon className="size-3.5" />
              {t(`add.${type}`)}
            </Button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">{t("hint")}</p>
    </div>
  );
}

function ImageBlockEditor({
  section,
  onChange,
}: {
  section: Extract<Section, { type: "image" }>;
  onChange: (patch: Partial<Section>) => void;
}) {
  const t = useTranslations("design.sections");
  // Destructured: the React compiler treats a whole object holding a ref as a ref
  const { inputRef, pending, handleFile } = useImageUpload((url) => onChange({ imageUrl: url }));
  return (
    <div className="flex flex-col gap-3 border-t p-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="bg-muted relative flex aspect-[2/1] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed"
      >
        {section.imageUrl ? (
          <Image src={section.imageUrl} alt="" fill sizes="480px" className="object-cover" />
        ) : (
          <span className="text-muted-foreground flex flex-col items-center gap-1 text-sm">
            <ImageIcon className="size-6" aria-hidden />
            {t("chooseImage")}
          </span>
        )}
        {pending && (
          <span className="bg-background/70 absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${section.id}-link`}>{t("link")}</Label>
        <Input
          id={`${section.id}-link`}
          type="url"
          inputMode="url"
          maxLength={300}
          value={section.link}
          placeholder="https://"
          onChange={(e) => onChange({ link: e.target.value })}
        />
        <p className="text-muted-foreground text-xs">{t("linkHint")}</p>
      </div>
    </div>
  );
}

function IconButton({
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
        "text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-30",
        danger
          ? "hover:bg-destructive/10 hover:text-destructive"
          : "hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
