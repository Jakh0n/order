"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bike, ChevronRight, LocateFixed, Loader2, MapPin, Store, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useFormatMoney } from "@/components/currency-provider";
import { useStoreOpen } from "@/components/storefront/use-store-open";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProductImage } from "@/components/storefront/product-image";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { adminCartKey } from "@/lib/cart-keys";
import { cartSubtotal, unitPrice, useCart, useCartHydrated, useCartLines } from "@/lib/cart-store";
import type { CheckoutSettings, StorefrontStore } from "@/lib/menu-types";
import { lookupAddress } from "@/lib/geo/actions";
import { mapsLink } from "@/lib/order-message";
import { createOrder } from "@/lib/orders/actions";
import { createManualOrder } from "@/lib/orders/admin-actions";
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
  customerPhone: "phone",
};

/**
 * mode="customer" — mijoz checkout'i (/[store]/checkout).
 * mode="admin" — egasi telefon orqali kelgan buyurtmani kiritadi: alohida savat,
 * ish vaqti va minOrder tekshirilmaydi, "hozir to'landi" belgisi bor.
 */
export function CheckoutForm({
  store,
  settings,
  mode = "customer",
}: {
  store: StorefrontStore;
  settings: CheckoutSettings;
  mode?: "customer" | "admin";
}) {
  const formatMoney = useFormatMoney();
  const isAdmin = mode === "admin";
  const cartKey = isAdmin ? adminCartKey(store.slug) : store.slug;
  const tAdmin = useTranslations("adminOrders");
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const tPay = useTranslations("payment");
  const router = useRouter();

  const hydrated = useCartHydrated();
  const lines = useCartLines(cartKey);
  const clearCart = useCart((s) => s.clear);
  const isOpenNow = useStoreOpen(store) ?? store.isOpen;
  const [submitted, setSubmitted] = useState(false);
  const [markPaid, setMarkPaid] = useState(false);
  const [timeMode, setTimeMode] = useState<"asap" | "scheduled">("asap");

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormInput, unknown, CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      type: settings.deliveryEnabled ? "DELIVERY" : "PICKUP",
      latitude: undefined,
      longitude: undefined,
      address: "",
      landmark: "",
      scheduledFor: "",
      comment: "",
      paymentMethod: settings.paymentMethods[0] ?? "CASH",
    },
  });

  // Oldingi buyurtmadagi ism va telefon (faqat shu brauzerda)
  useEffect(() => {
    if (isAdmin) return;
    const saved = loadCustomer();
    if (saved.name || saved.phone) {
      reset({
        ...getValues(),
        customerName: saved.name ?? "",
        phone: saved.phone ?? "",
      });
    }
  }, [reset, getValues, isAdmin]);

  // Checkout'ga savatsiz kelinsa (to'g'ridan-to'g'ri URL) — menyuga qaytaramiz
  const cartEmpty = hydrated && !submitted && !isAdmin && lines.length === 0;
  useEffect(() => {
    if (cartEmpty) router.replace(`/${store.slug}`);
  }, [cartEmpty, router, store.slug]);

  const [type, paymentMethod, latitude, longitude] = useWatch({
    control,
    name: ["type", "paymentMethod", "latitude", "longitude"],
  });

  const subtotal = cartSubtotal(lines);
  const deliveryFee = type === "DELIVERY" ? settings.deliveryFee : 0;

  // "Use my current location": browser geolocation → coordinates on the order + address text
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );
  const hasLocation = latitude !== undefined && longitude !== undefined;

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setLocationNote({ tone: "error", text: t("errors.locationUnsupported") });
      return;
    }
    setLocating(true);
    setLocationNote(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = Number(coords.latitude.toFixed(6));
        const lng = Number(coords.longitude.toFixed(6));
        setValue("latitude", lat);
        setValue("longitude", lng);
        const result = await lookupAddress(lat, lng);
        if (result.ok) {
          setValue("address", result.address, { shouldValidate: true, shouldDirty: true });
          setLocationNote({ tone: "ok", text: t("locationFilled") });
        } else {
          setLocationNote({ tone: "error", text: t("errors.geocodeFailed") });
        }
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocationNote({
          tone: "error",
          text:
            error.code === error.PERMISSION_DENIED
              ? t("errors.locationDenied")
              : t("errors.locationUnavailable"),
        });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  function removeLocation() {
    setValue("latitude", undefined);
    setValue("longitude", undefined);
    setLocationNote(null);
  }
  const total = subtotal + deliveryFee;
  const missing = Math.max(0, store.minOrder - subtotal);
  const canOrder = isAdmin
    ? lines.length > 0
    : isOpenNow &&
      missing === 0 &&
      settings.paymentMethods.length > 0 &&
      (settings.pickupEnabled || settings.deliveryEnabled);

  const errorText = (key?: string) => (key ? t(`errors.${key}`) : null);

  async function onSubmit(values: CheckoutFormData) {
    const order = {
      lang: "en" as const,
      customerName: values.customerName,
      customerPhone: values.phone,
      type: values.type,
      latitude: values.type === "DELIVERY" ? values.latitude : undefined,
      longitude: values.type === "DELIVERY" ? values.longitude : undefined,
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
    };

    const result = isAdmin
      ? await createManualOrder({ ...order, markPaid })
      : await createOrder({ ...order, storeSlug: store.slug });

    if (!result.ok) {
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        const name = FIELD_MAP[field] ?? field;
        if (name in values) setError(name as keyof CheckoutFormInput, { message });
      }
      const minOrder = "minOrder" in result ? result.minOrder : undefined;
      toast.error(t(`errors.${result.error}`, { amount: formatMoney(minOrder ?? store.minOrder) }));
      return;
    }

    setSubmitted(true);
    clearCart(cartKey);
    if (isAdmin) {
      const number = "number" in result ? Number(result.number) : 0;
      toast.success(tAdmin("created", { number }));
      router.push("/admin/orders");
    } else {
      saveCustomer(values.customerName, values.phone);
      router.replace(`/o/${result.orderId}`);
    }
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

  if (lines.length === 0 && isAdmin) {
    return <p className="text-muted-foreground px-4 py-10 text-center">{tAdmin("addItems")}</p>;
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

  const pickupAddress = [store.address].filter(Boolean).join(", ");

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3 px-3 py-3">
      {/* Buyurtma tarkibi — birinchi: mijoz nima buyurtma qilayotganini ko'rib turadi */}
      <Card
        title={t("summary")}
        action={
          !isAdmin && (
            <Link href={`/${store.slug}`} className="text-primary text-sm font-medium">
              {t("edit")}
            </Link>
          )
        }
      >
        <ul className="flex flex-col gap-3">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-3">
              <ProductImage
                src={l.imageUrl}
                alt=""
                sizes="48px"
                className="size-12 shrink-0 rounded-lg"
              />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">
                  <span className="text-muted-foreground">{l.quantity} × </span>
                  {l.name}
                </p>
                {l.options.length > 0 && (
                  <p className="text-muted-foreground truncate text-xs">
                    {l.options.map((o) => o.name).join(", ")}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {formatMoney(unitPrice(l) * l.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Qabul qilish usuli — segment tugmalar */}
      {settings.pickupEnabled && settings.deliveryEnabled && (
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div
              className="bg-background grid grid-cols-2 gap-1 rounded-2xl p-1"
              role="radiogroup"
              aria-label={t("type")}
            >
              {(
                [
                  ["DELIVERY", t("delivery"), Bike],
                  ["PICKUP", t("pickup"), Store],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={field.value === value}
                  onClick={() => field.onChange(value)}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
                    field.value === value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
        />
      )}

      {/* Yetkazish manzili. Yashiriladi, unmount qilinmaydi — aks holda qaytganda kiritilgan manzil bo'sh ko'rinadi */}
      <div className={cn(type !== "DELIVERY" && "hidden")}>
        <Card title={t("deliveryDetails")}>
          {!isAdmin && (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 justify-start gap-2 rounded-xl"
                disabled={locating}
                onClick={locateMe}
              >
                {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
                {locating ? t("locating") : t("useLocation")}
              </Button>
              {hasLocation && (
                <div className="bg-primary/5 flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
                  <MapPin className="text-primary size-4 shrink-0" />
                  <span className="flex-1">{t("locationAttached")}</span>
                  <a
                    href={mapsLink(latitude, longitude) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium"
                  >
                    {t("viewOnMap")}
                  </a>
                  <button
                    type="button"
                    onClick={removeLocation}
                    aria-label={t("removeLocation")}
                    className="text-muted-foreground hover:bg-background rounded-full p-1"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
              {locationNote && (
                <p
                  className={cn(
                    "text-sm",
                    locationNote.tone === "error" ? "text-destructive" : "text-muted-foreground",
                  )}
                  role={locationNote.tone === "error" ? "alert" : undefined}
                >
                  {locationNote.text}
                </p>
              )}
            </div>
          )}
          <Field label={t("address")} htmlFor="address" error={errorText(errors.address?.message)}>
            <Input
              id="address"
              autoComplete="street-address"
              placeholder={t("addressPlaceholder")}
              aria-invalid={!!errors.address}
              className="h-11"
              {...register("address")}
            />
          </Field>
          <Field label={t("landmark")} htmlFor="landmark" optional={t("optional")}>
            <Input
              id="landmark"
              placeholder={t("landmarkPlaceholder")}
              className="h-11"
              {...register("landmark")}
            />
          </Field>
        </Card>
      </div>

      {/* Olib ketishda — qayerdan */}
      {type === "PICKUP" && pickupAddress && (
        <Card title={t("pickupAddress")}>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
            {pickupAddress}
          </p>
        </Card>
      )}

      {/* Aloqa */}
      <Card title={t("contact")}>
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
            className="h-11"
            {...register("customerName")}
          />
        </Field>
        <Field
          label={t("phone")}
          htmlFor="phone"
          hint={isAdmin ? undefined : t("phoneHint")}
          error={errorText(errors.phone?.message)}
        >
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t("phonePlaceholder")}
            maxLength={24}
            aria-invalid={!!errors.phone}
            className="h-11"
            {...register("phone")}
          />
        </Field>
      </Card>

      {/* Vaqt va izoh */}
      <Card title={t("time")}>
        <div className="grid grid-cols-2 gap-2">
          {(["asap", "scheduled"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={timeMode === mode}
              onClick={() => {
                setTimeMode(mode);
                if (mode === "asap") setValue("scheduledFor", "", { shouldValidate: true });
              }}
              className={cn(
                "h-11 rounded-xl border text-sm font-medium transition-colors",
                timeMode === mode ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted",
              )}
            >
              {mode === "asap" ? t("timeAsap") : t("timeScheduled")}
            </button>
          ))}
        </div>
        <div className={cn(timeMode !== "scheduled" && "hidden")}>
          <Field
            label={t("time")}
            htmlFor="scheduledFor"
            error={errorText(errors.scheduledFor?.message)}
          >
            <Input
              id="scheduledFor"
              type="time"
              className="h-11 w-40"
              {...register("scheduledFor")}
            />
          </Field>
        </div>
        <Field label={t("comment")} htmlFor="comment" optional={t("optional")}>
          <Textarea
            id="comment"
            rows={2}
            maxLength={500}
            placeholder={t("commentPlaceholder")}
            {...register("comment")}
          />
        </Field>
      </Card>

      {/* To'lov */}
      <Card title={t("payment")}>
        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={(v) => field.onChange(v)}
              className="gap-2"
            >
              {settings.paymentMethods.map((m) => (
                <ChoiceCard key={m} value={m} checked={field.value === m}>
                  {tPay(m)}
                </ChoiceCard>
              ))}
            </RadioGroup>
          )}
        />
        {paymentMethod === "TRANSFER" && settings.transferDetails && (
          <div className="bg-muted rounded-xl p-3 text-sm">
            <p className="font-medium">{t("transferDetails")}</p>
            <p className="mt-1 whitespace-pre-line">{settings.transferDetails}</p>
            <p className="text-muted-foreground mt-2 text-xs">{t("transferNote")}</p>
          </div>
        )}
      </Card>

      {isAdmin && (
        <label className="bg-background flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-4">
          <Checkbox checked={markPaid} onCheckedChange={setMarkPaid} />
          <span className="font-medium">{tAdmin("markPaidNow")}</span>
        </label>
      )}

      {/* Yakuniy summa va yuborish */}
      <div className="bg-background/95 sticky bottom-0 z-40 -mx-3 mt-1 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          <dl className="flex flex-col gap-0.5 text-sm">
            <Row label={t("subtotal")} value={formatMoney(subtotal)} />
            {type === "DELIVERY" && (
              <Row label={t("deliveryFee")} value={formatMoney(settings.deliveryFee)} />
            )}
          </dl>
          {!isAdmin && !isOpenNow && (
            <p className="text-destructive text-center text-sm">{tCart("closed")}</p>
          )}
          {!isAdmin && isOpenNow && missing > 0 && (
            <p className="text-center text-sm text-amber-600">
              {tCart("addMore", { amount: formatMoney(missing) })}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="h-13 w-full justify-between rounded-2xl px-5 text-base"
            disabled={!canOrder || isSubmitting}
          >
            <span className="flex items-center gap-2">
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {isSubmitting ? t("submitting") : t("submit")}
            </span>
            <span className="flex items-center gap-1 font-bold tabular-nums">
              {formatMoney(total)}
              {!isSubmitting && <ChevronRight className="size-4" />}
            </span>
          </Button>
        </div>
      </div>
    </form>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-background flex flex-col gap-4 rounded-2xl p-4">
      {(title || action) && (
        <div className="flex items-center justify-between gap-2">
          {title && <h2 className="font-bold">{title}</h2>}
          {action}
        </div>
      )}
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
        "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
        checked ? "border-primary bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <RadioGroupItem value={value} />
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
