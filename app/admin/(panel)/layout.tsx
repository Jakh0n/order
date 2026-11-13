import { ChevronRight, ExternalLink, Gem, LogOut } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { CurrencyProvider } from "@/components/currency-provider";
import { StoreOpenToggle } from "@/components/admin/store-open-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/lib/auth/actions";
import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { isPro } from "@/lib/plan";
import { cn } from "@/lib/utils";

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
  const [t, tPlan, format, status] = await Promise.all([
    getTranslations("admin"),
    getTranslations("plan"),
    getFormatter(),
    prisma.store.findUnique({ where: { id: store.id }, select: { isOpen: true } }),
  ]);
  const pro = isPro(store);

  // Plan at a glance (replaces a separate "Plan" nav item on desktop)
  const planCard = (
    <Link
      href="/admin/plan"
      className="hover:bg-muted flex items-center gap-3 rounded-lg border px-3 py-2"
    >
      <Gem
        className={cn("size-4 shrink-0", pro ? "text-primary" : "text-muted-foreground")}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">
          {pro ? tPlan("proName") : tPlan("freeName")}
        </span>
        <span className="text-muted-foreground block truncate text-xs">
          {pro
            ? store.paidUntil
              ? tPlan("until", {
                  date: format.dateTime(store.paidUntil, {
                    dateStyle: "medium",
                    timeZone: store.timeZone,
                  }),
                })
              : tPlan("noEnd")
            : tPlan("upgrade")}
        </span>
      </span>
      {!pro && <ChevronRight className="text-muted-foreground size-4" aria-hidden />}
    </Link>
  );
  // Account: language + log out together, at the very bottom
  const account = (
    <div className="flex items-center justify-between gap-2">
      <LanguageSwitcher />
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
          <LogOut aria-hidden />
          {t("logout")}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="bg-muted/50 flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="bg-background sticky top-0 z-30 border-b md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        {/* Store identity: who you are managing + its public page + open/paused */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:flex-col md:items-stretch md:gap-3 md:px-3 md:pt-4 md:pb-4">
          <div className="flex min-w-0 items-center gap-2.5 md:px-1">
            <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
              {store.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate leading-tight font-semibold">{store.name}</p>
              <Link
                href={`/${store.slug}`}
                target="_blank"
                className="text-muted-foreground hover:text-primary hidden items-center gap-1 text-xs md:inline-flex"
              >
                {t("viewStore")}
                <ExternalLink className="size-3" aria-hidden />
              </Link>
            </div>
          </div>
          {/* Phone: compact switch + open store in the top bar */}
          <div className="flex items-center gap-1 md:hidden">
            <StoreOpenToggle isOpen={status?.isOpen ?? true} compact />
            <Link
              href={`/${store.slug}`}
              target="_blank"
              aria-label={t("viewStore")}
              className="text-muted-foreground hover:bg-muted flex size-10 items-center justify-center rounded-lg"
            >
              <ExternalLink className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="hidden md:block">
            <StoreOpenToggle isOpen={status?.isOpen ?? true} />
          </div>
        </div>

        <AdminNav variant="sidebar" planCard={planCard} account={account} />
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
        <CurrencyProvider currency={store.currency}>{children}</CurrencyProvider>
      </div>

      <AdminNav variant="bottom" account={account} />
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
