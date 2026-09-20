-- Wave 5: Engagement-scoped treatment, acceptance, approvals, contract gate, activation.

ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'TREATMENT_REVIEW';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'ACCEPTANCE_PENDING';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'TREATMENT_DECIDED';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'CONTRACT_REVIEW';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'GATE_BLOCKED';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'GATE_APPROVED';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'AVOIDED';
ALTER TYPE "EngagementStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TYPE "GovernanceRelationshipType" ADD VALUE IF NOT EXISTS 'HAS_DECISION';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE IF NOT EXISTS 'SUBJECT_TO';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE IF NOT EXISTS 'HAS_CONTRACT';

CREATE TYPE "EngagementTreatmentType" AS ENUM ('MITIGATE', 'ACCEPT', 'TRANSFER', 'AVOID');
CREATE TYPE "EngagementTreatmentStatus" AS ENUM ('DRAFT', 'SELECTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'RETURNED', 'COMPLETE', 'SUPERSEDED');
CREATE TYPE "EngagementAcceptanceStatus" AS ENUM ('DRAFT', 'REQUESTED', 'PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'SUPERSEDED');
CREATE TYPE "EngagementApprovalType" AS ENUM ('RISK_ACCEPTANCE', 'TREATMENT', 'CONTRACT_EXCEPTION', 'CONTRACT_GATE', 'ACTIVATION');
CREATE TYPE "EngagementApprovalStatus" AS ENUM ('REQUESTED', 'PENDING', 'APPROVED', 'REJECTED', 'RETURNED');
CREATE TYPE "EngagementContractRequirementSource" AS ENUM ('CONFIRMED_FINDING', 'CONTROL_GAP', 'TREATMENT_DECISION', 'REGULATORY_REQUIREMENT', 'INSURANCE_PACK', 'ORGANIZATION_POLICY', 'HUMAN_ADDED');
CREATE TYPE "EngagementContractRequirementStatus" AS ENUM ('OPEN', 'SATISFIED', 'EXCEPTION_REQUESTED', 'EXCEPTION_APPROVED', 'WAIVED');
CREATE TYPE "EngagementContractGateStatus" AS ENUM ('NOT_READY', 'READY_FOR_REVIEW', 'BLOCKED', 'APPROVED');
CREATE TYPE "EngagementTransferMechanism" AS ENUM ('INSURANCE', 'CONTRACTUAL_INDEMNITY', 'SERVICE_ARCHITECTURE', 'OTHER');

CREATE TABLE "EngagementRiskTreatment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "residualAssessmentId" TEXT NOT NULL,
    "residualScoreSnapshot" INTEGER,
    "residualBandSnapshot" TEXT,
    "residualMethodologyVersion" TEXT,
    "type" "EngagementTreatmentType" NOT NULL,
    "rationale" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "status" "EngagementTreatmentStatus" NOT NULL DEFAULT 'SELECTED',
    "conditions" TEXT,
    "relatedFindingIds" JSONB,
    "relatedControlIds" JSONB,
    "relatedEvidenceIds" JSONB,
    "mitigationAction" TEXT,
    "mitigationOwnerUserId" TEXT,
    "mitigationDueDate" TIMESTAMP(3),
    "mitigationFindingId" TEXT,
    "mitigationControlId" TEXT,
    "mitigationEvidenceRequired" TEXT,
    "mitigationCompletionCondition" TEXT,
    "mitigationStatus" TEXT,
    "transferMechanism" "EngagementTransferMechanism",
    "transferOwnerUserId" TEXT,
    "transferEvidenceRef" TEXT,
    "transferEffectiveAt" TIMESTAMP(3),
    "transferExpiresAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "history" JSONB,

    CONSTRAINT "EngagementRiskTreatment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementRiskAcceptance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "residualAssessmentId" TEXT NOT NULL,
    "residualScoreSnapshot" INTEGER NOT NULL,
    "residualBandSnapshot" TEXT NOT NULL,
    "residualMethodologyVersion" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "authorizedApproverUserId" TEXT,
    "status" "EngagementAcceptanceStatus" NOT NULL DEFAULT 'REQUESTED',
    "conditions" TEXT,
    "expiresAt" TIMESTAMP(3),
    "reviewAt" TIMESTAMP(3),
    "relatedFindingIds" JSONB,
    "decisionSnapshot" JSONB NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "decisionComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementRiskAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementDecisionApproval" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "type" "EngagementApprovalType" NOT NULL,
    "treatmentId" TEXT,
    "acceptanceId" TEXT,
    "exceptionId" TEXT,
    "status" "EngagementApprovalStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedByUserId" TEXT NOT NULL,
    "assignedApproverUserId" TEXT,
    "decidedByUserId" TEXT,
    "capability" TEXT NOT NULL,
    "comment" TEXT,
    "decisionVersion" INTEGER NOT NULL DEFAULT 1,
    "decidedAt" TIMESTAMP(3),
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementDecisionApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementContractRequirement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "source" "EngagementContractRequirementSource" NOT NULL,
    "sourceRef" TEXT,
    "sourceRationale" TEXT,
    "ownerUserId" TEXT,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "status" "EngagementContractRequirementStatus" NOT NULL DEFAULT 'OPEN',
    "evidenceRef" TEXT,
    "reviewerUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementContractRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementContractException" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "authorityUserId" TEXT,
    "status" "EngagementApprovalStatus" NOT NULL DEFAULT 'REQUESTED',
    "conditions" TEXT,
    "expiresAt" TIMESTAMP(3),
    "reviewAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "decisionComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementContractException_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementContractGate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "residualAssessmentId" TEXT,
    "treatmentId" TEXT,
    "status" "EngagementContractGateStatus" NOT NULL DEFAULT 'NOT_READY',
    "blockers" JSONB NOT NULL,
    "evaluatedAt" TIMESTAMP(3),
    "evaluatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementContractGate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EngagementActivation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "activatedByUserId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "treatmentSnapshot" JSONB NOT NULL,
    "acceptanceSnapshot" JSONB,
    "approvalSnapshot" JSONB NOT NULL,
    "gateSnapshot" JSONB NOT NULL,
    "decisionBriefId" TEXT,
    "decisionBriefVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementActivation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RiskDecisionBrief" ADD COLUMN IF NOT EXISTS "engagementId" TEXT;
ALTER TABLE "RiskDecisionBrief" ADD COLUMN IF NOT EXISTS "versionNumber" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "EngagementRiskTreatment_organizationId_engagementId_createdAt_idx" ON "EngagementRiskTreatment"("organizationId", "engagementId", "createdAt");
CREATE INDEX "EngagementRiskTreatment_organizationId_vendorId_idx" ON "EngagementRiskTreatment"("organizationId", "vendorId");
CREATE INDEX "EngagementRiskAcceptance_organizationId_engagementId_createdAt_idx" ON "EngagementRiskAcceptance"("organizationId", "engagementId", "createdAt");
CREATE INDEX "EngagementRiskAcceptance_organizationId_vendorId_idx" ON "EngagementRiskAcceptance"("organizationId", "vendorId");
CREATE INDEX "EngagementDecisionApproval_organizationId_engagementId_createdAt_idx" ON "EngagementDecisionApproval"("organizationId", "engagementId", "createdAt");
CREATE INDEX "EngagementDecisionApproval_organizationId_type_status_idx" ON "EngagementDecisionApproval"("organizationId", "type", "status");
CREATE INDEX "EngagementContractRequirement_organizationId_engagementId_idx" ON "EngagementContractRequirement"("organizationId", "engagementId");
CREATE INDEX "EngagementContractRequirement_organizationId_vendorId_idx" ON "EngagementContractRequirement"("organizationId", "vendorId");
CREATE INDEX "EngagementContractException_organizationId_engagementId_idx" ON "EngagementContractException"("organizationId", "engagementId");
CREATE INDEX "EngagementContractException_organizationId_requirementId_idx" ON "EngagementContractException"("organizationId", "requirementId");
CREATE INDEX "EngagementContractGate_organizationId_engagementId_createdAt_idx" ON "EngagementContractGate"("organizationId", "engagementId", "createdAt");
CREATE INDEX "EngagementActivation_organizationId_engagementId_idx" ON "EngagementActivation"("organizationId", "engagementId");
CREATE INDEX IF NOT EXISTS "RiskDecisionBrief_engagementId_idx" ON "RiskDecisionBrief"("engagementId");
CREATE INDEX IF NOT EXISTS "RiskDecisionBrief_organizationId_engagementId_versionNumber_idx" ON "RiskDecisionBrief"("organizationId", "engagementId", "versionNumber");

ALTER TABLE "EngagementRiskTreatment" ADD CONSTRAINT "EngagementRiskTreatment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementRiskTreatment" ADD CONSTRAINT "EngagementRiskTreatment_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementRiskAcceptance" ADD CONSTRAINT "EngagementRiskAcceptance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementRiskAcceptance" ADD CONSTRAINT "EngagementRiskAcceptance_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementDecisionApproval" ADD CONSTRAINT "EngagementDecisionApproval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementDecisionApproval" ADD CONSTRAINT "EngagementDecisionApproval_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementContractRequirement" ADD CONSTRAINT "EngagementContractRequirement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementContractRequirement" ADD CONSTRAINT "EngagementContractRequirement_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementContractException" ADD CONSTRAINT "EngagementContractException_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementContractException" ADD CONSTRAINT "EngagementContractException_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementContractGate" ADD CONSTRAINT "EngagementContractGate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementContractGate" ADD CONSTRAINT "EngagementContractGate_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementActivation" ADD CONSTRAINT "EngagementActivation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementActivation" ADD CONSTRAINT "EngagementActivation_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskDecisionBrief" ADD CONSTRAINT "RiskDecisionBrief_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
