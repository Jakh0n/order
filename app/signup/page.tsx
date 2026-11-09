import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { SignupForm } from "@/components/auth/signup-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getRequestOrigin } from "@/lib/app-url";
import { getCurrentUser, homePathFor } from "@/lib/auth/owner";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signup");
  return { title: t("title") };
}

export default function SignupPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Suspense>
        <RedirectIfLoggedIn />
      </Suspense>
      <Header />
      <Suspense fallback={<SignupForm host="" />}>
        <SignupFormWithHost />
      </Suspense>
    </main>
  );
}

async function Header() {
  const t = await getTranslations("signup");
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-muted-foreground text-sm">order</p>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
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

/** Slug oldidagi domen ("order.uz/") — so'rovdan, localhost bo'lib qolmasligi uchun */
async function SignupFormWithHost() {
  const host = (await getRequestOrigin()).replace(/^https?:\/\//, "");
  return <SignupForm host={host} />;
}
