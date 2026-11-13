import { ExternalLink, LogOut } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { CurrencyProvider } from "@/components/currency-provider";
import { StoreOpenToggle } from "@/components/admin/store-open-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { logout } from "@/lib/auth/actions";
import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { isPro } from "@/lib/plan";

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

  const planHint = pro
    ? store.paidUntil
      ? tPlan("until", {
          date: format.dateTime(store.paidUntil, { dateStyle: "medium", timeZone: store.timeZone }),
        })
      : tPlan("noEnd")
    : tPlan("upgrade");
  // Phone "More" sheet: language + log out together, at the very bottom
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
  // Collapsed or open is remembered in a cookie by the shadcn sidebar
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen} className="min-h-full flex-1">
        <AdminSidebar
          storeName={store.name}
          storeSlug={store.slug}
          openToggle={<StoreOpenToggle isOpen={status?.isOpen ?? true} />}
          plan={{ label: pro ? tPlan("proName") : tPlan("freeName"), hint: planHint, pro }}
          language={<LanguageSwitcher />}
        />

        <SidebarInset className="bg-muted/50 min-w-0 pb-16 md:pb-0">
          {/* Phone: store name + compact open switch + public page (desktop has the sidebar) */}
          <header className="bg-background sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3 md:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
                {store.name.charAt(0).toUpperCase()}
              </span>
              <p className="truncate leading-tight font-semibold">{store.name}</p>
            </div>
            <div className="flex items-center gap-1">
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
          </header>
          {/* Desktop: collapse / expand the sidebar (also ⌘/Ctrl+B) */}
          <div className="hidden px-2 pt-2 md:block">
            <SidebarTrigger aria-label={t("toggleSidebar")} />
          </div>

          {store.isBlocked && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive border-b px-4 py-3 text-sm"
            >
              {t("blockedBanner")}
            </div>
          )}
          <CurrencyProvider currency={store.currency}>{children}</CurrencyProvider>
        </SidebarInset>

        <AdminNav variant="bottom" account={account} />
      </SidebarProvider>
    </TooltipProvider>
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
