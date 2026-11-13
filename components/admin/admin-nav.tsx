"use client";

import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  Ellipsis,
  Gem,
  Globe,
  QrCode,
  Settings,
  Tag,
  TicketPercent,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavKey =
  | "orders"
  | "products"
  | "customers"
  | "analytics"
  | "website"
  | "dineIn"
  | "promos"
  | "settings"
  | "plan";

export interface NavItem {
  href: string;
  key: NavKey;
  icon: typeof Globe;
  /** Collapsible sub-items (Website) */
  children?: readonly { href: string; key: string }[];
}

/** Website editor sections (Take App style "Sales channels → Website") */
export const WEBSITE_ITEMS = [
  { href: "/admin/website/storefront", key: "storefront" },
  { href: "/admin/website/checkout", key: "checkout" },
  { href: "/admin/website/appearance", key: "appearance" },
  { href: "/admin/website/menu", key: "menu" },
  { href: "/admin/website/pages", key: "pages" },
  { href: "/admin/website/reviews", key: "reviews" },
] as const;

// Order follows the owner's day: run the shop → sell through channels → grow → configure
export const ORDERS: NavItem = { href: "/admin/orders", key: "orders", icon: ClipboardList };
// The dish list (route stays /admin/menu); Website → Menu is the store's navigation menu
export const PRODUCTS: NavItem = { href: "/admin/menu", key: "products", icon: Tag };
export const CUSTOMERS: NavItem = {
  href: "/admin/analytics/customers",
  key: "customers",
  icon: Users,
};
export const ANALYTICS: NavItem = { href: "/admin/analytics", key: "analytics", icon: BarChart3 };
export const STORE: NavItem[] = [ORDERS, PRODUCTS, CUSTOMERS, ANALYTICS];
export const CHANNELS: NavItem[] = [
  { href: "/admin/website", key: "website", icon: Globe, children: WEBSITE_ITEMS },
  { href: "/admin/qr", key: "dineIn", icon: QrCode },
];
export const MARKETING: NavItem[] = [{ href: "/admin/promos", key: "promos", icon: TicketPercent }];
export const SETTINGS: NavItem = { href: "/admin/settings", key: "settings", icon: Settings };
export const PLAN: NavItem = { href: "/admin/plan", key: "plan", icon: Gem };

const ALL_HREFS = [...STORE, ...CHANNELS, ...MARKETING, SETTINGS, PLAN].flatMap((i) => [
  i.href,
  ...(i.children?.map((c) => c.href) ?? []),
]);

/** The most specific nav entry wins: /admin/analytics/customers lights Customers, not Analytics */
export function useActive() {
  const pathname = usePathname();
  const best = ALL_HREFS.filter((h) => pathname === h || pathname.startsWith(`${h}/`)).sort(
    (a, b) => b.length - a.length,
  )[0];
  return (href: string) => best === href;
}

type T = ReturnType<typeof useTranslations<"admin">>;
type IsActive = (href: string) => boolean;

/**
 * Phone: tab bar with the daily three + "More" sheet. (Desktop uses AdminSidebar.)
 * `account` (language + log out) comes from the server layout.
 */
export function AdminNav({ account }: { variant: "bottom"; account?: React.ReactNode }) {
  const t = useTranslations("admin");
  const isActive = useActive();
  const [moreOpen, setMoreOpen] = useState(false);

  {
    const tabs = [ORDERS, PRODUCTS, ANALYTICS];
    const moreActive = !tabs.some((item) => isActive(item.href));
    const tab = "flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium";
    const close = () => setMoreOpen(false);
    const sheetLinks = (items: NavItem[]) =>
      items.map((item) => (
        <SheetLink key={item.href} item={item} t={t} isActive={isActive} onNavigate={close} />
      ));

    return (
      <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {tabs.map(({ href, key, icon: Icon }) => (
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
            className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <SheetTitle className="px-4 pt-4 text-base">{t("more")}</SheetTitle>
            <div className="flex flex-col gap-3 px-2">
              <Group>{sheetLinks([CUSTOMERS])}</Group>
              <Group label={t("salesChannels")}>{sheetLinks(CHANNELS)}</Group>
              <Group label={t("marketing")}>{sheetLinks(MARKETING)}</Group>
              <Group>{sheetLinks([SETTINGS, PLAN])}</Group>
              {account && <div className="border-t px-1 pt-3">{account}</div>}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    );
  }
}

function Group({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <p className="text-muted-foreground px-3 pb-1 text-[11px] font-semibold tracking-wider uppercase">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function SheetLink({
  item,
  t,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  t: T;
  isActive: IsActive;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const active = item.children ? item.children.some((c) => isActive(c.href)) : isActive(item.href);
  return (
    <div className="flex flex-col">
      <Link
        href={item.children ? item.children[0].href : item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium",
          active ? "bg-primary/10 text-primary" : "hover:bg-muted",
        )}
      >
        <Icon className="size-5" aria-hidden />
        <span className="flex-1">{t(item.key)}</span>
        <ChevronRight className="text-muted-foreground size-4" aria-hidden />
      </Link>
      {item.children && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-1 pb-2 pl-11">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                isActive(child.href)
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted",
              )}
            >
              {t(`websiteItems.${child.key}`)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
