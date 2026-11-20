import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";

/**
 * Vercel Web Analytics (cookieless, no personal data) — only on the platform's own pages
 * (landing, signup). Store pages stay out: diner traffic isn't the funnel and would eat the quota.
 * Signups and their sources are counted in the database (Store.signup*), not here.
 */
export function SiteAnalytics() {
  // Reads the URL on the client — Suspense keeps the page prerenderable
  return (
    <Suspense fallback={null}>
      <Analytics />
    </Suspense>
  );
}
