import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ProductForm } from "@/components/admin/menu/product-form";
import { ProductPageShell } from "@/components/admin/menu/product-page-shell";
import { MenuSkeleton } from "@/components/storefront/menu-skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { getAdminCategories, getAdminProduct } from "@/lib/menu/admin-data";

export default function EditProductPage({ params }: PageProps<"/admin/menu/products/[productId]">) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <EditProduct params={params} />
    </Suspense>
  );
}

async function EditProduct({
  params,
}: {
  params: PageProps<"/admin/menu/products/[productId]">["params"];
}) {
  const { store } = await requireOwner();
  const { productId } = await params;
  const [product, categories, t] = await Promise.all([
    getAdminProduct(store.id, productId),
    getAdminCategories(store.id),
    getTranslations("adminMenu"),
  ]);
  if (!product) notFound();

  return (
    <ProductPageShell title={t("editProduct")} backLabel={t("backToMenu")}>
      <ProductForm
        // Saqlangandan keyin yangi id lar bilan formani qayta boshlash
        key={product.optionGroups.flatMap((g) => [g.id, ...g.options.map((o) => o.id)]).join()}
        productId={product.id}
        categories={categories}
        defaultValues={{
          name: product.name,
          description: product.description ?? "",
          price: product.price,
          categoryId: product.categoryId,
          isAvailable: product.isAvailable,
          imageUrl: product.imageUrl,
          optionGroups: product.optionGroups.map((g) => ({
            dbId: g.id,
            name: g.name,
            required: g.required,
            maxSelect: g.maxSelect,
            options: g.options.map((o) => ({ dbId: o.id, name: o.name, price: o.price })),
          })),
        }}
      />
    </ProductPageShell>
  );
}
