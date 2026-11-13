"use client";

import { Loader2, LocateFixed, Lock, MapPin, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useFieldArray, type UseFormReturn, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MAX_TIERS } from "@/lib/delivery-distance";
import { mapsLink } from "@/lib/maps";
import { priceStep } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { StoreSettingsFormData, StoreSettingsFormInput } from "@/lib/validators";

type Form = UseFormReturn<StoreSettingsFormInput, unknown, StoreSettingsFormData>;

/**
 * Settings → Delivery: price by distance (Pro). The store's location (the owner taps
 * "use my location" while at the store) + ranges "up to N km → fee". Farther than the last
 * range = no delivery. Customers without a location pay the flat fee above.
 */
export function DeliveryDistanceFields({
  form,
  currency,
  pro,
  errorText,
}: {
  form: Form;
  currency: string;
  pro: boolean;
  errorText: (message?: string) => string | null;
}) {
  const t = useTranslations("adminSettings");
  const tPlan = useTranslations("plan");
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "deliveryTiers" });
  const [enabled, latitude, longitude] = useWatch({
    control,
    name: ["deliveryByDistance", "latitude", "longitude"],
  });
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const hasLocation = latitude != null && longitude != null;

  function locateStore() {
    if (!("geolocation" in navigator)) {
      setLocationError(t("storeLocationUnsupported"));
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const opts = { shouldDirty: true, shouldValidate: true } as const;
        setValue("latitude", Number(coords.latitude.toFixed(6)), opts);
        setValue("longitude", Number(coords.longitude.toFixed(6)), opts);
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? t("storeLocationDenied")
            : t("storeLocationUnavailable"),
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <Controller
        control={control}
        name="deliveryByDistance"
        render={({ field }) => (
          <label
            className={cn("flex items-start gap-3", pro ? "cursor-pointer" : "cursor-default")}
          >
            <Switch
              checked={!!field.value}
              onCheckedChange={field.onChange}
              disabled={!pro}
              className="mt-0.5"
            />
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm font-medium">
                {t("deliveryByDistance")}
                {!pro && (
                  <Link
                    href="/admin/plan"
                    className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  >
                    <Lock className="size-3" aria-hidden />
                    {tPlan("pro")}
                  </Link>
                )}
              </span>
              <span className="text-muted-foreground text-xs">{t("deliveryByDistanceHint")}</span>
            </span>
          </label>
        )}
      />

      {/* Hidden, not unmounted — keeps the ranges while the switch is off */}
      <div className={cn("flex flex-col gap-4", !enabled && "hidden")}>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t("storeLocation")}</p>
          {hasLocation ? (
            <div className="bg-primary/5 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm">
              <MapPin className="text-primary size-4 shrink-0" aria-hidden />
              <span className="flex-1">{t("storeLocationSet")}</span>
              <a
                href={mapsLink(latitude, longitude) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium"
              >
                {t("viewOnMap")}
              </a>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">{t("storeLocationHint")}</p>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-fit gap-2"
            disabled={locating || !pro}
            onClick={locateStore}
          >
            {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
            {hasLocation ? t("storeLocationUpdate") : t("storeLocationUse")}
          </Button>
          {(locationError || errors.latitude) && (
            <p className="text-destructive text-sm" role="alert">
              {locationError ?? errorText(errors.latitude?.message)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t("deliveryTiers")}</p>
          {fields.map((field, i) => (
            <div key={field.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-12 shrink-0 text-sm">{t("upTo")}</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0.1}
                  step={0.1}
                  aria-label={t("tierKm")}
                  readOnly={!pro}
                  className="w-20"
                  aria-invalid={!!errors.deliveryTiers?.[i]?.upToKm}
                  {...register(`deliveryTiers.${i}.upToKm`, { valueAsNumber: true })}
                />
                <span className="text-muted-foreground text-sm">{t("km")}</span>
                <span className="text-muted-foreground text-sm">→</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={priceStep(currency)}
                  aria-label={t("tierFee", { currency })}
                  readOnly={!pro}
                  className="w-28"
                  aria-invalid={!!errors.deliveryTiers?.[i]?.fee}
                  {...register(`deliveryTiers.${i}.fee`, { valueAsNumber: true })}
                />
                <span className="text-muted-foreground text-sm">{currency}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("removeTier")}
                  disabled={!pro}
                  onClick={() => remove(i)}
                >
                  <Trash2 />
                </Button>
              </div>
              {(errors.deliveryTiers?.[i]?.upToKm || errors.deliveryTiers?.[i]?.fee) && (
                <p className="text-destructive text-sm">
                  {errorText(
                    errors.deliveryTiers?.[i]?.upToKm?.message ??
                      errors.deliveryTiers?.[i]?.fee?.message,
                  )}
                </p>
              )}
            </div>
          ))}
          {errors.deliveryTiers?.message && (
            <p className="text-destructive text-sm">{errorText(errors.deliveryTiers.message)}</p>
          )}
          {fields.length < MAX_TIERS && (
            <Button
              type="button"
              variant="ghost"
              className="w-fit gap-2"
              disabled={!pro}
              onClick={() => {
                const last = form.getValues("deliveryTiers")?.at(-1);
                append({
                  upToKm: last ? Math.round((Number(last.upToKm) || 0) + 5) : 5,
                  fee: last ? Number(last.fee) || 0 : 0,
                });
              }}
            >
              <Plus className="size-4" />
              {t("addTier")}
            </Button>
          )}
          <p className="text-muted-foreground text-xs">{t("deliveryTiersHint")}</p>
        </div>
      </div>
    </div>
  );
}
