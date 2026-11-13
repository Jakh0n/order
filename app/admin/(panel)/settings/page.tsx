import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { SettingsForm } from "@/components/admin/settings/settings-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { isPro } from "@/lib/plan";
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings")}</h1>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm">
          {t("descriptions.settings")}
        </p>
      </div>
      <SettingsForm
        defaultValues={settingsToForm(settings)}
        currencies={currencyOptions(settings.currency)}
        timeZones={timeZoneOptions(settings.timeZone)}
        pro={isPro(store)}
      />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
