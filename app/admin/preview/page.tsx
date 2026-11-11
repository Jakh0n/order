import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DesignPreview } from "@/components/admin/design/design-preview";
import { requireOwner } from "@/lib/auth/owner";
import { getStorefront } from "@/lib/storefront";

export const metadata: Metadata = { robots: { index: false } };

/** Live preview for the Design page (iframe). Owner only; outside the panel layout. */
export default function DesignPreviewPage() {
  return (
    <Suspense>
      <Preview />
    </Suspense>
  );
}

async function Preview() {
  const { store } = await requireOwner();
  const data = await getStorefront(store.slug);
  if (!data) notFound();
  return <DesignPreview data={data} />;
}
