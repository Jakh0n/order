"use server";

import type { EmailCodePurpose } from "@prisma/client";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { consumeEmailCode, issueEmailCode } from "@/lib/auth/email-code";
import { homePathFor } from "@/lib/auth/owner";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { SIGNUP_EMAIL_TOKEN, signToken } from "@/lib/auth/token";
import { BRAND_NAME } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { codeEmail, normalizeCode } from "@/lib/email/code-email";
import { sendEmail } from "@/lib/email/send";
import { clientIp, rateLimit, rateLimitAll, RULES } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";
import { signupAccountSchema } from "@/lib/validators";

const SIGNUP_EMAIL_TOKEN_SECONDS = 60 * 60;

const emailSchema = signupAccountSchema.shape.email;

export type CodeError = "emailInvalid" | "emailTaken" | "tooMany" | "server" | "codeWrong" | "codeExpired";

async function sendCode(email: string, purpose: EmailCodePurpose) {
  const t = await getTranslations("authEmail");
  const kind = purpose === "SIGNUP" ? "signup" : "reset";
  const code = await issueEmailCode(email, purpose);
  const message = codeEmail(
    code,
    {
      subject: t(`${kind}.subject`, { code, brand: BRAND_NAME }),
      heading: t(`${kind}.heading`),
      intro: t(`${kind}.intro`),
      expires: t("expires"),
      ignore: t("ignore"),
    },
    BRAND_NAME,
  );
  await sendEmail({ to: email, ...message });
}

async function allowSend(email: string) {
  return rateLimitAll([
    [RULES.emailCodeIp, await clientIp()],
    [RULES.emailCodeEmail, email],
  ]);
}

/** Signup step 1 → emails a code (only to an email that has no account yet) */
export async function sendSignupCode(
  rawEmail: string,
): Promise<{ ok: true } | { ok: false; error: CodeError }> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: "emailInvalid" };
  const email = parsed.data;

  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (taken) return { ok: false, error: "emailTaken" };
  if (!(await allowSend(email))) return { ok: false, error: "tooMany" };

  try {
    await sendCode(email, "SIGNUP");
  } catch (e) {
    reportError(e, "sendSignupCode");
    return { ok: false, error: "server" };
  }
  return { ok: true };
}

/** Signup step 2 → a signed proof that this email is the owner's */
export async function verifySignupCode(
  rawEmail: string,
  rawCode: string,
): Promise<{ ok: true; token: string } | { ok: false; error: CodeError }> {
  const parsed = emailSchema.safeParse(rawEmail);
  const code = normalizeCode(rawCode);
  if (!parsed.success) return { ok: false, error: "emailInvalid" };
  if (!code) return { ok: false, error: "codeWrong" };
  if (!(await rateLimit(RULES.codeVerifyIp, await clientIp()))) return { ok: false, error: "tooMany" };

  const result = await consumeEmailCode(parsed.data, "SIGNUP", code);
  if (result === "wrong") return { ok: false, error: "codeWrong" };
  if (result === "expired") return { ok: false, error: "codeExpired" };
  return { ok: true, token: signToken(SIGNUP_EMAIL_TOKEN, parsed.data, SIGNUP_EMAIL_TOKEN_SECONDS) };
}

/**
 * "Forgot password" step 1. Answers the same whether or not the account exists
 * (doesn't reveal who has an account).
 */
export async function requestPasswordReset(
  rawEmail: string,
): Promise<{ ok: true } | { ok: false; error: CodeError }> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: "emailInvalid" };
  const email = parsed.data;
  if (!(await allowSend(email))) return { ok: false, error: "tooMany" };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { ok: true };
  try {
    await sendCode(email, "RESET");
  } catch (e) {
    reportError(e, "requestPasswordReset");
    return { ok: false, error: "server" };
  }
  return { ok: true };
}

const resetSchema = z.object({
  email: emailSchema,
  password: signupAccountSchema.shape.password,
});

/** "Forgot password" step 2: code + new password → logged in */
export async function resetPassword(input: {
  email: string;
  code: string;
  password: string;
}): Promise<{ ok: false; error: CodeError | "passwordShort" }> {
  const parsed = resetSchema.safeParse(input);
  const code = normalizeCode(input.code);
  if (!parsed.success) {
    const emailBad = parsed.error.issues.some((i) => i.path[0] === "email");
    return { ok: false, error: emailBad ? "emailInvalid" : "passwordShort" };
  }
  if (!code) return { ok: false, error: "codeWrong" };
  if (!(await rateLimit(RULES.codeVerifyIp, await clientIp()))) return { ok: false, error: "tooMany" };

  const { email, password } = parsed.data;
  const result = await consumeEmailCode(email, "RESET", code);
  if (result === "wrong") return { ok: false, error: "codeWrong" };
  if (result === "expired") return { ok: false, error: "codeExpired" };

  let user: { id: string; role: string; _count: { stores: number } };
  try {
    user = await prisma.user.update({
      where: { email },
      data: { passwordHash: await hashPassword(password) },
      select: { id: true, role: true, _count: { select: { stores: true } } },
    });
  } catch (e) {
    reportError(e, "resetPassword");
    return { ok: false, error: "server" };
  }

  await createSession(user.id);
  redirect(homePathFor(user.role, user._count.stores > 0));
}
