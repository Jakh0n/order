import type { MetadataRoute } from "next";

import { siteOrigin } from "@/lib/app-url";
import { getSitemapStores } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const stores = await getSitemapStores();

  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/signup`, changeFrequency: "monthly", priority: 0.6 },
    ...stores.map((s) => ({
      url: `${origin}/${s.slug}`,
      lastModified: s.lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
