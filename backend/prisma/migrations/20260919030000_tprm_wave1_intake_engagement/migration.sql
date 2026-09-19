-- #12 Wave 1: first-class IntakeRequest, assignment history, Engagement.
-- Additive. Does not rename Vendor. Does not move Insurance.

ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'INTAKE';
ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'ENGAGEMENT';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE IF NOT EXISTS 'HAS_ENGAGEMENT';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE IF NOT EXISTS 'ORIGINATED';

CREATE TYPE "IntakeSourceChannel" AS ENUM ('SUPREME_FORM', 'EMAIL', 'SERVICENOW', 'JIRA', 'PROCUREMENT', 'PUBLIC_API', 'OTHER');
CREATE TYPE "IntakeStatus" AS ENUM ('SUBMITTED', 'UNASSIGNED', 'ASSIGNED', 'IN_REVIEW', 'NEEDS_INFORMATION', 'READY_FOR_MATCH', 'VENDOR_MATCHED', 'ENGAGEMENT_CREATED', 'CANCELLED', 'REJECTED', 'DUPLICATE');
CREATE TYPE "IntakePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "EngagementStatus" AS ENUM ('DRAFT', 'INTAKE_COMPLETE', 'READY_FOR_IRA');

CREATE TABLE "IntakeRequest" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requesterUserId" TEXT,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterBusinessUnit" TEXT,
    "businessOwnerUserId" TEXT,
    "businessOwnerName" TEXT,
    "businessOwnerEmail" TEXT,
    "proposedThirdPartyName" TEXT NOT NULL,
    "proposedServiceName" TEXT NOT NULL,
    "businessPurpose" TEXT NOT NULL,
    "vendorWebsite" TEXT,
    "vendorContactName" TEXT,
    "vendorContactEmail" TEXT,
    "targetStartDate" TIMESTAMP(3),
    "estimatedSpend" DECIMAL(15,2),
    "procurementReference" TEXT,
    "sourceChannel" "IntakeSourceChannel" NOT NULL DEFAULT 'SUPREME_FORM',
    "priority" "IntakePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "IntakeStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "assignedAnalystUserId" TEXT,
    "assignmentDueAt" TIMESTAMP(3),
    "matchedVendorId" TEXT,
    "createdEngagementId" TEXT,
    "routingFacts" JSONB,
    "matchCandidates" JSONB,
    "matchReason" TEXT,
    "matchConfirmedBy" TEXT,
    "matchConfirmedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "triageStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntakeAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "intakeRequestId" TEXT NOT NULL,
    "fromAnalystUserId" TEXT,
    "toAnalystUserId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "priority" "IntakePriority" NOT NULL,
    "dueAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntakeInformationRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "intakeRequestId" TEXT NOT NULL,
    "fields" TEXT[],
    "requestNote" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedBy" TEXT,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeInformationRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Engagement" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "originatingIntakeRequestId" TEXT,
    "serviceName" TEXT NOT NULL,
    "businessPurpose" TEXT NOT NULL,
    "requesterUserId" TEXT,
    "requesterName" TEXT,
    "requesterEmail" TEXT,
    "businessOwnerUserId" TEXT,
    "businessOwnerName" TEXT,
    "businessOwnerEmail" TEXT,
    "assignedAnalystUserId" TEXT,
    "relationshipOwnerUserId" TEXT,
    "businessUnit" TEXT,
    "targetStartDate" TIMESTAMP(3),
    "procurementReference" TEXT,
    "status" "EngagementStatus" NOT NULL DEFAULT 'READY_FOR_IRA',
    "legacyReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Engagement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntakeRequest_organizationId_publicId_key" ON "IntakeRequest"("organizationId", "publicId");
CREATE UNIQUE INDEX "IntakeRequest_createdEngagementId_key" ON "IntakeRequest"("createdEngagementId");
CREATE INDEX "IntakeRequest_organizationId_status_idx" ON "IntakeRequest"("organizationId", "status");
CREATE INDEX "IntakeRequest_organizationId_assignedAnalystUserId_idx" ON "IntakeRequest"("organizationId", "assignedAnalystUserId");
CREATE INDEX "IntakeRequest_organizationId_submittedAt_idx" ON "IntakeRequest"("organizationId", "submittedAt");
CREATE INDEX "IntakeRequest_matchedVendorId_idx" ON "IntakeRequest"("matchedVendorId");
CREATE INDEX "IntakeRequest_createdEngagementId_idx" ON "IntakeRequest"("createdEngagementId");

CREATE INDEX "IntakeAssignment_organizationId_intakeRequestId_idx" ON "IntakeAssignment"("organizationId", "intakeRequestId");
CREATE INDEX "IntakeAssignment_toAnalystUserId_idx" ON "IntakeAssignment"("toAnalystUserId");

CREATE UNIQUE INDEX "IntakeInformationRequest_tokenHash_key" ON "IntakeInformationRequest"("tokenHash");
CREATE INDEX "IntakeInformationRequest_organizationId_intakeRequestId_idx" ON "IntakeInformationRequest"("organizationId", "intakeRequestId");

CREATE UNIQUE INDEX "Engagement_organizationId_publicId_key" ON "Engagement"("organizationId", "publicId");
CREATE INDEX "Engagement_organizationId_vendorId_idx" ON "Engagement"("organizationId", "vendorId");
CREATE INDEX "Engagement_organizationId_status_idx" ON "Engagement"("organizationId", "status");
CREATE INDEX "Engagement_originatingIntakeRequestId_idx" ON "Engagement"("originatingIntakeRequestId");

ALTER TABLE "IntakeRequest" ADD CONSTRAINT "IntakeRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeRequest" ADD CONSTRAINT "IntakeRequest_matchedVendorId_fkey" FOREIGN KEY ("matchedVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IntakeAssignment" ADD CONSTRAINT "IntakeAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeAssignment" ADD CONSTRAINT "IntakeAssignment_intakeRequestId_fkey" FOREIGN KEY ("intakeRequestId") REFERENCES "IntakeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntakeInformationRequest" ADD CONSTRAINT "IntakeInformationRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeInformationRequest" ADD CONSTRAINT "IntakeInformationRequest_intakeRequestId_fkey" FOREIGN KEY ("intakeRequestId") REFERENCES "IntakeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_originatingIntakeRequestId_fkey" FOREIGN KEY ("originatingIntakeRequestId") REFERENCES "IntakeRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IntakeRequest" ADD CONSTRAINT "IntakeRequest_createdEngagementId_fkey" FOREIGN KEY ("createdEngagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorOnboarding" ADD COLUMN "engagementId" TEXT;
CREATE INDEX "VendorOnboarding_engagementId_idx" ON "VendorOnboarding"("engagementId");
ALTER TABLE "VendorOnboarding" ADD CONSTRAINT "VendorOnboarding_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One legacy Engagement per existing VendorOnboarding when a service or name exists.
-- Ambiguous / empty service descriptions are flagged for review. No destructive rewrite.
INSERT INTO "Engagement" (
    "id",
    "publicId",
    "organizationId",
    "vendorId",
    "originatingIntakeRequestId",
    "serviceName",
    "businessPurpose",
    "requesterUserId",
    "requesterName",
    "requesterEmail",
    "businessOwnerUserId",
    "businessOwnerName",
    "businessOwnerEmail",
    "assignedAnalystUserId",
    "relationshipOwnerUserId",
    "businessUnit",
    "targetStartDate",
    "procurementReference",
    "status",
    "legacyReviewRequired",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    'ENG-' || EXTRACT(YEAR FROM CURRENT_DATE)::int || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY v."organizationId" ORDER BY v."createdAt", v.id))::text, 4, '0'),
    v."organizationId",
    v.id,
    NULL,
    CASE
        WHEN v."servicesProvided" IS NOT NULL AND LENGTH(TRIM(v."servicesProvided")) > 0 THEN LEFT(TRIM(v."servicesProvided"), 240)
        ELSE v.name
    END,
    CASE
        WHEN v."servicesProvided" IS NOT NULL AND LENGTH(TRIM(v."servicesProvided")) > 0 THEN v."servicesProvided"
        ELSE 'Legacy engagement backfilled from the pre-Wave-1 Vendor record. Review required.'
    END,
    v."requesterUserId",
    NULL,
    NULL,
    v."businessOwnerUserId",
    v."businessOwner",
    NULL,
    NULL,
    v."relationshipOwnerUserId",
    v."businessUnit",
    v."targetStartDate",
    NULL,
    'INTAKE_COMPLETE',
    CASE
        WHEN v."servicesProvided" IS NULL OR LENGTH(TRIM(v."servicesProvided")) = 0 THEN true
        ELSE false
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "VendorOnboarding" vo
JOIN "Vendor" v ON v.id = vo."vendorId"
WHERE v.name IS NOT NULL AND LENGTH(TRIM(v.name)) > 0;

UPDATE "VendorOnboarding" vo
SET "engagementId" = e.id
FROM "Engagement" e
WHERE e."vendorId" = vo."vendorId"
  AND vo."engagementId" IS NULL
  AND e."originatingIntakeRequestId" IS NULL;
