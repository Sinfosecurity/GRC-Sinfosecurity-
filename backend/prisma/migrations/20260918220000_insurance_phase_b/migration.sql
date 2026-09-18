CREATE TYPE "InsuranceApplicabilityState" AS ENUM ('RECOMMENDED', 'NEEDS_REVIEW', 'APPLICABLE', 'NOT_APPLICABLE', 'ENABLED', 'DISABLED', 'SUPERSEDED');
CREATE TYPE "InsuranceLicenseVerification" AS ENUM ('CUSTOMER_RECORDED', 'DOCUMENT_VERIFIED', 'EXTERNAL_SOURCE_VERIFIED');

ALTER TABLE "InsuranceLicense" ADD COLUMN "verificationBasis" "InsuranceLicenseVerification" NOT NULL DEFAULT 'CUSTOMER_RECORDED';
ALTER TABLE "InsuranceLicense" ADD COLUMN "reviewDueAt" TIMESTAMP(3);

ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "jurisdictionCode" TEXT;
ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "entityId" TEXT;
ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "linesOfBusiness" JSONB;
ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "claimsAuthority" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "underwritingAuthority" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "policyholderInteraction" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "premiumHandling" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "criticality" TEXT;
ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "licenseRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "aiModelProvider" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "regulatedOutsourcing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "fourthPartyUse" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InsuranceVendorClassification" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "InsuranceAiContext" ADD COLUMN "entityId" TEXT;
ALTER TABLE "InsuranceAiContext" ADD COLUMN "jurisdictionCode" TEXT;

CREATE TABLE "InsuranceApplicabilityDecision" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "packKey" TEXT NOT NULL,
    "packVersion" TEXT NOT NULL,
    "state" "InsuranceApplicabilityState" NOT NULL,
    "reason" TEXT,
    "actorUserId" TEXT,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InsuranceApplicabilityDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceDelegatedAuthority" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "delegateName" TEXT NOT NULL,
    "vendorId" TEXT,
    "entityId" TEXT,
    "jurisdictionCode" TEXT,
    "linesOfBusiness" JSONB,
    "scope" TEXT,
    "limits" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "evidenceObjectId" TEXT,
    "ownerUserId" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InsuranceDelegatedAuthority_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceCounterparty" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendorId" TEXT,
    "relationshipType" TEXT NOT NULL,
    "entityId" TEXT,
    "jurisdictionCode" TEXT,
    "linesOfBusiness" JSONB,
    "criticality" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InsuranceCounterparty_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InsuranceApplicabilityDecision_organizationId_packKey_createdAt_idx" ON "InsuranceApplicabilityDecision"("organizationId", "packKey", "createdAt");
CREATE UNIQUE INDEX "InsuranceDelegatedAuthority_organizationId_publicId_key" ON "InsuranceDelegatedAuthority"("organizationId", "publicId");
CREATE INDEX "InsuranceDelegatedAuthority_organizationId_kind_idx" ON "InsuranceDelegatedAuthority"("organizationId", "kind");
CREATE UNIQUE INDEX "InsuranceCounterparty_organizationId_publicId_key" ON "InsuranceCounterparty"("organizationId", "publicId");
CREATE INDEX "InsuranceCounterparty_organizationId_relationshipType_idx" ON "InsuranceCounterparty"("organizationId", "relationshipType");

ALTER TABLE "InsuranceApplicabilityDecision" ADD CONSTRAINT "InsuranceApplicabilityDecision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceDelegatedAuthority" ADD CONSTRAINT "InsuranceDelegatedAuthority_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceCounterparty" ADD CONSTRAINT "InsuranceCounterparty_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
