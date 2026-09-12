-- Additive identity plane, MFA recovery, elevation, and customer/break-glass support fields.

ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "plane" TEXT NOT NULL DEFAULT 'CUSTOMER';
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "mfaSatisfied" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnrolledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastMfaVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaLastCounter" INTEGER;

DO $$ BEGIN
    CREATE TYPE "SupportApprovalKind" AS ENUM ('CUSTOMER', 'BREAK_GLASS');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "SupportCustomerDecision" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'REVOKED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SupportAccessSession" ADD COLUMN IF NOT EXISTS "customerApproverUserId" TEXT;
ALTER TABLE "SupportAccessSession" ADD COLUMN IF NOT EXISTS "scope" TEXT;
ALTER TABLE "SupportAccessSession" ADD COLUMN IF NOT EXISTS "approvalKind" "SupportApprovalKind" NOT NULL DEFAULT 'CUSTOMER';
ALTER TABLE "SupportAccessSession" ADD COLUMN IF NOT EXISTS "customerDecision" "SupportCustomerDecision" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "SupportAccessSession" ADD COLUMN IF NOT EXISTS "breakGlass" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SupportAccessSession" ADD COLUMN IF NOT EXISTS "postEventReviewRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SupportAccessSession" ADD COLUMN IF NOT EXISTS "customerApprovedAt" TIMESTAMP(3);
ALTER TABLE "SupportAccessSession" ADD COLUMN IF NOT EXISTS "customerDeniedAt" TIMESTAMP(3);
ALTER TABLE "SupportAccessSession" ADD COLUMN IF NOT EXISTS "deniedByUserId" TEXT;

CREATE TABLE IF NOT EXISTS "MfaRecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuthChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PrivilegeElevation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "requestId" TEXT,
    CONSTRAINT "PrivilegeElevation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthChallenge_tokenHash_key" ON "AuthChallenge"("tokenHash");
CREATE INDEX IF NOT EXISTS "MfaRecoveryCode_userId_idx" ON "MfaRecoveryCode"("userId");
CREATE INDEX IF NOT EXISTS "AuthChallenge_userId_purpose_idx" ON "AuthChallenge"("userId", "purpose");
CREATE INDEX IF NOT EXISTS "PrivilegeElevation_userId_expiresAt_idx" ON "PrivilegeElevation"("userId", "expiresAt");

DO $$ BEGIN
    ALTER TABLE "SupportAccessSession"
        ADD CONSTRAINT "SupportAccessSession_customerApproverUserId_fkey"
        FOREIGN KEY ("customerApproverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "MfaRecoveryCode"
        ADD CONSTRAINT "MfaRecoveryCode_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "AuthChallenge"
        ADD CONSTRAINT "AuthChallenge_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "PrivilegeElevation"
        ADD CONSTRAINT "PrivilegeElevation_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
