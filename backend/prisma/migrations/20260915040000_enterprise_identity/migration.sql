CREATE TYPE "IdentityProtocol" AS ENUM ('SAML', 'OIDC');
CREATE TYPE "IdentityProviderStatus" AS ENUM ('DRAFT', 'CONFIGURED', 'TESTED', 'ENABLED', 'DISABLED');
CREATE TYPE "SsoEnforcement" AS ENUM ('OPTIONAL', 'REQUIRED');
CREATE TYPE "DomainVerificationStatus" AS ENUM ('PENDING', 'VERIFIED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "sessionEpoch" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "provisioningSource" TEXT;
ALTER TABLE "User" ADD COLUMN "lastSsoAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "IdentityProvider" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "protocol" "IdentityProtocol" NOT NULL,
    "status" "IdentityProviderStatus" NOT NULL DEFAULT 'DRAFT',
    "ssoEnforcement" "SsoEnforcement" NOT NULL DEFAULT 'OPTIONAL',
    "jitEnabled" BOOLEAN NOT NULL DEFAULT false,
    "passwordLoginAllowed" BOOLEAN NOT NULL DEFAULT true,
    "defaultRole" "Role" NOT NULL DEFAULT 'VIEWER',
    "recoveryUserId" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "lastSsoAt" TIMESTAMP(3),
    "lastScimAt" TIMESTAMP(3),
    "enabledAt" TIMESTAMP(3),
    "idpEntityId" TEXT,
    "ssoUrl" TEXT,
    "idpCertificate" TEXT,
    "spEntityId" TEXT,
    "nameIdFormat" TEXT,
    "emailAttribute" TEXT NOT NULL DEFAULT 'email',
    "firstNameAttribute" TEXT NOT NULL DEFAULT 'firstName',
    "lastNameAttribute" TEXT NOT NULL DEFAULT 'lastName',
    "groupsAttribute" TEXT NOT NULL DEFAULT 'groups',
    "issuer" TEXT,
    "authorizationEndpoint" TEXT,
    "tokenEndpoint" TEXT,
    "jwksUri" TEXT,
    "clientId" TEXT,
    "clientSecretEnc" TEXT,
    "scopes" TEXT NOT NULL DEFAULT 'openid email profile',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityProvider_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdentityProvider_publicId_key" ON "IdentityProvider"("publicId");
CREATE INDEX "IdentityProvider_organizationId_status_idx" ON "IdentityProvider"("organizationId", "status");

ALTER TABLE "IdentityProvider" ADD CONSTRAINT "IdentityProvider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdentityProvider" ADD CONSTRAINT "IdentityProvider_recoveryUserId_fkey" FOREIGN KEY ("recoveryUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "IdentityDomain" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerId" TEXT,
    "domain" TEXT NOT NULL,
    "status" "DomainVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationTokenHash" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdentityDomain_domain_key" ON "IdentityDomain"("domain");
CREATE INDEX "IdentityDomain_organizationId_idx" ON "IdentityDomain"("organizationId");
ALTER TABLE "IdentityDomain" ADD CONSTRAINT "IdentityDomain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdentityDomain" ADD CONSTRAINT "IdentityDomain_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "IdentityProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "IdentityRoleMapping" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "idpGroup" TEXT NOT NULL,
    "supremeRole" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityRoleMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdentityRoleMapping_providerId_idpGroup_key" ON "IdentityRoleMapping"("providerId", "idpGroup");
CREATE INDEX "IdentityRoleMapping_organizationId_idx" ON "IdentityRoleMapping"("organizationId");
ALTER TABLE "IdentityRoleMapping" ADD CONSTRAINT "IdentityRoleMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdentityRoleMapping" ADD CONSTRAINT "IdentityRoleMapping_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "IdentityProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "IdentityExternalAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "emailAtLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "IdentityExternalAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdentityExternalAccount_issuer_subject_key" ON "IdentityExternalAccount"("issuer", "subject");
CREATE UNIQUE INDEX "IdentityExternalAccount_userId_providerId_key" ON "IdentityExternalAccount"("userId", "providerId");
CREATE INDEX "IdentityExternalAccount_organizationId_idx" ON "IdentityExternalAccount"("organizationId");
ALTER TABLE "IdentityExternalAccount" ADD CONSTRAINT "IdentityExternalAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdentityExternalAccount" ADD CONSTRAINT "IdentityExternalAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdentityExternalAccount" ADD CONSTRAINT "IdentityExternalAccount_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "IdentityProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SsoLoginState" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "nonce" TEXT,
    "codeVerifier" TEXT,
    "requestId" TEXT,
    "purpose" TEXT NOT NULL,
    "actorUserId" TEXT,
    "redirectTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SsoLoginState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SsoLoginState_state_key" ON "SsoLoginState"("state");
CREATE INDEX "SsoLoginState_organizationId_expiresAt_idx" ON "SsoLoginState"("organizationId", "expiresAt");
ALTER TABLE "SsoLoginState" ADD CONSTRAINT "SsoLoginState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SsoLoginState" ADD CONSTRAINT "SsoLoginState_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "IdentityProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SsoReplayRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "assertionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SsoReplayRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SsoReplayRecord_providerId_assertionId_key" ON "SsoReplayRecord"("providerId", "assertionId");
CREATE INDEX "SsoReplayRecord_expiresAt_idx" ON "SsoReplayRecord"("expiresAt");
ALTER TABLE "SsoReplayRecord" ADD CONSTRAINT "SsoReplayRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SsoReplayRecord" ADD CONSTRAINT "SsoReplayRecord_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "IdentityProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ScimToken" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerId" TEXT,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ScimToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScimToken_publicId_key" ON "ScimToken"("publicId");
CREATE UNIQUE INDEX "ScimToken_tokenHash_key" ON "ScimToken"("tokenHash");
CREATE INDEX "ScimToken_organizationId_revokedAt_idx" ON "ScimToken"("organizationId", "revokedAt");
ALTER TABLE "ScimToken" ADD CONSTRAINT "ScimToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScimToken" ADD CONSTRAINT "ScimToken_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "IdentityProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ScimGroup" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerId" TEXT,
    "externalId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScimGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScimGroup_organizationId_externalId_key" ON "ScimGroup"("organizationId", "externalId");
ALTER TABLE "ScimGroup" ADD CONSTRAINT "ScimGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScimGroup" ADD CONSTRAINT "ScimGroup_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "IdentityProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ScimGroupMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ScimGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScimGroupMember_groupId_userId_key" ON "ScimGroupMember"("groupId", "userId");
CREATE INDEX "ScimGroupMember_organizationId_idx" ON "ScimGroupMember"("organizationId");
ALTER TABLE "ScimGroupMember" ADD CONSTRAINT "ScimGroupMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScimGroupMember" ADD CONSTRAINT "ScimGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ScimGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScimGroupMember" ADD CONSTRAINT "ScimGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "IdentityBreakGlassGrant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityBreakGlassGrant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IdentityBreakGlassGrant_organizationId_userId_expiresAt_idx" ON "IdentityBreakGlassGrant"("organizationId", "userId", "expiresAt");
ALTER TABLE "IdentityBreakGlassGrant" ADD CONSTRAINT "IdentityBreakGlassGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdentityBreakGlassGrant" ADD CONSTRAINT "IdentityBreakGlassGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
