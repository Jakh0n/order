"use client";

import { Lock, Plus, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type Control, Controller, type FieldErrors } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_EXTRA_CONTACTS,
  type StoreSettingsFormData,
  type StoreSettingsFormInput,
} from "@/lib/validators";

type Name = "extraWhatsappNumbers" | "extraTelegramUsernames";

/**
 * Order rolling (Pro): extra WhatsApp numbers / Telegram usernames that take turns with the main
 * one — 1st order to the main contact, 2nd to the next, and so on. Rows can be added and removed.
 * Free: the list is shown read-only with a Pro link (values are kept, not used).
 */
export function ExtraContacts({
  control,
  errors,
  name,
  pro,
  placeholder,
  errorText,
}: {
  control: Control<StoreSettingsFormInput, unknown, StoreSettingsFormData>;
  errors: FieldErrors<StoreSettingsFormInput>;
  name: Name;
  pro: boolean;
  placeholder: string;
  errorText: (message?: string) => string | null;
}) {
  const t = useTranslations("adminSettings.rolling");
  const tPlan = useTranslations("plan");
  const isPhone = name === "extraWhatsappNumbers";
  const rowErrors = errors[name] as Record<number, { message?: string } | undefined> | undefined;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const list = field.value ?? [];
        const set = (next: string[]) => field.onChange(next);
        return (
          <fieldset className="flex flex-col gap-2">
            <legend className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {isPhone ? t("titleWhatsapp") : t("titleTelegram")}
              {!pro && (
                <Link
                  href="/admin/plan"
                  className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                >
                  <Lock className="size-3" aria-hidden />
                  {tPlan("pro")}
                </Link>
              )}
            </legend>
            <p className="text-muted-foreground text-xs">{t("hint")}</p>

            {list.map((value, i) => {
              const error = errorText(rowErrors?.[i]?.message);
              return (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6 shrink-0 text-right text-xs tabular-nums">
                      {i + 2}.
                    </span>
                    <Input
                      type={isPhone ? "tel" : "text"}
                      value={value}
                      placeholder={placeholder}
                      autoCapitalize="off"
                      autoCorrect="off"
                      readOnly={!pro}
                      aria-label={t("rowLabel", { n: i + 2 })}
                      aria-invalid={!!error}
                      onChange={(e) => set(list.map((v, j) => (j === i ? e.target.value : v)))}
                      onBlur={field.onBlur}
                    />
                    {pro && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 shrink-0"
                        aria-label={t("remove", { n: i + 2 })}
                        onClick={() => set(list.filter((_, j) => j !== i))}
                      >
                        <X className="size-4" aria-hidden />
                      </Button>
                    )}
                  </div>
                  {error && (
                    <p className="text-destructive pl-8 text-xs" role="alert">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}

            {pro && list.length < MAX_EXTRA_CONTACTS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => set([...list, ""])}
              >
                <Plus className="size-4" aria-hidden />
                {isPhone ? t("addWhatsapp") : t("addTelegram")}
              </Button>
            )}
          </fieldset>
        );
      }}
    />
  );
}
