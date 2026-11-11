"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { priceStep } from "@/lib/money";
import { createPromo } from "@/lib/promos/actions";
import { cn } from "@/lib/utils";
import { type PromoFormData, type PromoFormInput, promoFormSchema } from "@/lib/validators";

const EMPTY: PromoFormInput = {
  code: "",
  type: "PERCENT",
  value: 10,
  minSubtotal: 0,
  maxUses: null,
  expiresOn: "",
};

/** New promo code. Money in the store currency's major unit (8.99). */
export function PromoForm({ currency }: { currency: string }) {
  const t = useTranslations("adminPromos");
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PromoFormInput, unknown, PromoFormData>({
    resolver: zodResolver(promoFormSchema),
    defaultValues: EMPTY,
  });
  const type = useWatch({ control, name: "type" });
  const errorText = (key?: string) => (key ? t(`errors.${key}`) : null);

  async function onSubmit(values: PromoFormData) {
    const result = await createPromo(values);
    if (result.ok) {
      toast.success(t("created", { code: values.code }));
      reset(EMPTY);
      return;
    }
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if (field in EMPTY) setError(field as keyof PromoFormInput, { message });
    }
    if (!result.fieldErrors) toast.error(t(`errors.${result.error}`));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("code")}
          htmlFor="code"
          hint={t("codeHint")}
          error={errorText(errors.code?.message)}
        >
          <Input
            id="code"
            placeholder={t("codePlaceholder")}
            autoComplete="off"
            maxLength={20}
            className="h-10 font-mono uppercase"
            aria-invalid={!!errors.code}
            {...register("code", { setValueAs: (v: string) => v.toUpperCase() })}
          />
        </Field>

        <Field label={t("type")}>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div
                className="bg-muted grid h-10 grid-cols-2 gap-1 rounded-lg p-1"
                role="radiogroup"
              >
                {(["PERCENT", "FIXED"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === value}
                    onClick={() => field.onChange(value)}
                    className={cn(
                      "rounded-md text-sm font-medium transition-colors",
                      field.value === value
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value === "PERCENT" ? t("percent") : t("fixed", { currency })}
                  </button>
                ))}
              </div>
            )}
          />
        </Field>

        <Field
          label={type === "PERCENT" ? t("valuePercent") : t("valueFixed", { currency })}
          htmlFor="value"
          error={errorText(errors.value?.message)}
        >
          <Input
            id="value"
            type="number"
            inputMode="decimal"
            min={0}
            max={type === "PERCENT" ? 100 : undefined}
            step={type === "PERCENT" ? 1 : priceStep(currency)}
            className="h-10 w-40"
            aria-invalid={!!errors.value}
            {...register("value", { valueAsNumber: true })}
          />
        </Field>

        <Field
          label={t("minSubtotal", { currency })}
          htmlFor="minSubtotal"
          hint={t("minSubtotalHint")}
          error={errorText(errors.minSubtotal?.message)}
        >
          <Input
            id="minSubtotal"
            type="number"
            inputMode="decimal"
            min={0}
            step={priceStep(currency)}
            className="h-10 w-40"
            aria-invalid={!!errors.minSubtotal}
            {...register("minSubtotal", { valueAsNumber: true })}
          />
        </Field>

        <Field
          label={t("maxUses")}
          htmlFor="maxUses"
          hint={t("maxUsesHint")}
          error={errorText(errors.maxUses?.message)}
        >
          <Input
            id="maxUses"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            className="h-10 w-40"
            aria-invalid={!!errors.maxUses}
            {...register("maxUses", {
              setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
            })}
          />
        </Field>

        <Field
          label={t("expiresOn")}
          htmlFor="expiresOn"
          hint={t("expiresOnHint")}
          error={errorText(errors.expiresOn?.message)}
        >
          <Input id="expiresOn" type="date" className="h-10 w-44" {...register("expiresOn")} />
        </Field>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-fit gap-2">
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {t("create")}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
