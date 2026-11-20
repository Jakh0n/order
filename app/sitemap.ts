import type { MetadataRoute } from "next";

import { defaultLocale, landingPath, type Locale, locales } from "@/i18n/config";
import { siteOrigin } from "@/lib/app-url";
import { getSitemapStores } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const stores = await getSitemapStores();

  // Every landing language, each listing all of them (incl. itself) + x-default.
  // Same form as the canonical: "https://site" for "/", "https://site/ru" otherwise
  const landingUrl = (l: Locale) => `${origin}${l === defaultLocale ? "" : landingPath(l)}`;
  const languages = {
    ...Object.fromEntries(locales.map((l) => [l, landingUrl(l)])),
    "x-default": landingUrl(defaultLocale),
  };
  const home = locales.map((l) => ({
    url: landingUrl(l),
    changeFrequency: "weekly" as const,
    priority: 1,
    alternates: { languages },
  }));

  return [
    ...home,
    { url: `${origin}/signup`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${origin}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...stores.map((s) => ({
      url: `${origin}/${s.slug}`,
      lastModified: s.lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
