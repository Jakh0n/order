import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// Short-lived signed proof, e.g. "this email was confirmed with a code" between signup steps.

/** Proof between signup steps that the email was confirmed with a code (checked again in signup) */
export const SIGNUP_EMAIL_TOKEN = "signup-email";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET o'rnatilmagan");
  return value;
}

function sign(purpose: string, data: string) {
  return createHmac("sha256", secret()).update(`${purpose}.${data}`).digest("base64url");
}

export function signToken(purpose: string, subject: string, maxAgeSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const data = Buffer.from(JSON.stringify({ sub: subject, exp })).toString("base64url");
  return `${data}.${sign(purpose, data)}`;
}

/** The subject if the token is genuine, for this purpose and not expired */
export function readToken(purpose: string, token: unknown): string | null {
  if (typeof token !== "string") return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = Buffer.from(sign(purpose, data));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const { sub, exp } = JSON.parse(Buffer.from(data, "base64url").toString());
    if (typeof sub !== "string" || typeof exp !== "number" || exp * 1000 < Date.now()) return null;
    return sub;
  } catch {
    return null;
  }
}
