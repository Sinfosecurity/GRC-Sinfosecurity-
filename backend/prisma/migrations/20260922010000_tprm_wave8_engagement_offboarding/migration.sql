-- Wave 8: Engagement termination and offboarding. Additive. Historical residual and vendor-level offboarding are not rewritten.

ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'OFFBOARDING';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'OFFBOARDED';
ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'OFFBOARDING';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE IF NOT EXISTS 'HAS_OFFBOARDING';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE IF NOT EXISTS 'HAS_OBLIGATION';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE IF NOT EXISTS 'PRODUCED';

CREATE TYPE "EngagementOffboardingStatus" AS ENUM ('DRAFT', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'READY_FOR_CLOSURE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "OffboardingObligationCategory" AS ENUM ('BUSINESS_TRANSITION', 'ACCESS_REVOCATION', 'INTEGRATION_CLOSURE', 'CREDENTIAL_REVOCATION', 'DATA_RETURN', 'DATA_DELETION', 'DATA_RETENTION', 'SUBPROCESSOR_CLOSURE', 'ASSET_RETURN', 'CONTRACT_NOTICE', 'FINAL_PAYMENT', 'EVIDENCE_COLLECTION', 'LEGAL_RETENTION', 'BUSINESS_CONTINUITY', 'KNOWLEDGE_TRANSFER');
CREATE TYPE "OffboardingObligationStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');
CREATE TYPE "OffboardingAudience" AS ENUM ('INTERNAL', 'REQUESTER', 'VENDOR');
CREATE TYPE "DataDispositionType" AS ENUM ('RETURN_REQUIRED', 'DELETION_REQUIRED', 'RETENTION_REQUIRED', 'NOT_APPLICABLE');
CREATE TYPE "OffboardingExceptionStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE "ReassessmentConflictDisposition" AS ENUM ('COMPLETE_REASSESSMENT', 'CANCEL_REASSESSMENT', 'SUPERSEDE_FOR_TERMINATION');

CREATE TABLE "EngagementOffboardingCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "status" "EngagementOffboardingStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "sourceRecommendationId" TEXT,
    "decisionOwnerUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "effectiveTerminationDate" TIMESTAMP(3),
    "urgency" TEXT NOT NULL DEFAULT 'NORMAL',
    "businessOwnerUserId" TEXT,
    "riskOwnerUserId" TEXT,
    "contractOwnerUserId" TEXT,
    "notes" TEXT,
    "reassessmentConflictDisposition" "ReassessmentConflictDisposition",
    "reassessmentConflictRationale" TEXT,
    "findingDisposition" TEXT NOT NULL DEFAULT 'RETAINED_FOR_RECORD',
    "startedByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelRationale" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "history" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementOffboardingCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementOffboardingObligation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "category" "OffboardingObligationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "applicable" BOOLEAN NOT NULL DEFAULT true,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "audience" "OffboardingAudience" NOT NULL DEFAULT 'INTERNAL',
    "ownerUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "OffboardingObligationStatus" NOT NULL DEFAULT 'PENDING',
    "systemName" TEXT,
    "accessType" TEXT,
    "integrationType" TEXT,
    "dataCategory" TEXT,
    "dataLocation" TEXT,
    "dataDisposition" "DataDispositionType",
    "retentionReason" TEXT,
    "retentionPeriod" TEXT,
    "retentionSource" TEXT,
    "retentionExpiry" TIMESTAMP(3),
    "noticeRequired" BOOLEAN,
    "noticeDueAt" TIMESTAMP(3),
    "noticeSentAt" TIMESTAMP(3),
    "vendorConfirmation" TEXT,
    "internalVerification" TEXT,
    "storedObjectId" TEXT,
    "completedByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "rationale" TEXT,
    "automationHonesty" TEXT NOT NULL DEFAULT 'Manual verification required. No connected integration performed this action.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementOffboardingObligation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementOffboardingException" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "obligationId" TEXT,
    "reason" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "approverUserId" TEXT,
    "expiryAt" TIMESTAMP(3),
    "evidenceNote" TEXT,
    "status" "OffboardingExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementOffboardingException_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementFinalDisposition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "snapshot" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementFinalDisposition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EngagementOffboardingCase_organizationId_publicId_key" ON "EngagementOffboardingCase"("organizationId", "publicId");
CREATE INDEX "EngagementOffboardingCase_organizationId_engagementId_status_idx" ON "EngagementOffboardingCase"("organizationId", "engagementId", "status");
CREATE INDEX "EngagementOffboardingObligation_organizationId_caseId_idx" ON "EngagementOffboardingObligation"("organizationId", "caseId");
CREATE INDEX "EngagementOffboardingException_organizationId_caseId_idx" ON "EngagementOffboardingException"("organizationId", "caseId");
CREATE UNIQUE INDEX "EngagementFinalDisposition_caseId_versionNumber_key" ON "EngagementFinalDisposition"("caseId", "versionNumber");
CREATE INDEX "EngagementFinalDisposition_organizationId_engagementId_idx" ON "EngagementFinalDisposition"("organizationId", "engagementId");

ALTER TABLE "EngagementOffboardingCase" ADD CONSTRAINT "EngagementOffboardingCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementOffboardingCase" ADD CONSTRAINT "EngagementOffboardingCase_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementOffboardingObligation" ADD CONSTRAINT "EngagementOffboardingObligation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementOffboardingObligation" ADD CONSTRAINT "EngagementOffboardingObligation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "EngagementOffboardingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementOffboardingException" ADD CONSTRAINT "EngagementOffboardingException_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementOffboardingException" ADD CONSTRAINT "EngagementOffboardingException_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "EngagementOffboardingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementOffboardingException" ADD CONSTRAINT "EngagementOffboardingException_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "EngagementOffboardingObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EngagementFinalDisposition" ADD CONSTRAINT "EngagementFinalDisposition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementFinalDisposition" ADD CONSTRAINT "EngagementFinalDisposition_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "EngagementOffboardingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
