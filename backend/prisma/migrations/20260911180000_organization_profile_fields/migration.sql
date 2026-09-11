-- Organization profile fields used by Administration.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
