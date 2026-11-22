import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { LanguageSwitcher } from "@/components/language-switcher";

export const metadata: Metadata = { robots: { index: false } };

/** "Forgot password": email → 6-digit code → new password (also lets Google-only owners set one) */
export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Header />
      {/* useSearchParams (?email=) — needs a Suspense boundary */}
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}

async function Header() {
  const t = await getTranslations("passwordReset");
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <LanguageSwitcher />
    </div>
  );
}
