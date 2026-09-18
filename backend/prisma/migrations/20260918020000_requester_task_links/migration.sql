-- AlterTable
ALTER TABLE "VendorOnboarding" ADD COLUMN IF NOT EXISTS "requesterName" TEXT;
ALTER TABLE "VendorOnboarding" ADD COLUMN IF NOT EXISTS "requesterEmail" TEXT;
ALTER TABLE "VendorOnboarding" ADD COLUMN IF NOT EXISTS "engagementPublicId" TEXT;
ALTER TABLE "VendorOnboarding" ADD COLUMN IF NOT EXISTS "iraAnswers" JSONB;
ALTER TABLE "VendorOnboarding" ADD COLUMN IF NOT EXISTS "iraUnknownCount" INTEGER;
ALTER TABLE "VendorOnboarding" ADD COLUMN IF NOT EXISTS "screeningStatus" TEXT NOT NULL DEFAULT 'CLEAR';
ALTER TABLE "VendorOnboarding" ADD COLUMN IF NOT EXISTS "externalRating" JSONB;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "RequesterTaskPurpose" AS ENUM ('IRA', 'CLARIFICATION', 'FINDING_DECISION', 'SCOPE_CHANGE', 'ATTESTATION', 'OFFBOARDING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RequesterTaskStatus" AS ENUM ('PENDING', 'OPENED', 'SUBMITTED', 'EXPIRED', 'REVOKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "RequesterTaskLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "purpose" "RequesterTaskPurpose" NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "RequesterTaskStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "deliveryMethod" TEXT,
    "emailDeliveryStatus" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "markedSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequesterTaskLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RequesterTaskLink_tokenHash_key" ON "RequesterTaskLink"("tokenHash");
CREATE INDEX IF NOT EXISTS "RequesterTaskLink_organizationId_vendorId_purpose_idx" ON "RequesterTaskLink"("organizationId", "vendorId", "purpose");
CREATE INDEX IF NOT EXISTS "RequesterTaskLink_email_idx" ON "RequesterTaskLink"("email");

ALTER TABLE "RequesterTaskLink" DROP CONSTRAINT IF EXISTS "RequesterTaskLink_organizationId_fkey";
ALTER TABLE "RequesterTaskLink" ADD CONSTRAINT "RequesterTaskLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequesterTaskLink" DROP CONSTRAINT IF EXISTS "RequesterTaskLink_vendorId_fkey";
ALTER TABLE "RequesterTaskLink" ADD CONSTRAINT "RequesterTaskLink_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
