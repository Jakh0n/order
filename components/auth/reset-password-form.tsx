"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, resetPassword } from "@/lib/auth/email-actions";

export function ResetPasswordForm() {
  const t = useTranslations("passwordReset");
  const tSignup = useTranslations("signup");
  const [email, setEmail] = useState(useSearchParams().get("email") ?? "");
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const errorText = (key: string) =>
    tSignup.has(`errors.${key}`) ? tSignup(`errors.${key}`) : tSignup("errors.server");

  async function sendCode() {
    setBusy(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (!result.ok) return setError(errorText(result.error));
    setCode("");
    setResendIn(60);
    setStep(2);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    // On success the server logs in and redirects — only errors come back
    const result = await resetPassword({ email, code, password });
    setBusy(false);
    if (result) setError(errorText(result.error));
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === 1) sendCode();
        else submit();
      }}
    >
      {step === 1 ? (
        <>
          <p className="text-muted-foreground text-sm">{t("intro")}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{tSignup("email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {t.rich("codeSent", {
              email,
              b: (chunks) => <span className="text-foreground font-medium">{chunks}</span>,
            })}
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">{tSignup("code")}</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              className="h-12 text-center font-mono text-xl tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
            />
            <p className="text-muted-foreground text-xs">{tSignup("checkSpam")}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("newPassword")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{tSignup("passwordHint")}</p>
          </div>
        </>
      )}

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-11"
        disabled={busy || (step === 2 && (code.length !== 6 || password.length < 8))}
      >
        {busy && <Loader2 className="animate-spin" />}
        {step === 1 ? t("sendCode") : t("save")}
      </Button>

      {step === 2 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-primary disabled:text-muted-foreground font-medium disabled:font-normal"
            disabled={resendIn > 0 || busy}
            onClick={sendCode}
          >
            {resendIn > 0
              ? tSignup("resendIn", { seconds: resendIn })
              : tSignup("resendCode")}
          </button>
          <button type="button" className="text-muted-foreground" onClick={() => setStep(1)}>
            {tSignup("changeEmail")}
          </button>
        </div>
      )}

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/admin/login" className="text-primary font-medium">
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
