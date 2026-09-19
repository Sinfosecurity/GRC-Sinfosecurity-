-- AlterEnum
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'DUE_DILIGENCE_PLANNING';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'READY_TO_SEND';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'AWAITING_VENDOR';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'VENDOR_IN_PROGRESS';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'VENDOR_SUBMITTED';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'SPECIALIST_REVIEW';

-- CreateEnum
CREATE TYPE "EngagementDueDiligencePlanStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'CONFIRMED');
CREATE TYPE "EngagementReviewStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'NEEDS_CLARIFICATION', 'COMPLETE');

-- CreateTable
CREATE TABLE "EngagementDueDiligencePlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "iraId" TEXT,
    "status" "EngagementDueDiligencePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "confirmedTier" "VendorTier" NOT NULL,
    "scoringVersion" TEXT NOT NULL DEFAULT '3',
    "catalogVersion" TEXT,
    "recommendedSnapshot" JSONB NOT NULL,
    "confirmedSnapshot" JSONB,
    "includedPackKeys" JSONB,
    "excludedPackKeys" JSONB,
    "packReasons" JSONB,
    "evidenceRequirements" JSONB,
    "reviewerDomains" JSONB,
    "unresolved" JSONB,
    "vendorDueAt" TIMESTAMP(3),
    "slaDays" INTEGER,
    "changeReason" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "assessmentContactId" TEXT,
    "invitationId" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentBy" TEXT,
    "catalogPin" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementDueDiligencePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementAssessmentReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "planId" TEXT,
    "assessmentId" TEXT,
    "domain" TEXT NOT NULL,
    "assignedTo" TEXT,
    "status" "EngagementReviewStatus" NOT NULL DEFAULT 'PENDING',
    "conclusions" JSONB,
    "observation" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementAssessmentReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EngagementDueDiligencePlan_engagementId_key" ON "EngagementDueDiligencePlan"("engagementId");
CREATE INDEX "EngagementDueDiligencePlan_organizationId_status_idx" ON "EngagementDueDiligencePlan"("organizationId", "status");
CREATE INDEX "EngagementDueDiligencePlan_vendorId_idx" ON "EngagementDueDiligencePlan"("vendorId");
CREATE INDEX "EngagementAssessmentReview_organizationId_engagementId_idx" ON "EngagementAssessmentReview"("organizationId", "engagementId");
CREATE INDEX "EngagementAssessmentReview_assessmentId_idx" ON "EngagementAssessmentReview"("assessmentId");

ALTER TABLE "EngagementDueDiligencePlan" ADD CONSTRAINT "EngagementDueDiligencePlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementDueDiligencePlan" ADD CONSTRAINT "EngagementDueDiligencePlan_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementAssessmentReview" ADD CONSTRAINT "EngagementAssessmentReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementAssessmentReview" ADD CONSTRAINT "EngagementAssessmentReview_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementAssessmentReview" ADD CONSTRAINT "EngagementAssessmentReview_planId_fkey" FOREIGN KEY ("planId") REFERENCES "EngagementDueDiligencePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EngagementAssessmentReview" ADD CONSTRAINT "EngagementAssessmentReview_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "VendorAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorAssessment" ADD COLUMN "engagementId" TEXT;
ALTER TABLE "VendorAssessment" ADD COLUMN "dueDiligencePlanId" TEXT;
ALTER TABLE "VendorAssessment" ADD COLUMN "catalogPin" JSONB;
CREATE INDEX "VendorAssessment_engagementId_idx" ON "VendorAssessment"("engagementId");
ALTER TABLE "VendorAssessment" ADD CONSTRAINT "VendorAssessment_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorAssessment" ADD CONSTRAINT "VendorAssessment_dueDiligencePlanId_fkey" FOREIGN KEY ("dueDiligencePlanId") REFERENCES "EngagementDueDiligencePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorAssessmentInvitation" ADD COLUMN "engagementId" TEXT;
ALTER TABLE "VendorAssessmentInvitation" ADD COLUMN "assessmentId" TEXT;
CREATE INDEX "VendorAssessmentInvitation_engagementId_idx" ON "VendorAssessmentInvitation"("engagementId");
ALTER TABLE "VendorAssessmentInvitation" ADD CONSTRAINT "VendorAssessmentInvitation_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EvidenceLink" ADD COLUMN "engagementId" TEXT;
CREATE INDEX "EvidenceLink_engagementId_idx" ON "EvidenceLink"("engagementId");
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
