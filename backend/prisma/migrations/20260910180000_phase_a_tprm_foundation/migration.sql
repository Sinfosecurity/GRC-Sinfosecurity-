-- Phase A TPRM: explainable score factors and Risk Decision Brief.
-- Additive only. Does not drop vendor or GRC tables.

ALTER TABLE "ScoreCalculation" ADD COLUMN IF NOT EXISTS "factors" JSONB;

DO $$ BEGIN
    CREATE TYPE "RiskDecision" AS ENUM (
        'APPROVE',
        'APPROVE_WITH_CONDITIONS',
        'ESCALATE',
        'REJECT',
        'RISK_ACCEPTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "DecisionBriefStatus" AS ENUM ('DRAFT', 'DECIDED', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "RiskDecisionBrief" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "engagementName" TEXT,
    "scoreCalculationId" TEXT,
    "inherentRisk" INTEGER NOT NULL,
    "residualRisk" INTEGER NOT NULL,
    "riskBand" TEXT NOT NULL,
    "assessmentStatus" TEXT,
    "evidenceConfidence" TEXT NOT NULL,
    "openFindingsCount" INTEGER NOT NULL DEFAULT 0,
    "monitoringAlertCount" INTEGER NOT NULL DEFAULT 0,
    "reviewerAnalysis" TEXT,
    "aiSummary" TEXT,
    "aiSummaryStatus" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "humanDecision" "RiskDecision",
    "conditions" TEXT,
    "nextReviewDate" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "status" "DecisionBriefStatus" NOT NULL DEFAULT 'DRAFT',
    "immutableSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskDecisionBrief_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RiskDecisionBrief_organizationId_idx" ON "RiskDecisionBrief"("organizationId");
CREATE INDEX IF NOT EXISTS "RiskDecisionBrief_vendorId_idx" ON "RiskDecisionBrief"("vendorId");
CREATE INDEX IF NOT EXISTS "RiskDecisionBrief_organizationId_status_idx" ON "RiskDecisionBrief"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "RiskDecisionBrief_createdAt_idx" ON "RiskDecisionBrief"("createdAt");

DO $$ BEGIN
    ALTER TABLE "RiskDecisionBrief"
        ADD CONSTRAINT "RiskDecisionBrief_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
