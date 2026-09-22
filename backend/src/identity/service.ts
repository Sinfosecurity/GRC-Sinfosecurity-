import crypto from 'crypto';
import dns from 'dns/promises';
import {
    DomainVerificationStatus,
    IdentityProviderStatus,
    IdentityProtocol,
    Role,
    SsoEnforcement,
    UserAccountStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { authService } from '../services/authService';
import { hashPassword, hashToken, randomToken } from '../services/passwordService';
import { encryptSecret, decryptSecret } from '../security/secretBox';
import { CUSTOMER_PLANE } from '../security/sessionPlane';
import { identityServiceUrls, portalFrontendUrl } from '../services/publicFrontendUrl';
import {
    IdentityError,
    assertMappableRole,
    customerSafeStatus,
    emailDomain,
    identityAudit,
    identityEventLabel,
    lowestMappedRole,
    normalizeDomain,
    normalizeEmail,
    publicIdentityId,
} from './core';
import { buildAuthnRequest, buildSpMetadata, parseAndValidateSamlResponse } from './saml';
import { createPkce, discoverOidc, exchangeOidcCode, oidcAuthorizeUrl, verifyOidcIdToken } from './oidc';

function acsUrl(publicId: string) {
    return identityServiceUrls(publicId).acsUrl;
}

function oidcRedirect() {
    return identityServiceUrls('unused').oidcRedirect;
}

function spEntityId(publicId: string) {
    return identityServiceUrls(publicId).spEntityId;
}

async function providerForOrg(organizationId: string, id: string) {
    const provider = await prisma.identityProvider.findFirst({ where: { id, organizationId } });
    if (!provider) throw new ApiError(404, 'Identity provider not found');
    return provider;
}

export async function revokeUserAccess(userId: string) {
    await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
    await prisma.user.update({
        where: { id: userId },
        data: { sessionEpoch: { increment: 1 } },
    });
}

export const identityService = {
    async overview(organizationId: string) {
        const provider = await prisma.identityProvider.findFirst({
            where: { organizationId },
            orderBy: { updatedAt: 'desc' },
            include: { domains: true },
        });
        const provisioned = await prisma.identityExternalAccount.count({ where: { organizationId } });
        const lastScim = await prisma.scimToken.findFirst({
            where: { organizationId, revokedAt: null, lastUsedAt: { not: null } },
            orderBy: { lastUsedAt: 'desc' },
        });
        const token = await prisma.scimToken.findFirst({ where: { organizationId, revokedAt: null } });
        const verifiedDomain = provider?.domains.find((row) => row.status === DomainVerificationStatus.VERIFIED);
        return {
            sso: provider ? customerSafeStatus(provider.status) : { key: 'not_configured', label: 'Not configured' },
            protocol: provider?.protocol || null,
            domain: verifiedDomain
                ? { key: 'verified', label: 'Verified', value: verifiedDomain.domain }
                : provider?.domains[0]
                    ? { key: 'pending', label: 'Pending', value: provider.domains[0].domain }
                    : { key: 'not_configured', label: 'Not configured' },
            jit: provider?.jitEnabled ? 'Enabled' : 'Disabled',
            scim: token ? { key: 'configured', label: 'Token created' } : { key: 'not_configured', label: 'Not configured' },
            scimBaseUrl: identityServiceUrls('unused').scimBaseUrl,
            ssoEnforcement: provider?.ssoEnforcement === SsoEnforcement.REQUIRED ? 'Required' : 'Optional',
            provisionedUsers: provisioned,
            lastSuccessfulSso: provider?.lastSsoAt,
            lastProvisioningActivity: lastScim?.lastUsedAt || null,
            recoveryAdministrator: Boolean(provider?.recoveryUserId),
        };
    },

    async listProviders(organizationId: string) {
        const rows = await prisma.identityProvider.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            include: { domains: true, mappings: true },
        });
        return rows.map((row) => this.publicProvider(row));
    },

    publicProvider(row: {
        id: string;
        publicId: string;
        displayName: string;
        protocol: IdentityProtocol;
        status: IdentityProviderStatus;
        ssoEnforcement: SsoEnforcement;
        jitEnabled: boolean;
        passwordLoginAllowed: boolean;
        defaultRole: Role;
        lastTestedAt: Date | null;
        lastTestResult: string | null;
        lastSsoAt: Date | null;
        idpEntityId: string | null;
        ssoUrl: string | null;
        idpCertificate: string | null;
        spEntityId: string | null;
        issuer: string | null;
        authorizationEndpoint: string | null;
        tokenEndpoint: string | null;
        jwksUri: string | null;
        clientId: string | null;
        scopes: string;
        recoveryUserId: string | null;
        emailAttribute: string;
        firstNameAttribute: string;
        lastNameAttribute: string;
        groupsAttribute: string;
        clientSecretEnc?: string | null;
        domains?: Array<{ id?: string; domain: string; status: DomainVerificationStatus }>;
        mappings?: Array<{ id: string; idpGroup: string; supremeRole: Role }>;
    }) {
        return {
            id: row.id,
            publicId: row.publicId,
            displayName: row.displayName,
            protocol: row.protocol,
            status: customerSafeStatus(row.status),
            rawStatus: row.status,
            ssoEnforcement: row.ssoEnforcement,
            jitEnabled: row.jitEnabled,
            passwordLoginAllowed: row.passwordLoginAllowed,
            defaultRole: row.defaultRole,
            lastTestedAt: row.lastTestedAt,
            lastTestResult: row.lastTestResult,
            lastSsoAt: row.lastSsoAt,
            recoveryAdministratorSet: Boolean(row.recoveryUserId),
            attributes: {
                email: row.emailAttribute,
                firstName: row.firstNameAttribute,
                lastName: row.lastNameAttribute,
                groups: row.groupsAttribute,
            },
            saml: row.protocol === IdentityProtocol.SAML ? {
                idpEntityId: row.idpEntityId,
                ssoUrl: row.ssoUrl,
                certificateConfigured: Boolean(row.idpCertificate),
                spEntityId: spEntityId(row.publicId),
                acsUrl: acsUrl(row.publicId),
                metadataUrl: identityServiceUrls(row.publicId).metadataUrl,
            } : null,
            oidc: row.protocol === IdentityProtocol.OIDC ? {
                issuer: row.issuer,
                authorizationEndpoint: row.authorizationEndpoint,
                tokenEndpoint: row.tokenEndpoint,
                jwksUri: row.jwksUri,
                clientId: row.clientId,
                clientSecretSet: Boolean(row.clientSecretEnc),
                redirectUri: oidcRedirect(),
                scopes: row.scopes,
            } : null,
            domains: (row.domains || []).map((domain) => ({
                id: domain.id,
                domain: domain.domain,
                status: domain.status,
            })),
            mappings: row.mappings || [],
        };
    },

    async createProvider(organizationId: string, actorUserId: string, input: { displayName: string; protocol: IdentityProtocol }) {
        const publicId = publicIdentityId('idp');
        const provider = await prisma.identityProvider.create({
            data: {
                publicId,
                organizationId,
                displayName: input.displayName.trim() || (input.protocol === IdentityProtocol.SAML ? 'Company SAML' : 'Company OIDC'),
                protocol: input.protocol,
                spEntityId: spEntityId(publicId),
            },
        });
        await identityAudit({
            organizationId,
            actorUserId,
            action: 'identity.provider.created',
            resourceType: 'IdentityProvider',
            resourceId: provider.id,
            result: 'success',
            metadata: { protocol: input.protocol },
        });
        return this.publicProvider(await prisma.identityProvider.findUniqueOrThrow({ where: { id: provider.id }, include: { domains: true, mappings: true } }));
    },

    async updateProvider(organizationId: string, id: string, actorUserId: string, input: Record<string, unknown>) {
        const existing = await providerForOrg(organizationId, id);
        const data: Record<string, unknown> = {};
        if (typeof input.displayName === 'string') data.displayName = input.displayName.trim();
        if (typeof input.idpEntityId === 'string') data.idpEntityId = input.idpEntityId.trim();
        if (typeof input.ssoUrl === 'string') data.ssoUrl = input.ssoUrl.trim();
        if (typeof input.idpCertificate === 'string') data.idpCertificate = input.idpCertificate.trim();
        if (typeof input.emailAttribute === 'string') data.emailAttribute = input.emailAttribute.trim();
        if (typeof input.firstNameAttribute === 'string') data.firstNameAttribute = input.firstNameAttribute.trim();
        if (typeof input.lastNameAttribute === 'string') data.lastNameAttribute = input.lastNameAttribute.trim();
        if (typeof input.groupsAttribute === 'string') data.groupsAttribute = input.groupsAttribute.trim();
        if (typeof input.issuer === 'string') data.issuer = input.issuer.trim();
        if (typeof input.authorizationEndpoint === 'string') data.authorizationEndpoint = input.authorizationEndpoint.trim();
        if (typeof input.tokenEndpoint === 'string') data.tokenEndpoint = input.tokenEndpoint.trim();
        if (typeof input.jwksUri === 'string') data.jwksUri = input.jwksUri.trim();
        if (typeof input.clientId === 'string') data.clientId = input.clientId.trim();
        if (typeof input.scopes === 'string') data.scopes = input.scopes.trim();
        if (typeof input.clientSecret === 'string' && input.clientSecret) {
            data.clientSecretEnc = encryptSecret(input.clientSecret);
        }
        if (typeof input.jitEnabled === 'boolean') data.jitEnabled = input.jitEnabled;
        if (typeof input.passwordLoginAllowed === 'boolean') data.passwordLoginAllowed = input.passwordLoginAllowed;
        if (typeof input.defaultRole === 'string') {
            assertMappableRole(input.defaultRole as Role);
            data.defaultRole = input.defaultRole;
        }
        const configured = existing.protocol === IdentityProtocol.SAML
            ? Boolean((data.idpEntityId || existing.idpEntityId) && (data.ssoUrl || existing.ssoUrl) && (data.idpCertificate || existing.idpCertificate))
            : Boolean((data.issuer || existing.issuer) && (data.clientId || existing.clientId));
        if (configured && existing.status === IdentityProviderStatus.DRAFT) {
            data.status = IdentityProviderStatus.CONFIGURED;
        }
        const updated = await prisma.identityProvider.update({
            where: { id },
            data,
            include: { domains: true, mappings: true },
        });
        await identityAudit({
            organizationId,
            actorUserId,
            action: 'identity.provider.updated',
            resourceType: 'IdentityProvider',
            resourceId: id,
            result: 'success',
        });
        return this.publicProvider(updated);
    },

    async discoverOidcIssuer(organizationId: string, id: string, actorUserId: string, issuer: string) {
        const provider = await providerForOrg(organizationId, id);
        const { issuerHostAllowed } = await import('../security/ssrfPolicy');
        const approved = (await prisma.identityDomain.findMany({
            where: { organizationId, providerId: id, status: DomainVerificationStatus.VERIFIED },
            select: { domain: true },
        })).map((row) => row.domain);
        if (!issuerHostAllowed(issuer, provider.issuer, approved)) {
            throw new ApiError(400, 'Use an approved issuer for this identity provider.');
        }
        const discovered = await discoverOidc(issuer);
        return this.updateProvider(organizationId, id, actorUserId, {
            issuer: discovered.issuer,
            authorizationEndpoint: discovered.authorizationEndpoint,
            tokenEndpoint: discovered.tokenEndpoint,
            jwksUri: discovered.jwksUri,
        });
    },

    samlMetadata(publicId: string) {
        return buildSpMetadata({ entityId: spEntityId(publicId), acsUrl: acsUrl(publicId) });
    },

    async startDomain(organizationId: string, actorUserId: string, domainRaw: string, providerId?: string) {
        const domain = normalizeDomain(domainRaw);
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) throw new ApiError(400, 'Enter a valid domain.');
        const existing = await prisma.identityDomain.findUnique({ where: { domain } });
        if (existing && existing.organizationId !== organizationId) {
            throw new ApiError(409, 'That domain is already claimed.');
        }
        const token = `supreme-domain-verification=${randomToken()}`;
        const row = existing
            ? await prisma.identityDomain.update({
                where: { id: existing.id },
                data: { verificationTokenHash: hashToken(token), providerId: providerId || existing.providerId },
            })
            : await prisma.identityDomain.create({
                data: {
                    organizationId,
                    providerId,
                    domain,
                    verificationTokenHash: hashToken(token),
                },
            });
        await identityAudit({
            organizationId,
            actorUserId,
            action: 'identity.domain.verification_started',
            resourceType: 'IdentityDomain',
            resourceId: row.id,
            result: 'success',
            metadata: { domain },
        });
        return {
            id: row.id,
            domain,
            status: 'Pending',
            txtName: domain,
            txtValue: token,
            wellKnownPath: `https://${domain}/.well-known/supreme-domain-verification`,
            tokenShownOnce: token,
        };
    },

    async verifyDomain(organizationId: string, domainId: string, actorUserId: string, presentedToken?: string) {
        const row = await prisma.identityDomain.findFirst({ where: { id: domainId, organizationId } });
        if (!row || !row.verificationTokenHash) throw new ApiError(404, 'Domain verification was not started.');
        let verified = false;
        if (presentedToken && hashToken(presentedToken) === row.verificationTokenHash && (process.env.NODE_ENV === 'test' || process.env.IDENTITY_ALLOW_TOKEN_VERIFY === 'true')) {
            verified = true;
        }
        if (!verified) {
            try {
                const records = await dns.resolveTxt(row.domain);
                const flat = records.flat().join(' ');
                if (flat.includes('supreme-domain-verification=')) {
                    const match = flat.match(/supreme-domain-verification=([A-Za-z0-9_-]+)/);
                    if (match && hashToken(`supreme-domain-verification=${match[1]}`) === row.verificationTokenHash) {
                        verified = true;
                    }
                }
            } catch {
                // DNS may be unavailable; try HTTPS well-known next.
            }
        }
        if (!verified) {
            try {
                const response = await fetch(`https://${row.domain}/.well-known/supreme-domain-verification`, { redirect: 'error' });
                const body = (await response.text()).trim();
                if (hashToken(body) === row.verificationTokenHash || hashToken(`supreme-domain-verification=${body}`) === row.verificationTokenHash) {
                    verified = true;
                }
            } catch {
                // Not verified.
            }
        }
        if (!verified) {
            await identityAudit({
                organizationId,
                actorUserId,
                action: 'identity.domain.failed',
                resourceType: 'IdentityDomain',
                resourceId: row.id,
                result: 'failure',
                metadata: { domain: row.domain },
            });
            throw new IdentityError('unverified_domain', 400);
        }
        const updated = await prisma.identityDomain.update({
            where: { id: row.id },
            data: { status: DomainVerificationStatus.VERIFIED, verifiedAt: new Date() },
        });
        await identityAudit({
            organizationId,
            actorUserId,
            action: 'identity.domain.verified',
            resourceType: 'IdentityDomain',
            resourceId: row.id,
            result: 'success',
            metadata: { domain: row.domain },
        });
        return { id: updated.id, domain: updated.domain, status: 'Verified' };
    },

    async replaceMappings(organizationId: string, providerId: string, actorUserId: string, mappings: Array<{ idpGroup: string; supremeRole: Role }>) {
        await providerForOrg(organizationId, providerId);
        for (const mapping of mappings) assertMappableRole(mapping.supremeRole);
        await prisma.$transaction([
            prisma.identityRoleMapping.deleteMany({ where: { providerId, organizationId } }),
            ...mappings.filter((row) => row.idpGroup.trim()).map((row) => prisma.identityRoleMapping.create({
                data: {
                    organizationId,
                    providerId,
                    idpGroup: row.idpGroup.trim(),
                    supremeRole: row.supremeRole,
                },
            })),
        ]);
        await identityAudit({
            organizationId,
            actorUserId,
            action: 'identity.role_mapping.changed',
            resourceType: 'IdentityProvider',
            resourceId: providerId,
            result: 'success',
        });
        return prisma.identityRoleMapping.findMany({ where: { providerId } });
    },

    async setPolicy(organizationId: string, providerId: string, actorUserId: string, input: {
        ssoEnforcement?: SsoEnforcement;
        jitEnabled?: boolean;
        passwordLoginAllowed?: boolean;
    }) {
        const provider = await providerForOrg(organizationId, providerId);
        if (input.ssoEnforcement === SsoEnforcement.REQUIRED) {
            if (provider.status !== IdentityProviderStatus.TESTED && provider.status !== IdentityProviderStatus.ENABLED) {
                throw new ApiError(409, 'Complete a successful test sign-in before requiring Company SSO.');
            }
            const verified = await prisma.identityDomain.count({
                where: { organizationId, status: DomainVerificationStatus.VERIFIED },
            });
            if (!verified) throw new ApiError(409, 'Verify a domain before requiring Company SSO.');
            if (!provider.recoveryUserId && !actorUserId) {
                throw new ApiError(409, 'A recovery administrator is required before requiring Company SSO.');
            }
        }
        const updated = await prisma.identityProvider.update({
            where: { id: providerId },
            data: {
                ssoEnforcement: input.ssoEnforcement,
                jitEnabled: input.jitEnabled,
                passwordLoginAllowed: input.passwordLoginAllowed,
                recoveryUserId: input.ssoEnforcement === SsoEnforcement.REQUIRED ? (provider.recoveryUserId || actorUserId) : provider.recoveryUserId,
            },
            include: { domains: true, mappings: true },
        });
        if (input.ssoEnforcement === SsoEnforcement.REQUIRED) {
            await identityAudit({
                organizationId,
                actorUserId,
                action: 'identity.sso.enforced',
                resourceType: 'IdentityProvider',
                resourceId: providerId,
                result: 'success',
            });
        } else if (input.ssoEnforcement === SsoEnforcement.OPTIONAL) {
            await identityAudit({
                organizationId,
                actorUserId,
                action: 'identity.sso.optional',
                resourceType: 'IdentityProvider',
                resourceId: providerId,
                result: 'success',
            });
        }
        if (typeof input.jitEnabled === 'boolean') {
            await identityAudit({
                organizationId,
                actorUserId,
                action: input.jitEnabled ? 'identity.jit.enabled' : 'identity.jit.disabled',
                resourceType: 'IdentityProvider',
                resourceId: providerId,
                result: 'success',
                metadata: { jitEnabled: input.jitEnabled },
            });
        }
        return this.publicProvider(updated);
    },

    async enableProvider(organizationId: string, providerId: string, actorUserId: string, enabled: boolean) {
        const provider = await providerForOrg(organizationId, providerId);
        if (enabled && provider.status !== IdentityProviderStatus.TESTED && provider.status !== IdentityProviderStatus.ENABLED) {
            throw new ApiError(409, 'Complete a successful test before enabling Company SSO.');
        }
        const updated = await prisma.identityProvider.update({
            where: { id: providerId },
            data: {
                status: enabled ? IdentityProviderStatus.ENABLED : IdentityProviderStatus.DISABLED,
                enabledAt: enabled ? new Date() : null,
            },
            include: { domains: true, mappings: true },
        });
        await identityAudit({
            organizationId,
            actorUserId,
            action: enabled ? 'identity.provider.enabled' : 'identity.provider.disabled',
            resourceType: 'IdentityProvider',
            resourceId: providerId,
            result: 'success',
        });
        return this.publicProvider(updated);
    },

    async createBreakGlass(organizationId: string, actorUserId: string, userId: string, reason: string, minutes = 60) {
        if (!reason.trim()) throw new ApiError(400, 'A reason is required.');
        const grant = await prisma.identityBreakGlassGrant.create({
            data: {
                organizationId,
                userId,
                reason: reason.trim(),
                createdById: actorUserId,
                expiresAt: new Date(Date.now() + minutes * 60_000),
            },
        });
        await identityAudit({
            organizationId,
            actorUserId,
            action: 'identity.break_glass.used',
            resourceType: 'IdentityBreakGlassGrant',
            resourceId: grant.id,
            result: 'success',
            metadata: { created: true },
        });
        return { id: grant.id, expiresAt: grant.expiresAt };
    },

    async passwordLoginAllowed(user: { id: string; organizationId: string; role: string }) {
        const provider = await prisma.identityProvider.findFirst({
            where: { organizationId: user.organizationId, status: IdentityProviderStatus.ENABLED },
        });
        if (!provider) return { allowed: true };
        if (provider.ssoEnforcement !== SsoEnforcement.REQUIRED) return { allowed: provider.passwordLoginAllowed };
        if (provider.recoveryUserId === user.id) return { allowed: true, recovery: true };
        const grant = await prisma.identityBreakGlassGrant.findFirst({
            where: {
                organizationId: user.organizationId,
                userId: user.id,
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
        if (grant) {
            await prisma.identityBreakGlassGrant.update({ where: { id: grant.id }, data: { usedAt: new Date() } });
            await identityAudit({
                organizationId: user.organizationId,
                actorUserId: user.id,
                action: 'identity.break_glass.used',
                resourceType: 'IdentityBreakGlassGrant',
                resourceId: grant.id,
                result: 'success',
            });
            return { allowed: true, recovery: true };
        }
        return { allowed: false };
    },

    async discover(email: string) {
        const domain = emailDomain(email);
        if (!domain) return { ssoAvailable: false };
        const row = await prisma.identityDomain.findUnique({
            where: { domain },
            include: { provider: true },
        });
        const ready = row?.status === DomainVerificationStatus.VERIFIED
            && row.provider
            && (row.provider.status === IdentityProviderStatus.ENABLED || row.provider.status === IdentityProviderStatus.TESTED);
        if (!ready || !row.provider) return { ssoAvailable: false };
        return {
            ssoAvailable: true,
            publicId: row.provider.publicId,
            continueLabel: 'Continue with Company SSO',
        };
    },

    async startSso(publicId: string, purpose: 'login' | 'test', actorUserId?: string) {
        const provider = await prisma.identityProvider.findUnique({ where: { publicId } });
        if (!provider || provider.status === IdentityProviderStatus.DRAFT || provider.status === IdentityProviderStatus.DISABLED) {
            throw new IdentityError('configuration_error', 404);
        }
        const state = randomToken();
        const requestId = `_${crypto.randomBytes(16).toString('hex')}`;
        const nonce = randomToken();
        const pkce = createPkce();
        await prisma.ssoLoginState.create({
            data: {
                organizationId: provider.organizationId,
                providerId: provider.id,
                state,
                nonce,
                codeVerifier: pkce.verifier,
                requestId,
                purpose,
                actorUserId,
                expiresAt: new Date(Date.now() + 10 * 60_000),
            },
        });
        if (provider.protocol === IdentityProtocol.SAML) {
            if (!provider.ssoUrl) throw new IdentityError('configuration_error', 409);
            if (purpose === 'test') {
                await identityAudit({
                    organizationId: provider.organizationId,
                    actorUserId,
                    action: 'identity.sso.test_started',
                    resourceType: 'IdentityProvider',
                    resourceId: provider.id,
                    result: 'success',
                });
            }
            const samlRequest = buildAuthnRequest({
                issuer: spEntityId(provider.publicId),
                acsUrl: acsUrl(provider.publicId),
                destination: provider.ssoUrl,
                requestId,
            });
            const url = new URL(provider.ssoUrl);
            url.searchParams.set('SAMLRequest', samlRequest);
            url.searchParams.set('RelayState', state);
            return { redirectTo: url.toString() };
        }
        if (!provider.authorizationEndpoint || !provider.clientId) throw new IdentityError('configuration_error', 409);
        return {
            redirectTo: oidcAuthorizeUrl({
                authorizationEndpoint: provider.authorizationEndpoint,
                clientId: provider.clientId,
                redirectUri: oidcRedirect(),
                state,
                nonce,
                codeChallenge: pkce.challenge,
                scopes: provider.scopes,
            }),
        };
    },

    async completeSaml(publicId: string, samlResponse: string, relayState?: string) {
        const provider = await prisma.identityProvider.findUnique({ where: { publicId } });
        if (!provider || !provider.idpCertificate || !provider.idpEntityId) {
            throw new IdentityError('configuration_error', 404);
        }
        const pending = relayState
            ? await prisma.ssoLoginState.findUnique({ where: { state: relayState } })
            : null;
        if (pending && (pending.consumedAt || pending.expiresAt < new Date() || pending.providerId !== provider.id)) {
            throw new IdentityError('state_mismatch');
        }
        let assertion;
        try {
            assertion = parseAndValidateSamlResponse({
                samlResponseB64: samlResponse,
                idpCertificate: provider.idpCertificate,
                expectedIssuer: provider.idpEntityId,
                expectedAudience: spEntityId(provider.publicId),
                expectedDestination: acsUrl(provider.publicId),
                expectedInResponseTo: pending?.requestId,
            });
        } catch (error) {
            if (pending?.purpose === 'test') {
                await identityAudit({
                    organizationId: provider.organizationId,
                    actorUserId: pending.actorUserId,
                    action: 'identity.sso.test_failed',
                    resourceType: 'IdentityProvider',
                    resourceId: provider.id,
                    result: 'failure',
                });
            }
            throw error;
        }
        await this.assertFreshAssertion(provider.id, provider.organizationId, assertion.assertionId, assertion.notOnOrAfter);
        if (pending) {
            await prisma.ssoLoginState.update({ where: { id: pending.id }, data: { consumedAt: new Date() } });
        }
        return this.finishFederated(provider, {
            subject: assertion.subject,
            issuer: assertion.issuer,
            email: assertion.email,
            firstName: assertion.firstName,
            lastName: assertion.lastName,
            groups: assertion.groups,
            purpose: pending?.purpose || 'login',
            actorUserId: pending?.actorUserId,
        });
    },

    async completeOidc(query: { code?: string; state?: string }) {
        if (!query.code || !query.state) throw new IdentityError('state_mismatch');
        const pending = await prisma.ssoLoginState.findUnique({ where: { state: query.state }, include: { provider: true } });
        if (!pending || pending.consumedAt || pending.expiresAt < new Date()) throw new IdentityError('state_mismatch');
        const provider = pending.provider;
        if (!provider.tokenEndpoint || !provider.jwksUri || !provider.issuer || !provider.clientId || !pending.nonce || !pending.codeVerifier) {
            throw new IdentityError('configuration_error', 409);
        }
        const tokens = await exchangeOidcCode({
            tokenEndpoint: provider.tokenEndpoint,
            code: query.code,
            redirectUri: oidcRedirect(),
            clientId: provider.clientId,
            clientSecret: provider.clientSecretEnc ? decryptSecret(provider.clientSecretEnc) : undefined,
            codeVerifier: pending.codeVerifier,
        });
        if (!tokens.id_token) throw new IdentityError('invalid_signature');
        const claims = await verifyOidcIdToken({
            idToken: tokens.id_token,
            jwksUri: provider.jwksUri,
            issuer: provider.issuer,
            audience: provider.clientId,
            nonce: pending.nonce,
        });
        await prisma.ssoLoginState.update({ where: { id: pending.id }, data: { consumedAt: new Date() } });
        return this.finishFederated(provider, {
            subject: claims.subject,
            issuer: claims.issuer,
            email: claims.email,
            firstName: claims.firstName,
            lastName: claims.lastName,
            groups: claims.groups,
            purpose: pending.purpose,
            actorUserId: pending.actorUserId,
        });
    },

    async assertFreshAssertion(providerId: string, organizationId: string, assertionId: string, expiresAt?: Date) {
        try {
            await prisma.ssoReplayRecord.create({
                data: {
                    providerId,
                    organizationId,
                    assertionId,
                    expiresAt: expiresAt || new Date(Date.now() + 10 * 60_000),
                },
            });
        } catch {
            throw new IdentityError('replay');
        }
    },

    async finishFederated(provider: {
        id: string;
        organizationId: string;
        jitEnabled: boolean;
        defaultRole: Role;
        status: IdentityProviderStatus;
    }, assertion: {
        subject: string;
        issuer: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        groups: string[];
        purpose: string;
        actorUserId?: string | null;
    }) {
        const email = assertion.email ? normalizeEmail(assertion.email) : '';
        if (assertion.purpose === 'test') {
            const nextStatus = provider.status === IdentityProviderStatus.ENABLED
                ? IdentityProviderStatus.ENABLED
                : IdentityProviderStatus.TESTED;
            await prisma.identityProvider.update({
                where: { id: provider.id },
                data: { status: nextStatus, lastTestedAt: new Date(), lastTestResult: 'success' },
            });
            await identityAudit({
                organizationId: provider.organizationId,
                actorUserId: assertion.actorUserId,
                action: 'identity.sso.test_succeeded',
                resourceType: 'IdentityProvider',
                resourceId: provider.id,
                result: 'success',
            });
            return { kind: 'test' as const, redirectTo: `${portalFrontendUrl('CUSTOMER', process.env)}/settings/identity?tested=1` };
        }
        const role = await this.resolveRole(provider.id, assertion.groups, provider.defaultRole);
        const user = await this.provisionOrLink({
            organizationId: provider.organizationId,
            providerId: provider.id,
            issuer: assertion.issuer,
            subject: assertion.subject,
            email,
            firstName: assertion.firstName || 'Provisioned',
            lastName: assertion.lastName || 'User',
            role,
            jitEnabled: provider.jitEnabled,
        });
        await prisma.identityProvider.update({
            where: { id: provider.id },
            data: { lastSsoAt: new Date() },
        });
        const session = await authService.completeFederatedSession(user.id);
        const exchange = randomToken();
        await prisma.ssoLoginState.create({
            data: {
                organizationId: provider.organizationId,
                providerId: provider.id,
                state: `ex_${hashToken(exchange)}`,
                purpose: 'exchange',
                redirectTo: JSON.stringify({ token: session.token, refreshToken: session.refreshToken, user: session.user }),
                expiresAt: new Date(Date.now() + 60_000),
            },
        });
        return {
            kind: 'session' as const,
            redirectTo: `${portalFrontendUrl('CUSTOMER', process.env)}/login/sso/complete?code=${encodeURIComponent(exchange)}`,
        };
    },

    async exchange(code: string) {
        const hashed = `ex_${hashToken(code)}`;
        const row = await prisma.ssoLoginState.findUnique({ where: { state: hashed } });
        if (!row || row.purpose !== 'exchange' || row.consumedAt || row.expiresAt < new Date() || !row.redirectTo) {
            throw new IdentityError('state_mismatch');
        }
        await prisma.ssoLoginState.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
        return JSON.parse(row.redirectTo);
    },

    async resolveRole(providerId: string, groups: string[], fallback: Role) {
        const mappings = await prisma.identityRoleMapping.findMany({ where: { providerId } });
        const wanted = new Set(groups.map((group) => group.trim().toLowerCase()));
        const matched = mappings
            .filter((row) => wanted.has(row.idpGroup.trim().toLowerCase()))
            .map((row) => row.supremeRole);
        return lowestMappedRole(matched, fallback);
    },

    async provisionOrLink(input: {
        organizationId: string;
        providerId: string;
        issuer: string;
        subject: string;
        email: string;
        firstName: string;
        lastName: string;
        role: Role;
        jitEnabled: boolean;
        source?: string;
    }) {
        const existingLink = await prisma.identityExternalAccount.findUnique({
            where: { issuer_subject: { issuer: input.issuer, subject: input.subject } },
            include: { user: true },
        });
        if (existingLink) {
            if (existingLink.organizationId !== input.organizationId) {
                throw new IdentityError('user_not_assigned');
            }
            if (existingLink.user.status === UserAccountStatus.DISABLED) {
                throw new IdentityError('user_not_assigned');
            }
            await prisma.identityExternalAccount.update({
                where: { id: existingLink.id },
                data: { lastLoginAt: new Date() },
            });
            await prisma.user.update({
                where: { id: existingLink.userId },
                data: { lastSsoAt: new Date(), lastLogin: new Date() },
            });
            return existingLink.user;
        }
        if (!input.email) throw new IdentityError('user_not_assigned');
        const byEmail = await prisma.user.findUnique({ where: { email: input.email } });
        if (byEmail) {
            if (byEmail.organizationId !== input.organizationId) {
                throw new IdentityError('user_not_assigned');
            }
            if (byEmail.status === UserAccountStatus.DISABLED) {
                throw new IdentityError('user_not_assigned');
            }
            await prisma.identityExternalAccount.create({
                data: {
                    organizationId: input.organizationId,
                    userId: byEmail.id,
                    providerId: input.providerId,
                    issuer: input.issuer,
                    subject: input.subject,
                    emailAtLink: input.email,
                    lastLoginAt: new Date(),
                },
            });
            await prisma.user.update({
                where: { id: byEmail.id },
                data: { lastSsoAt: new Date(), lastLogin: new Date() },
            });
            await identityAudit({
                organizationId: input.organizationId,
                actorUserId: byEmail.id,
                action: 'identity.account.linked',
                resourceType: 'User',
                resourceId: byEmail.id,
                result: 'success',
            });
            return byEmail;
        }
        if (!input.jitEnabled && input.source !== 'scim') {
            throw new IdentityError('jit_disabled', 403);
        }
        const user = await prisma.user.create({
            data: {
                email: input.email,
                hashedPassword: await hashPassword(randomToken() + 'Aa1'),
                firstName: input.firstName,
                lastName: input.lastName,
                role: input.role,
                organizationId: input.organizationId,
                status: UserAccountStatus.ACTIVE,
                emailVerifiedAt: new Date(),
                provisioningSource: input.source || 'jit',
                lastSsoAt: new Date(),
                lastLogin: new Date(),
            },
        });
        await prisma.identityExternalAccount.create({
            data: {
                organizationId: input.organizationId,
                userId: user.id,
                providerId: input.providerId,
                issuer: input.issuer,
                subject: input.subject,
                emailAtLink: input.email,
                lastLoginAt: new Date(),
            },
        });
        await identityAudit({
            organizationId: input.organizationId,
            actorUserId: user.id,
            action: input.source === 'scim' ? 'identity.scim.user_created' : 'identity.jit.user_created',
            resourceType: 'User',
            resourceId: user.id,
            result: 'success',
            metadata: { role: input.role },
        });
        return user;
    },

    async activity(organizationId: string) {
        const rows = await prisma.auditEvent.findMany({
            where: {
                organizationId,
                action: { startsWith: 'identity.' },
            },
            orderBy: { timestamp: 'desc' },
            take: 50,
            select: {
                id: true,
                action: true,
                result: true,
                timestamp: true,
                resourceType: true,
                resourceId: true,
                actor: { select: { email: true } },
            },
        });
        return rows.map((row) => ({
            id: row.id,
            action: row.action,
            label: identityEventLabel(row.action),
            result: row.result,
            timestamp: row.timestamp,
            actor: row.actor?.email || null,
            resourceType: row.resourceType,
            resourceId: row.resourceId,
        }));
    },
};
