"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import type { MenuActionResult } from "@/lib/menu/admin-actions";

/** Server Action'ni transition ichida chaqiradi, xato bo'lsa toast ko'rsatadi. */
export function useMenuAction() {
  const t = useTranslations("adminMenu");
  const [pending, startTransition] = useTransition();

  function run<T extends object>(
    action: () => Promise<MenuActionResult<T>>,
    opts: { success?: string; onSuccess?: (result: T) => void } = {},
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (opts.success) toast.success(opts.success);
        opts.onSuccess?.(result);
      } else {
        toast.error(t(`errors.${result.error}`));
      }
    });
  }

  return { pending, run };
}

/** Ro'yxatda elementni yuqoriga/pastga surish → yangi id tartibi (chegarada null) */
export function moveId(ids: string[], id: string, dir: -1 | 1): string[] | null {
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= ids.length) return null;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
