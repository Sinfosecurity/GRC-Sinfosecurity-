ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'INSURANCE_ENTITY';
ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'INSURANCE_LICENSE';
ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'JURISDICTION';
ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'REGULATOR';
ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'LINE_OF_BUSINESS';
ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'PRODUCT';
ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'BUSINESS_PROCESS';
ALTER TYPE "GovernanceNodeType" ADD VALUE IF NOT EXISTS 'CRITICAL_SERVICE';

CREATE TYPE "IndustryEditionKey" AS ENUM ('INSURANCE');
CREATE TYPE "EditionConfigStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED');
CREATE TYPE "InsuranceLicenseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'UNKNOWN');

CREATE TABLE "OrganizationEditionConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "editionKey" "IndustryEditionKey" NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "EditionConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "organizationType" TEXT NOT NULL,
    "domicileCountryCode" TEXT NOT NULL,
    "domicileSubJurisdiction" TEXT,
    "operatingJurisdictions" JSONB NOT NULL,
    "linesOfBusiness" JSONB NOT NULL,
    "activities" JSONB NOT NULL,
    "dataHandled" JSONB NOT NULL,
    "aiUsage" JSONB NOT NULL,
    "thirdPartyEcosystem" JSONB NOT NULL,
    "enabledPacks" JSONB NOT NULL,
    "recommendedPacks" JSONB NOT NULL,
    "recommendationDecisions" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationEditionConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceEntity" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentEntityId" TEXT,
    "name" TEXT NOT NULL,
    "organizationType" TEXT NOT NULL,
    "domicileCountryCode" TEXT NOT NULL,
    "domicileSubJurisdiction" TEXT,
    "operatingJurisdictions" JSONB NOT NULL,
    "linesOfBusiness" JSONB NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdUnderConfigId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceEntity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceLicense" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "authorityKey" TEXT NOT NULL,
    "jurisdictionCode" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,
    "reference" TEXT,
    "classes" JSONB NOT NULL,
    "status" "InsuranceLicenseStatus" NOT NULL DEFAULT 'UNKNOWN',
    "effectiveDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "restrictions" TEXT,
    "ownerUserId" TEXT,
    "evidenceObjectId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceLicense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceVendorClassification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "serviceCategory" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceVendorClassification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceAiContext" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "insuranceUseCase" TEXT,
    "lineOfBusiness" TEXT,
    "underwritingInfluence" BOOLEAN NOT NULL DEFAULT false,
    "pricingInfluence" BOOLEAN NOT NULL DEFAULT false,
    "claimsInfluence" BOOLEAN NOT NULL DEFAULT false,
    "fraudInfluence" BOOLEAN NOT NULL DEFAULT false,
    "consumerImpact" BOOLEAN NOT NULL DEFAULT false,
    "externalData" BOOLEAN NOT NULL DEFAULT false,
    "thirdPartyProvider" TEXT,
    "validationStatus" TEXT,
    "biasReviewStatus" TEXT,
    "explainability" TEXT,
    "humanOversight" TEXT,
    "lastReviewAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceAiContext_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationEditionConfig_organizationId_editionKey_version_key" ON "OrganizationEditionConfig"("organizationId", "editionKey", "version");
CREATE INDEX "OrganizationEditionConfig_organizationId_editionKey_status_idx" ON "OrganizationEditionConfig"("organizationId", "editionKey", "status");
CREATE UNIQUE INDEX "InsuranceEntity_organizationId_publicId_key" ON "InsuranceEntity"("organizationId", "publicId");
CREATE INDEX "InsuranceEntity_organizationId_parentEntityId_idx" ON "InsuranceEntity"("organizationId", "parentEntityId");
CREATE UNIQUE INDEX "InsuranceLicense_organizationId_publicId_key" ON "InsuranceLicense"("organizationId", "publicId");
CREATE INDEX "InsuranceLicense_organizationId_entityId_idx" ON "InsuranceLicense"("organizationId", "entityId");
CREATE INDEX "InsuranceLicense_organizationId_expiryDate_idx" ON "InsuranceLicense"("organizationId", "expiryDate");
CREATE UNIQUE INDEX "InsuranceVendorClassification_organizationId_vendorId_serviceCategory_key" ON "InsuranceVendorClassification"("organizationId", "vendorId", "serviceCategory");
CREATE INDEX "InsuranceVendorClassification_organizationId_serviceCategory_idx" ON "InsuranceVendorClassification"("organizationId", "serviceCategory");
CREATE UNIQUE INDEX "InsuranceAiContext_organizationId_aiSystemId_key" ON "InsuranceAiContext"("organizationId", "aiSystemId");

ALTER TABLE "OrganizationEditionConfig" ADD CONSTRAINT "OrganizationEditionConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceEntity" ADD CONSTRAINT "InsuranceEntity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceEntity" ADD CONSTRAINT "InsuranceEntity_parentEntityId_fkey" FOREIGN KEY ("parentEntityId") REFERENCES "InsuranceEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceLicense" ADD CONSTRAINT "InsuranceLicense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceLicense" ADD CONSTRAINT "InsuranceLicense_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "InsuranceEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceVendorClassification" ADD CONSTRAINT "InsuranceVendorClassification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceAiContext" ADD CONSTRAINT "InsuranceAiContext_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
