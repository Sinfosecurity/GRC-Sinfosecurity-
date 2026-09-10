-- Additive TPRM: evidence linkage and versioned org scoring methodology.

CREATE TABLE IF NOT EXISTS "EvidenceLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storedObjectId" TEXT NOT NULL,
    "vendorId" TEXT,
    "assessmentId" TEXT,
    "issueId" TEXT,
    "questionId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EvidenceLink_organizationId_idx" ON "EvidenceLink"("organizationId");
CREATE INDEX IF NOT EXISTS "EvidenceLink_storedObjectId_idx" ON "EvidenceLink"("storedObjectId");
CREATE INDEX IF NOT EXISTS "EvidenceLink_vendorId_idx" ON "EvidenceLink"("vendorId");
CREATE INDEX IF NOT EXISTS "EvidenceLink_assessmentId_idx" ON "EvidenceLink"("assessmentId");
CREATE INDEX IF NOT EXISTS "EvidenceLink_issueId_idx" ON "EvidenceLink"("issueId");

DO $$ BEGIN
    ALTER TABLE "EvidenceLink"
        ADD CONSTRAINT "EvidenceLink_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "EvidenceLink"
        ADD CONSTRAINT "EvidenceLink_storedObjectId_fkey"
        FOREIGN KEY ("storedObjectId") REFERENCES "StoredObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ScoringMethodology" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "weights" JSONB NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringMethodology_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScoringMethodology_organizationId_version_key" ON "ScoringMethodology"("organizationId", "version");
CREATE INDEX IF NOT EXISTS "ScoringMethodology_organizationId_isActive_idx" ON "ScoringMethodology"("organizationId", "isActive");

DO $$ BEGIN
    ALTER TABLE "ScoringMethodology"
        ADD CONSTRAINT "ScoringMethodology_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
