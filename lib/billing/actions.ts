"use server";

import { redirect } from "next/navigation";

import { getRequestOrigin } from "@/lib/app-url";
import { requireOwner } from "@/lib/auth/owner";
import { type BillingInterval, polarClient, productIdFor } from "@/lib/billing/polar";
import { rateLimit, RULES } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";

const PLAN_PATH = "/admin/plan";

/** "Upgrade to Pro": Polar checkout for this store (the webhook switches the plan after payment) */
export async function startCheckout(formData: FormData): Promise<void> {
  const { user, store } = await requireOwner();
  const interval: BillingInterval = formData.get("interval") === "year" ? "year" : "month";
  const productId = productIdFor(interval);
  if (!productId) redirect(`${PLAN_PATH}?billing=error`);
  if (!(await rateLimit(RULES.billingUser, user.id))) redirect(`${PLAN_PATH}?billing=limited`);

  const origin = await getRequestOrigin();
  let url: string | null = null;
  try {
    const checkout = await polarClient().checkouts.create({
      products: [productId],
      // The store is the Polar customer: the webhook finds it by external id
      external_customer_id: store.id,
      customer_email: user.email,
      customer_name: user.name || undefined,
      metadata: { storeId: store.id },
      allow_discount_codes: true,
      success_url: `${origin}${PLAN_PATH}?billing=success`,
      return_url: `${origin}${PLAN_PATH}`,
    });
    url = checkout.url;
  } catch (e) {
    reportError(e, "billing.startCheckout", { storeId: store.id, interval });
  }
  redirect(url ?? `${PLAN_PATH}?billing=error`);
}

/** "Manage subscription": Polar customer portal (card, cancel, invoices) */
export async function openBillingPortal(): Promise<void> {
  const { user, store } = await requireOwner();
  if (!store.polarSubscriptionId) redirect(PLAN_PATH);
  if (!(await rateLimit(RULES.billingUser, user.id))) redirect(`${PLAN_PATH}?billing=limited`);

  const origin = await getRequestOrigin();
  let url: string | null = null;
  try {
    const session = await polarClient().customerSessions.create({
      external_customer_id: store.id,
      return_url: `${origin}${PLAN_PATH}`,
    });
    url = session.customer_portal_url;
  } catch (e) {
    reportError(e, "billing.openBillingPortal", { storeId: store.id });
  }
  redirect(url ?? `${PLAN_PATH}?billing=error`);
}
