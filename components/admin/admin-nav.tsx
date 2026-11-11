"use client";

import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  Ellipsis,
  QrCode,
  Settings,
  TicketPercent,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/orders", key: "orders", icon: ClipboardList },
  { href: "/admin/menu", key: "menu", icon: UtensilsCrossed },
  { href: "/admin/analytics", key: "analytics", icon: BarChart3 },
  { href: "/admin/qr", key: "qr", icon: QrCode },
  { href: "/admin/promos", key: "promos", icon: TicketPercent },
  { href: "/admin/settings", key: "settings", icon: Settings },
] as const;

/** Phone tab bar: the daily three + "More" (the rest opens in a bottom sheet) */
const PRIMARY = 3;

/** Desktop: yon panel ro'yxati. Telefon: pastdagi tab bar (ilovadagidek). */
export function AdminNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "bottom") {
    const primary = NAV.slice(0, PRIMARY);
    const more = NAV.slice(PRIMARY);
    const moreActive = more.some((item) => isActive(item.href));
    const tab = "flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium";

    return (
      <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {primary.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(tab, isActive(href) ? "text-primary" : "text-muted-foreground")}
          >
            <Icon className="size-5" />
            {t(key)}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={cn(tab, moreActive ? "text-primary" : "text-muted-foreground")}
        >
          <Ellipsis className="size-5" />
          {t("more")}
        </button>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <SheetTitle className="px-4 pt-4 text-base">{t("more")}</SheetTitle>
            <ul className="flex flex-col px-2">
              {more.map(({ href, key, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium",
                      isActive(href) ? "bg-primary/10 text-primary" : "hover:bg-muted",
                    )}
                  >
                    <Icon className="size-5" />
                    <span className="flex-1">{t(key)}</span>
                    <ChevronRight className="text-muted-foreground size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>
      </nav>
    );
  }

  return (
    <nav className="hidden flex-col gap-1 px-2 md:flex">
      {NAV.map(({ href, key, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive(href) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
          )}
        >
          <Icon className="size-4" />
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
