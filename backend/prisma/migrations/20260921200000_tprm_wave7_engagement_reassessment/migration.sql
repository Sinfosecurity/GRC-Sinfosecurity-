-- Wave 7: Engagement reassessment cycle. Additive. Prior residual rows are not rewritten.

ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'REASSESSMENT';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE IF NOT EXISTS 'SUPERSEDES';

CREATE TYPE "EngagementReassessmentKind" AS ENUM ('FULL', 'TARGETED');
CREATE TYPE "EngagementReassessmentStatus" AS ENUM ('INITIATED', 'SCOPED', 'REQUESTER_DELTA', 'IRA_REFRESH', 'TIER_REVIEW', 'DELTA_DUE_DILIGENCE', 'VENDOR_REFRESH', 'EVIDENCE_REVIEW', 'SPECIALIST_REVIEW', 'FINDING_REVIEW', 'CONTROL_REVIEW', 'RESIDUAL_REVIEW', 'DECISION', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ReassessmentItemKind" AS ENUM ('BUSINESS_CONTEXT', 'IRA_QUESTION', 'DUE_DILIGENCE_QUESTION', 'EVIDENCE', 'CONTROL', 'FINDING', 'SPECIALIST_DOMAIN');
CREATE TYPE "ReassessmentItemDisposition" AS ENUM ('REUSE', 'REFRESH', 'NEW', 'NOT_REQUIRED');
CREATE TYPE "ReassessmentDecisionType" AS ENUM ('CONTINUE_MONITORING', 'FURTHER_TREATMENT_REQUIRED', 'TERMINATION_RECOMMENDED');
CREATE TYPE "ReassessmentVendorRefreshStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'REQUESTED');

CREATE TABLE "EngagementReassessment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "kind" "EngagementReassessmentKind" NOT NULL,
    "triggerType" "ReassessmentTriggerType" NOT NULL,
    "recommendationId" TEXT,
    "status" "EngagementReassessmentStatus" NOT NULL DEFAULT 'INITIATED',
    "scopeNote" TEXT NOT NULL,
    "whyReassessing" TEXT NOT NULL,
    "requesterDelta" JSONB,
    "priorIraSnapshot" JSONB NOT NULL,
    "currentIraSnapshot" JSONB,
    "priorResidualId" TEXT,
    "currentResidualId" TEXT,
    "priorAcceptanceId" TEXT,
    "acceptanceCarriedForward" BOOLEAN NOT NULL DEFAULT false,
    "vendorRefreshStatus" "ReassessmentVendorRefreshStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "decision" "ReassessmentDecisionType",
    "decisionRationale" TEXT,
    "wave8Started" BOOLEAN NOT NULL DEFAULT false,
    "scoringVersion" TEXT NOT NULL DEFAULT '3',
    "startedByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "history" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementReassessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementReassessmentItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reassessmentId" TEXT NOT NULL,
    "kind" "ReassessmentItemKind" NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "previousValue" TEXT,
    "currentValue" TEXT,
    "disposition" "ReassessmentItemDisposition" NOT NULL,
    "rationale" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementReassessmentItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EngagementResidualRiskAssessment" ADD COLUMN "reassessmentId" TEXT;

CREATE UNIQUE INDEX "EngagementReassessment_organizationId_publicId_key" ON "EngagementReassessment"("organizationId", "publicId");
CREATE INDEX "EngagementReassessment_organizationId_engagementId_status_idx" ON "EngagementReassessment"("organizationId", "engagementId", "status");
CREATE INDEX "EngagementReassessment_organizationId_engagementId_cycleNumber_idx" ON "EngagementReassessment"("organizationId", "engagementId", "cycleNumber");
CREATE UNIQUE INDEX "EngagementReassessmentItem_reassessmentId_kind_sourceKey_key" ON "EngagementReassessmentItem"("reassessmentId", "kind", "sourceKey");
CREATE INDEX "EngagementReassessmentItem_organizationId_reassessmentId_idx" ON "EngagementReassessmentItem"("organizationId", "reassessmentId");
CREATE INDEX "EngagementResidualRiskAssessment_reassessmentId_idx" ON "EngagementResidualRiskAssessment"("reassessmentId");

ALTER TABLE "EngagementReassessment" ADD CONSTRAINT "EngagementReassessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementReassessment" ADD CONSTRAINT "EngagementReassessment_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementReassessmentItem" ADD CONSTRAINT "EngagementReassessmentItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementReassessmentItem" ADD CONSTRAINT "EngagementReassessmentItem_reassessmentId_fkey" FOREIGN KEY ("reassessmentId") REFERENCES "EngagementReassessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementResidualRiskAssessment" ADD CONSTRAINT "EngagementResidualRiskAssessment_reassessmentId_fkey" FOREIGN KEY ("reassessmentId") REFERENCES "EngagementReassessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
