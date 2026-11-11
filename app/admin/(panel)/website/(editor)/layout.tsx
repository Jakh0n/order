import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DesignForm } from "@/components/admin/design/design-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import {
  asCornerStyle,
  asFontStyle,
  asHeaderStyle,
  asMenuLayout,
  asPageBackground,
} from "@/lib/design";
import { asEmailMode } from "@/lib/orders/promo";
import { parseNavLinks, parsePinned } from "@/lib/nav";
import { parsePopup } from "@/lib/popup";
import { parseSections } from "@/lib/sections";

/**
 * Website editor (Storefront | Checkout | Appearance | Menu). The form lives here, in the
 * shared layout, so switching tabs (routes) keeps unsaved changes. The tab pages are empty.
 */
export default function WebsiteEditorLayout({ children }: LayoutProps<"/admin/website">) {
  return (
    <div className="flex max-w-[1240px] flex-col p-4 pt-0 md:p-6 md:pt-0">
      <Suspense fallback={<Skeleton className="mt-6 h-[600px] w-full" />}>
        <Design />
      </Suspense>
      {children}
    </div>
  );
}

async function Design() {
  const { store } = await requireOwner();
  const [design, categories] = await Promise.all([
    prisma.store.findUnique({
      where: { id: store.id },
      select: {
        name: true,
        logoUrl: true,
        coverUrl: true,
        description: true,
        announcement: true,
        brandColor: true,
        pageBackground: true,
        menuLayout: true,
        fontStyle: true,
        cornerStyle: true,
        headerStyle: true,
        showSearch: true,
        showDescriptions: true,
        instagram: true,
        telegramChannel: true,
        tiktok: true,
        sections: true,
        checkoutEmail: true,
        checkoutNote: true,
        checkoutPromo: true,
        tipsEnabled: true,
        popup: true,
        navLinks: true,
        pinnedCategoryIds: true,
      },
    }),
    prisma.category.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  if (!design) notFound();

  return (
    <DesignForm
      slug={store.slug}
      categories={categories}
      defaultValues={{
        ...design,
        description: design.description ?? "",
        announcement: design.announcement ?? "",
        instagram: design.instagram ?? "",
        telegramChannel: design.telegramChannel ?? "",
        tiktok: design.tiktok ?? "",
        pageBackground: asPageBackground(design.pageBackground),
        menuLayout: asMenuLayout(design.menuLayout),
        fontStyle: asFontStyle(design.fontStyle),
        cornerStyle: asCornerStyle(design.cornerStyle),
        headerStyle: asHeaderStyle(design.headerStyle),
        sections: parseSections(design.sections),
        checkoutEmail: asEmailMode(design.checkoutEmail),
        popup: parsePopup(design.popup),
        navLinks: parseNavLinks(design.navLinks),
        pinnedCategoryIds: parsePinned(design.pinnedCategoryIds),
      }}
    />
  );
}
