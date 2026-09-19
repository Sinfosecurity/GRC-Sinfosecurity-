-- Wave 4 closure: request-scoped compensating-control idempotency.
ALTER TABLE "EngagementCompensatingControl" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "EngagementCompensatingControl_organizationId_engagementId_idempotencyKey_key"
ON "EngagementCompensatingControl"("organizationId", "engagementId", "idempotencyKey");
