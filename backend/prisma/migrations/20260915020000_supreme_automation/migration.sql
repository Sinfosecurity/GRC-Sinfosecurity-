-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AutomationExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'DEAD_LETTER', 'PREVIEW', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AutomationWorkStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationDomain" AS ENUM ('THIRD_PARTY', 'RISK', 'CONTROL', 'EVIDENCE', 'COMPLIANCE', 'PRIVACY', 'AI_GOVERNANCE', 'INTELLIGENCE', 'CROSS_PLATFORM');

-- CreateEnum
CREATE TYPE "AutomationWorkKind" AS ENUM ('REVIEW', 'REMINDER', 'EVIDENCE_REQUEST', 'DECISION_REQUEST', 'REASSESSMENT_REQUEST');

-- CreateTable
CREATE TABLE "AutomationDefinition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "AutomationStatus" NOT NULL DEFAULT 'DRAFT',
    "domain" "AutomationDomain" NOT NULL,
    "ownerUserId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currentVersionId" TEXT,
    "templateKey" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "publishedByUserId" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "trigger" JSONB NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "humanBoundary" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "sourceModel" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourcePublicId" TEXT,
    "status" "AutomationExecutionStatus" NOT NULL,
    "conditionsEvaluated" JSONB NOT NULL,
    "actionsAttempted" JSONB NOT NULL,
    "actionsSucceeded" JSONB NOT NULL,
    "actionsFailed" JSONB NOT NULL,
    "humanApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "nextActorLabel" TEXT,
    "preview" BOOLEAN NOT NULL DEFAULT false,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "timezoneUsed" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationWorkItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sourceModel" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceHref" TEXT,
    "ownerUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "AutomationWorkStatus" NOT NULL DEFAULT 'OPEN',
    "kind" "AutomationWorkKind" NOT NULL,
    "humanRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationWorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationCounter" (
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AutomationCounter_pkey" PRIMARY KEY ("organizationId","kind")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationDefinition_organizationId_publicId_key" ON "AutomationDefinition"("organizationId", "publicId");

-- CreateIndex
CREATE INDEX "AutomationDefinition_organizationId_status_idx" ON "AutomationDefinition"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AutomationDefinition_organizationId_domain_idx" ON "AutomationDefinition"("organizationId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationVersion_automationId_versionNumber_key" ON "AutomationVersion"("automationId", "versionNumber");

-- CreateIndex
CREATE INDEX "AutomationVersion_organizationId_automationId_idx" ON "AutomationVersion"("organizationId", "automationId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationExecution_organizationId_publicId_key" ON "AutomationExecution"("organizationId", "publicId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationExecution_organizationId_idempotencyKey_key" ON "AutomationExecution"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AutomationExecution_organizationId_status_idx" ON "AutomationExecution"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AutomationExecution_organizationId_automationId_createdAt_idx" ON "AutomationExecution"("organizationId", "automationId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationExecution_organizationId_sourceModel_sourceId_idx" ON "AutomationExecution"("organizationId", "sourceModel", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationWorkItem_organizationId_publicId_key" ON "AutomationWorkItem"("organizationId", "publicId");

-- CreateIndex
CREATE INDEX "AutomationWorkItem_organizationId_status_idx" ON "AutomationWorkItem"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AutomationWorkItem_organizationId_ownerUserId_idx" ON "AutomationWorkItem"("organizationId", "ownerUserId");

-- AddForeignKey
ALTER TABLE "AutomationDefinition" ADD CONSTRAINT "AutomationDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationVersion" ADD CONSTRAINT "AutomationVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationVersion" ADD CONSTRAINT "AutomationVersion_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "AutomationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "AutomationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AutomationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationWorkItem" ADD CONSTRAINT "AutomationWorkItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationWorkItem" ADD CONSTRAINT "AutomationWorkItem_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "AutomationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationWorkItem" ADD CONSTRAINT "AutomationWorkItem_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AutomationExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
