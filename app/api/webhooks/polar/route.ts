import { Webhooks } from "@polar-sh/nextjs";

import { syncSubscription } from "@/lib/billing/sync";

// Polar → Store.plan. Signature is verified by Webhooks (POLAR_WEBHOOK_SECRET); a throw → 500 → Polar retries.
// Every subscription event just triggers a sync of that subscription's current state.
const sync = async ({ data }: { data: { id: string } }) => syncSubscription(data.id);

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
