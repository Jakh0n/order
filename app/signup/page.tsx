import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { SignupForm } from "@/components/auth/signup-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteAnalytics } from "@/components/site-analytics";
import { getRequestOrigin } from "@/lib/app-url";
import { isGoogleEnabled } from "@/lib/auth/google";
import { getCurrentUser, homePathFor } from "@/lib/auth/owner";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signup");
  return { title: t("title") };
}

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Header />
      <Suspense fallback={<SignupForm host="" googleEnabled={isGoogleEnabled()} />}>
        <SignupFormWithHost searchParams={searchParams} />
      </Suspense>
      <SiteAnalytics />
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
