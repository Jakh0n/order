"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { locales } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t("language")}>
      {locales.map((l) => (
        <Button
          key={l}
          size="sm"
          variant={l === locale ? "secondary" : "ghost"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setLocale(l);
              router.refresh();
            })
          }
        >
          {l.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
