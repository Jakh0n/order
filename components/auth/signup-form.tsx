"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Controller, type FieldPath, type Resolver, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { defaultLocale, isLocale } from "@/i18n/config";
import { logout } from "@/lib/auth/actions";
import { sendSignupCode, verifySignupCode } from "@/lib/auth/email-actions";
import { checkSlug, createStore, signup, type SlugCheck } from "@/lib/auth/signup-actions";
import { POPULAR_CURRENCIES } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { type SignupInput, signupSchema, signupStoreOnlySchema } from "@/lib/validators";

type SlugStatus = { state: "idle" | "checking" } | ({ state: "done" } & SlugCheck);

export function SignupForm({
  host,
  initialStoreName = "",
  googleEnabled = false,
  googleError,
  account,
}: {
  host: string;
  /** Prefilled from the landing ("claim your link") */
  initialStoreName?: string;
  googleEnabled?: boolean;
  /** ?error= from /api/auth/google/callback */
  googleError?: string;
  /** Signed in with Google, no store yet — only the store step is shown */
  account?: { email: string };
}) {
  const t = useTranslations("signup");
  const tAuth = useTranslations("auth");
  const tLegal = useTranslations("legal");
  const currentLocale = useLocale();
  const locale = isLocale(currentLocale) ? currentLocale : defaultLocale;
  // 1 account → 2 email code → 3 store (Google: straight to 3)
  const [step, setStep] = useState<1 | 2 | 3>(account ? 3 : 1);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState<"send" | "verify" | null>(null);
  const [resendIn, setResendIn] = useState(0);
  /** Signed proof that this email was confirmed (bound to the email on the server) */
  const [verified, setVerified] = useState<{ email: string; token: string } | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: "idle" });

  const {
    control,
    register,
    handleSubmit,
    trigger,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    // With an account only the store part is validated (email/password stay empty)
    resolver: (account
      ? zodResolver(signupStoreOnlySchema)
      : zodResolver(signupSchema)) as Resolver<SignupInput>,
    defaultValues: {
      email: "",
      password: "",
      store: {
        storeName: initialStoreName,
        slug: "",
        currency: "USD",
        // The owner's current time zone; can be changed later in Settings
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // The store page opens in the language the owner is signing up in; changeable in Settings
        locale,
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

  // "Send a new code" countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const typedEmail = () => getValues("email").trim().toLowerCase();

  async function sendCode() {
    setCodeBusy("send");
    const result = await sendSignupCode(typedEmail());
    setCodeBusy(null);
    if (result.ok) {
      setCode("");
      setCodeError(null);
      setResendIn(60);
      return true;
    }
    if (result.error === "emailTaken" || result.error === "emailInvalid") {
      setError("email", { message: result.error });
      setStep(1);
    } else {
      toast.error(t(`errors.${result.error}`));
    }
    return false;
  }

  async function next() {
    if (!(await trigger(["email", "password"]))) return;
    // Already confirmed this email (came back to step 1 without changing it)
    if (verified?.email === typedEmail()) return setStep(3);
    if (await sendCode()) setStep(2);
  }

  async function verify() {
    setCodeBusy("verify");
    const result = await verifySignupCode(typedEmail(), code);
    setCodeBusy(null);
    if (result.ok) {
      setVerified({ email: typedEmail(), token: result.token });
      setStep(3);
    } else {
      setCodeError(t(`errors.${result.error}`));
    }
  }

  async function onSubmit(values: SignupInput) {
    // Muvaffaqiyatda server /admin/menu ga yo'naltiradi — bu yerga faqat xato qaytadi
    const result = account
      ? await createStore(values.store)
      : await signup(values, verified?.token ?? "");
    if (!result) return;
    if (result.error === "emailUnverified") {
      setVerified(null);
      setStep(1);
    }
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {account ? (
        <div className="bg-muted/60 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm">
          <span className="min-w-0 truncate">
            {tAuth.rich("signedInAs", {
              email: account.email,
              b: (chunks) => <span className="font-medium">{chunks}</span>,
            })}
          </span>
          <button
            type="button"
            className="text-primary shrink-0 font-medium"
            onClick={() => logout()}
          >
            {tAuth("switchAccount")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-1.5" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-300",
                  n <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span className="text-foreground font-medium">
              {step === 1 ? t("accountTitle") : step === 2 ? t("verifyTitle") : t("storeTitle")}
            </span>
            <span>{t("step", { current: step, total: 3 })}</span>
          </div>
        </div>
      )}

      {/* Qadamlar yashiriladi, unmount qilinmaydi — kiritilgan qiymatlar saqlanib turadi */}
      <div className={cn("flex flex-col gap-4", step !== 1 && "hidden")}>
        {googleEnabled && (
          <>
            <GoogleButton from="signup" />
            {googleError && (
              <p className="text-destructive text-sm" role="alert">
                {googleError === "tooMany" ? t("errors.tooMany") : tAuth("googleFailed")}
              </p>
            )}
            <AuthDivider />
          </>
        )}
        <Field label={t("email")} htmlFor="email" error={errorText(errors.email?.message)}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="h-11"
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
          <PasswordInput
            id="password"
            autoComplete="new-password"
            className="h-11"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </Field>
        <Button
          type="button"
          size="lg"
          className="h-11"
          onClick={next}
          disabled={codeBusy === "send"}
        >
          {codeBusy === "send" && <Loader2 className="animate-spin" />}
          {t("next")}
        </Button>
      </div>

      <div className={cn("flex flex-col gap-4", step !== 2 && "hidden")}>
        <p className="text-muted-foreground text-sm">
          {t.rich("codeSent", {
            email: getValues("email"),
            b: (chunks) => <span className="text-foreground font-medium">{chunks}</span>,
          })}
        </p>
        <Field label={t("code")} htmlFor="code" hint={t("checkSpam")} error={codeError}>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="123456"
            className="h-12 text-center font-mono text-xl tracking-[0.4em]"
            aria-invalid={!!codeError}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6));
              setCodeError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (code.length === 6) verify();
              }
            }}
          />
        </Field>
        <Button
          type="button"
          size="lg"
          className="h-11"
          disabled={code.length !== 6 || codeBusy !== null}
          onClick={verify}
        >
          {codeBusy === "verify" && <Loader2 className="animate-spin" />}
          {t("confirmCode")}
        </Button>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-primary font-medium disabled:text-muted-foreground disabled:font-normal"
            disabled={resendIn > 0 || codeBusy !== null}
            onClick={sendCode}
          >
            {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resendCode")}
          </button>
          <button
            type="button"
            className="text-muted-foreground"
            onClick={() => setStep(1)}
          >
            {t("changeEmail")}
          </button>
        </div>
      </div>

      <div className={cn("flex flex-col gap-4", step !== 3 && "hidden")}>
        <Field
          label={t("storeName")}
          htmlFor="storeName"
          error={errorText(errors.store?.storeName?.message)}
        >
          <Input
            id="storeName"
            placeholder={t("storeNamePlaceholder")}
            maxLength={80}
            className="h-11"
            aria-invalid={!!errors.store?.storeName}
            {...register("store.storeName")}
          />
        </Field>

        <Field label={t("slug")} htmlFor="slug" hint={t("slugHint")} error={errorText(slugError)}>
          <div className="focus-within:border-ring focus-within:ring-ring/50 flex h-11 items-center rounded-lg border focus-within:ring-3">
            <span className="text-muted-foreground shrink-0 pl-2.5 text-sm">{host}/</span>
            <input
              id="slug"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={40}
              className="h-full min-w-0 flex-1 bg-transparent px-1 text-base outline-none md:text-sm"
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
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full rounded-lg border bg-transparent px-2.5 text-base outline-none md:text-sm focus-visible:ring-3"
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
              className="h-11"
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
              className="h-11"
              aria-invalid={!!errors.store?.whatsappNumber}
              {...register("store.whatsappNumber")}
            />
          </Field>
        </div>

        <p className="text-muted-foreground text-xs">{t("terms")}</p>
        <p className="text-muted-foreground text-xs">
          {tLegal.rich("signupAgree", {
            terms: (chunks) => (
              <a href="/terms" target="_blank" className="underline underline-offset-2">
                {chunks}
              </a>
            ),
            privacy: (chunks) => (
              <a href="/privacy" target="_blank" className="underline underline-offset-2">
                {chunks}
              </a>
            ),
          })}
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={cn("h-11", account && "hidden")}
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

      <p className={cn("text-muted-foreground text-center text-sm", account && "hidden")}>
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
