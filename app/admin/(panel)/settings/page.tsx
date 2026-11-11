import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { SettingsForm } from "@/components/admin/settings/settings-form";
import { StoreLink } from "@/components/admin/settings/store-link";
import { Skeleton } from "@/components/ui/skeleton";
import { getRequestOrigin } from "@/lib/app-url";
import { requireOwner } from "@/lib/auth/owner";
import { getStoreSettings } from "@/lib/settings/data";
import { currencyOptions, timeZoneOptions } from "@/lib/settings/options";
import { settingsToForm } from "@/lib/validators";

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <AdminSettings />
    </Suspense>
  );
}

async function AdminSettings() {
  const { store } = await requireOwner();
  const [settings, t] = await Promise.all([getStoreSettings(store.id), getTranslations("admin")]);
  if (!settings) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">{t("settings")}</h1>
      <StoreLink slug={store.slug} origin={await getRequestOrigin()} />
      <SettingsForm
        defaultValues={settingsToForm(settings)}
        currencies={currencyOptions(settings.currency)}
        timeZones={timeZoneOptions(settings.timeZone)}
      />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
