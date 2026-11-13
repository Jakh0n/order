"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Armchair,
  Bike,
  CheckCircle2,
  ChevronRight,
  LocateFixed,
  Loader2,
  MapPin,
  Store,
  TicketPercent,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CopyButton } from "@/components/copy-button";
import { useFormatMoney } from "@/components/currency-provider";
import { ReceiptPicker, sendReceipt } from "@/components/order/receipt-upload";
import { validTable } from "@/components/storefront/table-banner";
import { useStoreOpen, useTimeSlots } from "@/components/storefront/use-store-open";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProductImage } from "@/components/storefront/product-image";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { defaultLocale, isLocale } from "@/i18n/config";
import { adminCartKey } from "@/lib/cart-keys";
import { cartSubtotal, unitPrice, useCart, useCartHydrated, useCartLines } from "@/lib/cart-store";
import type { CheckoutSettings, StorefrontStore } from "@/lib/menu-types";
import { lookupAddress } from "@/lib/geo/actions";
import { saveLastOrder } from "@/lib/last-order";
import { dialPrefix } from "@/lib/phone-prefix";
import { setTable, useTable } from "@/lib/table-session";
import { mapsLink } from "@/lib/maps";
import { createOrder } from "@/lib/orders/actions";
import { quoteDelivery, roundKm } from "@/lib/delivery-distance";
import { deliveryFeeFor, promoDiscount, TIP_PERCENTS, tipAmount } from "@/lib/orders/promo";
import { checkPromo, type CheckPromoResult } from "@/lib/orders/promo-actions";
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
  const locale = useLocale();
  const tCart = useTranslations("cart");
  const tPay = useTranslations("payment");
  const tReceipt = useTranslations("receipt");
  const tTable = useTranslations("table");
  const tLegal = useTranslations("legal");
  const router = useRouter();

  const hydrated = useCartHydrated();
  const lines = useCartLines(cartKey);
  const clearCart = useCart((s) => s.clear);
  const isOpenNow = useStoreOpen(store) ?? store.isOpen;
  const slots = useTimeSlots(store);
  // Ordering from a table QR code: name + payment only, no phone/address/time
  const sessionTable = validTable(store, useTable(store.slug));
  const table = isAdmin ? null : sessionTable;
  const dineIn = table !== null;
  // Closed now, but the customer can pick a time after opening (not at a table)
  const preorder = !isAdmin && !dineIn && !isOpenNow && slots.length > 0;
  const [submitted, setSubmitted] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [markPaid, setMarkPaid] = useState(false);
  // Promo code: checked on "Apply" (preview), re-checked and counted when the order is placed
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<
    Extract<CheckPromoResult, { ok: true }>["promo"] | null
  >(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [chosenTimeMode, setTimeMode] = useState<"asap" | "scheduled">("asap");
  const timeMode = preorder ? "scheduled" : chosenTimeMode;
  // Bank transfer receipt photo — uploaded right after the order is saved
  const [receipt, setReceipt] = useState<File | null>(null);

  const defaultType = settings.deliveryEnabled ? "DELIVERY" : "PICKUP";
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
      // Pre-filled with the store's country code — the most common mistake is a local number
      phone: dialPrefix(store.phone),
      type: defaultType,
      tableNumber: undefined,
      latitude: undefined,
      longitude: undefined,
      address: "",
      landmark: "",
      scheduledFor: "",
      comment: "",
      customerEmail: "",
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
        phone: saved.phone || getValues("phone"),
      });
    }
  }, [reset, getValues, isAdmin]);

  // Table from the QR session drives the order type (and back, if "not at a table")
  useEffect(() => {
    if (dineIn) {
      setValue("type", "DINE_IN");
      setValue("tableNumber", table);
    } else if (getValues("type") === "DINE_IN") {
      setValue("type", defaultType);
      setValue("tableNumber", undefined);
    }
  }, [dineIn, table, setValue, getValues, defaultType]);

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
  // By distance from the store (Pro) once the customer shares a location; flat fee otherwise
  const quote = quoteDelivery(settings.deliveryFee, settings.distance, { latitude, longitude });
  const tooFar = type === "DELIVERY" && quote.kind === "tooFar";
  const baseDeliveryFee = quote.kind === "tooFar" ? settings.deliveryFee : quote.fee;
  const deliveryFee = deliveryFeeFor(type, subtotal, baseDeliveryFee, settings.freeDeliveryFrom);
  // Free delivery: how much is missing (only shown for delivery)
  const toFreeDelivery =
    type === "DELIVERY" && settings.freeDeliveryFrom !== null && baseDeliveryFee > 0
      ? Math.max(0, settings.freeDeliveryFrom - subtotal)
      : 0;
  // The code may stop applying if the cart drops below its minimum
  const promoBelowMin = appliedPromo !== null && subtotal < appliedPromo.minSubtotal;
  const discount = appliedPromo && !promoBelowMin ? promoDiscount(appliedPromo, subtotal) : 0;

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
  // Tip (Website → Checkout): percent of the items after a discount; the server recomputes it
  const [tipPercent, setTipPercent] = useState<number>(0);
  const tips = !isAdmin && settings.tipsEnabled;
  const tip = tips ? tipAmount(subtotal - discount, tipPercent) : 0;
  const askEmail = !isAdmin && settings.emailField !== "off";
  const total = subtotal - discount + deliveryFee + tip;

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    setCheckingPromo(true);
    setPromoError(null);
    const result = await checkPromo({ storeSlug: store.slug, code, subtotal });
    setCheckingPromo(false);
    if (result.ok) {
      setAppliedPromo(result.promo);
      setPromoInput("");
      return;
    }
    setPromoError(
      result.error === "tooMany"
        ? t("promo.tooMany")
        : t(`errors.${result.error}`, { amount: formatMoney(result.minSubtotal ?? 0) }),
    );
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoError(null);
  }
  // No minimum order at a table (same rule as the server)
  const missing = dineIn ? 0 : Math.max(0, store.minOrder - subtotal);
  const canOrder = isAdmin
    ? lines.length > 0
    : (isOpenNow || preorder) &&
      missing === 0 &&
      !tooFar &&
      settings.paymentMethods.length > 0 &&
      (dineIn || settings.pickupEnabled || settings.deliveryEnabled);

  const errorText = (key?: string) => (key ? t(`errors.${key}`) : null);

  async function onSubmit(values: CheckoutFormData) {
    setServerError(null);
    if (askEmail && settings.emailField === "required" && !values.customerEmail) {
      setError("customerEmail", { message: "emailRequired" }, { shouldFocus: true });
      return;
    }
    if (!isAdmin && !dineIn && timeMode === "scheduled" && !values.scheduledFor) {
      setError("scheduledFor", { message: "timeRequired" }, { shouldFocus: true });
      return;
    }
    const order = {
      lang: isLocale(locale) ? locale : defaultLocale,
      customerName: values.customerName,
      customerPhone: values.phone,
      type: values.type,
      tableNumber: values.tableNumber,
      latitude: values.type === "DELIVERY" ? values.latitude : undefined,
      longitude: values.type === "DELIVERY" ? values.longitude : undefined,
      address: values.address,
      landmark: values.landmark,
      scheduledFor: dineIn ? undefined : values.scheduledFor,
      promoCode: isAdmin || promoBelowMin ? undefined : appliedPromo?.code,
      comment: settings.showNote || isAdmin ? values.comment : undefined,
      customerEmail: askEmail ? values.customerEmail : undefined,
      tipPercent: tips ? tipPercent : undefined,
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
      if (result.error.startsWith("promo")) {
        // The code stopped working (used up / expired) — drop it, the customer can order without it
        setAppliedPromo(null);
        setPromoError(t(`errors.${result.error}`, { amount: formatMoney(0) }));
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        const name = FIELD_MAP[field] ?? field;
        if (name in values) setError(name as keyof CheckoutFormInput, { message });
      }
      const minOrder = "minOrder" in result ? result.minOrder : undefined;
      // Inline, next to the button (a toast disappears before it can be acted on)
      setServerError(
        t(`errors.${result.error}`, {
          amount: formatMoney(minOrder ?? store.minOrder),
          km: "maxKm" in result ? (result.maxKm ?? 0) : 0,
        }),
      );
      return;
    }

    setSubmitted(true);
    clearCart(cartKey);
    if (isAdmin) {
      const number = "number" in result ? Number(result.number) : 0;
      toast.success(tAdmin("created", { number }));
      router.push("/admin/orders");
    } else {
      // A table order has no phone — keep the one saved from earlier orders
      saveCustomer(values.customerName, values.phone || loadCustomer().phone || "");
      if ("number" in result) {
        saveLastOrder(store.slug, { id: result.orderId, number: result.number });
      }
      if (receipt && values.paymentMethod === "TRANSFER") {
        setUploadingReceipt(true);
        const uploaded = await sendReceipt(result.orderId, receipt);
        // The order is already saved — the receipt can be attached again on the order page
        if (!uploaded.ok) toast.error(tReceipt("uploadFailed"));
      }
      router.replace(`/o/${result.orderId}`);
    }
  }

  if (submitted) {
    // Clear "it worked" state while we upload the receipt / open the order page
    return (
      <div
        className="flex flex-col items-center gap-3 px-4 py-20 text-center"
        role="status"
        aria-live="polite"
      >
        <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full">
          <CheckCircle2 className="size-8" />
        </span>
        <p className="text-lg font-bold">{t("placed")}</p>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          {uploadingReceipt ? t("uploadingReceipt") : t("openingOrder")}
        </p>
      </div>
    );
  }

  if (!hydrated) {
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

      {/* At a table (QR) — replaces pickup/delivery */}
      {table !== null && (
        <section className="border-primary/20 bg-background flex items-center gap-3 rounded-2xl border p-4">
          <span className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-xl">
            <Armchair className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{tTable("label", { number: table })}</p>
            <p className="text-muted-foreground text-sm">{tTable("checkoutHint")}</p>
          </div>
          <button
            type="button"
            onClick={() => setTable(store.slug, null)}
            className="text-primary shrink-0 text-sm font-medium"
          >
            {tTable("notAtTable")}
          </button>
        </section>
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
        {/* Not needed at a table — hidden, not unmounted (keeps the typed number) */}
        <div className={cn(dineIn && "hidden")}>
          <Field
            label={t("phone")}
            htmlFor="phone"
            hint={t("phoneHint")}
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
          {/* Website → Checkout: email off / optional / required (hidden, not unmounted) */}
          <div className={cn(!askEmail && "hidden")}>
            <Field
              label={t("email")}
              htmlFor="customerEmail"
              optional={settings.emailField === "optional" ? t("optional") : undefined}
              error={errorText(errors.customerEmail?.message)}
            >
              <Input
                id="customerEmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                maxLength={200}
                aria-invalid={!!errors.customerEmail}
                className="h-11"
                {...register("customerEmail")}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* Qabul qilish usuli — segment tugmalar */}
      {!dineIn && settings.pickupEnabled && settings.deliveryEnabled && (
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
              {/* Distance pricing: the exact fee needs the location; too far → can't deliver */}
              {settings.distance && type === "DELIVERY" && (
                <p
                  className={cn(
                    "text-sm",
                    tooFar ? "text-destructive font-medium" : "text-muted-foreground",
                  )}
                  role={tooFar ? "alert" : undefined}
                >
                  {quote.kind === "tooFar"
                    ? t("tooFarHint", { km: roundKm(quote.km), max: quote.maxKm })
                    : quote.kind === "distance"
                      ? t("distanceFee", { km: roundKm(quote.km), fee: formatMoney(quote.fee) })
                      : t("distanceHint")}
                </p>
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

      {/* Vaqt va izoh */}
      <Card title={dineIn ? undefined : t("time")}>
        <div className={cn("flex flex-col gap-4", dineIn && "hidden")}>
          {preorder && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {t("preorderNote")}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {(["asap", "scheduled"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={timeMode === mode}
                disabled={mode === "asap" && preorder}
                onClick={() => {
                  setTimeMode(mode);
                  if (mode === "asap") setValue("scheduledFor", "", { shouldValidate: true });
                }}
                className={cn(
                  "h-11 rounded-xl border text-sm font-medium transition-colors disabled:opacity-40",
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
              {isAdmin ? (
                <Input
                  id="scheduledFor"
                  type="time"
                  className="h-11 w-40"
                  {...register("scheduledFor")}
                />
              ) : (
                // Only real slots: inside opening hours, not in the past, with preparation time
                <select
                  id="scheduledFor"
                  aria-invalid={!!errors.scheduledFor}
                  className="border-input bg-background focus-visible:ring-ring/50 h-11 w-full rounded-md border px-3 text-base outline-none focus-visible:ring-3 sm:w-56"
                  {...register("scheduledFor")}
                >
                  <option value="">{t("chooseTime")}</option>
                  {slots.map((slot) => (
                    <option key={`${slot.tomorrow}-${slot.value}`} value={slot.value}>
                      {slot.tomorrow ? t("tomorrowAt", { time: slot.value }) : slot.value}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        </div>
        {/* Hidden, not unmounted, when the store turns the note off */}
        <div className={cn(!settings.showNote && !isAdmin && "hidden")}>
          <Field label={t("comment")} htmlFor="comment" optional={t("optional")}>
            <Textarea
              id="comment"
              rows={2}
              maxLength={500}
              placeholder={t("commentPlaceholder")}
              {...register("comment")}
            />
          </Field>
        </div>
      </Card>

      {/* Promo code (only when the store has active codes) */}
      {!isAdmin && settings.hasPromoCodes && (
        <Card title={t("promo.title")}>
          {appliedPromo ? (
            <div className="border-primary/30 bg-primary/5 flex items-center gap-3 rounded-xl border px-3 py-2.5">
              <TicketPercent className="text-primary size-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-bold tracking-wide">{appliedPromo.code}</p>
                <p className="text-muted-foreground text-xs">
                  {promoBelowMin
                    ? t("errors.promoMinSubtotal", {
                        amount: formatMoney(appliedPromo.minSubtotal),
                      })
                    : t("promo.applied", { amount: formatMoney(discount) })}
                </p>
              </div>
              <button
                type="button"
                onClick={removePromo}
                aria-label={t("promo.remove")}
                className="text-muted-foreground hover:bg-background rounded-full p-1.5"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <Input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void applyPromo();
                    }
                  }}
                  placeholder={t("promo.placeholder")}
                  aria-label={t("promo.title")}
                  aria-invalid={!!promoError}
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={20}
                  className="h-11 flex-1 font-mono uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-4"
                  disabled={!promoInput.trim() || checkingPromo}
                  onClick={applyPromo}
                >
                  {checkingPromo ? <Loader2 className="animate-spin" /> : t("promo.apply")}
                </Button>
              </div>
              {promoError && (
                <p className="text-destructive text-sm" role="alert">
                  {promoError}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Tip (Website → Checkout) */}
      {tips && (
        <Card title={t("tip.title")}>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t("tip.title")}>
            {TIP_PERCENTS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={tipPercent === p}
                onClick={() => setTipPercent(p)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center rounded-xl border text-sm font-semibold transition-colors",
                  tipPercent === p ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted",
                )}
              >
                {p === 0 ? t("tip.none") : `${p}%`}
                {p > 0 && (
                  <span className="text-muted-foreground text-xs font-normal tabular-nums">
                    {formatMoney(tipAmount(subtotal - discount, p))}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">{t("tip.hint")}</p>
        </Card>
      )}

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
                  {dineIn ? tTable(`pay.${m}`) : tPay(m)}
                </ChoiceCard>
              ))}
            </RadioGroup>
          )}
        />
        {paymentMethod === "TRANSFER" && settings.transferDetails && (
          <div className="bg-muted rounded-xl p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{t("transferDetails")}</p>
              <CopyButton text={settings.transferDetails} />
            </div>
            <p className="mt-1 whitespace-pre-line select-all">{settings.transferDetails}</p>
            <p className="text-muted-foreground mt-2 text-xs">{t("transferNote")}</p>
          </div>
        )}
        {/* Hidden, not unmounted — the picked receipt survives switching payment methods */}
        {!isAdmin && (
          <div className={cn("flex flex-col gap-2", paymentMethod !== "TRANSFER" && "hidden")}>
            <Label>
              {tReceipt("label")}
              <span className="text-muted-foreground font-normal">({t("optional")})</span>
            </Label>
            <p className="text-muted-foreground text-xs">{tReceipt("hint")}</p>
            <ReceiptPicker file={receipt} onChange={setReceipt} />
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
            {discount > 0 && appliedPromo && (
              <Row
                label={t("promo.discountRow", { code: appliedPromo.code })}
                value={`−${formatMoney(discount)}`}
                accent
              />
            )}
            {type === "DELIVERY" && (
              <Row
                label={t("deliveryFee")}
                value={deliveryFee === 0 ? tCart("freeDelivery") : formatMoney(deliveryFee)}
                accent={deliveryFee === 0}
              />
            )}
          </dl>
          {tip > 0 && (
            <dl className="-mt-2 flex flex-col text-sm">
              <Row label={t("tip.label")} value={formatMoney(tip)} />
            </dl>
          )}
          {toFreeDelivery > 0 && (
            <p className="text-primary text-center text-sm font-medium">
              {tCart("freeDeliveryMore", { amount: formatMoney(toFreeDelivery) })}
            </p>
          )}
          {!isAdmin && !isOpenNow && !preorder && (
            <p className="text-destructive text-center text-sm">{tCart("closed")}</p>
          )}
          {serverError && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">{serverError}</span>
              {!isAdmin && (
                <Link href={`/${store.slug}`} className="shrink-0 font-medium underline">
                  {t("editOrder")}
                </Link>
              )}
            </div>
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
              {isSubmitting ? t("submitting") : preorder ? t("submitPreorder") : t("submit")}
            </span>
            <span className="flex items-center gap-1 font-bold tabular-nums">
              {formatMoney(total)}
              {!isSubmitting && <ChevronRight className="size-4" />}
            </span>
          </Button>
          {!isAdmin && (
            <p className="text-muted-foreground text-center text-xs">
              {tLegal.rich("checkoutAgree", {
                privacy: (chunks) => (
                  <a href="/privacy" target="_blank" className="underline underline-offset-2">
                    {chunks}
                  </a>
                ),
              })}
            </p>
          )}
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

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums", accent && "text-primary font-medium")}>{value}</dd>
    </div>
  );
}
