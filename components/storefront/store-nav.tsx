"use client";

import { ChevronRight, ExternalLink, Menu } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { StorefrontStore } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

import { SocialLinks } from "./social-links";

/** ☰ menu (Website → Menu links). Hidden when the store has no links. */
export function StoreNav({
  store,
  variant = "overlay",
}: {
  store: StorefrontStore;
  variant?: "overlay" | "default";
}) {
  const t = useTranslations("menu");
  const [open, setOpen] = useState(false);
  if (store.navLinks.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openNav")}
        className={cn(
          "flex size-9 items-center justify-center rounded-full",
          variant === "overlay"
            ? "bg-white/90 text-neutral-900 shadow-sm ring-1 ring-black/5 backdrop-blur-md hover:bg-white"
            : "hover:bg-muted",
        )}
      >
        <Menu className="size-5" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-80 max-w-[85vw]">
          <SheetTitle className="px-5 pt-5 text-lg font-bold">{store.name}</SheetTitle>
          <ul className="flex flex-col px-2">
            {store.navLinks.map((link) => {
              const external = link.url.startsWith("https://");
              const className =
                "hover:bg-muted flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium";
              return (
                <li key={link.id}>
                  {external ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={className}
                    >
                      <span className="flex-1">{link.label}</span>
                      <ExternalLink className="text-muted-foreground size-4" aria-hidden />
                    </a>
                  ) : (
                    <Link href={link.url} onClick={() => setOpen(false)} className={className}>
                      <span className="flex-1">{link.label}</span>
                      <ChevronRight className="text-muted-foreground size-4" aria-hidden />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          <SocialLinks
            className="px-5 pt-2"
            links={{
              instagram: store.instagram,
              telegramChannel: store.telegramChannel,
              tiktok: store.tiktok,
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
