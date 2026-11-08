import { ClipboardList, ExternalLink, LogOut, Settings, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/lib/auth/actions";
import { requireOwner } from "@/lib/auth/owner";

const nav = [
  { href: "/admin/orders", key: "orders", icon: ClipboardList },
  { href: "/admin/menu", key: "menu", icon: UtensilsCrossed },
  { href: "/admin/settings", key: "settings", icon: Settings },
] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Panel>{children}</Panel>
    </Suspense>
  );
}

// Layout faqat qobiq. Har bir sahifa va Server Action requireOwner() ni o'zi ham chaqiradi.
async function Panel({ children }: { children: React.ReactNode }) {
  const { store } = await requireOwner();
  const t = await getTranslations("admin");

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="bg-muted/40 border-b md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:flex-col md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3 md:flex-col md:items-start">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{t("title")}</p>
            <p className="truncate font-semibold md:whitespace-normal">{store.name}</p>
          </div>
          <LanguageSwitcher />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col">
          {nav.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="hover:bg-muted flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm"
            >
              <Icon className="size-4" />
              {t(key)}
            </Link>
          ))}
          <Link
            href={`/${store.slug}`}
            target="_blank"
            className="text-muted-foreground hover:bg-muted flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm"
          >
            <ExternalLink className="size-4" />
            {t("viewStore")}
          </Link>
        </nav>
        <form action={logout} className="hidden px-2 pb-3 md:mt-auto md:block">
          <Button type="submit" variant="ghost" className="w-full justify-start">
            <LogOut />
            {t("logout")}
          </Button>
        </form>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
        <form action={logout} className="border-t px-4 py-3 md:hidden">
          <Button type="submit" variant="ghost" size="sm">
            <LogOut />
            {t("logout")}
          </Button>
        </form>
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
