import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Every response: no framing by other sites (admin clickjacking), no MIME sniffing,
// no full URLs (order ids) leaking in Referer, location only for our own pages.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
