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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavKey =
  "orders" | "products" | "analytics" | "website" | "dineIn" | "promos" | "settings" | "plan";

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

const MAIN: NavItem[] = [
  { href: "/admin/orders", key: "orders", icon: ClipboardList },
  // The dish list (route stays /admin/menu); Website → Menu is the store's navigation menu
  { href: "/admin/menu", key: "products", icon: Tag },
  { href: "/admin/analytics", key: "analytics", icon: BarChart3 },
];
const CHANNELS: NavItem[] = [
  { href: "/admin/website", key: "website", icon: Globe, children: WEBSITE_ITEMS },
  { href: "/admin/qr", key: "dineIn", icon: QrCode },
];
const OTHER: NavItem[] = [
  { href: "/admin/promos", key: "promos", icon: TicketPercent },
  { href: "/admin/settings", key: "settings", icon: Settings },
  { href: "/admin/plan", key: "plan", icon: Gem },
];

type T = ReturnType<typeof useTranslations<"admin">>;

/** Desktop: grouped sidebar. Phone: tab bar with the daily three + "More" sheet. */
export function AdminNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "bottom") {
    const moreActive = [...CHANNELS, ...OTHER].some((item) => isActive(item.href));
    const tab = "flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium";
    const close = () => setMoreOpen(false);

    return (
      <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {MAIN.map(({ href, key, icon: Icon }) => (
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
              <Group label={t("salesChannels")}>
                {CHANNELS.map((item) => (
                  <SheetLink
                    key={item.href}
                    item={item}
                    t={t}
                    isActive={isActive}
                    onNavigate={close}
                  />
                ))}
              </Group>
              <Group>
                {OTHER.map((item) => (
                  <SheetLink
                    key={item.href}
                    item={item}
                    t={t}
                    isActive={isActive}
                    onNavigate={close}
                  />
                ))}
              </Group>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    );
  }

  return (
    <nav className="hidden min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-2 md:flex">
      <Group>
        {MAIN.map((item) => (
          <SidebarLink key={item.href} item={item} t={t} isActive={isActive} />
        ))}
      </Group>
      <Group label={t("salesChannels")}>
        {CHANNELS.map((item) => (
          <SidebarLink key={item.href} item={item} t={t} isActive={isActive} />
        ))}
      </Group>
      <Group>
        {OTHER.map((item) => (
          <SidebarLink key={item.href} item={item} t={t} isActive={isActive} />
        ))}
      </Group>
    </nav>
  );
}

function Group({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && <p className="text-muted-foreground px-3 pb-1 text-xs font-medium">{label}</p>}
      {children}
    </div>
  );
}

const itemClass = (active: boolean) =>
  cn(
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
  );

function SidebarLink({
  item,
  t,
  isActive,
}: {
  item: NavItem;
  t: T;
  isActive: (href: string) => boolean;
}) {
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
        <Icon className="size-4" />
        {t(item.key)}
      </Link>
    );
  }

  // Website is open while you're inside it; otherwise toggled by hand
  const expanded = open || active;
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={expanded}
        className={cn(itemClass(false), active && "text-primary")}
      >
        <Icon className="size-4" />
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
  isActive: (href: string) => boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const active = isActive(item.href);
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
        <Icon className="size-5" />
        <span className="flex-1">{t(item.key)}</span>
        <ChevronRight className="text-muted-foreground size-4" />
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
