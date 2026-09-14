-- Additive #18 closure: first-class model version history and change review fields.
ALTER TABLE "AiSystemModel" ADD COLUMN IF NOT EXISTS "modelVersion" TEXT;
ALTER TABLE "AiSystemModel" ADD COLUMN IF NOT EXISTS "priorVersion" TEXT;
ALTER TABLE "AiSystemModel" ADD COLUMN IF NOT EXISTS "changeReason" TEXT;
ALTER TABLE "AiSystemModel" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'CURRENT';

ALTER TABLE "AiChange" ADD COLUMN IF NOT EXISTS "priorVersion" TEXT;
ALTER TABLE "AiChange" ADD COLUMN IF NOT EXISTS "newVersion" TEXT;
ALTER TABLE "AiChange" ADD COLUMN IF NOT EXISTS "changeReason" TEXT;
ALTER TABLE "AiChange" ADD COLUMN IF NOT EXISTS "impact" JSONB;

UPDATE "AiSystemModel" AS model
SET "modelVersion" = provider."modelVersion"
FROM "AiModelProvider" AS provider
WHERE model."providerId" = provider.id
  AND model."modelVersion" IS NULL
  AND provider."modelVersion" IS NOT NULL;
