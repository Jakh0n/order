import { Clock, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/language-switcher";
import type { StorefrontStore } from "@/lib/menu-types";

import { ClosedBanner, OpenBadge } from "./open-badge";

export async function StoreHeader({ store }: { store: StorefrontStore }) {
  const t = await getTranslations("menu");

  return (
    <header className="flex flex-col gap-3 px-4 pt-4 pb-3">
      <div className="flex items-start gap-3">
        {store.logoUrl ? (
          <Image
            src={store.logoUrl}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="bg-primary text-primary-foreground flex size-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold">
            {store.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl leading-tight font-bold">{store.name}</h1>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <OpenBadge store={store} />
            {store.openTime && store.closeTime && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                {t("workingHours", { open: store.openTime, close: store.closeTime })}
              </span>
            )}
          </div>
        </div>
        <LanguageSwitcher />
      </div>

      {(store.address || store.phone) && (
        <div className="text-muted-foreground flex flex-col gap-1 text-sm">
          {store.address && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {store.address}
            </span>
          )}
          {store.phone && (
            <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" aria-hidden />
              {store.phone}
            </a>
          )}
        </div>
      )}

      <ClosedBanner store={store} />
    </header>
  );
}
