-- Wave 2: Engagement-owned IRA, Tier Review, requester clarification.

ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'IRA_IN_PROGRESS';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'TIER_REVIEW';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'NEEDS_REQUESTER_CLARIFICATION';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'INHERENT_TIER_CONFIRMED';

CREATE TYPE "EngagementIraStatus" AS ENUM (
  'REQUIRED',
  'IN_PROGRESS',
  'SUBMITTED',
  'NEEDS_CLARIFICATION',
  'TIER_REVIEW',
  'CONFIRMED'
);

ALTER TABLE "RequesterTaskLink" ADD COLUMN IF NOT EXISTS "engagementId" TEXT;
CREATE INDEX IF NOT EXISTS "RequesterTaskLink_engagementId_idx" ON "RequesterTaskLink"("engagementId");

CREATE TABLE "EngagementIra" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "status" "EngagementIraStatus" NOT NULL DEFAULT 'REQUIRED',
    "currentAnswers" JSONB,
    "recommendedTier" "VendorTier",
    "recommendedScore" INTEGER,
    "unknownKeys" JSONB,
    "floors" JSONB,
    "packs" JSONB,
    "explanation" TEXT,
    "calculationSnapshot" JSONB,
    "previousCalculationSnapshot" JSONB,
    "confirmedTier" "VendorTier",
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "overrideFromTier" "VendorTier",
    "overrideReason" TEXT,
    "scoringVersion" TEXT NOT NULL DEFAULT '3',
    "openedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementIra_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EngagementIra_engagementId_key" ON "EngagementIra"("engagementId");
CREATE INDEX "EngagementIra_organizationId_status_idx" ON "EngagementIra"("organizationId", "status");

CREATE TABLE "EngagementIraSubmission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "iraId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "calculationSnapshot" JSONB NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementIraSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EngagementIraSubmission_organizationId_iraId_idx" ON "EngagementIraSubmission"("organizationId", "iraId");

CREATE TABLE "EngagementIraClarification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "iraId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "questionKey" TEXT NOT NULL,
    "previousAnswer" TEXT,
    "analystNote" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "generalNote" TEXT,
    "updatedAnswer" TEXT,
    "comment" TEXT,
    "respondedBy" TEXT,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "EngagementIraClarification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EngagementIraClarification_organizationId_iraId_round_idx" ON "EngagementIraClarification"("organizationId", "iraId", "round");

ALTER TABLE "RequesterTaskLink" ADD CONSTRAINT "RequesterTaskLink_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EngagementIra" ADD CONSTRAINT "EngagementIra_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementIra" ADD CONSTRAINT "EngagementIra_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementIraSubmission" ADD CONSTRAINT "EngagementIraSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementIraSubmission" ADD CONSTRAINT "EngagementIraSubmission_iraId_fkey" FOREIGN KEY ("iraId") REFERENCES "EngagementIra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementIraClarification" ADD CONSTRAINT "EngagementIraClarification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementIraClarification" ADD CONSTRAINT "EngagementIraClarification_iraId_fkey" FOREIGN KEY ("iraId") REFERENCES "EngagementIra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
