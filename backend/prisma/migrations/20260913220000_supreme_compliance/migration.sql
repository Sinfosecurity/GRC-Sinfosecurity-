-- AlterEnum
ALTER TYPE "GovernanceNodeType" ADD VALUE 'EXCEPTION';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'COMPLIANCE_GAP';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'ATTESTATION';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'COMPLIANCE_PERIOD';

-- AlterEnum
ALTER TYPE "GovernanceRelationshipType" ADD VALUE 'COVERS';

-- AlterTable
ALTER TABLE "FrameworkRequirement" ADD COLUMN "lifecycle" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "FrameworkRequirement" ADD COLUMN "supersededRequirementKey" TEXT;

-- CreateEnum
CREATE TYPE "ComplianceActivationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED');
CREATE TYPE "ComplianceApplicability" AS ENUM ('APPLICABLE', 'NOT_APPLICABLE', 'UNDER_REVIEW', 'NOT_DETERMINED');
CREATE TYPE "ComplianceAttestationStatus" AS ENUM ('IMPLEMENTED', 'PARTIALLY_IMPLEMENTED', 'NOT_IMPLEMENTED', 'NOT_APPLICABLE');
CREATE TYPE "ComplianceCampaignStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'OVERDUE', 'CLOSED');
CREATE TYPE "ComplianceAttestationReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'REJECTED');
CREATE TYPE "ComplianceGapSource" AS ENUM ('UNMAPPED', 'NOT_IMPLEMENTED', 'INEFFECTIVE', 'EVIDENCE_MISSING', 'EVIDENCE_EXPIRED', 'FAILED_TEST', 'OPEN_FINDING', 'UNRESOLVED_EXCEPTION');
CREATE TYPE "ComplianceGapStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'LINKED_FINDING', 'CLOSED');
CREATE TYPE "ComplianceExceptionType" AS ENUM ('POLICY', 'CONTROL', 'EVIDENCE', 'INTERPRETATION');
CREATE TYPE "ComplianceExceptionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CLOSED');
CREATE TYPE "CompliancePeriodStatus" AS ENUM ('PREPARING', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');
CREATE TYPE "CompliancePeriodItemType" AS ENUM ('REQUIREMENT', 'CONTROL', 'EVIDENCE_REQUEST');
CREATE TYPE "CompliancePeriodItemStatus" AS ENUM ('REQUESTED', 'RECEIVED', 'REVIEWED');

-- CreateTable
CREATE TABLE "ComplianceActivation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "frameworkVersionId" TEXT NOT NULL,
    "businessUnitId" TEXT,
    "ownerUserId" TEXT,
    "scope" TEXT,
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "status" "ComplianceActivationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "ComplianceActivation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceRequirementState" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "applicability" "ComplianceApplicability" NOT NULL DEFAULT 'NOT_DETERMINED',
    "naRationale" TEXT,
    "naActorUserId" TEXT,
    "naAt" TIMESTAMP(3),
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRequirementState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceAttestationCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "activationId" TEXT,
    "name" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "status" "ComplianceCampaignStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceAttestationCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceCampaignAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "organizationControlId" TEXT,
    "attestorUserId" TEXT NOT NULL,
    "reviewerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceCampaignAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceAttestation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "campaignId" TEXT,
    "organizationControlId" TEXT NOT NULL,
    "requirementStateId" TEXT,
    "status" "ComplianceAttestationStatus" NOT NULL,
    "statement" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "attestorUserId" TEXT NOT NULL,
    "attestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewerUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewStatus" "ComplianceAttestationReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceAttestation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceGap" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "activationId" TEXT,
    "requirementStateId" TEXT,
    "organizationControlId" TEXT,
    "findingId" TEXT,
    "enterpriseRiskId" TEXT,
    "source" "ComplianceGapSource" NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "ComplianceGapStatus" NOT NULL DEFAULT 'OPEN',
    "remediation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceGap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceException" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "activationId" TEXT,
    "type" "ComplianceExceptionType" NOT NULL,
    "scope" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "conditions" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "approverUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "startAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "reviewAt" TIMESTAMP(3),
    "status" "ComplianceExceptionStatus" NOT NULL DEFAULT 'REQUESTED',
    "requirementStateId" TEXT,
    "organizationControlId" TEXT,
    "enterpriseRiskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceException_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompliancePeriod" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "frameworkVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "status" "CompliancePeriodStatus" NOT NULL DEFAULT 'PREPARING',
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompliancePeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompliancePeriodItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "itemType" "CompliancePeriodItemType" NOT NULL,
    "requirementStateId" TEXT,
    "organizationControlId" TEXT,
    "storedObjectId" TEXT,
    "status" "CompliancePeriodItemStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "dueAt" TIMESTAMP(3),
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompliancePeriodItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceVersionChange" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "fromVersionId" TEXT NOT NULL,
    "toVersionId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceVersionChange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "change" TEXT,
    "actorUserId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceCounter" (
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ComplianceCounter_pkey" PRIMARY KEY ("organizationId","kind")
);

CREATE UNIQUE INDEX "ComplianceActivation_organizationId_publicId_key" ON "ComplianceActivation"("organizationId", "publicId");
CREATE INDEX "ComplianceActivation_organizationId_status_idx" ON "ComplianceActivation"("organizationId", "status");
CREATE INDEX "ComplianceActivation_organizationId_frameworkVersionId_idx" ON "ComplianceActivation"("organizationId", "frameworkVersionId");

CREATE UNIQUE INDEX "ComplianceRequirementState_organizationId_publicId_key" ON "ComplianceRequirementState"("organizationId", "publicId");
CREATE UNIQUE INDEX "ComplianceRequirementState_activationId_requirementId_key" ON "ComplianceRequirementState"("activationId", "requirementId");
CREATE INDEX "ComplianceRequirementState_organizationId_applicability_idx" ON "ComplianceRequirementState"("organizationId", "applicability");
CREATE INDEX "ComplianceRequirementState_organizationId_ownerUserId_idx" ON "ComplianceRequirementState"("organizationId", "ownerUserId");

CREATE UNIQUE INDEX "ComplianceAttestationCampaign_organizationId_publicId_key" ON "ComplianceAttestationCampaign"("organizationId", "publicId");
CREATE INDEX "ComplianceAttestationCampaign_organizationId_status_idx" ON "ComplianceAttestationCampaign"("organizationId", "status");

CREATE INDEX "ComplianceCampaignAssignment_campaignId_idx" ON "ComplianceCampaignAssignment"("campaignId");
CREATE INDEX "ComplianceCampaignAssignment_organizationId_idx" ON "ComplianceCampaignAssignment"("organizationId");

CREATE UNIQUE INDEX "ComplianceAttestation_organizationId_publicId_key" ON "ComplianceAttestation"("organizationId", "publicId");
CREATE INDEX "ComplianceAttestation_organizationId_organizationControlId_idx" ON "ComplianceAttestation"("organizationId", "organizationControlId");
CREATE INDEX "ComplianceAttestation_organizationId_campaignId_idx" ON "ComplianceAttestation"("organizationId", "campaignId");

CREATE UNIQUE INDEX "ComplianceGap_organizationId_publicId_key" ON "ComplianceGap"("organizationId", "publicId");
CREATE INDEX "ComplianceGap_organizationId_status_idx" ON "ComplianceGap"("organizationId", "status");
CREATE INDEX "ComplianceGap_organizationId_source_idx" ON "ComplianceGap"("organizationId", "source");

CREATE UNIQUE INDEX "ComplianceException_organizationId_publicId_key" ON "ComplianceException"("organizationId", "publicId");
CREATE INDEX "ComplianceException_organizationId_status_idx" ON "ComplianceException"("organizationId", "status");
CREATE INDEX "ComplianceException_organizationId_expiresAt_idx" ON "ComplianceException"("organizationId", "expiresAt");

CREATE UNIQUE INDEX "CompliancePeriod_organizationId_publicId_key" ON "CompliancePeriod"("organizationId", "publicId");
CREATE INDEX "CompliancePeriod_organizationId_status_idx" ON "CompliancePeriod"("organizationId", "status");

CREATE INDEX "CompliancePeriodItem_periodId_idx" ON "CompliancePeriodItem"("periodId");
CREATE INDEX "CompliancePeriodItem_organizationId_idx" ON "CompliancePeriodItem"("organizationId");

CREATE INDEX "ComplianceVersionChange_activationId_idx" ON "ComplianceVersionChange"("activationId");
CREATE INDEX "ComplianceVersionChange_organizationId_idx" ON "ComplianceVersionChange"("organizationId");

CREATE INDEX "ComplianceHistory_organizationId_entityType_entityId_createdAt_idx" ON "ComplianceHistory"("organizationId", "entityType", "entityId", "createdAt");
CREATE INDEX "ComplianceHistory_organizationId_createdAt_idx" ON "ComplianceHistory"("organizationId", "createdAt");

ALTER TABLE "ComplianceActivation" ADD CONSTRAINT "ComplianceActivation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceActivation" ADD CONSTRAINT "ComplianceActivation_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplianceActivation" ADD CONSTRAINT "ComplianceActivation_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceRequirementState" ADD CONSTRAINT "ComplianceRequirementState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirementState" ADD CONSTRAINT "ComplianceRequirementState_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "ComplianceActivation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirementState" ADD CONSTRAINT "ComplianceRequirementState_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "FrameworkRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceAttestationCampaign" ADD CONSTRAINT "ComplianceAttestationCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceAttestationCampaign" ADD CONSTRAINT "ComplianceAttestationCampaign_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "ComplianceActivation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceCampaignAssignment" ADD CONSTRAINT "ComplianceCampaignAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ComplianceAttestationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceAttestation" ADD CONSTRAINT "ComplianceAttestation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceAttestation" ADD CONSTRAINT "ComplianceAttestation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ComplianceAttestationCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceAttestation" ADD CONSTRAINT "ComplianceAttestation_organizationControlId_fkey" FOREIGN KEY ("organizationControlId") REFERENCES "OrganizationControl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplianceAttestation" ADD CONSTRAINT "ComplianceAttestation_requirementStateId_fkey" FOREIGN KEY ("requirementStateId") REFERENCES "ComplianceRequirementState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceGap" ADD CONSTRAINT "ComplianceGap_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceGap" ADD CONSTRAINT "ComplianceGap_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "ComplianceActivation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceGap" ADD CONSTRAINT "ComplianceGap_requirementStateId_fkey" FOREIGN KEY ("requirementStateId") REFERENCES "ComplianceRequirementState"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceGap" ADD CONSTRAINT "ComplianceGap_organizationControlId_fkey" FOREIGN KEY ("organizationControlId") REFERENCES "OrganizationControl"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceGap" ADD CONSTRAINT "ComplianceGap_enterpriseRiskId_fkey" FOREIGN KEY ("enterpriseRiskId") REFERENCES "EnterpriseRisk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceException" ADD CONSTRAINT "ComplianceException_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceException" ADD CONSTRAINT "ComplianceException_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "ComplianceActivation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceException" ADD CONSTRAINT "ComplianceException_requirementStateId_fkey" FOREIGN KEY ("requirementStateId") REFERENCES "ComplianceRequirementState"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceException" ADD CONSTRAINT "ComplianceException_organizationControlId_fkey" FOREIGN KEY ("organizationControlId") REFERENCES "OrganizationControl"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceException" ADD CONSTRAINT "ComplianceException_enterpriseRiskId_fkey" FOREIGN KEY ("enterpriseRiskId") REFERENCES "EnterpriseRisk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompliancePeriod" ADD CONSTRAINT "CompliancePeriod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompliancePeriod" ADD CONSTRAINT "CompliancePeriod_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "ComplianceActivation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompliancePeriod" ADD CONSTRAINT "CompliancePeriod_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompliancePeriodItem" ADD CONSTRAINT "CompliancePeriodItem_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CompliancePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompliancePeriodItem" ADD CONSTRAINT "CompliancePeriodItem_requirementStateId_fkey" FOREIGN KEY ("requirementStateId") REFERENCES "ComplianceRequirementState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceVersionChange" ADD CONSTRAINT "ComplianceVersionChange_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "ComplianceActivation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceHistory" ADD CONSTRAINT "ComplianceHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
