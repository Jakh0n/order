import { Webhooks } from "@polar-sh/nextjs";

import { syncSubscription } from "@/lib/billing/sync";

// Polar → Store.plan. Signature is verified by Webhooks (POLAR_WEBHOOK_SECRET); a throw → 500 → Polar retries.
// Every subscription event carries the full subscription, so one sync handles them all.
const sync = async ({ data }: { data: Parameters<typeof syncSubscription>[0] }) =>
  syncSubscription(data);

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",
  onSubscriptionCreated: sync,
  onSubscriptionActive: sync,
  onSubscriptionUpdated: sync,
  onSubscriptionCanceled: sync,
  onSubscriptionUncanceled: sync,
  onSubscriptionCycled: sync,
  onSubscriptionPastDue: sync,
  onSubscriptionRevoked: sync,
});
