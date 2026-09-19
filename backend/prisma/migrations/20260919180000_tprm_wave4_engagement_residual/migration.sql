-- AlterEnum
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'FINDING_REVIEW';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'RESIDUAL_READY';

-- CreateEnum
CREATE TYPE "EngagementControlRating" AS ENUM ('EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'NOT_APPLICABLE', 'NOT_ASSESSED');
CREATE TYPE "EngagementResidualStatus" AS ENUM ('NOT_READY', 'CALCULATED', 'CONFIRMED');

-- VendorIssue Engagement ownership
ALTER TABLE "VendorIssue" ADD COLUMN IF NOT EXISTS "engagementId" TEXT;
ALTER TABLE "VendorIssue" ADD COLUMN IF NOT EXISTS "controlId" TEXT;
ALTER TABLE "VendorIssue" ADD COLUMN IF NOT EXISTS "recommendedSeverity" "IssueSeverity";
ALTER TABLE "VendorIssue" ADD COLUMN IF NOT EXISTS "determinationNote" TEXT;
CREATE INDEX IF NOT EXISTS "VendorIssue_engagementId_idx" ON "VendorIssue"("engagementId");
ALTER TABLE "VendorIssue" ADD CONSTRAINT "VendorIssue_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EngagementControlEffectiveness" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "controlKey" TEXT NOT NULL,
    "controlTitle" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "rating" "EngagementControlRating" NOT NULL DEFAULT 'NOT_ASSESSED',
    "rationale" TEXT,
    "scopeNote" TEXT,
    "evidenceObjectIds" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementControlEffectiveness_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementCompensatingControl" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "affectedControlId" TEXT,
    "affectedControlKey" TEXT,
    "description" TEXT NOT NULL,
    "owner" TEXT,
    "evidenceObjectId" TEXT,
    "evidenceNote" TEXT,
    "effectivenessJudgment" "EngagementControlRating" NOT NULL DEFAULT 'NOT_ASSESSED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "consideredInResidual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementCompensatingControl_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementResidualRiskAssessment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "EngagementResidualStatus" NOT NULL DEFAULT 'NOT_READY',
    "inherentTier" "VendorTier",
    "inherentScore" INTEGER,
    "inherentSource" TEXT,
    "inherentConfirmedAt" TIMESTAMP(3),
    "inherentScoringVersion" TEXT,
    "controlEffectivenessSnapshot" JSONB,
    "openFindingSnapshot" JSONB,
    "compensatingSnapshot" JSONB,
    "methodologyVersion" TEXT NOT NULL,
    "calculationVersion" TEXT NOT NULL,
    "residualScore" INTEGER,
    "residualBand" TEXT,
    "explanation" TEXT,
    "factors" JSONB,
    "readiness" JSONB,
    "triggerReason" TEXT,
    "calculatedAt" TIMESTAMP(3),
    "calculatedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementResidualRiskAssessment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EngagementControlEffectiveness_engagementId_controlId_key" ON "EngagementControlEffectiveness"("engagementId", "controlId");
CREATE INDEX "EngagementControlEffectiveness_organizationId_engagementId_idx" ON "EngagementControlEffectiveness"("organizationId", "engagementId");
CREATE INDEX "EngagementControlEffectiveness_controlId_idx" ON "EngagementControlEffectiveness"("controlId");
CREATE INDEX "EngagementCompensatingControl_organizationId_engagementId_idx" ON "EngagementCompensatingControl"("organizationId", "engagementId");
CREATE INDEX "EngagementResidualRiskAssessment_organizationId_engagementId_createdAt_idx" ON "EngagementResidualRiskAssessment"("organizationId", "engagementId", "createdAt");

ALTER TABLE "EngagementControlEffectiveness" ADD CONSTRAINT "EngagementControlEffectiveness_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementControlEffectiveness" ADD CONSTRAINT "EngagementControlEffectiveness_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementCompensatingControl" ADD CONSTRAINT "EngagementCompensatingControl_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementCompensatingControl" ADD CONSTRAINT "EngagementCompensatingControl_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementResidualRiskAssessment" ADD CONSTRAINT "EngagementResidualRiskAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementResidualRiskAssessment" ADD CONSTRAINT "EngagementResidualRiskAssessment_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
