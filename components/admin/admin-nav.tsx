"use client";

import {
  BarChart3,
  ChevronDown,
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

interface NavItem {
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
const ORDERS: NavItem = { href: "/admin/orders", key: "orders", icon: ClipboardList };
// The dish list (route stays /admin/menu); Website → Menu is the store's navigation menu
const PRODUCTS: NavItem = { href: "/admin/menu", key: "products", icon: Tag };
const CUSTOMERS: NavItem = { href: "/admin/analytics/customers", key: "customers", icon: Users };
const ANALYTICS: NavItem = { href: "/admin/analytics", key: "analytics", icon: BarChart3 };
const STORE: NavItem[] = [ORDERS, PRODUCTS, CUSTOMERS, ANALYTICS];
const CHANNELS: NavItem[] = [
  { href: "/admin/website", key: "website", icon: Globe, children: WEBSITE_ITEMS },
  { href: "/admin/qr", key: "dineIn", icon: QrCode },
];
const MARKETING: NavItem[] = [{ href: "/admin/promos", key: "promos", icon: TicketPercent }];
const SETTINGS: NavItem = { href: "/admin/settings", key: "settings", icon: Settings };
const PLAN: NavItem = { href: "/admin/plan", key: "plan", icon: Gem };

const ALL_HREFS = [...STORE, ...CHANNELS, ...MARKETING, SETTINGS, PLAN].flatMap((i) => [
  i.href,
  ...(i.children?.map((c) => c.href) ?? []),
]);

/** The most specific nav entry wins: /admin/analytics/customers lights Customers, not Analytics */
function useActive() {
  const pathname = usePathname();
  const best = ALL_HREFS.filter((h) => pathname === h || pathname.startsWith(`${h}/`)).sort(
    (a, b) => b.length - a.length,
  )[0];
  return (href: string) => best === href;
}

type T = ReturnType<typeof useTranslations<"admin">>;
type IsActive = (href: string) => boolean;

/**
 * Desktop: sidebar — work items on top, channels and marketing below, settings + plan + account
 * pinned to the bottom. Phone: tab bar with the daily three + "More" sheet.
 * `planCard` (sidebar) and `account` (language + log out) come from the server layout.
 */
export function AdminNav({
  variant,
  planCard,
  account,
}: {
  variant: "sidebar" | "bottom";
  planCard?: React.ReactNode;
  account?: React.ReactNode;
}) {
  const t = useTranslations("admin");
  const isActive = useActive();
  const [moreOpen, setMoreOpen] = useState(false);

  if (variant === "bottom") {
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

  const links = (items: NavItem[]) =>
    items.map((item) => <SidebarLink key={item.href} item={item} t={t} isActive={isActive} />);

  return (
    <nav className="hidden min-h-0 flex-1 flex-col md:flex">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 pb-3">
        <Group>{links(STORE)}</Group>
        <Group label={t("salesChannels")}>{links(CHANNELS)}</Group>
        <Group label={t("marketing")}>{links(MARKETING)}</Group>
      </div>
      {/* Pinned bottom: configuration + account, away from daily work */}
      <div className="flex flex-col gap-1 border-t px-2 pt-2 pb-3">
        {links([SETTINGS])}
        {planCard}
        {account}
      </div>
    </nav>
  );
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

const itemClass = (active: boolean) =>
  cn(
    "flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-primary/10 text-primary"
      : "text-foreground/80 hover:bg-muted hover:text-foreground",
  );

function SidebarLink({ item, t, isActive }: { item: NavItem; t: T; isActive: IsActive }) {
  const active = isActive(item.href);
  const [open, setOpen] = useState(false);
  const Icon = item.icon;

  if (!item.children) {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={itemClass(active)}
      >
        <Icon className="size-4" aria-hidden />
        {t(item.key)}
      </Link>
    );
  }

  // Website is open while you're inside it; otherwise toggled by hand
  const inside = item.children.some((c) => isActive(c.href));
  const expanded = open || inside;
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={expanded}
        className={cn(itemClass(false), inside && "text-primary")}
      >
        <Icon className="size-4" aria-hidden />
        <span className="flex-1 text-left">{t(item.key)}</span>
        <ChevronDown
          className={cn("size-4 opacity-60 transition-transform", !expanded && "-rotate-90")}
          aria-hidden
        />
      </button>
      {expanded && (
        <ul className="border-border mt-0.5 ml-5 flex flex-col gap-0.5 border-l pl-2">
          {item.children.map((child) => {
            const childActive = isActive(child.href);
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  aria-current={childActive ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-1.5 text-sm transition-colors",
                    childActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {t(`websiteItems.${child.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
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
