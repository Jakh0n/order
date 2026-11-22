import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { SignupForm } from "@/components/auth/signup-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { SiteAnalytics } from "@/components/site-analytics";
import { getRequestOrigin } from "@/lib/app-url";
import { isGoogleEnabled } from "@/lib/auth/google";
import { getCurrentUser, homePathFor } from "@/lib/auth/owner";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signup");
  return { title: t("title") };
}

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const t = await getTranslations("signup");
  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      <Suspense fallback={<SignupForm host="" googleEnabled={isGoogleEnabled()} />}>
        <SignupFormWithHost searchParams={searchParams} />
      </Suspense>
      <SiteAnalytics />
    </AuthShell>
  );
}

/**
 * Slug oldidagi domen ("order.uz/") — so'rovdan, localhost bo'lib qolmasligi uchun.
 * ?name= — the landing's "claim your link" passes the store name typed there.
 */
async function SignupFormWithHost({
  searchParams,
}: {
  searchParams: PageProps<"/signup">["searchParams"];
}) {
  const [origin, params, current] = await Promise.all([
    getRequestOrigin(),
    searchParams,
    getCurrentUser(),
  ]);
  // Signed in with Google but no store yet → only the store step; otherwise go home
  if (current && (current.store || current.user.role === "SUPERADMIN")) {
    redirect(homePathFor(current.user.role, !!current.store));
  }
  const host = origin.replace(/^https?:\/\//, "");
  const name = typeof params.name === "string" ? params.name.trim().slice(0, 60) : "";
  const error = typeof params.error === "string" ? params.error : undefined;
  return (
    <SignupForm
      host={host}
      initialStoreName={name}
      googleEnabled={isGoogleEnabled()}
      googleError={error}
      account={current ? { email: current.user.email } : undefined}
    />
  );
}
