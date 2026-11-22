import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { LoginForm } from "@/components/admin/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isGoogleEnabled } from "@/lib/auth/google";
import { getCurrentUser, homePathFor } from "@/lib/auth/owner";

export const metadata: Metadata = { robots: { index: false } };

export default async function LoginPage() {
  const t = await getTranslations("adminLogin");
  return (
    <AuthShell title={t("welcome")} subtitle={t("subtitle")}>
      <Suspense>
        <RedirectIfLoggedIn />
      </Suspense>
      {/* useSearchParams (?next=) — needs a Suspense boundary */}
      <Suspense>
        <LoginForm googleEnabled={isGoogleEnabled()} />
      </Suspense>
    </AuthShell>
  );
}

async function RedirectIfLoggedIn() {
  const current = await getCurrentUser();
  if (current) redirect(homePathFor(current.user.role, !!current.store));
  return null;
}
