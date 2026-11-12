"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Controller, type FieldPath, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { localeNames, locales } from "@/i18n/config";
import { priceStep } from "@/lib/money";
import { saveStoreSettings } from "@/lib/settings/actions";
import { cn } from "@/lib/utils";
import {
  normalizeTelegramUsername,
  settingsFormToMinor,
  type StoreSettingsFormData,
  type StoreSettingsFormInput,
  storeSettingsFormSchema,
} from "@/lib/validators";

/**
 * currencies / timeZones are built on the server (lib/settings/options.ts): the browser's ICU
 * lists differ from Node's (e.g. SLE vs SLL), which broke hydration when built here.
 */
export function SettingsForm({
  defaultValues,
  currencies,
  timeZones,
  pro,
}: {
  defaultValues: StoreSettingsFormInput;
  currencies: string[];
  timeZones: string[];
  /** Pro plan: free-delivery threshold is editable */
  pro: boolean;
}) {
  const t = useTranslations("adminSettings");
  const tPlan = useTranslations("plan");

  const {
    control,
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<StoreSettingsFormInput, unknown, StoreSettingsFormData>({
    resolver: zodResolver(storeSettingsFormSchema),
    defaultValues,
  });
  const [deliveryEnabled, acceptTransfer, channel, telegramUsername, whatsappNumber, currency] =
    useWatch({
      control,
      name: [
        "deliveryEnabled",
        "acceptTransfer",
        "channel",
        "telegramUsername",
        "whatsappNumber",
        "currency",
      ],
    });

  const errorText = (message?: string) => {
    if (!message) return null;
    return t.has(`errors.${message}`) ? t(`errors.${message}`) : t("errors.invalid");
  };

  async function onSubmit(values: StoreSettingsFormData) {
    // Amounts are typed in the selected currency's major units → minor units for the server
    const result = await saveStoreSettings(settingsFormToMinor(values));
    if (!result.ok) {
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(path as FieldPath<StoreSettingsFormInput>, { message });
      }
      toast.error(t(`errors.${result.error}`));
      return;
    }
    toast.success(t("saved"));
    // Saqlangan qiymatlar yangi boshlang'ich holat (isDirty = false).
    // Yangi tumanlar id sini sahifa qayta yuklanganda oladi (refresh()).
    reset(values);
  }

  const tgName = telegramUsername ? normalizeTelegramUsername(telegramUsername) : "";
  const waDigits = (whatsappNumber ?? "").replace(/\D/g, "");
  const testHref =
    channel === "TELEGRAM"
      ? tgName && `https://t.me/${tgName}`
      : waDigits && `https://wa.me/${waDigits}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
      <Card title={t("storeSection")} hint={t("sectionHints.store")}>
        <Field label={t("phone")} htmlFor="phone" error={errorText(errors.phone?.message)}>
          <Input
            id="phone"
            type="tel"
            placeholder={t("phonePlaceholder")}
            maxLength={30}
            {...register("phone")}
          />
        </Field>
        <Field label={t("address")} htmlFor="address" error={errorText(errors.address?.message)}>
          <Input
            id="address"
            placeholder={t("addressPlaceholder")}
            maxLength={200}
            {...register("address")}
          />
        </Field>
        <Field label={t("landmark")} htmlFor="landmark" error={errorText(errors.landmark?.message)}>
          <Input
            id="landmark"
            placeholder={t("landmarkPlaceholder")}
            maxLength={200}
            {...register("landmark")}
          />
        </Field>
      </Card>

      <Card title={t("regionSection")} hint={t("sectionHints.region")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={t("currency")}
            htmlFor="currency"
            error={errorText(errors.currency?.message)}
          >
            <select id="currency" className={selectClass} {...register("currency")}>
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={t("timeZone")}
            htmlFor="timeZone"
            error={errorText(errors.timeZone?.message)}
          >
            <select id="timeZone" className={selectClass} {...register("timeZone")}>
              {timeZones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-muted-foreground -mt-2 text-xs">
          {t("currencyHint")} {t("timeZoneHint")}
        </p>
        <Field label={t("language")} htmlFor="locale" error={errorText(errors.locale?.message)}>
          <select id="locale" className={selectClass} {...register("locale")}>
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeNames[l]}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-muted-foreground -mt-2 text-xs">{t("languageHint")}</p>
      </Card>

      <Card title={t("hoursSection")} hint={t("sectionHints.hours")}>
        <SwitchField control={control} name="isOpen" label={t("isOpen")} hint={t("isOpenHint")} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t("openTime")}
            htmlFor="openTime"
            error={errorText(errors.openTime?.message)}
          >
            <Input
              id="openTime"
              type="time"
              aria-invalid={!!errors.openTime}
              {...register("openTime")}
            />
          </Field>
          <Field
            label={t("closeTime")}
            htmlFor="closeTime"
            error={errorText(errors.closeTime?.message)}
          >
            <Input
              id="closeTime"
              type="time"
              aria-invalid={!!errors.closeTime}
              {...register("closeTime")}
            />
          </Field>
        </div>
        <p className="text-muted-foreground text-xs">{t("hoursHint")}</p>
      </Card>

      <Card title={t("orderSection")} hint={t("sectionHints.orders")}>
        <SwitchField control={control} name="pickupEnabled" label={t("pickup")} />
        <SwitchField control={control} name="deliveryEnabled" label={t("delivery")} />
        <ErrorLine text={errorText(errors.deliveryEnabled?.message)} />
        <Field
          label={t("minOrder", { currency })}
          htmlFor="minOrder"
          error={errorText(errors.minOrder?.message)}
        >
          <Input
            id="minOrder"
            type="number"
            inputMode="numeric"
            min={0}
            step={priceStep(currency)}
            className="w-40"
            aria-invalid={!!errors.minOrder}
            {...register("minOrder", { valueAsNumber: true })}
          />
        </Field>
        <p className="text-muted-foreground -mt-2 text-xs">{t("minOrderHint")}</p>
        {/* Hidden, not unmounted — keeps the value while delivery is toggled */}
        <div className={cn("flex flex-col gap-1.5", !deliveryEnabled && "hidden")}>
          <Field
            label={t("deliveryFee", { currency })}
            htmlFor="deliveryFee"
            error={errorText(errors.deliveryFee?.message)}
          >
            <Input
              id="deliveryFee"
              type="number"
              inputMode="decimal"
              min={0}
              step={priceStep(currency)}
              className="w-40"
              aria-invalid={!!errors.deliveryFee}
              {...register("deliveryFee", { valueAsNumber: true })}
            />
          </Field>
          <p className="text-muted-foreground text-xs">{t("deliveryFeeHint")}</p>
          <Field
            label={t("freeDeliveryFrom", { currency })}
            htmlFor="freeDeliveryFrom"
            error={errorText(errors.freeDeliveryFrom?.message)}
          >
            {!pro && (
              <Link
                href="/admin/plan"
                className="bg-primary/10 text-primary inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              >
                <Lock className="size-3" aria-hidden />
                {tPlan("pro")}
              </Link>
            )}
            <Input
              id="freeDeliveryFrom"
              // readOnly, not disabled: a disabled field is submitted as undefined and would wipe the value
              readOnly={!pro}
              aria-disabled={!pro}
              tabIndex={pro ? undefined : -1}
              type="number"
              inputMode="decimal"
              min={0}
              step={priceStep(currency)}
              className={cn("w-40", !pro && "bg-muted text-muted-foreground cursor-not-allowed")}
              aria-invalid={!!errors.freeDeliveryFrom}
              {...register("freeDeliveryFrom", {
                // Empty = off
                setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
              })}
            />
          </Field>
          <p className="text-muted-foreground text-xs">{t("freeDeliveryFromHint")}</p>
        </div>
      </Card>

      <Card title={t("paymentSection")} hint={t("sectionHints.payment")}>
        <SwitchField control={control} name="acceptCash" label={t("cash")} />
        <SwitchField control={control} name="acceptCardOnDelivery" label={t("card")} />
        <SwitchField control={control} name="acceptTransfer" label={t("transfer")} />
        <ErrorLine text={errorText(errors.acceptTransfer?.message)} />
        <div className={cn(!acceptTransfer && "hidden")}>
          <Field
            label={t("transferDetails")}
            htmlFor="transferDetails"
            error={errorText(errors.transferDetails?.message)}
          >
            <Textarea
              id="transferDetails"
              rows={4}
              maxLength={500}
              placeholder={t("transferPlaceholder")}
              aria-invalid={!!errors.transferDetails}
              {...register("transferDetails")}
            />
          </Field>
        </div>
      </Card>

      <Card title={t("channelSection")} hint={t("channelHint")}>
        <Controller
          control={control}
          name="channel"
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
        {/* Ikkalasi ham doim DOM da: unmount bo'lsa input qayta paydo bo'lganda bo'sh ko'rinadi */}
        <div className={cn(channel !== "TELEGRAM" && "hidden")}>
          <Field
            label={t("telegramUsername")}
            htmlFor="telegramUsername"
            error={errorText(errors.telegramUsername?.message)}
          >
            <Input
              id="telegramUsername"
              placeholder={t("telegramPlaceholder")}
              autoCapitalize="off"
              autoCorrect="off"
              aria-invalid={!!errors.telegramUsername}
              {...register("telegramUsername")}
            />
          </Field>
        </div>
        <div className={cn(channel !== "WHATSAPP" && "hidden")}>
          <Field
            label={t("whatsappNumber")}
            htmlFor="whatsappNumber"
            error={errorText(errors.whatsappNumber?.message)}
          >
            <Input
              id="whatsappNumber"
              type="tel"
              placeholder={t("whatsappPlaceholder")}
              aria-invalid={!!errors.whatsappNumber}
              {...register("whatsappNumber")}
            />
          </Field>
        </div>
        {testHref && (
          <a
            href={testHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary flex items-center gap-1.5 self-start text-sm"
          >
            <ExternalLink className="size-3.5" />
            {t("testLink")}: {testHref.replace("https://", "")}
          </a>
        )}
      </Card>

      {/* Save bar appears only with unsaved changes (above the phone tab bar) */}
      <div
        className={cn(
          "bg-background/95 sticky bottom-16 z-20 -mx-1 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur transition md:bottom-4",
          !isDirty && !isSubmitting && "pointer-events-none translate-y-4 opacity-0",
        )}
        aria-hidden={!isDirty && !isSubmitting}
      >
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <span className="size-2 rounded-full bg-amber-500" aria-hidden />
          {t("unsaved")}
        </p>
        <Button type="submit" disabled={isSubmitting || !isDirty} className="gap-2">
          {isSubmitting && <Loader2 className="animate-spin" />}
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    // Settings pattern: what the section is about on the left, its fields on the right (desktop)
    <section className="grid gap-3 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-8">
      <div className="md:pt-1">
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-muted-foreground mt-1 text-sm">{hint}</p>}
      </div>
      <div className="bg-card flex min-w-0 flex-col gap-4 rounded-xl border p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}

function SwitchField({
  control,
  name,
  label,
  hint,
}: {
  control: ReturnType<
    typeof useForm<StoreSettingsFormInput, unknown, StoreSettingsFormData>
  >["control"];
  name:
    | "isOpen"
    | "pickupEnabled"
    | "deliveryEnabled"
    | "acceptCash"
    | "acceptCardOnDelivery"
    | "acceptTransfer";
  label: string;
  hint?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex cursor-pointer items-start gap-3">
          <Switch checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
          <span className="flex flex-col">
            <span className="text-sm font-medium">{label}</span>
            {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
          </span>
        </label>
      )}
    />
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <ErrorLine text={error} />
    </div>
  );
}

function ErrorLine({ text }: { text?: string | null }) {
  if (!text) return null;
  return <p className="text-destructive text-sm">{text}</p>;
}

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Popular currencies first, then every ISO 4217 code the browser knows */
