// Pure helpers for "Continue with Google" (no I/O — unit-tested in tests/unit/google-auth.test.ts).

export interface GoogleProfile {
  /** Stable Google account id */
  sub: string;
  email: string;
  name: string | null;
}

const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

/**
 * Reads the ID token returned by Google's token endpoint.
 * The token comes straight from Google over TLS (server-to-server, with our client secret),
 * so per OpenID Connect Core 3.1.3.7 the TLS check stands in for the signature check;
 * we still validate issuer, audience, expiry and a verified email.
 */
export function parseGoogleIdToken(
  idToken: string,
  clientId: string,
  nowSeconds: number,
): GoogleProfile | null {
  const payload = idToken.split(".")[1];
  if (!payload) return null;

  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }

  if (typeof claims.iss !== "string" || !ISSUERS.has(claims.iss)) return null;
  if (claims.aud !== clientId) return null;
  if (typeof claims.exp !== "number" || claims.exp < nowSeconds) return null;
  if (typeof claims.sub !== "string" || !claims.sub) return null;
  if (typeof claims.email !== "string" || !claims.email.includes("@")) return null;
  // Unverified emails must never log into (or link to) an account with that email
  if (claims.email_verified !== true && claims.email_verified !== "true") return null;

  const name = typeof claims.name === "string" ? claims.name.trim().slice(0, 100) : "";
  return {
    sub: claims.sub,
    email: claims.email.trim().toLowerCase().slice(0, 200),
    name: name || null,
  };
}

/** Only same-site admin paths (no open redirect via ?next=//evil.com) */
export function safeNext(value: unknown): string | null {
  const next = typeof value === "string" ? value : "";
  return /^\/admin\/[a-z0-9/_-]*$/i.test(next) && !next.includes("//") ? next : null;
}
