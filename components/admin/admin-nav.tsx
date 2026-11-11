"use client";

import { ClipboardList, QrCode, Settings, TicketPercent, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/orders", key: "orders", icon: ClipboardList },
  { href: "/admin/menu", key: "menu", icon: UtensilsCrossed },
  { href: "/admin/qr", key: "qr", icon: QrCode },
  { href: "/admin/promos", key: "promos", icon: TicketPercent },
  { href: "/admin/settings", key: "settings", icon: Settings },
] as const;

/** Desktop: yon panel ro'yxati. Telefon: pastdagi tab bar (ilovadagidek). */
export function AdminNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "bottom") {
    return (
      <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
              isActive(href) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {t(key)}
          </Link>
        ))}
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
