import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/lib/auth/actions";
import { requireOwner } from "@/lib/auth/owner";

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
    <div className="bg-muted/50 flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="bg-background sticky top-0 z-30 border-b md:flex md:h-dvh md:w-60 md:flex-col md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3 md:flex-col md:items-start md:py-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
              {store.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{t("title")}</p>
              <p className="truncate font-semibold md:whitespace-normal">{store.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/${store.slug}`}
              target="_blank"
              aria-label={t("viewStore")}
              className="text-muted-foreground hover:bg-muted flex size-8 items-center justify-center rounded-lg md:hidden"
            >
              <ExternalLink className="size-4" />
            </Link>
            <LanguageSwitcher />
          </div>
        </div>

        <AdminNav variant="sidebar" />
        <Link
          href={`/${store.slug}`}
          target="_blank"
          className="text-muted-foreground hover:bg-muted mx-2 mt-1 hidden items-center gap-2 rounded-lg px-3 py-2 text-sm md:flex"
        >
          <ExternalLink className="size-4" />
          {t("viewStore")}
        </Link>

        <form action={logout} className="hidden px-2 pb-3 md:mt-auto md:block">
          <Button
            type="submit"
            variant="ghost"
            className="text-muted-foreground w-full justify-start"
          >
            <LogOut />
            {t("logout")}
          </Button>
        </form>
      </aside>

      {/* Telefonda pastki tab bar uchun joy */}
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        {store.isBlocked && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive border-b px-4 py-3 text-sm"
          >
            {t("blockedBanner")}
          </div>
        )}
        {children}
        <form action={logout} className="px-4 py-4 md:hidden">
          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
            <LogOut />
            {t("logout")}
          </Button>
        </form>
      </div>

      <AdminNav variant="bottom" />
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
