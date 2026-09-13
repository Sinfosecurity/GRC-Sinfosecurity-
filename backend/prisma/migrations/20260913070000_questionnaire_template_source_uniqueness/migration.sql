-- Canonical Supreme templates are platform-scoped. PostgreSQL UNIQUE does not
-- treat NULL organizationId as equal, so the previous application unique
-- (organizationId, name, version) could not prevent duplicate platform rows.
-- Backfill source/scope, remap assessments onto the oldest row per key, then
-- enforce uniqueness. Do not drop tables.

DO $$ BEGIN
    CREATE TYPE "QuestionnaireTemplateSource" AS ENUM ('SUPREME', 'ORGANIZATION', 'CLONED', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "QuestionnaireTemplate" ADD COLUMN IF NOT EXISTS "source" "QuestionnaireTemplateSource" NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE "QuestionnaireTemplate" ADD COLUMN IF NOT EXISTS "libraryKey" TEXT;
ALTER TABLE "QuestionnaireTemplate" ADD COLUMN IF NOT EXISTS "scopeKey" TEXT;

UPDATE "QuestionnaireTemplate"
SET "scopeKey" = COALESCE("organizationId", 'platform')
WHERE "scopeKey" IS NULL OR "scopeKey" = '';

UPDATE "QuestionnaireTemplate"
SET "source" = 'SUPREME'
WHERE "organizationId" IS NULL;

UPDATE "QuestionnaireTemplate"
SET "source" = 'CLONED'
WHERE "organizationId" IS NOT NULL
  AND (
      "name" ILIKE '%copy%'
      OR "name" ILIKE '%— Custom%'
      OR "name" ILIKE '%- Custom%'
  );

UPDATE "QuestionnaireTemplate"
SET "source" = 'ORGANIZATION'
WHERE "organizationId" IS NOT NULL
  AND "source" = 'CUSTOM';

UPDATE "QuestionnaireTemplate" AS t
SET "libraryKey" = v.key
FROM (
    VALUES
        ('Inherent Risk Questionnaire', 'inherent-risk'),
        ('Information Security Assessment', 'information-security'),
        ('Privacy & Data Protection Assessment', 'privacy'),
        ('Business Continuity / Disaster Recovery Assessment', 'bcdr'),
        ('Access Control & Identity Assessment', 'identity'),
        ('Cloud / SaaS Security Assessment', 'cloud-saas'),
        ('Incident Response & Breach Management Assessment', 'incident'),
        ('Fourth-Party / Subcontractor Risk Assessment', 'fourth-party'),
        ('Financial & Operational Resilience Assessment', 'resilience'),
        ('Regulatory / Compliance Assessment', 'regulatory'),
        ('NIST CSF-Aligned Cybersecurity Assessment', 'nist-csf'),
        ('NIST SP 800-171-Aligned Assessment', 'nist-800-171'),
        ('CMMC Readiness Assessment', 'cmmc'),
        ('ISO 27001-Aligned Security Assessment', 'iso27001'),
        ('SOC 2 Evidence / Assurance Review', 'soc2'),
        ('Supreme Risk Standard Due Diligence', 'standard-due-diligence')
) AS v(name, key)
WHERE t."organizationId" IS NULL
  AND t."name" = v.name
  AND t."libraryKey" IS NULL;

WITH ranked AS (
    SELECT
        id,
        "scopeKey",
        name,
        version,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE("scopeKey", 'platform'), name, version
            ORDER BY "createdAt" ASC, id ASC
        ) AS rn
    FROM "QuestionnaireTemplate"
),
canonical AS (
    SELECT "scopeKey", name, version, id AS canonical_id
    FROM ranked
    WHERE rn = 1
),
dups AS (
    SELECT r.id AS dup_id, c.canonical_id
    FROM ranked r
    JOIN canonical c
      ON c."scopeKey" = r."scopeKey"
     AND c.name = r.name
     AND c.version = r.version
    WHERE r.rn > 1
)
UPDATE "VendorAssessment" va
SET "templateId" = d.canonical_id
FROM dups d
WHERE va."templateId" = d.dup_id;

WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE("scopeKey", 'platform'), name, version
            ORDER BY "createdAt" ASC, id ASC
        ) AS rn
    FROM "QuestionnaireTemplate"
),
dups AS (
    SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM "QuestionnaireTemplate" t
WHERE t.id IN (SELECT id FROM dups)
  AND NOT EXISTS (
      SELECT 1 FROM "VendorAssessment" va WHERE va."templateId" = t.id
  );

WITH ranked AS (
    SELECT
        id,
        name,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE("scopeKey", 'platform'), name, version
            ORDER BY "createdAt" ASC, id ASC
        ) AS rn
    FROM "QuestionnaireTemplate"
)
UPDATE "QuestionnaireTemplate" t
SET
    "name" = t.name || ' (archived duplicate)',
    "isActive" = false,
    "libraryKey" = NULL
FROM ranked r
WHERE t.id = r.id
  AND r.rn > 1;

UPDATE "QuestionnaireTemplate"
SET "scopeKey" = COALESCE("organizationId", 'platform')
WHERE "scopeKey" IS NULL OR "scopeKey" = '';

ALTER TABLE "QuestionnaireTemplate" ALTER COLUMN "scopeKey" SET DEFAULT 'platform';
ALTER TABLE "QuestionnaireTemplate" ALTER COLUMN "scopeKey" SET NOT NULL;

DROP INDEX IF EXISTS "QuestionnaireTemplate_organizationId_name_version_key";

CREATE UNIQUE INDEX IF NOT EXISTS "QuestionnaireTemplate_scopeKey_name_version_key"
    ON "QuestionnaireTemplate"("scopeKey", "name", "version");

CREATE UNIQUE INDEX IF NOT EXISTS "QuestionnaireTemplate_scopeKey_libraryKey_key"
    ON "QuestionnaireTemplate"("scopeKey", "libraryKey")
    WHERE "libraryKey" IS NOT NULL;
