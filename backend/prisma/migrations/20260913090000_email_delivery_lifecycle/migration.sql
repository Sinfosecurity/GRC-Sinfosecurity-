ALTER TABLE "AccountInvitation" ADD COLUMN IF NOT EXISTS "emailProvider" TEXT;
ALTER TABLE "AccountInvitation" ADD COLUMN IF NOT EXISTS "providerMessageId" TEXT;
ALTER TABLE "AccountInvitation" ADD COLUMN IF NOT EXISTS "emailDeliveryStatus" TEXT;
ALTER TABLE "AccountInvitation" ADD COLUMN IF NOT EXISTS "emailSentAt" TIMESTAMP(3);
ALTER TABLE "AccountInvitation" ADD COLUMN IF NOT EXISTS "emailDeliveredAt" TIMESTAMP(3);
ALTER TABLE "AccountInvitation" ADD COLUMN IF NOT EXISTS "emailFailedAt" TIMESTAMP(3);
ALTER TABLE "AccountInvitation" ADD COLUMN IF NOT EXISTS "emailLastError" TEXT;

CREATE INDEX IF NOT EXISTS "AccountInvitation_providerMessageId_idx" ON "AccountInvitation"("providerMessageId");

ALTER TABLE "NotificationDeliveryLog" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "NotificationDeliveryLog" ADD COLUMN IF NOT EXISTS "providerMessageId" TEXT;
ALTER TABLE "NotificationDeliveryLog" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "NotificationDeliveryLog" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "NotificationDeliveryLog" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "NotificationDeliveryLog" ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "NotificationDeliveryLog_providerMessageId_idx" ON "NotificationDeliveryLog"("providerMessageId");

CREATE TABLE IF NOT EXISTS "EmailDeliveryEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "eventType" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL,
    "recipientMask" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "organizationId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailDeliveryEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailDeliveryEvent_providerEventId_key" ON "EmailDeliveryEvent"("providerEventId");
CREATE INDEX IF NOT EXISTS "EmailDeliveryEvent_providerMessageId_idx" ON "EmailDeliveryEvent"("providerMessageId");
CREATE INDEX IF NOT EXISTS "EmailDeliveryEvent_resourceId_idx" ON "EmailDeliveryEvent"("resourceId");
CREATE INDEX IF NOT EXISTS "EmailDeliveryEvent_organizationId_idx" ON "EmailDeliveryEvent"("organizationId");
