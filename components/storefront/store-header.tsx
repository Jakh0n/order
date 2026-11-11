import { MapPin, Phone } from "lucide-react";
import Image from "next/image";

import { LanguageSwitcher } from "@/components/language-switcher";
import { asHeaderStyle } from "@/lib/design";
import type { StorefrontStore } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

import { LastOrderBanner } from "./last-order-banner";
import { ClosedBanner, OpenStatus } from "./open-badge";
import { RichText } from "./rich-text";
import { SocialLinks } from "./social-links";
import { TableBanner } from "./table-banner";

/**
 * Store page header. Three styles from the Design page:
 * cover — wide photo, logo overlapping on the left (default);
 * centered — photo band, big centered logo and name (link-in-bio feel);
 * compact — no photo, logo next to the name (menu first).
 */
export function StoreHeader({ store }: { store: StorefrontStore }) {
  const style = asHeaderStyle(store.headerStyle);
  const centered = style === "centered";

  return (
    <header className="bg-background">
      {store.announcement && (
        <p className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm font-medium">
          <RichText text={store.announcement} />
        </p>
      )}

      {style !== "compact" && (
        <div
          className={cn(
            "from-primary/80 via-primary to-primary/70 relative overflow-hidden bg-gradient-to-br",
            centered ? "h-24 sm:h-36" : "h-28 sm:h-44",
          )}
        >
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
      )}

      <div className={cn("flex flex-col gap-3 px-4 pb-4", style === "compact" && "pt-4")}>
        <div
          className={cn(
            "relative z-10 flex gap-3",
            centered && "-mt-12 flex-col items-center text-center",
            style === "cover" && "-mt-10 items-end",
            style === "compact" && "items-center",
          )}
        >
          <Logo store={store} size={centered ? "lg" : style === "compact" ? "sm" : "md"} />
          {style === "compact" && (
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl leading-tight font-bold">{store.name}</h1>
              <OpenStatus store={store} />
            </div>
          )}
          {style === "compact" && <LanguageSwitcher />}
        </div>

        <div className={cn("flex flex-col gap-1.5", centered && "items-center text-center")}>
          {style !== "compact" && (
            <h1 className={cn("leading-tight font-bold", centered ? "text-3xl" : "text-2xl")}>
              {store.name}
            </h1>
          )}
          {store.description && (
            <p className="text-muted-foreground max-w-prose text-sm">
              <RichText text={store.description} />
            </p>
          )}
          {style !== "compact" && <OpenStatus store={store} />}
          {(store.address || store.phone) && (
            <div
              className={cn(
                "text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm",
                centered && "justify-center",
              )}
            >
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
          <SocialLinks
            className={cn("pt-1", centered && "justify-center")}
            links={{
              instagram: store.instagram,
              telegramChannel: store.telegramChannel,
              tiktok: store.tiktok,
            }}
          />
        </div>

        <TableBanner store={store} />
        <ClosedBanner store={store} />
        <LastOrderBanner slug={store.slug} />
      </div>
    </header>
  );
}

function Logo({ store, size }: { store: StorefrontStore; size: "sm" | "md" | "lg" }) {
  const box = { sm: "size-14 border-2", md: "size-20 border-4", lg: "size-24 border-4" }[size];
  const px = { sm: 56, md: 80, lg: 96 }[size];
  return store.logoUrl ? (
    <Image
      src={store.logoUrl}
      alt=""
      width={px}
      height={px}
      priority
      className={cn(
        "border-background bg-background shrink-0 rounded-2xl object-cover shadow-sm",
        box,
      )}
    />
  ) : (
    <div
      className={cn(
        "border-background bg-primary text-primary-foreground flex shrink-0 items-center justify-center rounded-2xl font-bold shadow-sm",
        box,
        size === "sm" ? "text-xl" : "text-3xl",
      )}
    >
      {store.name.charAt(0).toUpperCase()}
    </div>
  );
}
