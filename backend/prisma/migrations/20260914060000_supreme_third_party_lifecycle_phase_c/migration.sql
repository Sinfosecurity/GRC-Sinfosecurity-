-- Additive Phase C lifecycle stages and onboarding fields. No destructive changes.

ALTER TYPE "VendorOnboardingStage" ADD VALUE IF NOT EXISTS 'REMEDIATION';
ALTER TYPE "VendorOnboardingStage" ADD VALUE IF NOT EXISTS 'RISK_ACCEPTANCE';
ALTER TYPE "VendorOnboardingStage" ADD VALUE IF NOT EXISTS 'CONTRACT_REVIEW';
ALTER TYPE "VendorOnboardingStage" ADD VALUE IF NOT EXISTS 'APPROVAL';
ALTER TYPE "VendorOnboardingStage" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "VendorOnboardingStage" ADD VALUE IF NOT EXISTS 'REASSESSMENT';
ALTER TYPE "VendorOnboardingStage" ADD VALUE IF NOT EXISTS 'OFFBOARDING';

ALTER TABLE "VendorOnboarding"
ADD COLUMN "contractChecklist" JSONB,
ADD COLUMN "contractAttestedAt" TIMESTAMP(3),
ADD COLUMN "contractAttestedBy" TEXT,
ADD COLUMN "approvalDecision" TEXT,
ADD COLUMN "approvalConditions" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedBy" TEXT,
ADD COLUMN "lifecycleActivatedAt" TIMESTAMP(3),
ADD COLUMN "nextReassessmentAt" TIMESTAMP(3),
ADD COLUMN "reassessmentFrequencyDays" INTEGER,
ADD COLUMN "lastReassessmentAt" TIMESTAMP(3),
ADD COLUMN "residualAtApproval" INTEGER;
