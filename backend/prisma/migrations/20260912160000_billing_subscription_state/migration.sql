-- Authoritative Stripe subscription fields used by hosted test-mode billing.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "billingSubscriptionId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "billingInterval" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Organization_billingSubscriptionId_idx" ON "Organization"("billingSubscriptionId");
