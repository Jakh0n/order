import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { type GoogleProfile, parseGoogleIdToken } from "@/lib/auth/google-token";

// "Continue with Google" — OAuth 2.0 authorization code flow with PKCE, no extra library.
// Google Cloud Console → Credentials → OAuth client (Web): authorized redirect URI
// = https://<each domain owners log in on>/api/auth/google/callback (+ http://localhost:3000/... for dev).

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Short-lived cookie that carries state + PKCE verifier from the start route to the callback */
export const GOOGLE_STATE_COOKIE = "google_oauth";
export const GOOGLE_STATE_MAX_AGE_SECONDS = 10 * 60;

export type GoogleFrom = "login" | "signup";

export interface GoogleState {
  state: string;
  verifier: string;
  from: GoogleFrom;
  next: string | null;
}

function credentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** The button is shown only when the keys are set */
export function isGoogleEnabled(): boolean {
  return credentials() !== null;
}

export function redirectUri(origin: string) {
  return `${origin}/api/auth/google/callback`;
}

export function newGoogleState(from: GoogleFrom, next: string | null): GoogleState {
  return {
    state: randomBytes(24).toString("base64url"),
    verifier: randomBytes(48).toString("base64url"),
    from,
    next,
  };
}

export function encodeGoogleState(value: GoogleState) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeGoogleState(raw: string | undefined): GoogleState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString()) as GoogleState;
    if (typeof value.state !== "string" || typeof value.verifier !== "string") return null;
    return {
      state: value.state,
      verifier: value.verifier,
      from: value.from === "signup" ? "signup" : "login",
      next: typeof value.next === "string" ? value.next : null,
    };
  } catch {
    return null;
  }
}

export function googleAuthUrl(origin: string, value: GoogleState): string | null {
  const creds = credentials();
  if (!creds) return null;
  const challenge = createHash("sha256").update(value.verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state: value.state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    // Lets people with several Google accounts pick the right one
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params}`;
}

/** Exchanges the callback code for the user's verified Google profile (null = rejected) */
export async function exchangeGoogleCode(
  origin: string,
  code: string,
  verifier: string,
): Promise<GoogleProfile | null> {
  const creds = credentials();
  if (!creds) return null;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status}`);
  }
  const data = (await response.json()) as { id_token?: unknown };
  if (typeof data.id_token !== "string") return null;
  return parseGoogleIdToken(data.id_token, creds.clientId, Math.floor(Date.now() / 1000));
}
