import "server-only";

import { createPolar } from "@polar-sh/sdk/2026-10";

// Polar (merchant of record) — Pro subscription. Server only: the access token never reaches the client.
// POLAR_SERVER=sandbox uses POLAR_SANDBOX_ACCESS_TOKEN; anything else is production (POLAR_ACCESS_TOKEN).

export type BillingInterval = "month" | "year";

export function polarEnvironment(): "sandbox" | "production" {
  return process.env.POLAR_SERVER?.trim() === "sandbox" ? "sandbox" : "production";
}

function accessToken(): string | undefined {
  const token =
    polarEnvironment() === "sandbox"
      ? process.env.POLAR_SANDBOX_ACCESS_TOKEN
      : process.env.POLAR_ACCESS_TOKEN;
  return token?.trim() || undefined;
}

export function productIdFor(interval: BillingInterval): string | undefined {
  const id =
    interval === "year"
      ? process.env.POLAR_PRODUCT_YEARLY_ID
      : process.env.POLAR_PRODUCT_MONTHLY_ID;
  return id?.trim() || undefined;
}

/** Online upgrade is shown only when token + both products are set; otherwise the Telegram fallback */
export function billingEnabled(): boolean {
  return Boolean(accessToken() && productIdFor("month") && productIdFor("year"));
}

export function polarClient() {
  const token = accessToken();
  if (!token) throw new Error("Polar access token is not configured");
  return createPolar({ accessToken: token, environment: polarEnvironment() });
}
