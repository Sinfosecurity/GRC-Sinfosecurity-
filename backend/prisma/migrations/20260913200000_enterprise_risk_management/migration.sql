-- AlterEnum
ALTER TYPE "GovernanceNodeType" ADD VALUE 'KRI';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'TREATMENT';

-- AlterEnum
ALTER TYPE "GovernanceRelationshipType" ADD VALUE 'ASSOCIATED_WITH';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE 'INCREASES_EXPOSURE_TO';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE 'ADDRESSES';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE 'GOVERNS';

-- CreateEnum
CREATE TYPE "EnterpriseRiskCategory" AS ENUM ('STRATEGIC', 'OPERATIONAL', 'FINANCIAL', 'CYBERSECURITY', 'TECHNOLOGY', 'THIRD_PARTY', 'PRIVACY', 'COMPLIANCE', 'AI', 'BUSINESS_CONTINUITY', 'REPUTATIONAL', 'LEGAL_REGULATORY', 'PEOPLE', 'PHYSICAL_ENVIRONMENTAL');
CREATE TYPE "EnterpriseRiskStatus" AS ENUM ('DRAFT', 'IDENTIFIED', 'ASSESSED', 'TREATING', 'MONITORING', 'ACCEPTED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "EnterpriseRiskTrend" AS ENUM ('IMPROVING', 'STABLE', 'WORSENING', 'UNKNOWN');
CREATE TYPE "EnterpriseAppetiteState" AS ENUM ('WITHIN_APPETITE', 'NEAR_TOLERANCE', 'OUTSIDE_APPETITE', 'NOT_CONFIGURED');
CREATE TYPE "EnterpriseTreatmentStrategy" AS ENUM ('MITIGATE', 'ACCEPT', 'TRANSFER', 'AVOID', 'MONITOR');
CREATE TYPE "EnterpriseTreatmentStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');
CREATE TYPE "EnterpriseDecisionType" AS ENUM ('ACCEPT', 'REJECT', 'ESCALATE', 'APPROVE_TREATMENT');
CREATE TYPE "EnterpriseDecisionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE "EnterpriseImpactDimension" AS ENUM ('FINANCIAL', 'OPERATIONAL', 'REGULATORY', 'CUSTOMER', 'REPUTATIONAL', 'SAFETY', 'PRIVACY', 'CYBERSECURITY');
CREATE TYPE "EnterpriseKriDirection" AS ENUM ('HIGHER_IS_WORSE', 'LOWER_IS_WORSE');
CREATE TYPE "EnterpriseKriStatus" AS ENUM ('WITHIN', 'WARNING', 'CRITICAL', 'NOT_MEASURED');
CREATE TYPE "EnterpriseAppetiteScope" AS ENUM ('ORGANIZATION', 'CATEGORY', 'BUSINESS_UNIT');
CREATE TYPE "EnterpriseRiskRating" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE "BusinessUnit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskCustomCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canonicalParent" "EnterpriseRiskCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseRiskCustomCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskMethodology" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "likelihoodLabels" JSONB NOT NULL,
    "impactLabels" JSONB NOT NULL,
    "matrix" JSONB NOT NULL,
    "dimensionRollup" TEXT NOT NULL DEFAULT 'HIGHEST_DIMENSION',
    "notes" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseRiskMethodology_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRisk" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT,
    "description" TEXT,
    "category" "EnterpriseRiskCategory" NOT NULL,
    "customCategoryId" TEXT,
    "subcategory" TEXT,
    "businessUnitId" TEXT,
    "ownerUserId" TEXT,
    "executiveOwnerUserId" TEXT,
    "source" TEXT,
    "status" "EnterpriseRiskStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "likelihood" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "inherentScore" INTEGER NOT NULL,
    "inherentRating" "EnterpriseRiskRating" NOT NULL,
    "residualScore" INTEGER NOT NULL,
    "residualRating" "EnterpriseRiskRating" NOT NULL,
    "targetLikelihood" INTEGER,
    "targetImpact" INTEGER,
    "targetScore" INTEGER,
    "targetRating" "EnterpriseRiskRating",
    "velocity" TEXT,
    "trend" "EnterpriseRiskTrend" NOT NULL DEFAULT 'UNKNOWN',
    "appetiteStatus" "EnterpriseAppetiteState" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "treatmentStrategy" "EnterpriseTreatmentStrategy",
    "reviewDate" TIMESTAMP(3),
    "methodologyVersion" TEXT NOT NULL,
    "lastCalculatedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EnterpriseRisk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskImpact" (
    "id" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "dimension" "EnterpriseImpactDimension" NOT NULL,
    "rating" INTEGER NOT NULL,
    CONSTRAINT "EnterpriseRiskImpact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskScoreSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "methodologyId" TEXT,
    "methodologyVersion" TEXT NOT NULL,
    "inherentScore" INTEGER NOT NULL,
    "inherentRating" "EnterpriseRiskRating" NOT NULL,
    "residualScore" INTEGER NOT NULL,
    "residualRating" "EnterpriseRiskRating" NOT NULL,
    "controlReduction" INTEGER NOT NULL,
    "inputs" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseRiskScoreSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskAppetite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scope" "EnterpriseAppetiteScope" NOT NULL,
    "category" "EnterpriseRiskCategory",
    "businessUnitId" TEXT,
    "maxResidualRating" "EnterpriseRiskRating" NOT NULL,
    "statement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EnterpriseRiskAppetite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskTreatment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "strategy" "EnterpriseTreatmentStrategy" NOT NULL,
    "ownerUserId" TEXT,
    "status" "EnterpriseTreatmentStatus" NOT NULL DEFAULT 'PLANNED',
    "dueDate" TIMESTAMP(3),
    "priority" TEXT,
    "expectedTargetScore" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EnterpriseRiskTreatment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskTreatmentAction" (
    "id" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "EnterpriseTreatmentStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseRiskTreatmentAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskDecision" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "decision" "EnterpriseDecisionType" NOT NULL,
    "status" "EnterpriseDecisionStatus" NOT NULL DEFAULT 'REQUESTED',
    "decisionMakerUserId" TEXT,
    "authority" TEXT,
    "rationale" TEXT NOT NULL,
    "conditions" TEXT,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "evidenceObjectIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseRiskDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskControlLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseRiskControlLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskFindingLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseRiskFindingLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskRelationship" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseRiskRelationship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskKri" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT,
    "unit" TEXT,
    "direction" "EnterpriseKriDirection" NOT NULL,
    "warningThreshold" DOUBLE PRECISION NOT NULL,
    "criticalThreshold" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION,
    "measuredAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" "EnterpriseKriStatus" NOT NULL DEFAULT 'NOT_MEASURED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EnterpriseRiskKri_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskKriMeasurement" (
    "id" TEXT NOT NULL,
    "kriId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "recordedBy" TEXT,
    CONSTRAINT "EnterpriseRiskKriMeasurement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggersReview" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseRiskEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actorUserId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseRiskHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRiskCounter" (
    "organizationId" TEXT NOT NULL,
    "nextRisk" INTEGER NOT NULL DEFAULT 1,
    "nextKri" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "EnterpriseRiskCounter_pkey" PRIMARY KEY ("organizationId")
);

CREATE UNIQUE INDEX "BusinessUnit_organizationId_name_key" ON "BusinessUnit"("organizationId", "name");
CREATE INDEX "BusinessUnit_organizationId_idx" ON "BusinessUnit"("organizationId");
CREATE UNIQUE INDEX "EnterpriseRiskCustomCategory_organizationId_name_key" ON "EnterpriseRiskCustomCategory"("organizationId", "name");
CREATE UNIQUE INDEX "EnterpriseRiskMethodology_organizationId_version_key" ON "EnterpriseRiskMethodology"("organizationId", "version");
CREATE INDEX "EnterpriseRiskMethodology_organizationId_isActive_idx" ON "EnterpriseRiskMethodology"("organizationId", "isActive");
CREATE UNIQUE INDEX "EnterpriseRisk_organizationId_publicId_key" ON "EnterpriseRisk"("organizationId", "publicId");
CREATE INDEX "EnterpriseRisk_organizationId_status_idx" ON "EnterpriseRisk"("organizationId", "status");
CREATE INDEX "EnterpriseRisk_organizationId_residualRating_idx" ON "EnterpriseRisk"("organizationId", "residualRating");
CREATE INDEX "EnterpriseRisk_organizationId_category_idx" ON "EnterpriseRisk"("organizationId", "category");
CREATE INDEX "EnterpriseRisk_organizationId_ownerUserId_idx" ON "EnterpriseRisk"("organizationId", "ownerUserId");
CREATE INDEX "EnterpriseRisk_organizationId_appetiteStatus_idx" ON "EnterpriseRisk"("organizationId", "appetiteStatus");
CREATE INDEX "EnterpriseRisk_organizationId_archivedAt_idx" ON "EnterpriseRisk"("organizationId", "archivedAt");
CREATE INDEX "EnterpriseRisk_organizationId_reviewDate_idx" ON "EnterpriseRisk"("organizationId", "reviewDate");
CREATE UNIQUE INDEX "EnterpriseRiskImpact_riskId_dimension_key" ON "EnterpriseRiskImpact"("riskId", "dimension");
CREATE INDEX "EnterpriseRiskScoreSnapshot_riskId_calculatedAt_idx" ON "EnterpriseRiskScoreSnapshot"("riskId", "calculatedAt");
CREATE INDEX "EnterpriseRiskScoreSnapshot_organizationId_idx" ON "EnterpriseRiskScoreSnapshot"("organizationId");
CREATE INDEX "EnterpriseRiskAppetite_organizationId_scope_idx" ON "EnterpriseRiskAppetite"("organizationId", "scope");
CREATE INDEX "EnterpriseRiskTreatment_organizationId_status_idx" ON "EnterpriseRiskTreatment"("organizationId", "status");
CREATE INDEX "EnterpriseRiskTreatment_riskId_idx" ON "EnterpriseRiskTreatment"("riskId");
CREATE INDEX "EnterpriseRiskDecision_organizationId_status_idx" ON "EnterpriseRiskDecision"("organizationId", "status");
CREATE INDEX "EnterpriseRiskDecision_riskId_idx" ON "EnterpriseRiskDecision"("riskId");
CREATE UNIQUE INDEX "EnterpriseRiskControlLink_riskId_controlId_key" ON "EnterpriseRiskControlLink"("riskId", "controlId");
CREATE INDEX "EnterpriseRiskControlLink_organizationId_idx" ON "EnterpriseRiskControlLink"("organizationId");
CREATE UNIQUE INDEX "EnterpriseRiskFindingLink_riskId_findingId_key" ON "EnterpriseRiskFindingLink"("riskId", "findingId");
CREATE UNIQUE INDEX "EnterpriseRiskRelationship_riskId_targetType_targetId_relationship_key" ON "EnterpriseRiskRelationship"("riskId", "targetType", "targetId", "relationship");
CREATE INDEX "EnterpriseRiskRelationship_organizationId_idx" ON "EnterpriseRiskRelationship"("organizationId");
CREATE UNIQUE INDEX "EnterpriseRiskKri_organizationId_publicId_key" ON "EnterpriseRiskKri"("organizationId", "publicId");
CREATE INDEX "EnterpriseRiskKri_organizationId_status_idx" ON "EnterpriseRiskKri"("organizationId", "status");
CREATE INDEX "EnterpriseRiskKri_riskId_idx" ON "EnterpriseRiskKri"("riskId");
CREATE INDEX "EnterpriseRiskEvent_organizationId_idx" ON "EnterpriseRiskEvent"("organizationId");
CREATE INDEX "EnterpriseRiskEvent_riskId_idx" ON "EnterpriseRiskEvent"("riskId");
CREATE INDEX "EnterpriseRiskHistory_riskId_createdAt_idx" ON "EnterpriseRiskHistory"("riskId", "createdAt");
CREATE INDEX "EnterpriseRiskHistory_organizationId_idx" ON "EnterpriseRiskHistory"("organizationId");

ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskCustomCategory" ADD CONSTRAINT "EnterpriseRiskCustomCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskMethodology" ADD CONSTRAINT "EnterpriseRiskMethodology_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRisk" ADD CONSTRAINT "EnterpriseRisk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRisk" ADD CONSTRAINT "EnterpriseRisk_customCategoryId_fkey" FOREIGN KEY ("customCategoryId") REFERENCES "EnterpriseRiskCustomCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRisk" ADD CONSTRAINT "EnterpriseRisk_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskImpact" ADD CONSTRAINT "EnterpriseRiskImpact_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "EnterpriseRisk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskScoreSnapshot" ADD CONSTRAINT "EnterpriseRiskScoreSnapshot_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "EnterpriseRisk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskScoreSnapshot" ADD CONSTRAINT "EnterpriseRiskScoreSnapshot_methodologyId_fkey" FOREIGN KEY ("methodologyId") REFERENCES "EnterpriseRiskMethodology"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskAppetite" ADD CONSTRAINT "EnterpriseRiskAppetite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskAppetite" ADD CONSTRAINT "EnterpriseRiskAppetite_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskTreatment" ADD CONSTRAINT "EnterpriseRiskTreatment_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "EnterpriseRisk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskTreatmentAction" ADD CONSTRAINT "EnterpriseRiskTreatmentAction_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "EnterpriseRiskTreatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskDecision" ADD CONSTRAINT "EnterpriseRiskDecision_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "EnterpriseRisk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskControlLink" ADD CONSTRAINT "EnterpriseRiskControlLink_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "EnterpriseRisk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskFindingLink" ADD CONSTRAINT "EnterpriseRiskFindingLink_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "EnterpriseRisk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskRelationship" ADD CONSTRAINT "EnterpriseRiskRelationship_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "EnterpriseRisk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskKri" ADD CONSTRAINT "EnterpriseRiskKri_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskKri" ADD CONSTRAINT "EnterpriseRiskKri_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "EnterpriseRisk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskKriMeasurement" ADD CONSTRAINT "EnterpriseRiskKriMeasurement_kriId_fkey" FOREIGN KEY ("kriId") REFERENCES "EnterpriseRiskKri"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskEvent" ADD CONSTRAINT "EnterpriseRiskEvent_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "EnterpriseRisk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseRiskHistory" ADD CONSTRAINT "EnterpriseRiskHistory_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "EnterpriseRisk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
