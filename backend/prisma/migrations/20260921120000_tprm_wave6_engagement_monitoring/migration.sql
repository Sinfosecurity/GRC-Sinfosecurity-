-- Wave 6: Engagement monitoring profile, signals, triage, escalation, reassessment handoff.
-- VendorMonitoring remains readable legacy. No reassessment execution.

ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'MONITORING_PROFILE';
ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'MONITORING_SIGNAL';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE IF NOT EXISTS 'OBSERVED';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE IF NOT EXISTS 'RELATES_TO';

CREATE TYPE "EngagementMonitoringProfileStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'RETIRED');
CREATE TYPE "MonitoringDomain" AS ENUM ('CYBERSECURITY', 'PRIVACY', 'OPERATIONAL_RESILIENCE', 'FINANCIAL_VIABILITY', 'REGULATORY_COMPLIANCE', 'FOURTH_PARTY', 'BUSINESS_CONTINUITY', 'INSURANCE', 'AI_MODEL_DEPENDENCY');
CREATE TYPE "MonitoringSourceType" AS ENUM ('INTERNAL_REVIEW', 'MANUAL_OBSERVATION', 'VENDOR_NOTIFICATION', 'PUBLIC_API', 'WEBHOOK', 'PROVIDER_OBSERVATION', 'SECURITY_RATING', 'EXTERNAL_INTELLIGENCE', 'REGULATORY_EVENT', 'CONTRACT_EVENT', 'DOCUMENT_EXPIRY', 'SYSTEM_EVENT');
CREATE TYPE "MonitoringSignalStatus" AS ENUM ('NEW', 'NEEDS_REVIEW', 'ASSIGNED', 'ESCALATED', 'WATCHING', 'CLOSED');
CREATE TYPE "MonitoringTriageOutcome" AS ENUM ('NOT_RELEVANT', 'MONITOR', 'ACTION_REQUIRED', 'ESCALATE', 'REASSESSMENT_RECOMMENDED');
CREATE TYPE "MonitoringImpactDecision" AS ENUM ('AFFECTED', 'NOT_AFFECTED', 'NEEDS_REVIEW');
CREATE TYPE "MonitoringPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "MonitoringEscalationStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');
CREATE TYPE "ReassessmentRecommendationStatus" AS ENUM ('RECOMMENDED', 'SUBMITTED', 'WITHDRAWN');
CREATE TYPE "ReassessmentTriggerType" AS ENUM ('MATERIAL_SECURITY_INCIDENT', 'MAJOR_SERVICE_CHANGE', 'MATERIAL_DATA_SCOPE_CHANGE', 'CRITICAL_FINDING', 'REGULATORY_CHANGE', 'FINANCIAL_DISTRESS', 'SUBPROCESSOR_CHANGE', 'PROLONGED_OUTAGE', 'CONTRACT_CHANGE', 'SCHEDULED_PERIODIC_REVIEW');

CREATE TABLE "EngagementMonitoringProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "status" "EngagementMonitoringProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerUserId" TEXT,
    "reviewCadenceDays" INTEGER,
    "enabledDomains" JSONB NOT NULL,
    "enabledSources" JSONB NOT NULL,
    "materialityConfig" JSONB,
    "reassessmentTriggerConfig" JSONB,
    "whatMonitoring" TEXT NOT NULL,
    "whyMonitoring" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "history" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementMonitoringProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EngagementMonitoringProfile_engagementId_key" ON "EngagementMonitoringProfile"("engagementId");
CREATE INDEX "EngagementMonitoringProfile_organizationId_vendorId_idx" ON "EngagementMonitoringProfile"("organizationId", "vendorId");
CREATE INDEX "EngagementMonitoringProfile_organizationId_status_idx" ON "EngagementMonitoringProfile"("organizationId", "status");

CREATE TABLE "EngagementMonitoringSignal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "originatingEngagementId" TEXT,
    "publicId" TEXT NOT NULL,
    "sourceType" "MonitoringSourceType" NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "sourceRecordRef" TEXT,
    "signalType" TEXT NOT NULL,
    "domain" "MonitoringDomain" NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceMetadata" JSONB NOT NULL,
    "sourceSeverity" TEXT,
    "attentionPriority" "MonitoringPriority" NOT NULL,
    "normalizationExplanation" TEXT NOT NULL,
    "confidence" TEXT,
    "status" "MonitoringSignalStatus" NOT NULL DEFAULT 'NEW',
    "dedupKey" TEXT NOT NULL,
    "reviewOwnerUserId" TEXT,
    "triageOutcome" "MonitoringTriageOutcome",
    "materiality" TEXT,
    "materialityRationale" TEXT,
    "relatedEvidenceRef" TEXT,
    "relatedFindingId" TEXT,
    "relatedRecommendationId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementMonitoringSignal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EngagementMonitoringSignal_organizationId_publicId_key" ON "EngagementMonitoringSignal"("organizationId", "publicId");
CREATE UNIQUE INDEX "EngagementMonitoringSignal_organizationId_dedupKey_key" ON "EngagementMonitoringSignal"("organizationId", "dedupKey");
CREATE INDEX "EngagementMonitoringSignal_organizationId_vendorId_status_idx" ON "EngagementMonitoringSignal"("organizationId", "vendorId", "status");
CREATE INDEX "EngagementMonitoringSignal_organizationId_attentionPriority_status_idx" ON "EngagementMonitoringSignal"("organizationId", "attentionPriority", "status");
CREATE INDEX "EngagementMonitoringSignal_organizationId_originatingEngagementId_idx" ON "EngagementMonitoringSignal"("organizationId", "originatingEngagementId");

CREATE TABLE "MonitoringSignalEngagementImpact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "decision" "MonitoringImpactDecision" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "rationale" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoringSignalEngagementImpact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonitoringSignalEngagementImpact_signalId_engagementId_key" ON "MonitoringSignalEngagementImpact"("signalId", "engagementId");
CREATE INDEX "MonitoringSignalEngagementImpact_organizationId_engagementId_idx" ON "MonitoringSignalEngagementImpact"("organizationId", "engagementId");

CREATE TABLE "MonitoringReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" "MonitoringTriageOutcome" NOT NULL,
    "rationale" TEXT NOT NULL,
    "engagementId" TEXT,
    "materiality" TEXT,
    "nextAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoringReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MonitoringReview_organizationId_signalId_reviewedAt_idx" ON "MonitoringReview"("organizationId", "signalId", "reviewedAt");

CREATE TABLE "MonitoringEscalation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "engagementId" TEXT,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" "MonitoringPriority" NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "MonitoringEscalationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoringEscalation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MonitoringEscalation_organizationId_signalId_createdAt_idx" ON "MonitoringEscalation"("organizationId", "signalId", "createdAt");

CREATE TABLE "ReassessmentRecommendation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "signalId" TEXT,
    "reason" TEXT NOT NULL,
    "recommendedScope" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "triggerType" "ReassessmentTriggerType" NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "status" "ReassessmentRecommendationStatus" NOT NULL DEFAULT 'RECOMMENDED',
    "wave7Started" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReassessmentRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReassessmentRecommendation_organizationId_engagementId_createdAt_idx" ON "ReassessmentRecommendation"("organizationId", "engagementId", "createdAt");

ALTER TABLE "EvidenceLink" ADD COLUMN "monitoringSignalId" TEXT;
CREATE INDEX "EvidenceLink_monitoringSignalId_idx" ON "EvidenceLink"("monitoringSignalId");

ALTER TABLE "EngagementMonitoringProfile" ADD CONSTRAINT "EngagementMonitoringProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementMonitoringProfile" ADD CONSTRAINT "EngagementMonitoringProfile_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementMonitoringProfile" ADD CONSTRAINT "EngagementMonitoringProfile_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EngagementMonitoringSignal" ADD CONSTRAINT "EngagementMonitoringSignal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementMonitoringSignal" ADD CONSTRAINT "EngagementMonitoringSignal_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonitoringSignalEngagementImpact" ADD CONSTRAINT "MonitoringSignalEngagementImpact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonitoringSignalEngagementImpact" ADD CONSTRAINT "MonitoringSignalEngagementImpact_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "EngagementMonitoringSignal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonitoringSignalEngagementImpact" ADD CONSTRAINT "MonitoringSignalEngagementImpact_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonitoringReview" ADD CONSTRAINT "MonitoringReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonitoringReview" ADD CONSTRAINT "MonitoringReview_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "EngagementMonitoringSignal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonitoringEscalation" ADD CONSTRAINT "MonitoringEscalation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonitoringEscalation" ADD CONSTRAINT "MonitoringEscalation_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "EngagementMonitoringSignal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReassessmentRecommendation" ADD CONSTRAINT "ReassessmentRecommendation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReassessmentRecommendation" ADD CONSTRAINT "ReassessmentRecommendation_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReassessmentRecommendation" ADD CONSTRAINT "ReassessmentRecommendation_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "EngagementMonitoringSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_monitoringSignalId_fkey" FOREIGN KEY ("monitoringSignalId") REFERENCES "EngagementMonitoringSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
