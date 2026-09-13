-- Additive #17 operational UX fields. Do not drop existing privacy tables.

ALTER TYPE "PrivacyDataKind" ADD VALUE IF NOT EXISTS 'SPECIAL_CATEGORY';

ALTER TYPE "PrivacyDeletionStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "PrivacyDeletionStatus" ADD VALUE IF NOT EXISTS 'AWAITING_VERIFICATION';
ALTER TYPE "PrivacyDeletionStatus" ADD VALUE IF NOT EXISTS 'EXCEPTION';
ALTER TYPE "PrivacyDeletionStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

DO $$ BEGIN
    CREATE TYPE "PrivacyNotificationStatus" AS ENUM (
        'REVIEW_REQUIRED',
        'ASSESSMENT_IN_PROGRESS',
        'NOTIFICATION_DETERMINED_REQUIRED',
        'NOTIFICATION_DETERMINED_NOT_REQUIRED',
        'CLOSED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PrivacyRightsRequest"
    ADD COLUMN IF NOT EXISTS "verificationMethod" TEXT,
    ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT,
    ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "verificationNotes" TEXT,
    ADD COLUMN IF NOT EXISTS "verificationException" TEXT,
    ADD COLUMN IF NOT EXISTS "verificationObjectId" TEXT;

ALTER TABLE "PrivacyConsentRecord"
    ADD COLUMN IF NOT EXISTS "providerStatus" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    ADD COLUMN IF NOT EXISTS "storedObjectId" TEXT,
    ADD COLUMN IF NOT EXISTS "evidenceNote" TEXT,
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PrivacyDeletionTask"
    ADD COLUMN IF NOT EXISTS "dataKind" "PrivacyDataKind",
    ADD COLUMN IF NOT EXISTS "systemName" TEXT,
    ADD COLUMN IF NOT EXISTS "vendorId" TEXT,
    ADD COLUMN IF NOT EXISTS "action" TEXT,
    ADD COLUMN IF NOT EXISTS "verification" TEXT,
    ADD COLUMN IF NOT EXISTS "exceptionReason" TEXT,
    ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "PrivacyIncidentAssessment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "incidentId" TEXT,
    "findingId" TEXT,
    "enterpriseRiskId" TEXT,
    "notificationStatus" "PrivacyNotificationStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "decision" TEXT,
    "ownerUserId" TEXT,
    "occurredAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivacyIncidentAssessment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PrivacyIncidentAssessment_organizationId_publicId_key"
    ON "PrivacyIncidentAssessment"("organizationId", "publicId");
CREATE INDEX IF NOT EXISTS "PrivacyIncidentAssessment_organizationId_notificationStatus_idx"
    ON "PrivacyIncidentAssessment"("organizationId", "notificationStatus");

ALTER TABLE "PrivacyIncidentLink"
    ADD COLUMN IF NOT EXISTS "assessmentId" TEXT;

DO $$ BEGIN
    ALTER TABLE "PrivacyIncidentLink"
        ADD CONSTRAINT "PrivacyIncidentLink_assessmentId_fkey"
        FOREIGN KEY ("assessmentId") REFERENCES "PrivacyIncidentAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
