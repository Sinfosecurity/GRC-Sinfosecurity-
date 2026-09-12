import request from 'supertest';
import { Role } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { hasPermission, PERMISSIONS, isPlatformStaffRole } from '../security/rbac';
import { rollupHealth } from '../services/customerHealth';
import { assertRoleAssignment } from '../services/identityUserService';
import { ApiError } from '../middleware/errorHandler';
import { totpAt } from '../security/totp';

jest.setTimeout(60000);

const PASSWORD = 'PlatformPass1x';
const API = '/api/v1';

async function signup(suffix: string, name: string) {
    const response = await request(app).post(`${API}/auth/signup`).send({
        email: `${name}-${suffix}@console.test`,
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
    };
}

async function setRole(userId: string, role: Role) {
    await prisma.user.update({ where: { id: userId }, data: { role } });
}

async function platformAuth(email: string) {
    const login = await request(app).post(`${API}/auth/login`).send({
        email,
        password: PASSWORD,
        plane: 'PLATFORM',
    });
    expect(login.status).toBe(200);
    expect(login.body.data.mfaEnrollmentRequired).toBe(true);
    const enrollToken = login.body.data.enrollmentToken as string;
    const start = await request(app)
        .post(`${API}/auth/mfa/enroll/start`)
        .set('Authorization', `Bearer ${enrollToken}`);
    expect(start.status).toBe(200);
    const confirm = await request(app)
        .post(`${API}/auth/mfa/enroll/confirm`)
        .set('Authorization', `Bearer ${enrollToken}`)
        .send({ code: totpAt(start.body.data.secret) });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.token).toBeTruthy();
    expect(JSON.stringify(confirm.body)).not.toMatch(/mfaSecretEnc|hashedPassword/);
    return confirm.body.data.token as string;
}

describe('platform owner console', () => {
    const suffix = `${Date.now()}`;
    let owner: Awaited<ReturnType<typeof signup>>;
    let support: Awaited<ReturnType<typeof signup>>;
    let analyst: Awaited<ReturnType<typeof signup>>;
    let customer: Awaited<ReturnType<typeof signup>>;
    let other: Awaited<ReturnType<typeof signup>>;

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        owner = await signup(suffix, 'owner');
        support = await signup(suffix, 'support');
        analyst = await signup(suffix, 'analyst');
        customer = await signup(suffix, 'customer');
        other = await signup(suffix, 'other');
        await setRole(owner.userId, Role.PLATFORM_OWNER);
        await setRole(support.userId, Role.SUPPORT_ADMIN);
        await setRole(analyst.userId, Role.SUPPORT_ANALYST);
        owner.token = await platformAuth(`owner-${suffix}@console.test`);
        support.token = await platformAuth(`support-${suffix}@console.test`);
        analyst.token = await platformAuth(`analyst-${suffix}@console.test`);
    });

    it('keeps tenant roles off platform permissions', () => {
        expect(hasPermission('ORGANIZATION_ADMIN', PERMISSIONS['platform.overview'])).toBe(false);
        expect(hasPermission('ADMIN', PERMISSIONS['platform.overview'])).toBe(false);
        expect(hasPermission('ASSESSOR', PERMISSIONS['platform.support.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['platform.organizations.read'])).toBe(false);
        expect(hasPermission('PLATFORM_OWNER', PERMISSIONS['platform.overview'])).toBe(true);
        expect(hasPermission('SUPPORT_ANALYST', PERMISSIONS['platform.support.manage'])).toBe(false);
        expect(isPlatformStaffRole('ORGANIZATION_ADMIN')).toBe(false);
    });

    it('does not infer HEALTHY from an empty signal set', () => {
        expect(rollupHealth([]).health).toBe('UNKNOWN');
        expect(
            rollupHealth([{ key: 'db', label: 'Database', observed: true, severity: 'HEALTHY' }]).health
        ).toBe('HEALTHY');
    });

    it('blocks tenant roles from platform APIs', async () => {
        const admin = await request(app).get(`${API}/platform/overview`).set('Authorization', `Bearer ${customer.token}`);
        const assessorUser = await prisma.user.update({
            where: { id: other.userId },
            data: { role: Role.ASSESSOR },
        });
        const assessor = await request(app).get(`${API}/platform/overview`).set('Authorization', `Bearer ${other.token}`);
        await prisma.user.update({ where: { id: assessorUser.id }, data: { role: Role.VIEWER } });
        const viewer = await request(app).get(`${API}/platform/overview`).set('Authorization', `Bearer ${other.token}`);
        expect(admin.status).toBe(403);
        expect(assessor.status).toBe(403);
        expect(viewer.status).toBe(403);
    });

    it('allows platform owner overview and directory', async () => {
        const overview = await request(app).get(`${API}/platform/overview`).set('Authorization', `Bearer ${owner.token}`);
        expect(overview.status).toBe(200);
        expect(overview.body.data.organizations.total).toBeGreaterThan(0);
        expect(overview.body.data.provider.database).toBeDefined();
        expect(overview.body.data.provider.database).not.toBe('ALL SYSTEMS HEALTHY');

        const orgs = await request(app).get(`${API}/platform/organizations`).set('Authorization', `Bearer ${owner.token}`);
        expect(orgs.status).toBe(200);
        const customerRow = orgs.body.data.find((row: { id: string }) => row.id === customer.orgId);
        expect(customerRow).toBeTruthy();
        expect(customerRow.health).toMatch(/HEALTHY|DEGRADED|ACTION_REQUIRED|INCIDENT|UNKNOWN/);

        const detail = await request(app)
            .get(`${API}/platform/organizations/${customer.orgId}`)
            .set('Authorization', `Bearer ${owner.token}`);
        expect(detail.status).toBe(200);
        expect(detail.body.data.summary.id).toBe(customer.orgId);
        expect(JSON.stringify(detail.body.data)).not.toMatch(/hashedPassword|sk_live|sk_test_/);
    });

    it('creates tenant-bound tickets and hides internal notes from customers', async () => {
        const created = await request(app)
            .post(`${API}/support/tickets`)
            .set('Authorization', `Bearer ${customer.token}`)
            .send({
                subject: 'Cannot export report',
                description: 'The board export stays on the spinner.',
                category: 'REPORTS',
                priority: 'P1',
                organizationId: other.orgId,
            });
        expect(created.status).toBe(403);

        const mine = await request(app)
            .post(`${API}/support/tickets`)
            .set('Authorization', `Bearer ${customer.token}`)
            .send({
                subject: 'Cannot export report',
                description: 'The board export stays on the spinner.',
                category: 'REPORTS',
                priority: 'P1',
            });
        expect(mine.status).toBe(201);
        expect(mine.body.data.organizationId).toBe(customer.orgId);
        expect(mine.body.data.priority).toBe('P2');
        expect(mine.body.data.requestedPriority).toBe('P1');

        const leaked = await request(app)
            .get(`${API}/support/tickets/${mine.body.data.id}`)
            .set('Authorization', `Bearer ${other.token}`);
        expect([403, 404]).toContain(leaked.status);

        await request(app)
            .patch(`${API}/platform/support/tickets/${mine.body.data.id}`)
            .set('Authorization', `Bearer ${owner.token}`)
            .send({
                status: 'IN_PROGRESS',
                assignedToUserId: support.userId,
                internalNote: 'Checking export worker. Do not share scanner keys.',
                customerReply: 'We received your request and are investigating.',
            })
            .expect(200);

        const customerView = await request(app)
            .get(`${API}/support/tickets/${mine.body.data.id}`)
            .set('Authorization', `Bearer ${customer.token}`);
        expect(customerView.status).toBe(200);
        const bodies = (customerView.body.data.messages || []).map((row: { body: string }) => row.body);
        expect(bodies.join(' ')).toContain('investigating');
        expect(bodies.join(' ')).not.toContain('scanner keys');

        const internal = await request(app)
            .get(`${API}/platform/support/tickets/${mine.body.data.id}`)
            .set('Authorization', `Bearer ${owner.token}`);
        expect(internal.body.data.messages.some((row: { visibility: string }) => row.visibility === 'INTERNAL')).toBe(true);
    });

    it('manages incidents and flags security incidents', async () => {
        const created = await request(app)
            .post(`${API}/platform/incidents`)
            .set('Authorization', `Bearer ${owner.token}`)
            .send({
                title: 'Email provider degraded',
                severity: 'P2',
                summary: 'Resend/SMTP failures on invitation delivery.',
                organizationIds: [customer.orgId],
                securityIncident: true,
                affectedServices: ['email'],
            });
        expect(created.status).toBe(201);
        expect(created.body.data.securityIncident).toBe(true);
        const resolved = await request(app)
            .patch(`${API}/platform/incidents/${created.body.data.id}`)
            .set('Authorization', `Bearer ${owner.token}`)
            .send({ status: 'RESOLVED', resolution: 'Provider recovered.' });
        expect(resolved.status).toBe(200);
        expect(resolved.body.data.status).toBe('RESOLVED');
    });

    it('shows demo leads internally and never to customers', async () => {
        const lead = await request(app).post(`${API}/demo-requests`).send({
            name: 'Casey Miles',
            email: `casey-${suffix}@lead.test`,
            company: 'Northwind Audit',
            role: 'CISO',
            companySize: '251–1,000',
            primaryNeed: 'Vendor assessments and decision briefs',
            selectedPlan: 'professional',
            intent: 'demo',
            source: 'pricing',
        });
        expect([200, 202]).toContain(lead.status);

        const denied = await request(app).get(`${API}/platform/demo-requests`).set('Authorization', `Bearer ${customer.token}`);
        expect(denied.status).toBe(403);

        const queue = await request(app).get(`${API}/platform/demo-requests`).set('Authorization', `Bearer ${owner.token}`);
        expect(queue.status).toBe(200);
        const found = queue.body.data.find((row: { email: string }) => row.email === `casey-${suffix}@lead.test`);
        expect(found).toBeTruthy();
        expect(found.selectedPlan).toBe('professional');
        expect(found.intent).toBe('demo');
        expect(found.source).toBe('pricing');

        if (found) {
            const updated = await request(app)
                .patch(`${API}/platform/demo-requests/${found.id}`)
                .set('Authorization', `Bearer ${support.token}`)
                .send({ leadStatus: 'CONTACTED', assignedToUserId: support.userId, internalNotes: 'Call Monday' });
            expect(updated.status).toBe(200);
            expect(updated.body.data.internalNotes).toBe('Call Monday');
        }
    });

    it('enforces time-limited, tenant-bound, audited support access', async () => {
        const ticket = await request(app)
            .post(`${API}/support/tickets`)
            .set('Authorization', `Bearer ${customer.token}`)
            .send({ subject: 'Login loop', description: 'Activation link expired.', category: 'ACCESS', priority: 'P3' });

        const selfApprove = await request(app)
            .post(`${API}/platform/support-sessions`)
            .set('Authorization', `Bearer ${analyst.token}`)
            .send({
                organizationId: customer.orgId,
                ticketId: ticket.body.data.id,
                reason: 'Need to inspect invitation state',
                accessLevel: 'READ_ONLY',
                durationMinutes: 15,
            });
        expect(selfApprove.status).toBe(201);
        const deniedSelf = await request(app)
            .post(`${API}/platform/support-sessions/${selfApprove.body.data.id}/approve`)
            .set('Authorization', `Bearer ${analyst.token}`);
        expect(deniedSelf.status).toBe(403);

        const requested = await request(app)
            .post(`${API}/platform/support-sessions`)
            .set('Authorization', `Bearer ${support.token}`)
            .send({
                organizationId: customer.orgId,
                ticketId: ticket.body.data.id,
                reason: 'Confirm invitation expiry for SUP ticket',
                accessLevel: 'READ_ONLY',
                durationMinutes: 30,
            });
        expect(requested.status).toBe(201);
        expect(requested.body.data.accessLevel).toBe('READ_ONLY');

        const ownerApprove = await request(app)
            .post(`${API}/platform/support-sessions/${requested.body.data.id}/approve`)
            .set('Authorization', `Bearer ${owner.token}`);
        expect(ownerApprove.status).toBe(400);

        const approved = await request(app)
            .post(`${API}/support/access-requests/${requested.body.data.id}/approve`)
            .set('Authorization', `Bearer ${customer.token}`);
        expect(approved.status).toBe(200);

        const started = await request(app)
            .post(`${API}/platform/support-sessions/${requested.body.data.id}/start`)
            .set('Authorization', `Bearer ${support.token}`);
        expect(started.status).toBe(200);
        expect(started.body.data.status).toBe('ACTIVE');
        expect(new Date(started.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());

        const cross = await request(app)
            .get(`${API}/platform/support-sessions/${requested.body.data.id}/tenant-snapshot`)
            .query({ organizationId: other.orgId })
            .set('Authorization', `Bearer ${support.token}`);
        expect(cross.status).toBe(404);

        const snapshot = await request(app)
            .get(`${API}/platform/support-sessions/${requested.body.data.id}/tenant-snapshot`)
            .set('Authorization', `Bearer ${support.token}`);
        expect(snapshot.status).toBe(200);
        expect(snapshot.body.data.organization.id).toBe(customer.orgId);

        const writeDenied = await request(app)
            .post(`${API}/platform/support-sessions/${requested.body.data.id}/tenant-action`)
            .set('Authorization', `Bearer ${support.token}`)
            .send({ action: 'user.disable' });
        expect(writeDenied.status).toBe(403);

        const cleanDenied = await request(app)
            .post(`${API}/platform/support-sessions/${requested.body.data.id}/tenant-action`)
            .set('Authorization', `Bearer ${support.token}`)
            .send({ action: 'evidence.mark_clean' });
        expect(cleanDenied.status).toBe(403);

        const revoked = await request(app)
            .post(`${API}/platform/support-sessions/${requested.body.data.id}/revoke`)
            .set('Authorization', `Bearer ${owner.token}`);
        expect(revoked.status).toBe(200);

        const audit = await request(app).get(`${API}/platform/audit`).set('Authorization', `Bearer ${owner.token}`);
        expect(audit.status).toBe(200);
        const actions = audit.body.data.map((row: { action: string; actorUserId: string }) => row.action);
        expect(actions).toEqual(expect.arrayContaining([
            'support.session_requested',
            'support.session_customer_approved',
            'support.session_started',
            'support.session_revoked',
        ]));
        expect(audit.body.data.every((row: { actorUserId: string | null }) => row.actorUserId)).toBe(true);
    });

    it('blocks support staff from granting platform owner', () => {
        expect(() =>
            assertRoleAssignment({
                actorId: support.userId,
                actorRole: Role.SUPPORT_ADMIN,
                targetId: analyst.userId,
                targetCurrentRole: Role.SUPPORT_ANALYST,
                nextRole: Role.PLATFORM_OWNER,
                action: 'role_change',
            })
        ).toThrow(ApiError);
    });

    it('blocks customers from platform billing and keeps provider health honest', async () => {
        const denied = await request(app).get(`${API}/platform/billing`).set('Authorization', `Bearer ${customer.token}`);
        expect(denied.status).toBe(403);
        const billing = await request(app).get(`${API}/platform/billing`).set('Authorization', `Bearer ${owner.token}`);
        expect(billing.status).toBe(200);
        expect(JSON.stringify(billing.body)).not.toMatch(/sk_live|sk_test_|whsec_/);

        const health = await request(app).get(`${API}/platform/provider-health`).set('Authorization', `Bearer ${owner.token}`);
        expect(health.status).toBe(200);
        expect(['CONNECTED', 'DEGRADED', 'NOT_CONFIGURED', 'ERROR', 'POLICY', 'PATH_PRESENT']).toContain(
            health.body.data.stripe
        );
    });
});
