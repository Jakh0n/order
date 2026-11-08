import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { LoginForm } from "@/components/admin/login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getCurrentUser, homePathFor } from "@/lib/auth/owner";

export const metadata: Metadata = { robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Suspense>
        <RedirectIfLoggedIn />
      </Suspense>
      <Header />
      <LoginForm />
    </main>
  );
}

async function Header() {
  const t = await getTranslations();
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-muted-foreground text-sm">order</p>
        <h1 className="text-xl font-semibold">{t("adminLogin.title")}</h1>
      </div>
      <LanguageSwitcher />
    </div>
  );
}

async function RedirectIfLoggedIn() {
  const current = await getCurrentUser();
  if (current) redirect(homePathFor(current.user.role, !!current.store));
  return null;
}
