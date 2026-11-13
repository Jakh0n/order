"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategory } from "@/lib/menu/admin-actions";

import { useMenuAction } from "./use-menu-action";

export function AddCategoryForm() {
  const t = useTranslations("adminMenu");
  const { pending, run } = useMenuAction();
  const [name, setName] = useState("");

  return (
    <form
      className="bg-card flex items-center gap-2 rounded-xl border p-2 pl-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        run(() => createCategory(name), { success: t("saved"), onSuccess: () => setName("") });
      }}
    >
      <label htmlFor="new-category" className="hidden shrink-0 text-sm font-medium sm:block">
        {t("addCategory")}
      </label>
      <Input
        id="new-category"
        className="sm:bg-background h-10 border-0 bg-transparent shadow-none focus-visible:ring-0 sm:border"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("categoryPlaceholder")}
        aria-label={t("categoryName")}
        maxLength={60}
      />
      <Button type="submit" disabled={pending || !name.trim()} className="h-10">
        <Plus />
        <span className="hidden sm:inline">{t("addCategory")}</span>
      </Button>
    </form>
  );
}
