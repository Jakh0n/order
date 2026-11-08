"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useStoreOpen } from "@/components/storefront/use-store-open";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cartSubtotal, unitPrice, useCart, useCartHydrated, useCartLines } from "@/lib/cart-store";
import type { CheckoutSettings, StorefrontStore } from "@/lib/menu-types";
import { formatUZS } from "@/lib/money";
import { createOrder } from "@/lib/orders/actions";
import { cn } from "@/lib/utils";
import {
  type CheckoutFormData,
  type CheckoutFormInput,
  checkoutFormSchema,
} from "@/lib/validators";

const CUSTOMER_KEY = "order-customer";

function loadCustomer(): { name?: string; phone?: string } {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveCustomer(name: string, phone: string) {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name, phone }));
  } catch {
    // localStorage yopiq bo'lishi mumkin — muhim emas
  }
}

/** Server xato kalitlari -> forma maydonlari */
const FIELD_MAP: Record<string, keyof CheckoutFormInput> = {
  customerPhone: "phoneDigits",
};

export function CheckoutForm({
  store,
  settings,
}: {
  store: StorefrontStore;
  settings: CheckoutSettings;
}) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const tPay = useTranslations("payment");
  const locale = useLocale();
  const router = useRouter();

  const hydrated = useCartHydrated();
  const lines = useCartLines(store.slug);
  const clearCart = useCart((s) => s.clear);
  const isOpenNow = useStoreOpen(store) ?? store.isOpen;
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormInput, unknown, CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      customerName: "",
      phoneDigits: "",
      type: settings.deliveryEnabled ? "DELIVERY" : "PICKUP",
      zoneId: undefined,
      address: "",
      landmark: "",
      scheduledFor: "",
      comment: "",
      paymentMethod: settings.paymentMethods[0] ?? "CASH",
    },
  });

  // Oldingi buyurtmadagi ism va telefon (faqat shu brauzerda)
  useEffect(() => {
    const saved = loadCustomer();
    if (saved.name || saved.phone) {
      reset({
        ...getValues(),
        customerName: saved.name ?? "",
        phoneDigits: saved.phone ?? "",
      });
    }
  }, [reset, getValues]);

  const [type, zoneId, paymentMethod] = useWatch({
    control,
    name: ["type", "zoneId", "paymentMethod"],
  });

  const subtotal = cartSubtotal(lines);
  const zone = settings.zones.find((z) => z.id === zoneId);
  const deliveryFee = type === "DELIVERY" ? (zone?.fee ?? 0) : 0;
  const total = subtotal + deliveryFee;
  const missing = Math.max(0, store.minOrder - subtotal);
  const canOrder =
    isOpenNow &&
    missing === 0 &&
    settings.paymentMethods.length > 0 &&
    (settings.pickupEnabled || settings.deliveryEnabled);

  const errorText = (key?: string) => (key ? t(`errors.${key}`) : null);

  async function onSubmit(values: CheckoutFormData) {
    const result = await createOrder({
      storeSlug: store.slug,
      lang: locale === "ru" ? "ru" : "uz",
      customerName: values.customerName,
      customerPhone: `+998${values.phoneDigits}`,
      type: values.type,
      zoneId: values.type === "DELIVERY" ? values.zoneId : undefined,
      address: values.address,
      landmark: values.landmark,
      scheduledFor: values.scheduledFor,
      comment: values.comment,
      paymentMethod: values.paymentMethod,
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        optionIds: l.options.map((o) => o.id),
      })),
    });

    if (!result.ok) {
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        const name = FIELD_MAP[field] ?? field;
        if (name in values) setError(name as keyof CheckoutFormInput, { message });
      }
      toast.error(
        t(`errors.${result.error}`, { amount: formatUZS(result.minOrder ?? store.minOrder) }),
      );
      return;
    }

    saveCustomer(values.customerName, values.phoneDigits);
    setSubmitted(true);
    clearCart(store.slug);
    router.replace(`/o/${result.orderId}`);
  }

  if (!hydrated || submitted) {
    return (
      <div className="flex flex-col gap-3 px-4 py-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="text-muted-foreground">{tCart("empty")}</p>
        <Link href={`/${store.slug}`} className={buttonVariants({ variant: "outline" })}>
          {t("backToMenu")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col pb-32">
      {/* Aloqa */}
      <Section title={t("contact")}>
        <Field
          label={t("name")}
          htmlFor="customerName"
          error={errorText(errors.customerName?.message)}
        >
          <Input
            id="customerName"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            aria-invalid={!!errors.customerName}
            {...register("customerName")}
          />
        </Field>
        <Field
          label={t("phone")}
          htmlFor="phoneDigits"
          error={errorText(errors.phoneDigits?.message)}
        >
          <div className="flex items-center gap-2">
            <span className="bg-muted text-muted-foreground flex h-9 items-center rounded-lg border px-3 text-sm">
              +998
            </span>
            <Input
              id="phoneDigits"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="90 123 45 67"
              maxLength={14}
              aria-invalid={!!errors.phoneDigits}
              {...register("phoneDigits")}
            />
          </div>
        </Field>
      </Section>

      {/* Qabul qilish usuli */}
      {settings.pickupEnabled && settings.deliveryEnabled && (
        <Section title={t("type")}>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(v) => field.onChange(v)}
                className="grid-cols-2"
              >
                {(["DELIVERY", "PICKUP"] as const).map((value) => (
                  <ChoiceCard key={value} value={value} checked={field.value === value}>
                    {value === "DELIVERY" ? t("delivery") : t("pickup")}
                  </ChoiceCard>
                ))}
              </RadioGroup>
            )}
          />
        </Section>
      )}

      {/* Manzil */}
      {type === "DELIVERY" && (
        <Section title={t("deliveryDetails")}>
          <Field label={t("zone")} error={errorText(errors.zoneId?.message)}>
            <Controller
              control={control}
              name="zoneId"
              render={({ field }) => (
                <RadioGroup
                  value={field.value ?? null}
                  onValueChange={(v) => field.onChange(String(v))}
                  aria-invalid={!!errors.zoneId}
                >
                  {settings.zones.map((z) => (
                    <ChoiceCard key={z.id} value={z.id} checked={field.value === z.id}>
                      <span className="flex-1">{z.name}</span>
                      <span className="text-muted-foreground text-sm">{formatUZS(z.fee)}</span>
                    </ChoiceCard>
                  ))}
                </RadioGroup>
              )}
            />
          </Field>
          <Field label={t("address")} htmlFor="address" error={errorText(errors.address?.message)}>
            <Input
              id="address"
              autoComplete="street-address"
              placeholder={t("addressPlaceholder")}
              aria-invalid={!!errors.address}
              {...register("address")}
            />
          </Field>
          <Field label={t("landmark")} htmlFor="landmark" optional={t("optional")}>
            <Input id="landmark" placeholder={t("landmarkPlaceholder")} {...register("landmark")} />
          </Field>
        </Section>
      )}

      {/* Vaqt va izoh */}
      <Section>
        <Field
          label={t("time")}
          htmlFor="scheduledFor"
          optional={t("optional")}
          hint={t("timeHint")}
          error={errorText(errors.scheduledFor?.message)}
        >
          <Input id="scheduledFor" type="time" className="w-36" {...register("scheduledFor")} />
        </Field>
        <Field label={t("comment")} htmlFor="comment" optional={t("optional")}>
          <Textarea
            id="comment"
            rows={2}
            maxLength={500}
            placeholder={t("commentPlaceholder")}
            {...register("comment")}
          />
        </Field>
      </Section>

      {/* To'lov */}
      <Section title={t("payment")}>
        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={(v) => field.onChange(v)}>
              {settings.paymentMethods.map((m) => (
                <ChoiceCard key={m} value={m} checked={field.value === m}>
                  {tPay(m)}
                </ChoiceCard>
              ))}
            </RadioGroup>
          )}
        />
        {paymentMethod === "TRANSFER" && settings.transferDetails && (
          <div className="bg-muted rounded-lg p-3 text-sm">
            <p className="font-medium">{t("transferDetails")}</p>
            <p className="mt-1 whitespace-pre-line">{settings.transferDetails}</p>
            <p className="text-muted-foreground mt-2 text-xs">{t("transferNote")}</p>
          </div>
        )}
      </Section>

      {/* Buyurtma tarkibi */}
      <Section title={t("summary")}>
        <ul className="flex flex-col gap-2 text-sm">
          {lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3">
              <span className="min-w-0">
                {l.quantity} × {l.name}
                {l.options.length > 0 && (
                  <span className="text-muted-foreground block text-xs">
                    {l.options.map((o) => o.name).join(", ")}
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums">{formatUZS(unitPrice(l) * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 border-t pt-3 text-sm">
          <Row label={t("subtotal")} value={formatUZS(subtotal)} />
          {type === "DELIVERY" && (
            <Row label={t("deliveryFee")} value={zone ? formatUZS(zone.fee) : t("chooseZone")} />
          )}
          <Row label={t("total")} value={formatUZS(total)} strong />
        </dl>
      </Section>

      {/* Yuborish */}
      <div className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          {!isOpenNow && <p className="text-destructive text-center text-sm">{tCart("closed")}</p>}
          {isOpenNow && missing > 0 && (
            <p className="text-center text-sm text-amber-600 dark:text-amber-500">
              {tCart("addMore", { amount: formatUZS(missing) })}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full justify-between px-4 text-base"
            disabled={!canOrder || isSubmitting}
          >
            <span className="flex items-center gap-2">
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? t("submitting") : t("submit")}
            </span>
            <span className="font-semibold tabular-nums">{formatUZS(total)}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b px-4 py-5">
      {title && <h2 className="font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  optional?: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="text-muted-foreground font-normal">({optional})</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

function ChoiceCard({
  value,
  checked,
  children,
}: {
  value: string;
  checked: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
        checked ? "border-primary bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <RadioGroupItem value={value} />
      {children}
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between", strong && "text-base font-semibold")}>
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
