import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { robots: { index: false } };

/** "Forgot password": email → 6-digit code → new password (also lets Google-only owners set one) */
export default async function ResetPasswordPage() {
  const t = await getTranslations("passwordReset");
  return (
    <AuthShell title={t("title")} subtitle={t("intro")}>
      {/* useSearchParams (?email=) — needs a Suspense boundary */}
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
