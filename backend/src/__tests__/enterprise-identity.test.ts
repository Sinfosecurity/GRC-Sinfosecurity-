import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { IdentityProtocol, Role, UserAccountStatus } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { hashPassword, hashToken } from '../services/passwordService';
import { authService } from '../services/authService';
import { hasPermission, PERMISSIONS } from '../security/rbac';
import { identityService } from '../identity/service';
import { scimService } from '../identity/scim';
import { createSignedSamlResponse, parseAndValidateSamlResponse } from '../identity/saml';
import { verifyOidcIdToken } from '../identity/oidc';
import { recordAudit } from '../services/auditEventService';

jest.setTimeout(60000);

function samlCert(dir: string) {
    execFileSync('mkdir', ['-p', dir]);
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-keyout', `${dir}/key.pem`, '-out', `${dir}/cert.pem`, '-days', '1', '-nodes', '-subj', '/CN=test-idp']);
    return {
        privateKey: readFileSync(`${dir}/key.pem`, 'utf8'),
        certificate: readFileSync(`${dir}/cert.pem`, 'utf8'),
    };
}

describe('enterprise identity', () => {
    it('keeps identity.manage off viewer/assessor/approver', () => {
        expect(hasPermission('VIEWER', PERMISSIONS['identity.manage'])).toBe(false);
        expect(hasPermission('ASSESSOR', PERMISSIONS['identity.manage'])).toBe(false);
        expect(hasPermission('APPROVER', PERMISSIONS['identity.manage'])).toBe(false);
        expect(hasPermission('ORGANIZATION_ADMIN', PERMISSIONS['identity.manage'])).toBe(true);
    });

    it('validates SAML signature, issuer, audience, expiry, and replay', async () => {
        const { privateKey, certificate } = samlCert(`/tmp/supreme-saml-${Date.now()}`);
        const other = samlCert(`/tmp/supreme-saml-other-${Date.now()}`);
        const destination = 'http://localhost:3001/api/v1/auth/sso/saml/acs/idp_test';
        const valid = createSignedSamlResponse({
            privateKey,
            certificate,
            issuer: 'https://idp.example/entity',
            audience: 'http://localhost:3001/saml/sp/idp_test',
            destination,
            nameId: 'alex@acme.com',
            email: 'alex@acme.com',
            groups: ['Acme-Viewers'],
            assertionId: '_assert-valid',
        });
        const parsed = parseAndValidateSamlResponse({
            samlResponseB64: valid,
            idpCertificate: certificate,
            expectedIssuer: 'https://idp.example/entity',
            expectedAudience: 'http://localhost:3001/saml/sp/idp_test',
            expectedDestination: destination,
        });
        expect(parsed.email).toBe('alex@acme.com');

        expect(() => parseAndValidateSamlResponse({
            samlResponseB64: Buffer.from('not-xml').toString('base64'),
            idpCertificate: certificate,
            expectedIssuer: 'https://idp.example/entity',
            expectedAudience: 'http://localhost:3001/saml/sp/idp_test',
            expectedDestination: destination,
        })).toThrow(/verified/i);

        const wrongIssuer = createSignedSamlResponse({
            privateKey, certificate, issuer: 'https://other.example', audience: 'http://localhost:3001/saml/sp/idp_test', destination, nameId: 'alex@acme.com', email: 'alex@acme.com',
        });
        expect(() => parseAndValidateSamlResponse({
            samlResponseB64: wrongIssuer, idpCertificate: certificate, expectedIssuer: 'https://idp.example/entity', expectedAudience: 'http://localhost:3001/saml/sp/idp_test', expectedDestination: destination,
        })).toThrow(/issuer/i);

        const wrongAudience = createSignedSamlResponse({
            privateKey, certificate, issuer: 'https://idp.example/entity', audience: 'https://other', destination, nameId: 'alex@acme.com', email: 'alex@acme.com',
        });
        expect(() => parseAndValidateSamlResponse({
            samlResponseB64: wrongAudience, idpCertificate: certificate, expectedIssuer: 'https://idp.example/entity', expectedAudience: 'http://localhost:3001/saml/sp/idp_test', expectedDestination: destination,
        })).toThrow(/issued for this organization/i);

        const expired = createSignedSamlResponse({
            privateKey, certificate, issuer: 'https://idp.example/entity', audience: 'http://localhost:3001/saml/sp/idp_test', destination, nameId: 'alex@acme.com', email: 'alex@acme.com',
            notBefore: new Date(Date.now() - 3600_000),
            notOnOrAfter: new Date(Date.now() - 60_000),
        });
        expect(() => parseAndValidateSamlResponse({
            samlResponseB64: expired, idpCertificate: certificate, expectedIssuer: 'https://idp.example/entity', expectedAudience: 'http://localhost:3001/saml/sp/idp_test', expectedDestination: destination,
        })).toThrow(/expired/i);

        expect(() => parseAndValidateSamlResponse({
            samlResponseB64: valid, idpCertificate: other.certificate, expectedIssuer: 'https://idp.example/entity', expectedAudience: 'http://localhost:3001/saml/sp/idp_test', expectedDestination: destination,
        })).toThrow(/verified/i);

        const xml = Buffer.from(valid, 'base64').toString('utf8').replace('alex@acme.com', 'attacker@evil.com');
        expect(() => parseAndValidateSamlResponse({
            samlResponseB64: Buffer.from(xml).toString('base64'), idpCertificate: certificate, expectedIssuer: 'https://idp.example/entity', expectedAudience: 'http://localhost:3001/saml/sp/idp_test', expectedDestination: destination,
        })).toThrow(/verified/i);
    });

    it('validates OIDC issuer, audience, nonce, and signature', async () => {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
        const sign = (payload: Record<string, unknown>) => jwt.sign(payload, privateKey, {
            algorithm: 'RS256',
            keyid: 'k1',
            expiresIn: '5m',
        });
        const good = sign({ iss: 'https://issuer.example', aud: 'client-1', sub: 'sub-1', nonce: 'n1', email: 'alex@acme.com' });
        const claims = await verifyOidcIdToken({
            idToken: good,
            jwksUri: 'https://issuer.example/jwks',
            issuer: 'https://issuer.example',
            audience: 'client-1',
            nonce: 'n1',
            key: publicKey,
        });
        expect(claims.subject).toBe('sub-1');

        const badNonce = await sign({ iss: 'https://issuer.example', aud: 'client-1', sub: 'sub-1', nonce: 'other' });
        await expect(verifyOidcIdToken({
            idToken: badNonce, jwksUri: 'https://issuer.example/jwks', issuer: 'https://issuer.example', audience: 'client-1', nonce: 'n1', key: publicKey,
        })).rejects.toThrow(/validated/i);

        const badIss = await sign({ iss: 'https://evil.example', aud: 'client-1', sub: 'sub-1', nonce: 'n1' });
        await expect(verifyOidcIdToken({
            idToken: badIss, jwksUri: 'https://issuer.example/jwks', issuer: 'https://issuer.example', audience: 'client-1', nonce: 'n1', key: publicKey,
        })).rejects.toThrow(/issuer/i);

        const badAud = await sign({ iss: 'https://issuer.example', aud: 'other', sub: 'sub-1', nonce: 'n1' });
        await expect(verifyOidcIdToken({
            idToken: badAud, jwksUri: 'https://issuer.example/jwks', issuer: 'https://issuer.example', audience: 'client-1', nonce: 'n1', key: publicKey,
        })).rejects.toThrow(/audience|issued/i);
        await expect(identityService.exchange('not-a-real-code')).rejects.toThrow(/could not be completed/i);
    });

    it('provisions, links, isolates, maps roles, and deprovisions through the existing User model', async () => {
        await prisma.$queryRaw`SELECT 1`;
        const suffix = `${Date.now()}`;
        const orgA = await prisma.organization.create({ data: { name: `IdA ${suffix}`, country: 'US' } });
        const orgB = await prisma.organization.create({ data: { name: `IdB ${suffix}`, country: 'US' } });
        const password = await hashPassword('ValidPass1x');
        const adminA = await prisma.user.create({
            data: { email: `admin-a-${suffix}@a.test`, hashedPassword: password, firstName: 'Ada', lastName: 'Admin', role: Role.ORGANIZATION_ADMIN, organizationId: orgA.id },
        });
        const existing = await prisma.user.create({
            data: { email: `alex-${suffix}@acme.test`, hashedPassword: password, firstName: 'Alex', lastName: 'Existing', role: Role.VIEWER, organizationId: orgA.id },
        });
        const adminB = await prisma.user.create({
            data: { email: `admin-b-${suffix}@b.test`, hashedPassword: password, firstName: 'Bea', lastName: 'Admin', role: Role.ORGANIZATION_ADMIN, organizationId: orgB.id },
        });
        const provider = await identityService.createProvider(orgA.id, adminA.id, { displayName: 'Acme SAML', protocol: IdentityProtocol.SAML });
        await identityService.updateProvider(orgA.id, provider.id, adminA.id, {
            idpEntityId: 'https://idp.acme.test',
            ssoUrl: 'https://idp.acme.test/sso',
            idpCertificate: 'CERT',
        });
        const claimed = await identityService.startDomain(orgA.id, adminA.id, `acme-${suffix}.test`, provider.id);
        process.env.IDENTITY_ALLOW_TOKEN_VERIFY = 'true';
        const verified = await identityService.verifyDomain(orgA.id, claimed.id, adminA.id, claimed.tokenShownOnce);
        expect(verified.status).toBe('Verified');
        await expect(identityService.startDomain(orgB.id, adminB.id, `acme-${suffix}.test`)).rejects.toThrow(/already claimed/);
        await prisma.identityProvider.update({
            where: { id: provider.id },
            data: { status: 'TESTED', lastTestResult: 'success', lastTestedAt: new Date() },
        });

        const discovered = await identityService.discover(`person@acme-${suffix}.test`);
        expect(discovered.ssoAvailable).toBe(true);
        expect(JSON.stringify(discovered)).not.toContain(orgA.id);

        await identityService.replaceMappings(orgA.id, provider.id, adminA.id, [
            { idpGroup: 'Acme-Viewers', supremeRole: Role.VIEWER },
            { idpGroup: 'Acme-Admins', supremeRole: Role.ORGANIZATION_ADMIN },
        ]);
        const lowest = await identityService.resolveRole(provider.id, ['Acme-Viewers', 'Acme-Admins'], Role.VIEWER);
        expect(lowest).toBe(Role.VIEWER);

        await expect(identityService.provisionOrLink({
            organizationId: orgA.id,
            providerId: provider.id,
            issuer: 'https://idp.acme.test',
            subject: `new-${suffix}`,
            email: `jit-${suffix}@acme.test`,
            firstName: 'Jay',
            lastName: 'Itee',
            role: Role.VIEWER,
            jitEnabled: false,
        })).rejects.toThrow(/not enabled/);

        const jit = await identityService.provisionOrLink({
            organizationId: orgA.id,
            providerId: provider.id,
            issuer: 'https://idp.acme.test',
            subject: `new-${suffix}`,
            email: `jit-${suffix}@acme.test`,
            firstName: 'Jay',
            lastName: 'Itee',
            role: Role.VIEWER,
            jitEnabled: true,
        });
        expect(jit.organizationId).toBe(orgA.id);
        expect(jit.email).toBe(`jit-${suffix}@acme.test`);

        const linked = await identityService.provisionOrLink({
            organizationId: orgA.id,
            providerId: provider.id,
            issuer: 'https://idp.acme.test',
            subject: `exist-${suffix}`,
            email: existing.email,
            firstName: 'Alex',
            lastName: 'Existing',
            role: Role.VIEWER,
            jitEnabled: true,
        });
        expect(linked.id).toBe(existing.id);
        expect(await prisma.user.count({ where: { email: existing.email } })).toBe(1);

        await expect(identityService.provisionOrLink({
            organizationId: orgA.id,
            providerId: provider.id,
            issuer: 'https://idp.acme.test',
            subject: `cross-${suffix}`,
            email: adminB.email,
            firstName: 'Bea',
            lastName: 'Admin',
            role: Role.VIEWER,
            jitEnabled: true,
        })).rejects.toThrow(/not assigned/);

        const replayId = `_replay-${suffix}`;
        await identityService.assertFreshAssertion(provider.id, orgA.id, replayId);
        await expect(identityService.assertFreshAssertion(provider.id, orgA.id, replayId)).rejects.toThrow(/already been used/);

        const token = await scimService.createToken(orgA.id, adminA.id, 'Test');
        expect(token.token).toBeTruthy();
        const listed = await scimService.listTokens(orgA.id);
        expect(JSON.stringify(listed)).not.toContain(token.token);
        const scimOk = await request(app).get('/scim/v2/Users?count=2').set('Authorization', `Bearer ${token.token}`);
        expect(scimOk.status).toBe(200);
        expect(scimOk.body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');
        const scimOther = await request(app).get('/scim/v2/Users').set('Authorization', 'Bearer not-a-token');
        expect(scimOther.status).toBe(401);

        const created = await scimService.upsertUser(orgA.id, {
            userName: `scim-${suffix}@acme.test`,
            externalId: `scim-${suffix}`,
            name: { givenName: 'Sam', familyName: 'Scim' },
            active: true,
        }, provider.id);
        expect(created.created).toBe(true);
        const retry = await scimService.upsertUser(orgA.id, {
            userName: `scim-${suffix}@acme.test`,
            externalId: `scim-${suffix}`,
            name: { givenName: 'Sam', familyName: 'Scim' },
            active: true,
        }, provider.id);
        expect(retry.created).toBe(false);
        expect(retry.resource.id).toBe(created.resource.id);

        const page = await scimService.listUsers(orgA.id, { startIndex: '1', count: '2' });
        expect(page.itemsPerPage).toBeLessThanOrEqual(2);

        const otherToken = await scimService.authenticate(`Bearer ${token.token}`);
        expect(otherToken?.organizationId).toBe(orgA.id);
        const usersA = await scimService.listUsers(orgA.id, {});
        const usersB = await scimService.listUsers(orgB.id, {});
        expect(usersB.Resources.some((row: { id: string }) => row.id === created.resource.id)).toBe(false);
        expect(usersA.Resources.some((row: { id: string }) => row.id === created.resource.id)).toBe(true);

        await scimService.upsertGroup(orgA.id, {
            displayName: 'Acme-Viewers',
            externalId: 'g1',
            members: [{ value: created.resource.id }],
        }, provider.id);

        const session = await authService.completeFederatedSession(created.resource.id);
        expect(session.token).toBeTruthy();
        const viewerSession = await authService.completeFederatedSession(existing.id);
        const viewerDenied = await request(app).post('/api/v1/identity/providers').set('Authorization', `Bearer ${viewerSession.token}`).send({ protocol: 'SAML' });
        expect(viewerDenied.status).toBe(403);
        await scimService.patchUser(orgA.id, created.resource.id, { Operations: [{ op: 'replace', path: 'active', value: false }] });
        const disabled = await prisma.user.findUniqueOrThrow({ where: { id: created.resource.id } });
        expect(disabled.status).toBe(UserAccountStatus.DISABLED);
        expect(disabled.sessionEpoch).toBeGreaterThan(0);
        const revoked = await request(app).get('/api/v1/identity/overview').set('Authorization', `Bearer ${session.token}`);
        expect(revoked.status).toBe(401);

        const rotated = await scimService.rotateToken(orgA.id, token.id, adminA.id);
        expect(rotated.token).not.toBe(token.token);
        expect(await scimService.authenticate(`Bearer ${token.token}`)).toBeNull();
        await scimService.revokeToken(orgA.id, (await scimService.listTokens(orgA.id)).find((row) => !row.revoked)!.id, adminA.id);

        await identityService.setPolicy(orgA.id, provider.id, adminA.id, { jitEnabled: true });
        await prisma.identityProvider.update({
            where: { id: provider.id },
            data: { status: 'TESTED', lastTestResult: 'success', lastTestedAt: new Date() },
        });
        await identityService.setPolicy(orgA.id, provider.id, adminA.id, { ssoEnforcement: 'REQUIRED' as any });
        await identityService.enableProvider(orgA.id, provider.id, adminA.id, true);
        const denied = await identityService.passwordLoginAllowed({ id: existing.id, organizationId: orgA.id, role: existing.role });
        expect(denied.allowed).toBe(false);
        const recovery = await identityService.passwordLoginAllowed({ id: adminA.id, organizationId: orgA.id, role: adminA.role });
        expect(recovery.allowed).toBe(true);

        await recordAudit({
            organizationId: orgA.id,
            action: 'identity.provider.updated',
            resourceType: 'IdentityProvider',
            result: 'success',
            metadata: { samlResponse: 'should-redact', token: 'secret' },
        });
        const audit = await prisma.auditEvent.findFirst({ where: { organizationId: orgA.id, action: 'identity.provider.updated' }, orderBy: { timestamp: 'desc' } });
        expect(JSON.stringify(audit?.metadata || {})).not.toContain('should-redact');
        expect(hashToken('x')).not.toBe('x');
    });
});

describe('enterprise identity gates and public origin', () => {
    const hostedOrigin = 'https://supreme-risk-staging-api.onrender.com';

    afterEach(() => {
        delete process.env.API_PUBLIC_URL;
        delete process.env.APP_ENVIRONMENT;
        delete process.env.IDENTITY_ALLOW_TOKEN_VERIFY;
    });

    it('keeps SAML metadata, ACS, and entity ID on the same public origin', () => {
        process.env.NODE_ENV = 'test';
        process.env.APP_ENVIRONMENT = 'staging';
        process.env.API_PUBLIC_URL = hostedOrigin;
        const xml = identityService.samlMetadata('idp_meta');
        expect(xml).toContain(`entityID="${hostedOrigin}/saml/sp/idp_meta"`);
        expect(xml).toContain(`Location="${hostedOrigin}/api/v1/auth/sso/saml/acs/idp_meta"`);
        expect(xml).not.toMatch(/localhost|127\.0\.0\.1/);
    });

    it('rejects incomplete enable, untested require-SSO, unknown-group elevation, and platform role mapping', async () => {
        await prisma.$queryRaw`SELECT 1`;
        const suffix = `${Date.now()}-gates`;
        const org = await prisma.organization.create({ data: { name: `IdGates ${suffix}`, country: 'US' } });
        const admin = await prisma.user.create({
            data: {
                email: `admin-gates-${suffix}@a.test`,
                hashedPassword: await hashPassword('ValidPass1x'),
                firstName: 'Gia',
                lastName: 'Gates',
                role: Role.ORGANIZATION_ADMIN,
                organizationId: org.id,
            },
        });
        const provider = await identityService.createProvider(org.id, admin.id, { displayName: 'Draft SAML', protocol: IdentityProtocol.SAML });
        expect(provider.status.key).toBe('not_configured');
        await expect(identityService.enableProvider(org.id, provider.id, admin.id, true)).rejects.toThrow(/successful test/i);
        await expect(identityService.setPolicy(org.id, provider.id, admin.id, { ssoEnforcement: 'REQUIRED' as any })).rejects.toThrow(/successful test/i);

        await identityService.updateProvider(org.id, provider.id, admin.id, {
            idpEntityId: 'https://idp.example',
            ssoUrl: 'https://idp.example/sso',
        });
        const afterPartial = await identityService.listProviders(org.id);
        expect(afterPartial[0].status.key).toBe('not_configured');

        await identityService.updateProvider(org.id, provider.id, admin.id, {
            idpCertificate: 'CERT',
        });
        const configured = await identityService.listProviders(org.id);
        expect(configured[0].status.key).toBe('configured');
        expect(configured[0].status.label).toMatch(/not verified/i);
        expect(configured[0].saml.acsUrl).toMatch(/\/api\/v1\/auth\/sso\/saml\/acs\//);
        expect(configured[0].saml.spEntityId).toMatch(/\/saml\/sp\//);

        await expect(identityService.replaceMappings(org.id, provider.id, admin.id, [
            { idpGroup: 'Platform', supremeRole: Role.PLATFORM_OWNER },
        ])).rejects.toThrow(/cannot be assigned/i);
        await expect(identityService.replaceMappings(org.id, provider.id, admin.id, [
            { idpGroup: 'Platform', supremeRole: Role.PLATFORM_ADMIN },
        ])).rejects.toThrow(/cannot be assigned/i);

        await identityService.replaceMappings(org.id, provider.id, admin.id, [
            { idpGroup: 'Acme-Viewers', supremeRole: Role.VIEWER },
        ]);
        await expect(identityService.resolveRole(provider.id, ['Unknown-Admins'], Role.VIEWER)).resolves.toBe(Role.VIEWER);
        await expect(identityService.resolveRole(provider.id, ['Acme-Viewers'], Role.VIEWER)).resolves.toBe(Role.VIEWER);

        const claimed = await identityService.startDomain(org.id, admin.id, `unverified-${suffix}.example`);
        delete process.env.IDENTITY_ALLOW_TOKEN_VERIFY;
        await expect(identityService.verifyDomain(org.id, claimed.id, admin.id)).rejects.toThrow(/not verified/i);
        const pending = await prisma.identityDomain.findUniqueOrThrow({ where: { id: claimed.id } });
        expect(pending.status).toBe('PENDING');
        const failed = await prisma.auditEvent.findFirst({ where: { organizationId: org.id, action: 'identity.domain.failed' } });
        expect(failed?.result).toBe('failure');

        await prisma.identityProvider.update({
            where: { id: provider.id },
            data: { status: 'TESTED', lastTestResult: 'success', lastTestedAt: new Date() },
        });
        await expect(identityService.setPolicy(org.id, provider.id, admin.id, { ssoEnforcement: 'REQUIRED' as any })).rejects.toThrow(/Verify a domain/i);

        process.env.IDENTITY_ALLOW_TOKEN_VERIFY = 'true';
        const verified = await identityService.verifyDomain(org.id, claimed.id, admin.id, claimed.tokenShownOnce);
        expect(verified.status).toBe('Verified');
        await identityService.setPolicy(org.id, provider.id, admin.id, { jitEnabled: true, ssoEnforcement: 'OPTIONAL' as any });
        const events = await identityService.activity(org.id);
        expect(events.some((row) => row.action === 'identity.domain.verification_started' && row.label === 'Domain verification started')).toBe(true);
        expect(events.some((row) => row.action === 'identity.role_mapping.changed' && row.label === 'Role mapping changed')).toBe(true);
        expect(events.some((row) => row.action === 'identity.jit.enabled' && row.label === 'Just-in-time provisioning enabled')).toBe(true);
        expect(events.some((row) => row.action === 'identity.sso.optional' && row.label === 'Company SSO optional')).toBe(true);
        expect(JSON.stringify(events)).not.toMatch(/tokenShownOnce|supreme-domain-verification=/);
    });
});
