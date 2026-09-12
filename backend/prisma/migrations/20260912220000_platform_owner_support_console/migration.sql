-- Platform Owner & Support Console (additive)

DO $$ BEGIN ALTER TYPE "Role" ADD VALUE 'PLATFORM_OWNER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "Role" ADD VALUE 'SUPPORT_ADMIN'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "Role" ADD VALUE 'SUPPORT_ANALYST'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "Role" ADD VALUE 'BILLING_SUPPORT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "Role" ADD VALUE 'SECURITY_ADMIN'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "SupportTicketPriority" AS ENUM ('P1', 'P2', 'P3', 'P4'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupportTicketStatus" AS ENUM ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'WAITING_INTERNAL', 'RESOLVED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupportTicketCategory" AS ENUM ('ACCESS', 'ASSESSMENT', 'EVIDENCE', 'MALWARE', 'FINDINGS', 'REPORTS', 'BILLING', 'NOTIFICATIONS', 'INTEGRATION', 'PERFORMANCE', 'SECURITY', 'HOW_TO', 'FEATURE_REQUEST', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupportMessageVisibility" AS ENUM ('CUSTOMER', 'INTERNAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupportAccessLevel" AS ENUM ('READ_ONLY', 'LIMITED_SUPPORT_WRITE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupportSessionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'DENIED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PlatformIncidentSeverity" AS ENUM ('P1', 'P2', 'P3'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PlatformIncidentStatus" AS ENUM ('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DemoLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'QUALIFIED', 'CONVERTED', 'NOT_A_FIT', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" SERIAL NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "SupportTicketCategory" NOT NULL DEFAULT 'OTHER',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'P3',
    "requestedPriority" "SupportTicketPriority" NOT NULL DEFAULT 'P3',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'NEW',
    "assignedToUserId" TEXT,
    "securityIncident" BOOLEAN NOT NULL DEFAULT false,
    "diagnosticContext" JSONB,
    "resolutionSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");
CREATE INDEX IF NOT EXISTS "SupportTicket_organizationId_idx" ON "SupportTicket"("organizationId");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_priority_idx" ON "SupportTicket"("priority");
CREATE INDEX IF NOT EXISTS "SupportTicket_assignedToUserId_idx" ON "SupportTicket"("assignedToUserId");
CREATE INDEX IF NOT EXISTS "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

CREATE TABLE IF NOT EXISTS "SupportTicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "visibility" "SupportMessageVisibility" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_ticketId_idx" ON "SupportTicketMessage"("ticketId");

CREATE TABLE IF NOT EXISTS "PlatformIncident" (
    "id" TEXT NOT NULL,
    "incidentNumber" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "PlatformIncidentSeverity" NOT NULL,
    "status" "PlatformIncidentStatus" NOT NULL DEFAULT 'INVESTIGATING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "affectedServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ownerUserId" TEXT,
    "summary" TEXT NOT NULL,
    "rootCause" TEXT,
    "resolution" TEXT,
    "customerCommunication" TEXT NOT NULL DEFAULT 'INTERNAL_ONLY',
    "securityIncident" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformIncident_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformIncident_incidentNumber_key" ON "PlatformIncident"("incidentNumber");
CREATE INDEX IF NOT EXISTS "PlatformIncident_status_idx" ON "PlatformIncident"("status");
CREATE INDEX IF NOT EXISTS "PlatformIncident_severity_idx" ON "PlatformIncident"("severity");

CREATE TABLE IF NOT EXISTS "PlatformIncidentOrg" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    CONSTRAINT "PlatformIncidentOrg_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformIncidentOrg_incidentId_organizationId_key" ON "PlatformIncidentOrg"("incidentId", "organizationId");
CREATE INDEX IF NOT EXISTS "PlatformIncidentOrg_organizationId_idx" ON "PlatformIncidentOrg"("organizationId");

CREATE TABLE IF NOT EXISTS "SupportAccessSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT,
    "incident" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "reason" TEXT NOT NULL,
    "accessLevel" "SupportAccessLevel" NOT NULL DEFAULT 'READ_ONLY',
    "status" "SupportSessionStatus" NOT NULL DEFAULT 'REQUESTED',
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportAccessSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportAccessSession_organizationId_idx" ON "SupportAccessSession"("organizationId");
CREATE INDEX IF NOT EXISTS "SupportAccessSession_requestedByUserId_idx" ON "SupportAccessSession"("requestedByUserId");
CREATE INDEX IF NOT EXISTS "SupportAccessSession_status_idx" ON "SupportAccessSession"("status");
CREATE INDEX IF NOT EXISTS "SupportAccessSession_expiresAt_idx" ON "SupportAccessSession"("expiresAt");

CREATE TABLE IF NOT EXISTS "DemoLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "companySize" TEXT NOT NULL,
    "primaryNeed" TEXT NOT NULL,
    "intent" TEXT NOT NULL DEFAULT 'demo',
    "selectedPlan" TEXT,
    "source" TEXT,
    "salesNotification" TEXT NOT NULL,
    "prospectAcknowledgement" TEXT NOT NULL,
    "duplicateOf" TEXT,
    "leadStatus" "DemoLeadStatus" NOT NULL DEFAULT 'NEW',
    "assignedToUserId" TEXT,
    "internalNotes" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "nextAction" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DemoLead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DemoLead_email_idx" ON "DemoLead"("email");
CREATE INDEX IF NOT EXISTS "DemoLead_leadStatus_idx" ON "DemoLead"("leadStatus");
CREATE INDEX IF NOT EXISTS "DemoLead_submittedAt_idx" ON "DemoLead"("submittedAt");

CREATE TABLE IF NOT EXISTS "NotificationDeliveryLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recipientMask" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationDeliveryLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "NotificationDeliveryLog_organizationId_idx" ON "NotificationDeliveryLog"("organizationId");
CREATE INDEX IF NOT EXISTS "NotificationDeliveryLog_status_idx" ON "NotificationDeliveryLog"("status");
CREATE INDEX IF NOT EXISTS "NotificationDeliveryLog_eventType_idx" ON "NotificationDeliveryLog"("eventType");
CREATE INDEX IF NOT EXISTS "NotificationDeliveryLog_createdAt_idx" ON "NotificationDeliveryLog"("createdAt");

CREATE TABLE IF NOT EXISTS "OperationalEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "kind" TEXT NOT NULL,
    "failureClass" TEXT,
    "requestId" TEXT,
    "actorUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OperationalEvent_organizationId_idx" ON "OperationalEvent"("organizationId");
CREATE INDEX IF NOT EXISTS "OperationalEvent_kind_idx" ON "OperationalEvent"("kind");
CREATE INDEX IF NOT EXISTS "OperationalEvent_createdAt_idx" ON "OperationalEvent"("createdAt");

DO $$ BEGIN
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "PlatformIncident" ADD CONSTRAINT "PlatformIncident_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "PlatformIncidentOrg" ADD CONSTRAINT "PlatformIncidentOrg_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "PlatformIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "PlatformIncidentOrg" ADD CONSTRAINT "PlatformIncidentOrg_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "SupportAccessSession" ADD CONSTRAINT "SupportAccessSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "SupportAccessSession" ADD CONSTRAINT "SupportAccessSession_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "SupportAccessSession" ADD CONSTRAINT "SupportAccessSession_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "SupportAccessSession" ADD CONSTRAINT "SupportAccessSession_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "NotificationDeliveryLog" ADD CONSTRAINT "NotificationDeliveryLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "OperationalEvent" ADD CONSTRAINT "OperationalEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
