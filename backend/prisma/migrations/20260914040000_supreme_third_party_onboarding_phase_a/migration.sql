-- Additive Third Party onboarding Phase A. Existing Vendor UUID remains the primary key.

CREATE TYPE "VendorOnboardingStage" AS ENUM ('REQUEST', 'INTAKE', 'TIER_REVIEW', 'DUE_DILIGENCE_PLAN', 'READY_TO_SEND');

ALTER TABLE "Vendor"
ADD COLUMN "publicId" TEXT,
ADD COLUMN "domain" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "requesterUserId" TEXT,
ADD COLUMN "businessOwnerUserId" TEXT,
ADD COLUMN "relationshipOwnerUserId" TEXT,
ADD COLUMN "businessUnit" TEXT,
ADD COLUMN "estimatedAnnualSpend" DECIMAL(15, 2),
ADD COLUMN "targetStartDate" TIMESTAMP(3);

WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId", EXTRACT(YEAR FROM "createdAt")::int
      ORDER BY "createdAt" ASC, id ASC
    ) AS seq,
    EXTRACT(YEAR FROM "createdAt")::int AS year
  FROM "Vendor"
)
UPDATE "Vendor" v
SET "publicId" = 'VND-' || numbered.year::text || '-' || LPAD(numbered.seq::text, 4, '0')
FROM numbered
WHERE v.id = numbered.id
  AND v."publicId" IS NULL;

UPDATE "Vendor"
SET "domain" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE("website", ''), '^https?://', '', 'i'), '^www\\.', '', 'i'))
WHERE "website" IS NOT NULL
  AND "domain" IS NULL;

CREATE UNIQUE INDEX "Vendor_organizationId_publicId_key" ON "Vendor"("organizationId", "publicId");
CREATE INDEX "Vendor_organizationId_domain_idx" ON "Vendor"("organizationId", "domain");
CREATE INDEX "Vendor_businessOwnerUserId_idx" ON "Vendor"("businessOwnerUserId");

CREATE TABLE "VendorOnboarding" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stage" "VendorOnboardingStage" NOT NULL DEFAULT 'INTAKE',
    "intakeAssessmentId" TEXT,
    "intakeDueAt" TIMESTAMP(3),
    "intakeStartedAt" TIMESTAMP(3),
    "intakeCompletedAt" TIMESTAMP(3),
    "intakeAttestedAt" TIMESTAMP(3),
    "intakeAttestedBy" TEXT,
    "recommendedTier" "VendorTier",
    "recommendedScore" INTEGER,
    "recommendedFactors" JSONB,
    "hardFloors" JSONB,
    "confirmedTier" "VendorTier",
    "tierConfirmedAt" TIMESTAMP(3),
    "tierConfirmedBy" TEXT,
    "overrideReason" TEXT,
    "previousRecommendedTier" "VendorTier",
    "tierReviewDueAt" TIMESTAMP(3),
    "plan" JSONB,
    "planConfirmedAt" TIMESTAMP(3),
    "planConfirmedBy" TEXT,
    "lastReminderAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorOnboarding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorOnboarding_vendorId_key" ON "VendorOnboarding"("vendorId");
CREATE INDEX "VendorOnboarding_organizationId_idx" ON "VendorOnboarding"("organizationId");
CREATE INDEX "VendorOnboarding_organizationId_stage_idx" ON "VendorOnboarding"("organizationId", "stage");
CREATE INDEX "VendorOnboarding_intakeDueAt_idx" ON "VendorOnboarding"("intakeDueAt");
CREATE INDEX "VendorOnboarding_tierReviewDueAt_idx" ON "VendorOnboarding"("tierReviewDueAt");

ALTER TABLE "VendorOnboarding" ADD CONSTRAINT "VendorOnboarding_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorOnboarding" ADD CONSTRAINT "VendorOnboarding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
