-- Maker/checker provenance for material governance decisions (H-2 / H-7).

ALTER TABLE "RiskDecisionBrief" ADD COLUMN "preparedByUserId" TEXT;

ALTER TABLE "VendorOnboarding" ADD COLUMN "approvalPreparedBy" TEXT;
ALTER TABLE "VendorOnboarding" ADD COLUMN "approvalPreparedAt" TIMESTAMP(3);
ALTER TABLE "VendorOnboarding" ADD COLUMN "approvalPreparedDecision" TEXT;
ALTER TABLE "VendorOnboarding" ADD COLUMN "approvalPreparedRationale" TEXT;

ALTER TABLE "VendorIssue" ADD COLUMN "acceptanceRequestedBy" TEXT;
ALTER TABLE "VendorIssue" ADD COLUMN "acceptanceRequestedAt" TIMESTAMP(3);
