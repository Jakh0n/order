"use client";

import { Check, ChevronDown, Globe, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/i18n/actions";
import { type Locale, localeNames, locales } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Til tanlash: pill tugma (globus + kod + strelka) → tillar o'z nomi bilan.
 * variant="overlay" — rasm ustida (do'kon muqovasi): oq shisha fon.
 */
export function LanguageSwitcher({
  variant = "default",
  className,
}: {
  variant?: "default" | "overlay";
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (locales.length < 2) return null;

  function choose(l: Locale) {
    if (l === locale) return;
    startTransition(async () => {
      await setLocale(l);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("language")}
        disabled={pending}
        className={cn(
          "group/lang inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full pr-2.5 pl-3 text-sm font-semibold",
          "focus-visible:ring-ring/50 transition-[background-color,box-shadow,color] outline-none focus-visible:ring-3",
          "disabled:opacity-70",
          variant === "overlay"
            ? "bg-white/90 text-neutral-900 shadow-sm ring-1 ring-black/5 backdrop-blur-md hover:bg-white data-[popup-open]:bg-white"
            : "text-foreground/80 hover:bg-muted hover:text-foreground data-[popup-open]:bg-muted data-[popup-open]:text-foreground",
          className,
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Globe className="size-4" aria-hidden />
        )}
        <span className="tracking-wide">{locale.toUpperCase()}</span>
        <ChevronDown
          className="size-3.5 opacity-60 transition-transform duration-200 group-data-[popup-open]/lang:rotate-180"
          aria-hidden
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-auto min-w-56 rounded-2xl p-1.5 shadow-xl ring-black/5"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 pt-1.5 pb-1 text-[11px] tracking-wider uppercase">
            {t("language")}
          </DropdownMenuLabel>
          {locales.map((l) => {
            const active = l === locale;
            return (
              <DropdownMenuItem
                key={l}
                lang={l}
                onClick={() => choose(l)}
                className={cn(
                  "min-h-11 gap-3 rounded-xl px-2.5 py-2 text-[15px]",
                  active && "bg-primary/8 focus:bg-primary/12",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-8 items-center justify-center rounded-md text-[11px] font-bold tracking-wide",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {l.toUpperCase()}
                </span>
                <span className={cn("flex-1", active && "font-semibold")}>{localeNames[l]}</span>
                <Check
                  className={cn("text-primary size-4", active ? "opacity-100" : "opacity-0")}
                  aria-hidden
                />
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
