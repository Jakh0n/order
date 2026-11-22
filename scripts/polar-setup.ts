// Polar billing setup (idempotent — safe to run again).
// Usage: npm run polar:setup -- sandbox https://<public-url>
//        npm run polar:setup -- production https://tezda.app
// Creates: "Tezda Pro" monthly ($15) + yearly ($150) products, webhook → <url>/api/webhooks/polar.
// Writes POLAR_* values into .env.local (sandbox) or .env.polar-production.local (production,
// for Vercel env — never used by local dev). The webhook secret is never printed.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { createPolar } from "@polar-sh/sdk/2026-10";

import { PRO_PRICE_USD, PRO_PRICE_YEARLY_USD } from "../lib/plan";

function readEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return out;
}

function writeEnv(file: string, values: Record<string, string>) {
  let text = existsSync(file) ? readFileSync(file, "utf8") : "";
  for (const [k, v] of Object.entries(values)) {
    const line = `${k}=${v}`;
    const re = new RegExp(`^${k}=.*$`, "m");
    text = re.test(text) ? text.replace(re, line) : `${text.replace(/\n?$/, "\n")}${line}\n`;
  }
  writeFileSync(file, text);
}

async function main() {
  const env = process.argv[2];
  const baseUrl = process.argv[3]?.replace(/\/$/, "");
  if ((env !== "sandbox" && env !== "production") || !baseUrl?.startsWith("https://")) {
    console.error("Usage: npm run polar:setup -- <sandbox|production> https://<public-url>");
    process.exit(1);
  }
  const envFile = env === "sandbox" ? ".env.local" : ".env.polar-production.local";
  const vars = { ...readEnv(".env"), ...readEnv(".env.local"), ...process.env };
  const token = env === "sandbox" ? vars.POLAR_SANDBOX_ACCESS_TOKEN : vars.POLAR_ACCESS_TOKEN;
  if (!token) {
    console.error(
      `Missing ${env === "sandbox" ? "POLAR_SANDBOX_ACCESS_TOKEN" : "POLAR_ACCESS_TOKEN"}`,
    );
    process.exit(1);
  }
  const polar = createPolar({ accessToken: token, environment: env });

  // Products (one per billing interval), matched by our metadata key
  const existing = (await polar.products.list({ limit: 100 })).items;
  async function product(externalId: string, interval: "month" | "year", usd: number) {
    const found = existing.find((p) => p.metadata.tezda === externalId && !p.is_archived);
    if (found) return found.id;
    const created = await polar.products.create({
      metadata: { tezda: externalId },
      name: "Tezda Pro",
      description:
        "Growth tools for your Tezda store: full order history, promo codes, free delivery threshold, analytics, customer base, no Tezda branding.",
      recurring_interval: interval,
      prices: [{ amount_type: "fixed", price_currency: "usd", price_amount: usd * 100 }],
    });
    return created.id;
  }
  const monthly = await product("tezda-pro-monthly", "month", PRO_PRICE_USD);
  const yearly = await product("tezda-pro-yearly", "year", PRO_PRICE_YEARLY_USD);

  // Webhook → syncSubscription
  const url = `${baseUrl}/api/webhooks/polar`;
  const endpoints = (await polar.webhooks.listWebhookEndpoints({ limit: 100 })).items;
  const events = [
    "subscription.created",
    "subscription.active",
    "subscription.updated",
    "subscription.canceled",
    "subscription.uncanceled",
    "subscription.cycled",
    "subscription.past_due",
    "subscription.revoked",
  ] as const;
  const hook =
    endpoints.find((e) => e.url === url) ??
    (await polar.webhooks.createWebhookEndpoint({
      url,
      name: "Tezda plan sync",
      format: "raw",
      events: [...events],
    }));

  writeEnv(envFile, {
    POLAR_SERVER: env,
    POLAR_PRODUCT_MONTHLY_ID: monthly,
    POLAR_PRODUCT_YEARLY_ID: yearly,
    POLAR_WEBHOOK_SECRET: hook.secret,
  });
  console.log(`Polar ${env} ready → ${envFile}`);
  console.log(`  monthly product: ${monthly}`);
  console.log(`  yearly product:  ${yearly}`);
  console.log(`  webhook:         ${url}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
