-- CreateEnum
CREATE TYPE "IntelligencePriority" AS ENUM ('CRITICAL_ATTENTION', 'HIGH_ATTENTION', 'REVIEW', 'POSITIVE');

-- CreateEnum
CREATE TYPE "IntelligenceLifecycle" AS ENUM ('NEW', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'RESOLVED_BY_SOURCE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "IntelligenceDomain" AS ENUM ('THIRD_PARTY', 'RISK', 'CONTROL', 'EVIDENCE', 'COMPLIANCE', 'PRIVACY', 'AI_GOVERNANCE', 'DECISION', 'CROSS_PLATFORM');

-- CreateEnum
CREATE TYPE "IntelligencePolarity" AS ENUM ('NEGATIVE', 'POSITIVE');

-- CreateTable
CREATE TABLE "IntelligenceItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "groupingKey" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "domain" "IntelligenceDomain" NOT NULL,
    "changeType" TEXT NOT NULL,
    "priority" "IntelligencePriority" NOT NULL,
    "polarity" "IntelligencePolarity" NOT NULL,
    "lifecycle" "IntelligenceLifecycle" NOT NULL DEFAULT 'NEW',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "reviewGuidance" TEXT NOT NULL,
    "ownerLabel" TEXT,
    "ownerUserId" TEXT,
    "sourceProduct" TEXT NOT NULL,
    "sourceModel" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourcePublicId" TEXT,
    "sourceTimestamp" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "fingerprint" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "affected" JSONB NOT NULL,
    "links" JSONB NOT NULL,
    "roleAudience" TEXT[],
    "requiredPermissions" TEXT[],
    "current" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntelligenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actorUserId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelligenceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceCounter" (
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "IntelligenceCounter_pkey" PRIMARY KEY ("organizationId","kind")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntelligenceItem_organizationId_publicId_key" ON "IntelligenceItem"("organizationId", "publicId");

-- CreateIndex
CREATE UNIQUE INDEX "IntelligenceItem_organizationId_groupingKey_ruleId_key" ON "IntelligenceItem"("organizationId", "groupingKey", "ruleId");

-- CreateIndex
CREATE INDEX "IntelligenceItem_organizationId_current_priority_idx" ON "IntelligenceItem"("organizationId", "current", "priority");

-- CreateIndex
CREATE INDEX "IntelligenceItem_organizationId_domain_current_idx" ON "IntelligenceItem"("organizationId", "domain", "current");

-- CreateIndex
CREATE INDEX "IntelligenceItem_organizationId_lifecycle_idx" ON "IntelligenceItem"("organizationId", "lifecycle");

-- CreateIndex
CREATE INDEX "IntelligenceItem_organizationId_sourceModel_sourceId_idx" ON "IntelligenceItem"("organizationId", "sourceModel", "sourceId");

-- CreateIndex
CREATE INDEX "IntelligenceHistory_organizationId_itemId_createdAt_idx" ON "IntelligenceHistory"("organizationId", "itemId", "createdAt");

-- AddForeignKey
ALTER TABLE "IntelligenceItem" ADD CONSTRAINT "IntelligenceItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceHistory" ADD CONSTRAINT "IntelligenceHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
