import { MapPin, Phone } from "lucide-react";
import Image from "next/image";

import { LanguageSwitcher } from "@/components/language-switcher";
import type { StorefrontStore } from "@/lib/menu-types";

import { LastOrderBanner } from "./last-order-banner";
import { ClosedBanner, OpenStatus } from "./open-badge";

/** take.app uslubidagi sarlavha: rangli muqova, ustiga chiqib turgan logo, holat va manzil */
export function StoreHeader({ store }: { store: StorefrontStore }) {
  return (
    <header className="bg-background">
      <div className="from-primary/80 via-primary to-primary/70 relative h-28 overflow-hidden bg-gradient-to-br sm:h-44">
        {store.coverUrl && (
          <Image
            src={store.coverUrl}
            alt=""
            fill
            priority
            sizes="(min-width: 672px) 672px, 100vw"
            className="object-cover"
          />
        )}
        <div className="absolute top-3 right-3">
          <LanguageSwitcher variant="overlay" />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="relative z-10 -mt-10 flex items-end gap-3">
          {store.logoUrl ? (
            <Image
              src={store.logoUrl}
              alt=""
              width={80}
              height={80}
              priority
              className="border-background bg-background size-20 shrink-0 rounded-2xl border-4 object-cover shadow-sm"
            />
          ) : (
            <div className="border-background bg-primary text-primary-foreground flex size-20 shrink-0 items-center justify-center rounded-2xl border-4 text-3xl font-bold shadow-sm">
              {store.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl leading-tight font-bold">{store.name}</h1>
          <OpenStatus store={store} />
          {(store.address || store.phone) && (
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {store.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  {store.address}
                </span>
              )}
              {store.phone && (
                <a
                  href={`tel:${store.phone.replace(/\s/g, "")}`}
                  className="hover:text-foreground flex items-center gap-1"
                >
                  <Phone className="size-3.5 shrink-0" aria-hidden />
                  {store.phone}
                </a>
              )}
            </div>
          )}
        </div>

        <ClosedBanner store={store} />
        <LastOrderBanner slug={store.slug} />
      </div>
    </header>
  );
}
