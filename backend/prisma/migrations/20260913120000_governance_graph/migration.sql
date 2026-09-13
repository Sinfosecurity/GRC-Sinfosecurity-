-- CreateEnum
CREATE TYPE "GovernanceNodeType" AS ENUM ('ORGANIZATION', 'BUSINESS_UNIT', 'VENDOR', 'SYSTEM', 'APPLICATION', 'ASSET', 'DATA_ASSET', 'AI_SYSTEM', 'RISK', 'CONTROL', 'REQUIREMENT', 'FRAMEWORK', 'REGULATION', 'POLICY', 'CONTRACT', 'ASSESSMENT', 'EVIDENCE', 'FINDING', 'REMEDIATION', 'DECISION', 'INCIDENT');

-- CreateEnum
CREATE TYPE "GovernanceRelationshipType" AS ENUM ('OWNS', 'BELONGS_TO', 'USES', 'DEPENDS_ON', 'PROVIDES_SERVICE_TO', 'HOSTS', 'PROCESSES', 'STORES', 'SHARES_WITH', 'HAS_RISK', 'AFFECTS', 'MITIGATES', 'CONTROLLED_BY', 'MAPS_TO', 'REQUIRED_BY', 'SATISFIES', 'SUPPORTED_BY', 'EVIDENCED_BY', 'ASSESSED_BY', 'HAS_FINDING', 'REMEDIATED_BY', 'APPLIES_TO', 'INFORMS', 'APPROVED_BY', 'ACCEPTED_BY', 'MONITORED_BY', 'TRIGGERED_BY', 'GOVERNED_BY', 'COVERED_BY');

-- CreateEnum
CREATE TYPE "GovernanceProvenance" AS ENUM ('SYSTEM', 'USER', 'IMPORT', 'ASSESSMENT', 'RULE', 'INTELLIGENCE', 'AI_SUGGESTED', 'AI_APPROVED');

-- CreateEnum
CREATE TYPE "GovernanceAuthority" AS ENUM ('AUTHORITATIVE', 'VERIFIED', 'DERIVED', 'SUGGESTED');

-- CreateTable
CREATE TABLE "GovernanceNode" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nodeType" "GovernanceNodeType" NOT NULL,
    "sourceModel" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "GovernanceNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceEdge" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "relationshipType" "GovernanceRelationshipType" NOT NULL,
    "provenance" "GovernanceProvenance" NOT NULL DEFAULT 'SYSTEM',
    "authority" "GovernanceAuthority" NOT NULL DEFAULT 'AUTHORITATIVE',
    "isDerived" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "GovernanceEdge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GovernanceNode_organizationId_nodeType_sourceModel_sourceId_key" ON "GovernanceNode"("organizationId", "nodeType", "sourceModel", "sourceId");
CREATE INDEX "GovernanceNode_organizationId_nodeType_idx" ON "GovernanceNode"("organizationId", "nodeType");
CREATE INDEX "GovernanceNode_organizationId_sourceModel_sourceId_idx" ON "GovernanceNode"("organizationId", "sourceModel", "sourceId");
CREATE INDEX "GovernanceNode_organizationId_archivedAt_idx" ON "GovernanceNode"("organizationId", "archivedAt");
CREATE INDEX "GovernanceNode_displayLabel_idx" ON "GovernanceNode"("displayLabel");

CREATE INDEX "GovernanceEdge_organizationId_relationshipType_idx" ON "GovernanceEdge"("organizationId", "relationshipType");
CREATE INDEX "GovernanceEdge_organizationId_fromNodeId_idx" ON "GovernanceEdge"("organizationId", "fromNodeId");
CREATE INDEX "GovernanceEdge_organizationId_toNodeId_idx" ON "GovernanceEdge"("organizationId", "toNodeId");
CREATE INDEX "GovernanceEdge_organizationId_archivedAt_idx" ON "GovernanceEdge"("organizationId", "archivedAt");
CREATE INDEX "GovernanceEdge_fromNodeId_toNodeId_relationshipType_idx" ON "GovernanceEdge"("fromNodeId", "toNodeId", "relationshipType");

CREATE UNIQUE INDEX "GovernanceEdge_active_identity" ON "GovernanceEdge"("organizationId", "fromNodeId", "toNodeId", "relationshipType") WHERE "archivedAt" IS NULL AND "validTo" IS NULL;

ALTER TABLE "GovernanceNode" ADD CONSTRAINT "GovernanceNode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GovernanceEdge" ADD CONSTRAINT "GovernanceEdge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GovernanceEdge" ADD CONSTRAINT "GovernanceEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "GovernanceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GovernanceEdge" ADD CONSTRAINT "GovernanceEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "GovernanceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
