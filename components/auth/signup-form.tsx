"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Controller, type FieldPath, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { checkSlug, signup, type SlugCheck } from "@/lib/auth/signup-actions";
import { POPULAR_CURRENCIES } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { type SignupInput, signupSchema } from "@/lib/validators";

type SlugStatus = { state: "idle" | "checking" } | ({ state: "done" } & SlugCheck);

export function SignupForm({ host }: { host: string }) {
  const t = useTranslations("signup");
  const [step, setStep] = useState<1 | 2>(1);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: "idle" });

  const {
    control,
    register,
    handleSubmit,
    trigger,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      store: {
        storeName: "",
        slug: "",
        currency: "USD",
        // The owner's current time zone; can be changed later in Settings
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        channel: "TELEGRAM",
        telegramUsername: "",
        whatsappNumber: "",
      },
    },
  });
  const [storeName, slug, channel] = useWatch({
    control,
    name: ["store.storeName", "store.slug", "store.channel"],
  });

  // Nomdan slug yasash — foydalanuvchi slugni o'zi o'zgartirmaguncha
  useEffect(() => {
    if (!slugTouched) setValue("store.slug", slugify(storeName ?? ""));
  }, [storeName, slugTouched, setValue]);

  // Band-bo'shligini tekshirish (yozish to'xtagach)
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      setSlugStatus({ state: "checking" });
      const result = await checkSlug(slug);
      if (!cancelled) setSlugStatus({ state: "done", ...result });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [slug]);

  const errorText = (message?: string) => {
    if (!message) return null;
    return t.has(`errors.${message}`) ? t(`errors.${message}`) : t("errors.invalid");
  };

  async function next() {
    if (await trigger(["email", "password"])) setStep(2);
  }

  async function onSubmit(values: SignupInput) {
    // Muvaffaqiyatda server /admin/menu ga yo'naltiradi — bu yerga faqat xato qaytadi
    const result = await signup(values);
    if (!result) return;
    for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(path as FieldPath<SignupInput>, { message });
    }
    if (
      result.error === "emailTaken" ||
      result.fieldErrors?.email ||
      result.fieldErrors?.password
    ) {
      setStep(1);
    }
    toast.error(t(`errors.${result.error}`));
  }

  const slugError = errors.store?.slug?.message;
  const slugTaken = slugStatus.state === "done" && !slugStatus.available;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">
          {step === 1 ? t("accountTitle") : t("storeTitle")}
        </span>
        <span>{t("step", { current: step, total: 2 })}</span>
      </div>

      {/* Qadamlar yashiriladi, unmount qilinmaydi — kiritilgan qiymatlar saqlanib turadi */}
      <div className={cn("flex flex-col gap-4", step !== 1 && "hidden")}>
        <Field label={t("email")} htmlFor="email" error={errorText(errors.email?.message)}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </Field>
        <Field
          label={t("password")}
          htmlFor="password"
          hint={t("passwordHint")}
          error={errorText(errors.password?.message)}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </Field>
        <Button type="button" size="lg" className="h-11" onClick={next}>
          {t("next")}
        </Button>
      </div>

      <div className={cn("flex flex-col gap-4", step !== 2 && "hidden")}>
        <Field
          label={t("storeName")}
          htmlFor="storeName"
          error={errorText(errors.store?.storeName?.message)}
        >
          <Input
            id="storeName"
            placeholder={t("storeNamePlaceholder")}
            maxLength={80}
            aria-invalid={!!errors.store?.storeName}
            {...register("store.storeName")}
          />
        </Field>

        <Field label={t("slug")} htmlFor="slug" hint={t("slugHint")} error={errorText(slugError)}>
          <div className="focus-within:border-ring focus-within:ring-ring/50 flex items-center rounded-lg border focus-within:ring-3">
            <span className="text-muted-foreground shrink-0 pl-2.5 text-sm">{host}/</span>
            <input
              id="slug"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={40}
              className="h-9 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
              aria-invalid={!!slugError || slugTaken}
              {...register("store.slug", {
                onChange: (e) => {
                  setSlugTouched(true);
                  e.target.value = e.target.value.toLowerCase();
                },
              })}
            />
            <span className="flex w-8 shrink-0 justify-center" aria-live="polite">
              {slugStatus.state === "checking" && (
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              )}
              {slugStatus.state === "done" &&
                (slugStatus.available ? (
                  <Check className="size-4 text-emerald-600" aria-label={t("slugAvailable")} />
                ) : (
                  <X className="text-destructive size-4" />
                ))}
            </span>
          </div>
          {!slugError && slugStatus.state === "done" && slugStatus.error && (
            <p className="text-destructive text-sm">{errorText(slugStatus.error)}</p>
          )}
        </Field>

        <Field
          label={t("currency")}
          htmlFor="currency"
          error={errorText(errors.store?.currency?.message)}
        >
          <select
            id="currency"
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
            {...register("store.currency")}
          >
            {POPULAR_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("channel")}>
          <Controller
            control={control}
            name="store.channel"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(v) => field.onChange(v)}
                className="grid-cols-2"
              >
                {(["TELEGRAM", "WHATSAPP"] as const).map((value) => (
                  <label
                    key={value}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2",
                      field.value === value ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                    )}
                  >
                    <RadioGroupItem value={value} />
                    {value === "TELEGRAM" ? t("telegram") : t("whatsapp")}
                  </label>
                ))}
              </RadioGroup>
            )}
          />
        </Field>

        <div className={cn(channel !== "TELEGRAM" && "hidden")}>
          <Field
            label={t("telegramUsername")}
            htmlFor="telegramUsername"
            error={errorText(errors.store?.telegramUsername?.message)}
          >
            <Input
              id="telegramUsername"
              placeholder={t("telegramPlaceholder")}
              autoCapitalize="off"
              autoCorrect="off"
              aria-invalid={!!errors.store?.telegramUsername}
              {...register("store.telegramUsername")}
            />
          </Field>
        </div>
        <div className={cn(channel !== "WHATSAPP" && "hidden")}>
          <Field
            label={t("whatsappNumber")}
            htmlFor="whatsappNumber"
            error={errorText(errors.store?.whatsappNumber?.message)}
          >
            <Input
              id="whatsappNumber"
              type="tel"
              placeholder={t("whatsappPlaceholder")}
              aria-invalid={!!errors.store?.whatsappNumber}
              {...register("store.whatsappNumber")}
            />
          </Field>
        </div>

        <p className="text-muted-foreground text-xs">{t("terms")}</p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11"
            disabled={isSubmitting}
            onClick={() => setStep(1)}
          >
            {t("back")}
          </Button>
          <Button
            type="submit"
            size="lg"
            className="h-11 flex-1"
            disabled={isSubmitting || slugTaken}
          >
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? t("creating") : t("submit")}
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground text-center text-sm">
        {t("haveAccount")}{" "}
        <Link href="/admin/login" className="text-primary font-medium">
          {t("loginLink")}
        </Link>
      </p>
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
