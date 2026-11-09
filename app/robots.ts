import type { MetadataRoute } from "next";

import { siteOrigin } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or per-customer pages: owner panels, API, order pages, checkouts
      disallow: ["/admin", "/superadmin", "/api/", "/o/", "/*/checkout", "/monitoring"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
