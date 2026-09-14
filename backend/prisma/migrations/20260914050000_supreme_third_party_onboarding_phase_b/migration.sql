-- Additive Phase B vendor-facing due diligence. No destructive changes.

ALTER TYPE "VendorOnboardingStage" ADD VALUE IF NOT EXISTS 'AWAITING_VENDOR';
ALTER TYPE "VendorOnboardingStage" ADD VALUE IF NOT EXISTS 'VENDOR_IN_PROGRESS';
ALTER TYPE "VendorOnboardingStage" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "VendorOnboardingStage" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';

CREATE TYPE "VendorInvitationStatus" AS ENUM ('PENDING', 'ACTIVATED', 'EXPIRED', 'REVOKED', 'COMPLETED');
CREATE TYPE "IssueReviewState" AS ENUM ('DRAFT', 'CONFIRMED', 'DISMISSED');

ALTER TABLE "VendorOnboarding"
ADD COLUMN "assessmentContactId" TEXT,
ADD COLUMN "invitationId" TEXT,
ADD COLUMN "dueDiligenceDueAt" TIMESTAMP(3),
ADD COLUMN "dueDiligenceSentAt" TIMESTAMP(3),
ADD COLUMN "dueDiligenceSentBy" TEXT,
ADD COLUMN "vendorActivatedAt" TIMESTAMP(3),
ADD COLUMN "vendorSubmittedAt" TIMESTAMP(3);

CREATE INDEX "VendorOnboarding_dueDiligenceDueAt_idx" ON "VendorOnboarding"("dueDiligenceDueAt");

ALTER TABLE "VendorContact"
ADD COLUMN "isAssessmentContact" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastActivatedAt" TIMESTAMP(3);

CREATE INDEX "VendorContact_vendorId_email_idx" ON "VendorContact"("vendorId", "email");

ALTER TABLE "VendorAssessment"
ADD COLUMN "assignedContactId" TEXT,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "respondentPlane" TEXT NOT NULL DEFAULT 'CUSTOMER',
ADD COLUMN "attestationStatement" TEXT,
ADD COLUMN "attestationVersion" TEXT,
ADD COLUMN "attestedByName" TEXT,
ADD COLUMN "attestedAt" TIMESTAMP(3),
ADD COLUMN "clarificationQuestionIds" JSONB;

CREATE INDEX "VendorAssessment_assignedContactId_idx" ON "VendorAssessment"("assignedContactId");
CREATE INDEX "VendorAssessment_organizationId_respondentPlane_idx" ON "VendorAssessment"("organizationId", "respondentPlane");

ALTER TABLE "VendorIssue"
ADD COLUMN "assessmentId" TEXT,
ADD COLUMN "questionId" TEXT,
ADD COLUMN "reviewState" "IssueReviewState" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN "draftRuleCode" TEXT,
ADD COLUMN "dismissReason" TEXT,
ADD COLUMN "dismissedBy" TEXT,
ADD COLUMN "dismissedAt" TIMESTAMP(3),
ADD COLUMN "severityAdjustReason" TEXT;

CREATE INDEX "VendorIssue_reviewState_idx" ON "VendorIssue"("reviewState");
CREATE INDEX "VendorIssue_assessmentId_idx" ON "VendorIssue"("assessmentId");

CREATE TABLE "VendorAssessmentInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorContactId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "VendorInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "emailProvider" TEXT,
    "providerMessageId" TEXT,
    "emailDeliveryStatus" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "emailDeliveredAt" TIMESTAMP(3),
    "emailFailedAt" TIMESTAMP(3),
    "emailLastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VendorAssessmentInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorAssessmentInvitation_tokenHash_key" ON "VendorAssessmentInvitation"("tokenHash");
CREATE INDEX "VendorAssessmentInvitation_organizationId_vendorId_idx" ON "VendorAssessmentInvitation"("organizationId", "vendorId");
CREATE INDEX "VendorAssessmentInvitation_vendorContactId_idx" ON "VendorAssessmentInvitation"("vendorContactId");
CREATE INDEX "VendorAssessmentInvitation_providerMessageId_idx" ON "VendorAssessmentInvitation"("providerMessageId");

CREATE TABLE "VendorPortalSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorContactId" TEXT NOT NULL,
    "invitationId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendorPortalSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorPortalSession_tokenHash_key" ON "VendorPortalSession"("tokenHash");
CREATE INDEX "VendorPortalSession_organizationId_vendorId_idx" ON "VendorPortalSession"("organizationId", "vendorId");
CREATE INDEX "VendorPortalSession_vendorContactId_idx" ON "VendorPortalSession"("vendorContactId");

ALTER TABLE "VendorAssessmentInvitation"
ADD CONSTRAINT "VendorAssessmentInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "VendorAssessmentInvitation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "VendorAssessmentInvitation_vendorContactId_fkey" FOREIGN KEY ("vendorContactId") REFERENCES "VendorContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VendorPortalSession"
ADD CONSTRAINT "VendorPortalSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "VendorPortalSession_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "VendorPortalSession_vendorContactId_fkey" FOREIGN KEY ("vendorContactId") REFERENCES "VendorContact"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "VendorPortalSession_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "VendorAssessmentInvitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
