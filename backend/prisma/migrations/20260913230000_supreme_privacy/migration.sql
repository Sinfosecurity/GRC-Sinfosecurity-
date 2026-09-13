-- CreateEnum
CREATE TYPE "PrivacyActivityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'RETIRED');

-- CreateEnum
CREATE TYPE "PrivacyRole" AS ENUM ('CONTROLLER', 'PROCESSOR', 'JOINT_CONTROLLER', 'RECIPIENT', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "PrivacyVendorRole" AS ENUM ('PROCESSOR', 'SUBPROCESSOR', 'CONTROLLER', 'JOINT_CONTROLLER', 'RECIPIENT', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "PrivacyDataSubjectKind" AS ENUM ('CUSTOMERS', 'EMPLOYEES', 'APPLICANTS', 'CONTRACTORS', 'PROSPECTS', 'WEBSITE_VISITORS', 'CHILDREN', 'PATIENTS', 'STUDENTS', 'SUPPLIERS', 'OTHER');

-- CreateEnum
CREATE TYPE "PrivacyDataKind" AS ENUM ('IDENTITY', 'CONTACT', 'FINANCIAL', 'EMPLOYMENT', 'LOCATION', 'ONLINE_IDENTIFIERS', 'DEVICE_NETWORK', 'AUTHENTICATION', 'COMMUNICATIONS', 'HEALTH', 'BIOMETRIC', 'GOVERNMENT_IDENTIFIERS', 'CRIMINAL_LEGAL', 'DEMOGRAPHIC', 'BEHAVIORAL', 'PREFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "PrivacyBasisType" AS ENUM ('CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS', 'SALE_OPT_OUT', 'BUSINESS_PURPOSE', 'OTHER');

-- CreateEnum
CREATE TYPE "PrivacyTransferMechanism" AS ENUM ('ADEQUACY', 'SCC', 'BCR', 'CONSENT_EXCEPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PrivacyReviewStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'REVIEW_REQUIRED', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PrivacyDpiaDecision" AS ENUM ('PROCEED', 'PROCEED_WITH_CONDITIONS', 'DO_NOT_PROCEED', 'FURTHER_REVIEW');

-- CreateEnum
CREATE TYPE "PrivacyRightsType" AS ENUM ('ACCESS', 'CORRECTION', 'DELETION', 'RESTRICTION', 'OBJECTION', 'PORTABILITY', 'OPT_OUT', 'CONSENT_WITHDRAWAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PrivacyVerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "PrivacyRightsStatus" AS ENUM ('RECEIVED', 'VERIFYING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'DENIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PrivacyDeletionStatus" AS ENUM ('REQUESTED', 'PENDING', 'VERIFIED', 'LEGAL_HOLD', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "PrivacyConsentStatus" AS ENUM ('GIVEN', 'WITHDRAWN', 'EXPIRED', 'MANUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GovernanceNodeType" ADD VALUE 'PROCESSING_ACTIVITY';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'DATA_CATEGORY';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'DATA_SUBJECT_CATEGORY';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'TRANSFER';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'DPIA';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'RIGHTS_REQUEST';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'RETENTION_RULE';
ALTER TYPE "GovernanceNodeType" ADD VALUE 'CONSENT_RECORD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GovernanceRelationshipType" ADD VALUE 'TRANSFERS_VIA';
ALTER TYPE "GovernanceRelationshipType" ADD VALUE 'CONCERNS';

-- CreateTable
CREATE TABLE "PrivacyProcessingActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "businessProcess" TEXT,
    "businessUnitId" TEXT,
    "ownerUserId" TEXT,
    "controllerRole" "PrivacyRole" NOT NULL DEFAULT 'CONTROLLER',
    "status" "PrivacyActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "jurisdictions" TEXT[],
    "storageLocations" TEXT[],
    "sourceOfData" TEXT,
    "retentionSummary" TEXT,
    "disposalMethod" TEXT,
    "dpiaRequired" BOOLEAN NOT NULL DEFAULT false,
    "dpiaStatus" TEXT,
    "riskLevel" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "reviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyProcessingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyPurpose" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "noticeVersionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyPurpose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyLawfulBasis" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purposeId" TEXT NOT NULL,
    "basisType" "PrivacyBasisType" NOT NULL,
    "rationale" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "storedObjectId" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "reviewAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RECORDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyLawfulBasis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyActivityData" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "kind" "PrivacyDataKind" NOT NULL,
    "label" TEXT NOT NULL,
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyActivityData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyActivitySubject" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "kind" "PrivacyDataSubjectKind" NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyActivitySubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyActivityParty" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "partyType" TEXT NOT NULL,
    "vendorId" TEXT,
    "systemName" TEXT,
    "recipientName" TEXT,
    "privacyRole" "PrivacyVendorRole" NOT NULL DEFAULT 'PROCESSOR',
    "jurisdiction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyActivityParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyTransfer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "activityId" TEXT,
    "vendorId" TEXT,
    "sourceJurisdiction" TEXT NOT NULL,
    "destinationJurisdiction" TEXT NOT NULL,
    "recipientName" TEXT,
    "dataSummary" TEXT,
    "mechanism" "PrivacyTransferMechanism" NOT NULL,
    "supplementaryMeasures" TEXT,
    "ownerUserId" TEXT,
    "reviewAt" TIMESTAMP(3),
    "status" "PrivacyReviewStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyTransferAssessment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "sensitivity" TEXT,
    "governmentAccess" TEXT,
    "measures" TEXT,
    "decision" TEXT,
    "ownerUserId" TEXT,
    "reviewAt" TIMESTAMP(3),
    "status" "PrivacyReviewStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyTransferAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyDpia" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "activityId" TEXT,
    "title" TEXT NOT NULL,
    "trigger" TEXT,
    "scope" TEXT,
    "necessity" TEXT,
    "residualNote" TEXT,
    "enterpriseRiskId" TEXT,
    "ownerUserId" TEXT,
    "reviewAt" TIMESTAMP(3),
    "decision" "PrivacyDpiaDecision",
    "status" "PrivacyReviewStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyDpia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyDpiaScreening" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dpiaId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "answer" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyDpiaScreening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRightsRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "activityId" TEXT,
    "requestType" "PrivacyRightsType" NOT NULL,
    "regime" TEXT NOT NULL,
    "requesterRef" TEXT NOT NULL,
    "requesterIdentity" TEXT,
    "verificationStatus" "PrivacyVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "originalDueAt" TIMESTAMP(3),
    "extensionDays" INTEGER,
    "dueAt" TIMESTAMP(3),
    "deadlineWhy" TEXT,
    "ownerUserId" TEXT,
    "status" "PrivacyRightsStatus" NOT NULL DEFAULT 'RECEIVED',
    "decision" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyRightsRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRightsTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "vendorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyRightsTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyConsentRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "choice" "PrivacyConsentStatus" NOT NULL DEFAULT 'MANUAL',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "noticeVersion" TEXT,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyNoticeVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "activityId" TEXT,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "storedObjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyNoticeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRetentionRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "activityId" TEXT,
    "dataKind" "PrivacyDataKind",
    "systemName" TEXT,
    "period" TEXT NOT NULL,
    "triggerEvent" TEXT,
    "disposalMethod" TEXT,
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "ownerUserId" TEXT,
    "reviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyRetentionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyDeletionTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "activityId" TEXT,
    "status" "PrivacyDeletionStatus" NOT NULL DEFAULT 'REQUESTED',
    "attestation" TEXT,
    "storedObjectId" TEXT,
    "ownerUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyDeletionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyIncidentLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "activityId" TEXT,
    "incidentId" TEXT,
    "findingId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyIncidentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyHistory" (
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

    CONSTRAINT "PrivacyHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyCounter" (
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PrivacyCounter_pkey" PRIMARY KEY ("organizationId","kind")
);

-- CreateIndex
CREATE INDEX "PrivacyProcessingActivity_organizationId_status_idx" ON "PrivacyProcessingActivity"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyProcessingActivity_organizationId_publicId_key" ON "PrivacyProcessingActivity"("organizationId", "publicId");

-- CreateIndex
CREATE INDEX "PrivacyPurpose_activityId_idx" ON "PrivacyPurpose"("activityId");

-- CreateIndex
CREATE INDEX "PrivacyPurpose_organizationId_idx" ON "PrivacyPurpose"("organizationId");

-- CreateIndex
CREATE INDEX "PrivacyLawfulBasis_purposeId_idx" ON "PrivacyLawfulBasis"("purposeId");

-- CreateIndex
CREATE INDEX "PrivacyLawfulBasis_organizationId_idx" ON "PrivacyLawfulBasis"("organizationId");

-- CreateIndex
CREATE INDEX "PrivacyActivityData_activityId_idx" ON "PrivacyActivityData"("activityId");

-- CreateIndex
CREATE INDEX "PrivacyActivityData_organizationId_kind_idx" ON "PrivacyActivityData"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "PrivacyActivitySubject_activityId_idx" ON "PrivacyActivitySubject"("activityId");

-- CreateIndex
CREATE INDEX "PrivacyActivitySubject_organizationId_kind_idx" ON "PrivacyActivitySubject"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "PrivacyActivityParty_activityId_idx" ON "PrivacyActivityParty"("activityId");

-- CreateIndex
CREATE INDEX "PrivacyActivityParty_organizationId_vendorId_idx" ON "PrivacyActivityParty"("organizationId", "vendorId");

-- CreateIndex
CREATE INDEX "PrivacyTransfer_organizationId_status_idx" ON "PrivacyTransfer"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyTransfer_organizationId_publicId_key" ON "PrivacyTransfer"("organizationId", "publicId");

-- CreateIndex
CREATE INDEX "PrivacyTransferAssessment_transferId_idx" ON "PrivacyTransferAssessment"("transferId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyTransferAssessment_organizationId_publicId_key" ON "PrivacyTransferAssessment"("organizationId", "publicId");

-- CreateIndex
CREATE INDEX "PrivacyDpia_organizationId_status_idx" ON "PrivacyDpia"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyDpia_organizationId_publicId_key" ON "PrivacyDpia"("organizationId", "publicId");

-- CreateIndex
CREATE INDEX "PrivacyDpiaScreening_dpiaId_idx" ON "PrivacyDpiaScreening"("dpiaId");

-- CreateIndex
CREATE INDEX "PrivacyRightsRequest_organizationId_status_idx" ON "PrivacyRightsRequest"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyRightsRequest_organizationId_publicId_key" ON "PrivacyRightsRequest"("organizationId", "publicId");

-- CreateIndex
CREATE INDEX "PrivacyRightsTask_requestId_idx" ON "PrivacyRightsTask"("requestId");

-- CreateIndex
CREATE INDEX "PrivacyConsentRecord_organizationId_idx" ON "PrivacyConsentRecord"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyConsentRecord_organizationId_publicId_key" ON "PrivacyConsentRecord"("organizationId", "publicId");

-- CreateIndex
CREATE INDEX "PrivacyNoticeVersion_organizationId_effectiveFrom_idx" ON "PrivacyNoticeVersion"("organizationId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PrivacyRetentionRule_organizationId_idx" ON "PrivacyRetentionRule"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyRetentionRule_organizationId_publicId_key" ON "PrivacyRetentionRule"("organizationId", "publicId");

-- CreateIndex
CREATE INDEX "PrivacyDeletionTask_organizationId_status_idx" ON "PrivacyDeletionTask"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyDeletionTask_organizationId_publicId_key" ON "PrivacyDeletionTask"("organizationId", "publicId");

-- CreateIndex
CREATE INDEX "PrivacyIncidentLink_organizationId_idx" ON "PrivacyIncidentLink"("organizationId");

-- CreateIndex
CREATE INDEX "PrivacyHistory_organizationId_entityType_entityId_createdAt_idx" ON "PrivacyHistory"("organizationId", "entityType", "entityId", "createdAt");


-- AddForeignKey
ALTER TABLE "PrivacyProcessingActivity" ADD CONSTRAINT "PrivacyProcessingActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyPurpose" ADD CONSTRAINT "PrivacyPurpose_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "PrivacyProcessingActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyPurpose" ADD CONSTRAINT "PrivacyPurpose_noticeVersionId_fkey" FOREIGN KEY ("noticeVersionId") REFERENCES "PrivacyNoticeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyLawfulBasis" ADD CONSTRAINT "PrivacyLawfulBasis_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "PrivacyPurpose"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyActivityData" ADD CONSTRAINT "PrivacyActivityData_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "PrivacyProcessingActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyActivitySubject" ADD CONSTRAINT "PrivacyActivitySubject_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "PrivacyProcessingActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyActivityParty" ADD CONSTRAINT "PrivacyActivityParty_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "PrivacyProcessingActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyTransfer" ADD CONSTRAINT "PrivacyTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyTransfer" ADD CONSTRAINT "PrivacyTransfer_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "PrivacyProcessingActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyTransferAssessment" ADD CONSTRAINT "PrivacyTransferAssessment_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "PrivacyTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyDpia" ADD CONSTRAINT "PrivacyDpia_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyDpia" ADD CONSTRAINT "PrivacyDpia_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "PrivacyProcessingActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyDpiaScreening" ADD CONSTRAINT "PrivacyDpiaScreening_dpiaId_fkey" FOREIGN KEY ("dpiaId") REFERENCES "PrivacyDpia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRightsRequest" ADD CONSTRAINT "PrivacyRightsRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRightsRequest" ADD CONSTRAINT "PrivacyRightsRequest_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "PrivacyProcessingActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRightsTask" ADD CONSTRAINT "PrivacyRightsTask_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrivacyRightsRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyNoticeVersion" ADD CONSTRAINT "PrivacyNoticeVersion_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "PrivacyProcessingActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRetentionRule" ADD CONSTRAINT "PrivacyRetentionRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRetentionRule" ADD CONSTRAINT "PrivacyRetentionRule_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "PrivacyProcessingActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyDeletionTask" ADD CONSTRAINT "PrivacyDeletionTask_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "PrivacyProcessingActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyIncidentLink" ADD CONSTRAINT "PrivacyIncidentLink_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "PrivacyProcessingActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyHistory" ADD CONSTRAINT "PrivacyHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
