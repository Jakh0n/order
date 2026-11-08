"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/auth/actions";

export function LoginForm() {
  const t = useTranslations("adminLogin");
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state?.email}
          key={state?.email}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state?.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error === "tooMany" ? t("tooMany") : t("invalid")}
        </p>
      )}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {t("submit")}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        {t("noAccount")}{" "}
        <Link href="/signup" className="text-primary font-medium">
          {t("signupLink")}
        </Link>
      </p>
    </form>
  );
}
