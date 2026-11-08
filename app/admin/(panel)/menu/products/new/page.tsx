import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ProductForm } from "@/components/admin/menu/product-form";
import { ProductPageShell } from "@/components/admin/menu/product-page-shell";
import { MenuSkeleton } from "@/components/storefront/menu-skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { getAdminCategories } from "@/lib/menu/admin-data";

export default function NewProductPage({ searchParams }: PageProps<"/admin/menu/products/new">) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <NewProduct searchParams={searchParams} />
    </Suspense>
  );
}

async function NewProduct({
  searchParams,
}: {
  searchParams: PageProps<"/admin/menu/products/new">["searchParams"];
}) {
  const { store } = await requireOwner();
  const [categories, t, params] = await Promise.all([
    getAdminCategories(store.id),
    getTranslations("adminMenu"),
    searchParams,
  ]);
  const requested = typeof params.category === "string" ? params.category : "";
  const categoryId = categories.some((c) => c.id === requested)
    ? requested
    : (categories[0]?.id ?? "");

  return (
    <ProductPageShell title={t("newProduct")} backLabel={t("backToMenu")}>
      <ProductForm
        productId={null}
        categories={categories}
        defaultValues={{
          name: "",
          description: "",
          price: Number.NaN,
          categoryId,
          isAvailable: true,
          imageUrl: null,
          optionGroups: [],
        }}
      />
    </ProductPageShell>
  );
}
