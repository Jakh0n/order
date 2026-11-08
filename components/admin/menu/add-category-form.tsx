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
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        run(() => createCategory(name), { success: t("saved"), onSuccess: () => setName("") });
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("categoryPlaceholder")}
        aria-label={t("categoryName")}
        maxLength={60}
      />
      <Button type="submit" disabled={pending || !name.trim()}>
        <Plus />
        <span className="hidden sm:inline">{t("addCategory")}</span>
      </Button>
    </form>
  );
}
