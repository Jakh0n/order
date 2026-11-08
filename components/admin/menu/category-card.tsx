"use client";

import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  deleteCategory,
  reorderCategories,
  reorderProducts,
  updateCategory,
} from "@/lib/menu/admin-actions";
import type { AdminMenuCategory } from "@/lib/menu/admin-data";
import { cn } from "@/lib/utils";

import { ProductRow } from "./product-row";
import { moveId, useMenuAction } from "./use-menu-action";

export function CategoryCard({
  category,
  categoryIds,
}: {
  category: AdminMenuCategory;
  /** Barcha kategoriyalar tartibi — yuqoriga/pastga surish uchun */
  categoryIds: string[];
}) {
  const t = useTranslations("adminMenu");
  const { pending, run } = useMenuAction();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const productIds = category.products.map((p) => p.id);
  const index = categoryIds.indexOf(category.id);

  function move(dir: -1 | 1) {
    const ids = moveId(categoryIds, category.id, dir);
    if (ids) run(() => reorderCategories(ids));
  }

  return (
    <section
      className={cn("bg-card rounded-xl border", !category.isActive && "border-dashed opacity-75")}
    >
      <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        {editing ? (
          <form
            className="flex flex-1 items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateCategory(category.id, { name }), {
                success: t("saved"),
                onSuccess: () => setEditing(false),
              });
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoFocus
              aria-label={t("categoryName")}
            />
            <Button type="submit" size="icon" aria-label={t("save")} disabled={pending}>
              <Check />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={t("cancel")}
              onClick={() => {
                setName(category.name);
                setEditing(false);
              }}
            >
              <X />
            </Button>
          </form>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <h2 className="truncate font-semibold">{category.name}</h2>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t("rename")}
              onClick={() => setEditing(true)}
            >
              <Pencil />
            </Button>
          </div>
        )}

        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <Switch
            checked={category.isActive}
            disabled={pending}
            onCheckedChange={(isActive) => run(() => updateCategory(category.id, { isActive }))}
          />
          {category.isActive ? t("visible") : t("hidden")}
        </label>

        <div className="flex items-center">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t("moveUp")}
            disabled={pending || index === 0}
            onClick={() => move(-1)}
          >
            <ArrowUp />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t("moveDown")}
            disabled={pending || index === categoryIds.length - 1}
            onClick={() => move(1)}
          >
            <ArrowDown />
          </Button>
          {category.products.length === 0 && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-destructive"
              aria-label={t("delete")}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </header>

      {category.products.length === 0 ? (
        <p className="text-muted-foreground px-3 py-4 text-sm">{t("emptyCategory")}</p>
      ) : (
        <ul className="divide-y">
          {category.products.map((product, i) => (
            <ProductRow
              key={product.id}
              product={product}
              canMoveUp={i > 0}
              canMoveDown={i < productIds.length - 1}
              onMove={(dir) => {
                const ids = moveId(productIds, product.id, dir);
                if (ids) run(() => reorderProducts(category.id, ids));
              }}
              reordering={pending}
            />
          ))}
        </ul>
      )}

      <div className="border-t px-3 py-2">
        <Link
          href={`/admin/menu/products/new?category=${category.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <Plus />
          {t("addProduct")}
        </Link>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteCategoryTitle", { name: category.name })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        pending={pending}
        onConfirm={() =>
          run(() => deleteCategory(category.id), {
            success: t("deleted"),
            onSuccess: () => setConfirmDelete(false),
          })
        }
      />
    </section>
  );
}
