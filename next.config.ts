import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Taom rasmlari (brauzerda kichraytiriladi, lekin zaxira uchun; uploadMenuImage 2 MB dan kattasini rad etadi)
    serverActions: { bodySizeLimit: "3mb" },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Source map yuklash faqat SENTRY_AUTH_TOKEN bo'lsa (Vercel build'da). Lokal build'da o'tkazib yuboriladi.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Reklama blokerlari sentry.io ga so'rovlarni to'smasligi uchun o'z domenimiz orqali.
  // "monitoring" — lib/slug.ts da band qilingan.
  tunnelRoute: "/monitoring",
  telemetry: false,
});
