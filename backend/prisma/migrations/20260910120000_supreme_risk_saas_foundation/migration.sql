-- Supreme Risk additive SaaS foundation.
-- Safe for existing databases that were created with prisma db push.
-- Coordinate on production: review, backup, then apply.

-- Role / status enums
DO $$ BEGIN
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PLATFORM_ADMIN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ORGANIZATION_ADMIN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ASSESSOR';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'APPROVER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BUSINESS_OWNER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VIEWER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE "VendorStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE "VendorStatus" ADD VALUE IF NOT EXISTS 'OFFBOARDING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE "VendorIssueStatus" ADD VALUE IF NOT EXISTS 'REMEDIATED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'DISABLED', 'PENDING_ACTIVATION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "OrganizationStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'FAILED', 'NOT_CONFIGURED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "IntegrationStatus" AS ENUM ('NOT_CONFIGURED', 'CONNECTED', 'DISCONNECTED', 'ERROR', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaSecretEnc" TEXT;
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "status" "OrganizationStatus" NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'STARTER';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "trialStart" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "trialEnd" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "billingCustomerId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC';
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX IF NOT EXISTS "Organization_status_idx" ON "Organization"("status");
CREATE INDEX IF NOT EXISTS "Organization_billingCustomerId_idx" ON "Organization"("billingCustomerId");

ALTER TABLE "VendorAssessment" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
ALTER TABLE "VendorAssessment" ADD COLUMN IF NOT EXISTS "templateVersion" TEXT;
ALTER TABLE "VendorAssessment" ADD COLUMN IF NOT EXISTS "scoreVersion" TEXT;
ALTER TABLE "VendorAssessment" ADD COLUMN IF NOT EXISTS "scoreMetadata" JSONB;

ALTER TABLE "AssessmentResponse" ADD COLUMN IF NOT EXISTS "reviewerComment" TEXT;
ALTER TABLE "AssessmentResponse" ADD COLUMN IF NOT EXISTS "optionValue" TEXT;

ALTER TABLE "VendorDocument" ADD COLUMN IF NOT EXISTS "storageKey" TEXT;
ALTER TABLE "VendorDocument" ADD COLUMN IF NOT EXISTS "checksum" TEXT;
ALTER TABLE "VendorDocument" ADD COLUMN IF NOT EXISTS "scanStatus" "ScanStatus" NOT NULL DEFAULT 'NOT_CONFIGURED';
ALTER TABLE "VendorDocument" ADD COLUMN IF NOT EXISTS "storedObjectId" TEXT;

CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

CREATE TABLE IF NOT EXISTS "AccountInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invitedById" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AccountInvitation_tokenHash_key" ON "AccountInvitation"("tokenHash");

CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "result" TEXT NOT NULL,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditEvent_organizationId_timestamp_idx" ON "AuditEvent"("organizationId", "timestamp");

CREATE TABLE IF NOT EXISTS "StoredObject" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classification" TEXT NOT NULL DEFAULT 'INTERNAL',
    "scanStatus" "ScanStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "retentionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "StoredObject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StoredObject_storageKey_key" ON "StoredObject"("storageKey");
CREATE INDEX IF NOT EXISTS "StoredObject_organizationId_idx" ON "StoredObject"("organizationId");

CREATE TABLE IF NOT EXISTS "QuestionnaireTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuestionnaireTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuestionnaireSection" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "QuestionnaireSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuestionnaireQuestion" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL DEFAULT 'SINGLE_CHOICE',
    "category" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "conditionalOnKey" TEXT,
    "conditionalValue" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuestionnaireQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ScoreCalculation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "scoreVersion" TEXT NOT NULL,
    "inherentRisk" INTEGER NOT NULL,
    "controlEffectiveness" INTEGER NOT NULL,
    "residualRisk" INTEGER NOT NULL,
    "riskBand" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoreCalculation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ScoreCalculation_vendorId_idx" ON "ScoreCalculation"("vendorId");

CREATE TABLE IF NOT EXISTS "InAppNotification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT,
    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_eventType_key" ON "NotificationPreference"("userId", "eventType");

CREATE TABLE IF NOT EXISTS "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "configEnc" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationConnection_organizationId_provider_key" ON "IntegrationConnection"("organizationId", "provider");

CREATE TABLE IF NOT EXISTS "AiOperationLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "success" BOOLEAN NOT NULL,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiOperationLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SubscriptionEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadSummary" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionEvent_stripeEventId_key" ON "SubscriptionEvent"("stripeEventId");
