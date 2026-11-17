-- Polar billing: subscription that drives Store.plan / paidUntil
ALTER TABLE "Store" ADD COLUMN "polarSubscriptionId" TEXT;
