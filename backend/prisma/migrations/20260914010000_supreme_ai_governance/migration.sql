-- AlterEnum
ALTER TYPE "GovernanceNodeType" ADD VALUE 'AI_USE_CASE';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'AI_MODEL';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'AI_PROVIDER';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'AI_TEST';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'AI_ASSESSMENT';

-- AlterEnum
ALTER TYPE "CommonControlDomain" ADD VALUE 'AI_GOVERNANCE';

-- CreateEnum
CREATE TYPE "AiLifecycleState" AS ENUM ('PROPOSED', 'IN_REVIEW', 'PILOT', 'APPROVED', 'PRODUCTION', 'RESTRICTED', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AiDeploymentKind" AS ENUM ('INTERNAL', 'EXTERNAL', 'HYBRID', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AiAutonomyLevel" AS ENUM ('ASSISTIVE', 'HUMAN_IN_THE_LOOP', 'HUMAN_ON_THE_LOOP', 'AUTONOMOUS', 'NOT_RECORDED');

-- CreateEnum
CREATE TYPE "AiImpactClass" AS ENUM ('MINIMAL', 'LIMITED', 'ELEVATED', 'HIGH', 'NOT_CLASSIFIED');

-- CreateEnum
CREATE TYPE "AiApprovalDecision" AS ENUM ('APPROVED', 'APPROVED_WITH_CONDITIONS', 'RESTRICTED', 'REJECTED', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AiTestKind" AS ENUM ('ACCURACY', 'ROBUSTNESS', 'BIAS_FAIRNESS', 'SECURITY', 'PROMPT_INJECTION', 'DATA_LEAKAGE', 'HALLUCINATION', 'SAFETY', 'RED_TEAM', 'HUMAN_OVERSIGHT', 'PERFORMANCE', 'DRIFT');

-- CreateEnum
CREATE TYPE "AiTestResult" AS ENUM ('PASS', 'FAIL', 'PARTIAL', 'NOT_TESTED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "AiIncidentStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'MITIGATING', 'CLOSED');

-- CreateEnum
CREATE TYPE "AiExceptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AiRegulatoryStatus" AS ENUM ('NOT_REVIEWED', 'IN_REVIEW', 'POTENTIAL', 'NOT_APPLICABLE', 'RECORDED');

-- CreateEnum
CREATE TYPE "AiScoreRating" AS ENUM ('MINIMAL', 'LIMITED', 'ELEVATED', 'HIGH');

-- CreateTable
CREATE TABLE "AiSystem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "businessPurpose" TEXT,
    "businessUnit" TEXT,
    "businessOwner" TEXT,
    "technicalOwner" TEXT,
    "riskOwner" TEXT,
    "vendorId" TEXT,
    "modelProviderName" TEXT,
    "modelVersion" TEXT,
    "deploymentKind" "AiDeploymentKind" NOT NULL DEFAULT 'UNKNOWN',
    "developmentStatus" TEXT,
    "productionStatus" TEXT,
    "lifecycle" "AiLifecycleState" NOT NULL DEFAULT 'PROPOSED',
    "useCaseClass" TEXT,
    "decisionInfluence" TEXT,
    "autonomy" "AiAutonomyLevel" NOT NULL DEFAULT 'NOT_RECORDED',
    "humanOversightSummary" TEXT,
    "dataCategories" TEXT[],
    "personalData" BOOLEAN NOT NULL DEFAULT false,
    "sensitiveData" BOOLEAN NOT NULL DEFAULT false,
    "jurisdictions" TEXT[],
    "systemsIntegrated" TEXT[],
    "usersAffected" TEXT,
    "subjectsAffected" TEXT,
    "criticality" TEXT,
    "inherentRating" "AiScoreRating",
    "residualRating" "AiScoreRating",
    "organizationClass" "AiImpactClass" NOT NULL DEFAULT 'NOT_CLASSIFIED',
    "reviewAt" TIMESTAMP(3),
    "lastAssessedAt" TIMESTAMP(3),
    "lastTestedAt" TIMESTAMP(3),
    "retirementAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUseCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT,
    "businessProcess" TEXT,
    "decisionInfluence" TEXT,
    "affectedPersons" TEXT,
    "dataSummary" TEXT,
    "owner" TEXT,
    "jurisdiction" TEXT,
    "autonomy" "AiAutonomyLevel" NOT NULL DEFAULT 'NOT_RECORDED',
    "organizationClass" "AiImpactClass" NOT NULL DEFAULT 'NOT_CLASSIFIED',
    "approvalStatus" TEXT,
    "humanOversight" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUseCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModelProvider" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "vendorId" TEXT,
    "providerName" TEXT NOT NULL,
    "modelFamily" TEXT,
    "modelVersion" TEXT,
    "hosting" TEXT,
    "deployment" TEXT,
    "trainingDataAssertion" TEXT,
    "retentionAssertion" TEXT,
    "availabilityStatus" TEXT NOT NULL DEFAULT 'Unknown / Not recorded',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModelProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSystemModel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSystemModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiOversight" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "humanReviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "humanCanOverride" BOOLEAN NOT NULL DEFAULT true,
    "humanCanStop" BOOLEAN NOT NULL DEFAULT true,
    "reviewPoint" TEXT,
    "approvalThreshold" TEXT,
    "escalationPath" TEXT,
    "oversightOwner" TEXT,
    "evidenceNote" TEXT,
    "exceptionNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiOversight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRisk" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "applies" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiScoreSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "methodologyVersion" TEXT NOT NULL,
    "impact" INTEGER NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "autonomy" INTEGER NOT NULL,
    "decisionCriticality" INTEGER NOT NULL,
    "dataSensitivity" INTEGER NOT NULL,
    "affectedPopulation" INTEGER NOT NULL,
    "oversightStrength" INTEGER NOT NULL,
    "externalExposure" INTEGER NOT NULL,
    "vendorDependency" INTEGER NOT NULL,
    "testingStatus" INTEGER NOT NULL,
    "controlEffectiveness" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "rating" "AiScoreRating" NOT NULL,
    "rationale" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "calculation" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'RESIDUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAssessment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "useCaseId" TEXT,
    "publicId" TEXT NOT NULL,
    "purpose" TEXT,
    "stakeholders" TEXT,
    "residualNote" TEXT,
    "recommendation" TEXT,
    "decision" TEXT,
    "conditions" TEXT,
    "reviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAssessmentScreening" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "answer" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAssessmentScreening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "useCaseId" TEXT,
    "publicId" TEXT NOT NULL,
    "kind" "AiTestKind" NOT NULL,
    "method" TEXT,
    "datasetRef" TEXT,
    "tester" TEXT,
    "testedAt" TIMESTAMP(3),
    "result" "AiTestResult" NOT NULL DEFAULT 'NOT_TESTED',
    "threshold" TEXT,
    "notes" TEXT,
    "evidenceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiIncident" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "useCaseId" TEXT,
    "publicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "impact" TEXT,
    "status" "AiIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "owner" TEXT,
    "decision" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiApproval" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "useCaseId" TEXT,
    "publicId" TEXT NOT NULL,
    "decision" "AiApprovalDecision" NOT NULL,
    "decisionMaker" TEXT NOT NULL,
    "authority" TEXT,
    "rationale" TEXT NOT NULL,
    "conditions" TEXT,
    "reviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiException" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "owner" TEXT,
    "approver" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "conditions" TEXT,
    "status" "AiExceptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChange" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRegulatoryReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "status" "AiRegulatoryStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "owner" TEXT,
    "rationale" TEXT,
    "legalReview" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRegulatoryReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiControlLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiControlLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPrivacyLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPrivacyLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEnterpriseRiskLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "enterpriseRiskId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiEnterpriseRiskLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiHistory" (
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

    CONSTRAINT "AiHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCounter" (
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AiCounter_pkey" PRIMARY KEY ("organizationId","kind")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSystem_organizationId_publicId_key" ON "AiSystem"("organizationId", "publicId");
CREATE INDEX "AiSystem_organizationId_lifecycle_idx" ON "AiSystem"("organizationId", "lifecycle");
CREATE INDEX "AiSystem_organizationId_vendorId_idx" ON "AiSystem"("organizationId", "vendorId");

CREATE UNIQUE INDEX "AiUseCase_organizationId_publicId_key" ON "AiUseCase"("organizationId", "publicId");
CREATE INDEX "AiUseCase_organizationId_systemId_idx" ON "AiUseCase"("organizationId", "systemId");

CREATE UNIQUE INDEX "AiModelProvider_organizationId_publicId_key" ON "AiModelProvider"("organizationId", "publicId");
CREATE INDEX "AiModelProvider_organizationId_vendorId_idx" ON "AiModelProvider"("organizationId", "vendorId");

CREATE INDEX "AiSystemModel_organizationId_systemId_idx" ON "AiSystemModel"("organizationId", "systemId");

CREATE UNIQUE INDEX "AiOversight_systemId_key" ON "AiOversight"("systemId");

CREATE UNIQUE INDEX "AiRisk_organizationId_publicId_key" ON "AiRisk"("organizationId", "publicId");
CREATE INDEX "AiRisk_organizationId_systemId_idx" ON "AiRisk"("organizationId", "systemId");

CREATE INDEX "AiScoreSnapshot_organizationId_systemId_createdAt_idx" ON "AiScoreSnapshot"("organizationId", "systemId", "createdAt");

CREATE UNIQUE INDEX "AiAssessment_organizationId_publicId_key" ON "AiAssessment"("organizationId", "publicId");
CREATE INDEX "AiAssessment_organizationId_systemId_idx" ON "AiAssessment"("organizationId", "systemId");

CREATE INDEX "AiAssessmentScreening_organizationId_assessmentId_idx" ON "AiAssessmentScreening"("organizationId", "assessmentId");

CREATE UNIQUE INDEX "AiTest_organizationId_publicId_key" ON "AiTest"("organizationId", "publicId");
CREATE INDEX "AiTest_organizationId_systemId_idx" ON "AiTest"("organizationId", "systemId");

CREATE UNIQUE INDEX "AiIncident_organizationId_publicId_key" ON "AiIncident"("organizationId", "publicId");
CREATE INDEX "AiIncident_organizationId_systemId_status_idx" ON "AiIncident"("organizationId", "systemId", "status");

CREATE UNIQUE INDEX "AiApproval_organizationId_publicId_key" ON "AiApproval"("organizationId", "publicId");
CREATE INDEX "AiApproval_organizationId_systemId_idx" ON "AiApproval"("organizationId", "systemId");

CREATE UNIQUE INDEX "AiException_organizationId_publicId_key" ON "AiException"("organizationId", "publicId");
CREATE INDEX "AiException_organizationId_systemId_status_idx" ON "AiException"("organizationId", "systemId", "status");

CREATE UNIQUE INDEX "AiChange_organizationId_publicId_key" ON "AiChange"("organizationId", "publicId");
CREATE INDEX "AiChange_organizationId_systemId_idx" ON "AiChange"("organizationId", "systemId");

CREATE UNIQUE INDEX "AiRegulatoryReview_organizationId_publicId_key" ON "AiRegulatoryReview"("organizationId", "publicId");
CREATE INDEX "AiRegulatoryReview_organizationId_systemId_idx" ON "AiRegulatoryReview"("organizationId", "systemId");

CREATE UNIQUE INDEX "AiControlLink_organizationId_systemId_controlId_key" ON "AiControlLink"("organizationId", "systemId", "controlId");
CREATE UNIQUE INDEX "AiPrivacyLink_organizationId_systemId_activityId_key" ON "AiPrivacyLink"("organizationId", "systemId", "activityId");
CREATE UNIQUE INDEX "AiEnterpriseRiskLink_organizationId_systemId_enterpriseRiskId_key" ON "AiEnterpriseRiskLink"("organizationId", "systemId", "enterpriseRiskId");

CREATE INDEX "AiHistory_organizationId_entityType_entityId_createdAt_idx" ON "AiHistory"("organizationId", "entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiSystem" ADD CONSTRAINT "AiSystem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiUseCase" ADD CONSTRAINT "AiUseCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiUseCase" ADD CONSTRAINT "AiUseCase_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiModelProvider" ADD CONSTRAINT "AiModelProvider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiSystemModel" ADD CONSTRAINT "AiSystemModel_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiSystemModel" ADD CONSTRAINT "AiSystemModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiModelProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiOversight" ADD CONSTRAINT "AiOversight_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiRisk" ADD CONSTRAINT "AiRisk_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiScoreSnapshot" ADD CONSTRAINT "AiScoreSnapshot_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiAssessment" ADD CONSTRAINT "AiAssessment_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiAssessment" ADD CONSTRAINT "AiAssessment_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "AiUseCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiAssessmentScreening" ADD CONSTRAINT "AiAssessmentScreening_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "AiAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiTest" ADD CONSTRAINT "AiTest_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiTest" ADD CONSTRAINT "AiTest_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "AiUseCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiIncident" ADD CONSTRAINT "AiIncident_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiIncident" ADD CONSTRAINT "AiIncident_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "AiUseCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiApproval" ADD CONSTRAINT "AiApproval_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiApproval" ADD CONSTRAINT "AiApproval_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "AiUseCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiException" ADD CONSTRAINT "AiException_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiChange" ADD CONSTRAINT "AiChange_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiRegulatoryReview" ADD CONSTRAINT "AiRegulatoryReview_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiControlLink" ADD CONSTRAINT "AiControlLink_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiPrivacyLink" ADD CONSTRAINT "AiPrivacyLink_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiEnterpriseRiskLink" ADD CONSTRAINT "AiEnterpriseRiskLink_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiHistory" ADD CONSTRAINT "AiHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
