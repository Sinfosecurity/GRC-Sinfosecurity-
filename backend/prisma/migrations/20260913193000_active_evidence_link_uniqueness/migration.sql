-- Keep the newest active reuse link when QA accidentally created duplicates.
UPDATE "EvidenceGovernanceLink" AS keep
SET "validTo" = NOW()
WHERE keep."validTo" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "EvidenceGovernanceLink" AS newer
    WHERE newer."organizationId" = keep."organizationId"
      AND newer."storedObjectId" = keep."storedObjectId"
      AND newer."targetType" = keep."targetType"
      AND newer."targetId" = keep."targetId"
      AND newer."relationship" = keep."relationship"
      AND newer."validTo" IS NULL
      AND (
        newer."createdAt" > keep."createdAt"
        OR (newer."createdAt" = keep."createdAt" AND newer."id" > keep."id")
      )
  );

-- Different relationship or a later version after unlink remains allowed.
CREATE UNIQUE INDEX "EvidenceGovernanceLink_active_unique"
ON "EvidenceGovernanceLink" ("organizationId", "storedObjectId", "targetType", "targetId", "relationship")
WHERE "validTo" IS NULL;
