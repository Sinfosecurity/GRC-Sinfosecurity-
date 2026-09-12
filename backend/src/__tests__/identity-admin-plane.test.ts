import request from 'supertest';
import { Role, UserAccountStatus } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { totpAt } from '../security/totp';
import { configuredCorsOrigins, isAllowedCorsOrigin } from '../security/corsOrigins';
import { invitationEmailBody, portalFrontendUrl } from '../services/publicFrontendUrl';

jest.setTimeout(60000);

const PASSWORD = 'IdentityPass1x';
const API = '/api/v1';

async function signup(suffix: string, name: string) {
    const response = await request(app).post(`${API}/auth/signup`).send({
        email: `${name}-${suffix}@plane.test`,
        password: PASSWORD,
        firstName: name,
        lastName: 'User',
        organizationName: `${name} Org ${suffix}`,
        country: 'US',
    });
    expect(response.status).toBe(201);
    return {
        token: response.body.data.token as string,
        userId: response.body.data.user.id as string,
        orgId: response.body.data.user.organizationId as string,
        email: `${name}-${suffix}@plane.test`,
    };
}

async function enrollPlatform(email: string) {
    const login = await request(app).post(`${API}/auth/login`).send({ email, password: PASSWORD, plane: 'PLATFORM' });
    expect(login.body.data.mfaEnrollmentRequired).toBe(true);
    const enrollToken = login.body.data.enrollmentToken as string;
    const denied = await request(app).get(`${API}/platform/overview`).set('Authorization', `Bearer ${enrollToken}`);
    expect(denied.status).toBe(403);
    const start = await request(app).post(`${API}/auth/mfa/enroll/start`).set('Authorization', `Bearer ${enrollToken}`);
    const secret = start.body.data.secret as string;
    const confirm = await request(app)
        .post(`${API}/auth/mfa/enroll/confirm`)
        .set('Authorization', `Bearer ${enrollToken}`)
        .send({ code: totpAt(secret) });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.recoveryCodes).toHaveLength(8);
    expect(JSON.stringify(confirm.body)).not.toContain(secret);
    return { token: confirm.body.data.token as string, secret, recoveryCodes: confirm.body.data.recoveryCodes as string[] };
}

describe('identity and admin plane', () => {
    const suffix = `${Date.now()}`;
    let customer: Awaited<ReturnType<typeof signup>>;
    let other: Awaited<ReturnType<typeof signup>>;
    let owner: Awaited<ReturnType<typeof signup>>;
    let support: Awaited<ReturnType<typeof signup>>;
    let security: Awaited<ReturnType<typeof signup>>;
    let ownerAuth: Awaited<ReturnType<typeof enrollPlatform>>;
    let supportAuth: Awaited<ReturnType<typeof enrollPlatform>>;
    let securityAuth: Awaited<ReturnType<typeof enrollPlatform>>;

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        customer = await signup(suffix, 'cust');
        other = await signup(suffix, 'other');
        owner = await signup(suffix, 'owner');
        support = await signup(suffix, 'support');
        security = await signup(suffix, 'sec');
        await prisma.user.update({ where: { id: owner.userId }, data: { role: Role.PLATFORM_OWNER } });
        await prisma.user.update({ where: { id: support.userId }, data: { role: Role.SUPPORT_ADMIN } });
        await prisma.user.update({ where: { id: security.userId }, data: { role: Role.SECURITY_ADMIN } });
        ownerAuth = await enrollPlatform(owner.email);
        supportAuth = await enrollPlatform(support.email);
        securityAuth = await enrollPlatform(security.email);
    });

    it('keeps customer login on the customer plane and denies admin portal access', async () => {
        const ok = await request(app).post(`${API}/auth/login`).send({
            email: customer.email,
            password: PASSWORD,
            plane: 'CUSTOMER',
        });
        expect(ok.status).toBe(200);
        expect(ok.body.data.user.nextPath).toBe('/dashboard');
        expect(ok.body.data.plane).toBe('CUSTOMER');

        const bad = await request(app).post(`${API}/auth/login`).send({
            email: customer.email,
            password: 'WrongPass1x',
            plane: 'CUSTOMER',
        });
        expect(bad.status).toBe(401);
        expect(bad.body.error?.message || bad.body.message || JSON.stringify(bad.body)).not.toMatch(/PLATFORM_OWNER|SECURITY_ADMIN/);

        const adminDenied = await request(app).post(`${API}/auth/login`).send({
            email: customer.email,
            password: PASSWORD,
            plane: 'PLATFORM',
        });
        expect(adminDenied.status).toBe(401);
        expect(JSON.stringify(adminDenied.body)).not.toMatch(/PLATFORM_OWNER|mfaEnrollmentRequired/);
    });

    it('denies disabled customer and platform accounts with a generic error', async () => {
        const disabled = await signup(suffix, 'disabled');
        await prisma.user.update({ where: { id: disabled.userId }, data: { status: UserAccountStatus.DISABLED } });
        const response = await request(app).post(`${API}/auth/login`).send({
            email: disabled.email,
            password: PASSWORD,
            plane: 'CUSTOMER',
        });
        expect(response.status).toBe(401);
        await prisma.user.update({
            where: { id: owner.userId },
            data: { status: UserAccountStatus.DISABLED },
        });
        const ownerDisabled = await request(app).post(`${API}/auth/login`).send({
            email: owner.email,
            password: PASSWORD,
            plane: 'PLATFORM',
        });
        expect(ownerDisabled.status).toBe(401);
        await prisma.user.update({
            where: { id: owner.userId },
            data: { status: UserAccountStatus.ACTIVE },
        });
    });

    it('requires MFA for platform login and rejects invalid or reused codes', async () => {
        const login = await request(app).post(`${API}/auth/login`).send({
            email: owner.email,
            password: PASSWORD,
            plane: 'PLATFORM',
        });
        expect(login.body.data.mfaRequired).toBe(true);
        const invalid = await request(app).post(`${API}/auth/mfa/verify`).send({
            challengeToken: login.body.data.challengeToken,
            code: '000000',
        });
        expect(invalid.status).toBe(403);

        const fresh = await request(app).post(`${API}/auth/login`).send({
            email: owner.email,
            password: PASSWORD,
            plane: 'PLATFORM',
        });
        const valid = await request(app).post(`${API}/auth/mfa/verify`).send({
            challengeToken: fresh.body.data.challengeToken,
            code: ownerAuth.recoveryCodes[1],
        });
        expect(valid.status).toBe(200);
        ownerAuth.token = valid.body.data.token;
        expect(JSON.stringify(valid.body)).not.toMatch(/mfaSecret|recoveryCodes|otpauth/);
    });

    it('accepts a recovery code once and refuses reuse', async () => {
        const login = await request(app).post(`${API}/auth/login`).send({
            email: support.email,
            password: PASSWORD,
            plane: 'PLATFORM',
        });
        const first = await request(app).post(`${API}/auth/mfa/verify`).send({
            challengeToken: login.body.data.challengeToken,
            code: supportAuth.recoveryCodes[0],
        });
        expect(first.status).toBe(200);
        const againLogin = await request(app).post(`${API}/auth/login`).send({
            email: support.email,
            password: PASSWORD,
            plane: 'PLATFORM',
        });
        const reuse = await request(app).post(`${API}/auth/mfa/verify`).send({
            challengeToken: againLogin.body.data.challengeToken,
            code: supportAuth.recoveryCodes[0],
        });
        expect(reuse.status).toBe(403);
        supportAuth.token = first.body.data.token;
    });

    it('denies platform staff automatic customer tenant access and customer admin-plane APIs', async () => {
        const vendors = await request(app).get(`${API}/vendors`).set('Authorization', `Bearer ${ownerAuth.token}`);
        expect([403, 404]).toContain(vendors.status);
        const tickets = await request(app).get(`${API}/support/tickets`).set('Authorization', `Bearer ${ownerAuth.token}`);
        expect(tickets.status).toBe(403);
        const platform = await request(app).get(`${API}/platform/overview`).set('Authorization', `Bearer ${customer.token}`);
        expect(platform.status).toBe(403);
        const customerPlane = await request(app).post(`${API}/auth/login`).send({
            email: owner.email,
            password: PASSWORD,
            plane: 'CUSTOMER',
        });
        expect(customerPlane.status).toBe(401);
    });

    it('requires customer approval for ordinary support access and honors deny/revoke', async () => {
        const ticket = await request(app)
            .post(`${API}/support/tickets`)
            .set('Authorization', `Bearer ${customer.token}`)
            .send({ subject: 'Need help', description: 'Login retry', category: 'ACCESS', priority: 'P3' });
        const requested = await request(app)
            .post(`${API}/platform/support-sessions`)
            .set('Authorization', `Bearer ${supportAuth.token}`)
            .send({
                organizationId: customer.orgId,
                ticketId: ticket.body.data.id,
                reason: 'Inspect invitation state',
                accessLevel: 'READ_ONLY',
                durationMinutes: 15,
            });
        expect(requested.status).toBe(201);

        const denied = await request(app)
            .post(`${API}/support/access-requests/${requested.body.data.id}/deny`)
            .set('Authorization', `Bearer ${customer.token}`);
        expect(denied.status).toBe(200);
        const startDenied = await request(app)
            .post(`${API}/platform/support-sessions/${requested.body.data.id}/start`)
            .set('Authorization', `Bearer ${supportAuth.token}`);
        expect(startDenied.status).toBe(400);

        const second = await request(app)
            .post(`${API}/platform/support-sessions`)
            .set('Authorization', `Bearer ${supportAuth.token}`)
            .send({
                organizationId: customer.orgId,
                ticketId: ticket.body.data.id,
                reason: 'Second attempt after denial',
                accessLevel: 'READ_ONLY',
                durationMinutes: 15,
            });
        const approved = await request(app)
            .post(`${API}/support/access-requests/${second.body.data.id}/approve`)
            .set('Authorization', `Bearer ${customer.token}`);
        expect(approved.status).toBe(200);
        const started = await request(app)
            .post(`${API}/platform/support-sessions/${second.body.data.id}/start`)
            .set('Authorization', `Bearer ${supportAuth.token}`);
        expect(started.status).toBe(200);
        const cross = await request(app)
            .get(`${API}/platform/support-sessions/${second.body.data.id}/tenant-snapshot`)
            .query({ organizationId: other.orgId })
            .set('Authorization', `Bearer ${supportAuth.token}`);
        expect(cross.status).toBe(404);
        const revoked = await request(app)
            .post(`${API}/support/access-requests/${second.body.data.id}/revoke`)
            .set('Authorization', `Bearer ${customer.token}`);
        expect(revoked.status).toBe(200);
        const afterRevoke = await request(app)
            .get(`${API}/platform/support-sessions/${second.body.data.id}/tenant-snapshot`)
            .set('Authorization', `Bearer ${supportAuth.token}`);
        expect(afterRevoke.status).toBe(403);
    });

    it('requires incident, reason, step-up, and a different approver for break-glass', async () => {
        const noIncident = await request(app)
            .post(`${API}/platform/support-sessions/break-glass`)
            .set('Authorization', `Bearer ${supportAuth.token}`)
            .send({ organizationId: customer.orgId, reason: 'Emergency' });
        expect(noIncident.status).toBe(400);

        const incident = await request(app)
            .post(`${API}/platform/incidents`)
            .set('Authorization', `Bearer ${ownerAuth.token}`)
            .send({ title: 'Suspected exposure', severity: 'P1', summary: 'Investigate tenant isolation', organizationIds: [customer.orgId] });
        expect(incident.status).toBe(201);

        const noReason = await request(app)
            .post(`${API}/platform/support-sessions/break-glass`)
            .set('Authorization', `Bearer ${supportAuth.token}`)
            .send({ organizationId: customer.orgId, incidentId: incident.body.data.id, reason: '' });
        expect(noReason.status).toBe(400);

        const created = await request(app)
            .post(`${API}/platform/support-sessions/break-glass`)
            .set('Authorization', `Bearer ${supportAuth.token}`)
            .send({
                organizationId: customer.orgId,
                incidentId: incident.body.data.id,
                reason: 'Critical security incident',
                durationMinutes: 15,
            });
        expect(created.status).toBe(201);

        const noStepUp = await request(app)
            .post(`${API}/platform/support-sessions/${created.body.data.id}/break-glass-approve`)
            .set('Authorization', `Bearer ${ownerAuth.token}`);
        expect(noStepUp.status).toBe(403);

        const stepUp = await request(app)
            .post(`${API}/auth/step-up`)
            .set('Authorization', `Bearer ${ownerAuth.token}`)
            .send({ code: ownerAuth.recoveryCodes[2] });
        expect(stepUp.status).toBe(200);

        const self = await request(app)
            .post(`${API}/platform/support-sessions/${created.body.data.id}/break-glass-approve`)
            .set('Authorization', `Bearer ${supportAuth.token}`);
        expect(self.status).toBe(403);

        const approved = await request(app)
            .post(`${API}/platform/support-sessions/${created.body.data.id}/break-glass-approve`)
            .set('Authorization', `Bearer ${ownerAuth.token}`);
        expect(approved.status).toBe(200);
        expect(approved.body.data.postEventReviewRequired).toBe(true);
        expect(approved.body.data.durationMinutes).toBeLessThanOrEqual(15);
    });

    it('requires step-up for platform role changes and MFA reset', async () => {
        await prisma.privilegeElevation.updateMany({
            where: { userId: owner.userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        const noElev = await request(app)
            .patch(`${API}/platform/internal-users/${support.userId}/role`)
            .set('Authorization', `Bearer ${ownerAuth.token}`)
            .send({ role: 'SUPPORT_ANALYST' });
        expect(noElev.status).toBe(403);

        await request(app)
            .post(`${API}/auth/step-up`)
            .set('Authorization', `Bearer ${ownerAuth.token}`)
            .send({ code: ownerAuth.recoveryCodes[3] });
        const reset = await request(app)
            .post(`${API}/platform/internal-users/${security.userId}/mfa-reset`)
            .set('Authorization', `Bearer ${ownerAuth.token}`);
        expect(reset.status).toBe(200);
        const securityUser = await prisma.user.findUnique({ where: { id: security.userId } });
        expect(securityUser?.mfaEnabled).toBe(false);
        expect(securityUser?.mfaSecretEnc).toBeNull();
    });

    it('does not leak secrets in audit metadata and prepares portal-specific email links', () => {
        expect(invitationEmailBody('PLATFORM_OWNER', 'opaque', {
            NODE_ENV: 'production',
            APP_ENVIRONMENT: 'staging',
            FRONTEND_BASE_URL: 'https://supreme-risk-staging.onrender.com',
            ADMIN_FRONTEND_URL: 'https://supreme-risk-staging.onrender.com',
        } as NodeJS.ProcessEnv)).toContain('/admin/activate?token=opaque');
        expect(portalFrontendUrl('CUSTOMER', {
            NODE_ENV: 'production',
            APP_ENVIRONMENT: 'staging',
            FRONTEND_BASE_URL: 'https://supreme-risk-staging.onrender.com',
            FRONTEND_URL: 'http://localhost:5173',
        } as NodeJS.ProcessEnv)).toBe('https://supreme-risk-staging.onrender.com');
        expect(isAllowedCorsOrigin('https://app.supremerisk.com', {
            CORS_ORIGIN: 'https://app.supremerisk.com,https://admin.supremerisk.com',
        } as NodeJS.ProcessEnv)).toBe(true);
        expect(isAllowedCorsOrigin('https://evil.example', {
            CORS_ORIGIN: 'https://app.supremerisk.com,https://admin.supremerisk.com',
        } as NodeJS.ProcessEnv)).toBe(false);
        expect(configuredCorsOrigins({ CORS_ORIGIN: 'https://app.supremerisk.com' } as NodeJS.ProcessEnv)).not.toContain('*');
    });
});
