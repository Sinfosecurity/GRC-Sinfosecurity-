-- Shared Control & Evidence Layer. Additive only.

ALTER TYPE "GovernanceNodeType" ADD VALUE 'CONTROL_TEST';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE 'SATISFIED_BY';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE 'TESTED_BY';

CREATE TYPE "ControlImplementationStatus" AS ENUM ('NOT_IMPLEMENTED', 'PLANNED', 'IMPLEMENTED');
CREATE TYPE "ControlEffectivenessStatus" AS ENUM ('NOT_TESTED', 'EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE');
CREATE TYPE "ControlLifecycleStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "CommonControlDomain" AS ENUM (
  'GOVERNANCE', 'RISK_MANAGEMENT', 'ASSET_MANAGEMENT', 'IDENTITY_ACCESS', 'AUTHENTICATION',
  'PRIVILEGED_ACCESS', 'DATA_PROTECTION', 'ENCRYPTION', 'KEY_MANAGEMENT', 'LOGGING_MONITORING',
  'VULNERABILITY_MANAGEMENT', 'SECURE_CONFIGURATION', 'CHANGE_MANAGEMENT', 'SECURE_DEVELOPMENT',
  'INCIDENT_RESPONSE', 'BUSINESS_CONTINUITY', 'DISASTER_RECOVERY', 'THIRD_PARTY_RISK', 'PRIVACY',
  'PHYSICAL_SECURITY', 'NETWORK_SECURITY', 'CLOUD_SECURITY', 'BACKUP', 'SECURITY_AWARENESS',
  'PERSONNEL_SECURITY'
);
CREATE TYPE "CommonControlType" AS ENUM ('PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'DIRECTIVE', 'COMPENSATING');
CREATE TYPE "MappingStrength" AS ENUM ('PRIMARY', 'CONTRIBUTING', 'PARTIAL', 'RELATED');
CREATE TYPE "MappingReviewStatus" AS ENUM ('DRAFT', 'REVIEWED', 'APPROVED', 'SUPERSEDED');
CREATE TYPE "EvidenceLinkRelation" AS ENUM ('SUPPORTS', 'PARTIALLY_SUPPORTS', 'CONTRADICTS', 'SUPERSEDES', 'REPLACES', 'RELATED_TO');
CREATE TYPE "EvidenceFreshness" AS ENUM ('CURRENT', 'EXPIRING', 'EXPIRED', 'SUPERSEDED', 'REVOKED', 'UNDER_REVIEW');
CREATE TYPE "EvidenceReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'REJECTED');
CREATE TYPE "SharedControlTestResult" AS ENUM ('PASS', 'FAIL', 'PARTIAL', 'NOT_TESTED', 'NOT_APPLICABLE');
CREATE TYPE "SharedControlTestMethod" AS ENUM ('INQUIRY', 'OBSERVATION', 'INSPECTION', 'REPERFORMANCE', 'AUTOMATED');
CREATE TYPE "EvidenceGovernanceTarget" AS ENUM ('CONTROL', 'REQUIREMENT', 'VENDOR', 'ASSESSMENT', 'FINDING', 'RISK', 'FRAMEWORK', 'CONTROL_TEST');

CREATE TABLE "ControlCatalogEntry" (
  "id" TEXT NOT NULL,
  "controlKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "domain" "CommonControlDomain" NOT NULL,
  "category" TEXT NOT NULL,
  "controlType" "CommonControlType" NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "ControlCatalogEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ControlCatalogEntry_controlKey_key" ON "ControlCatalogEntry"("controlKey");
CREATE INDEX "ControlCatalogEntry_domain_idx" ON "ControlCatalogEntry"("domain");

CREATE TABLE "OrganizationControl" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "catalogEntryId" TEXT,
  "controlKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "domain" "CommonControlDomain" NOT NULL,
  "category" TEXT NOT NULL,
  "controlType" "CommonControlType" NOT NULL,
  "implementationStatus" "ControlImplementationStatus" NOT NULL DEFAULT 'NOT_IMPLEMENTED',
  "effectivenessStatus" "ControlEffectivenessStatus" NOT NULL DEFAULT 'NOT_TESTED',
  "ownerUserId" TEXT,
  "reviewerUserId" TEXT,
  "frequency" TEXT,
  "lastTestedAt" TIMESTAMP(3),
  "nextTestAt" TIMESTAMP(3),
  "status" "ControlLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "supersededById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "OrganizationControl_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationControl_organizationId_controlKey_key" ON "OrganizationControl"("organizationId", "controlKey");
CREATE INDEX "OrganizationControl_organizationId_domain_idx" ON "OrganizationControl"("organizationId", "domain");
CREATE INDEX "OrganizationControl_organizationId_implementationStatus_idx" ON "OrganizationControl"("organizationId", "implementationStatus");
CREATE INDEX "OrganizationControl_organizationId_effectivenessStatus_idx" ON "OrganizationControl"("organizationId", "effectivenessStatus");
CREATE INDEX "OrganizationControl_organizationId_archivedAt_idx" ON "OrganizationControl"("organizationId", "archivedAt");

CREATE TABLE "FrameworkDefinition" (
  "id" TEXT NOT NULL,
  "frameworkKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "publisher" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FrameworkDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FrameworkDefinition_frameworkKey_key" ON "FrameworkDefinition"("frameworkKey");

CREATE TABLE "FrameworkVersion" (
  "id" TEXT NOT NULL,
  "frameworkId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" TIMESTAMP(3),
  "sourceUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FrameworkVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FrameworkVersion_frameworkId_version_key" ON "FrameworkVersion"("frameworkId", "version");

CREATE TABLE "FrameworkRequirement" (
  "id" TEXT NOT NULL,
  "frameworkVersionId" TEXT NOT NULL,
  "requirementKey" TEXT NOT NULL,
  "supremeSummary" TEXT NOT NULL,
  "sourceUrl" TEXT,
  CONSTRAINT "FrameworkRequirement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FrameworkRequirement_frameworkVersionId_requirementKey_key" ON "FrameworkRequirement"("frameworkVersionId", "requirementKey");

CREATE TABLE "RequirementControlMapping" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "requirementId" TEXT NOT NULL,
  "catalogEntryId" TEXT,
  "organizationControlId" TEXT,
  "mappingStrength" "MappingStrength" NOT NULL DEFAULT 'PRIMARY',
  "provenance" "GovernanceProvenance" NOT NULL DEFAULT 'SYSTEM',
  "authority" "GovernanceAuthority" NOT NULL DEFAULT 'AUTHORITATIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "reviewStatus" "MappingReviewStatus" NOT NULL DEFAULT 'APPROVED',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RequirementControlMapping_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RequirementControlMapping_organizationId_idx" ON "RequirementControlMapping"("organizationId");
CREATE INDEX "RequirementControlMapping_requirementId_idx" ON "RequirementControlMapping"("requirementId");
CREATE INDEX "RequirementControlMapping_catalogEntryId_idx" ON "RequirementControlMapping"("catalogEntryId");
CREATE INDEX "RequirementControlMapping_organizationControlId_idx" ON "RequirementControlMapping"("organizationControlId");

CREATE TABLE "EvidenceGovernanceLink" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "storedObjectId" TEXT NOT NULL,
  "targetType" "EvidenceGovernanceTarget" NOT NULL,
  "targetId" TEXT NOT NULL,
  "relationship" "EvidenceLinkRelation" NOT NULL,
  "rationale" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewStatus" "EvidenceReviewStatus" NOT NULL DEFAULT 'SUBMITTED',
  "provenance" "GovernanceProvenance" NOT NULL DEFAULT 'USER',
  "authority" "GovernanceAuthority" NOT NULL DEFAULT 'AUTHORITATIVE',
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validTo" TIMESTAMP(3),
  "freshness" "EvidenceFreshness" NOT NULL DEFAULT 'CURRENT',
  "issuedAt" TIMESTAMP(3),
  "effectiveFrom" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "reviewDueAt" TIMESTAMP(3),
  CONSTRAINT "EvidenceGovernanceLink_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EvidenceGovernanceLink_organizationId_storedObjectId_idx" ON "EvidenceGovernanceLink"("organizationId", "storedObjectId");
CREATE INDEX "EvidenceGovernanceLink_organizationId_targetType_targetId_idx" ON "EvidenceGovernanceLink"("organizationId", "targetType", "targetId");
CREATE INDEX "EvidenceGovernanceLink_organizationId_freshness_idx" ON "EvidenceGovernanceLink"("organizationId", "freshness");

CREATE TABLE "OrganizationControlTest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "controlId" TEXT NOT NULL,
  "method" "SharedControlTestMethod" NOT NULL,
  "procedure" TEXT,
  "testerUserId" TEXT NOT NULL,
  "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "result" "SharedControlTestResult" NOT NULL,
  "notes" TEXT,
  "nextTestAt" TIMESTAMP(3),
  "findingId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationControlTest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrganizationControlTest_organizationId_controlId_idx" ON "OrganizationControlTest"("organizationId", "controlId");
CREATE INDEX "OrganizationControlTest_organizationId_result_idx" ON "OrganizationControlTest"("organizationId", "result");

ALTER TABLE "OrganizationControl" ADD CONSTRAINT "OrganizationControl_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationControl" ADD CONSTRAINT "OrganizationControl_catalogEntryId_fkey" FOREIGN KEY ("catalogEntryId") REFERENCES "ControlCatalogEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FrameworkVersion" ADD CONSTRAINT "FrameworkVersion_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FrameworkRequirement" ADD CONSTRAINT "FrameworkRequirement_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementControlMapping" ADD CONSTRAINT "RequirementControlMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementControlMapping" ADD CONSTRAINT "RequirementControlMapping_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "FrameworkRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementControlMapping" ADD CONSTRAINT "RequirementControlMapping_catalogEntryId_fkey" FOREIGN KEY ("catalogEntryId") REFERENCES "ControlCatalogEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RequirementControlMapping" ADD CONSTRAINT "RequirementControlMapping_organizationControlId_fkey" FOREIGN KEY ("organizationControlId") REFERENCES "OrganizationControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceGovernanceLink" ADD CONSTRAINT "EvidenceGovernanceLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceGovernanceLink" ADD CONSTRAINT "EvidenceGovernanceLink_storedObjectId_fkey" FOREIGN KEY ("storedObjectId") REFERENCES "StoredObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationControlTest" ADD CONSTRAINT "OrganizationControlTest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationControlTest" ADD CONSTRAINT "OrganizationControlTest_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "OrganizationControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;
