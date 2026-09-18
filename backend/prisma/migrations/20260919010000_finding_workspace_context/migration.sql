-- Finding workspace source snapshot and responsibility.
-- Does not change scoring, closure evidence rules, or risk acceptance.

ALTER TABLE "VendorIssue"
ADD COLUMN IF NOT EXISTS "sourceSnapshot" JSONB,
ADD COLUMN IF NOT EXISTS "responsibility" TEXT;
