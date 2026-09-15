import request from 'supertest';
import { IssuePriority, IssueSeverity, IssueSource, VendorCategory, VendorIssueType, VendorTier, VendorType } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';

jest.setTimeout(120000);

const PASSWORD = 'AutoPass1x';
const API = '/api/v1/automation';

describe('supreme automation tenant isolation and human boundary', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let orgA = '';
    let userA = '';
    let findingId = '';
    let automationId = '';
    let executionPublicId = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signupA = await request(app).post('/api/v1/auth/signup').send({
            email: `auto-a-${suffix}@tenant-a.test`,
            password: PASSWORD,
            firstName: 'Auto',
            lastName: 'Alpha',
            organizationName: `Auto A ${suffix}`,
            country: 'US',
        });
        const signupB = await request(app).post('/api/v1/auth/signup').send({
            email: `auto-b-${suffix}@tenant-b.test`,
            password: PASSWORD,
            firstName: 'Auto',
            lastName: 'Bravo',
            organizationName: `Auto B ${suffix}`,
            country: 'US',
        });
        expect(signupA.status).toBe(201);
        expect(signupB.status).toBe(201);
        tokenA = signupA.body.data.token;
        tokenB = signupB.body.data.token;
        orgA = signupA.body.data.user.organizationId;
        userA = signupA.body.data.user.id;

        const vendor = await prisma.vendor.create({
            data: {
                organizationId: orgA,
                name: `Auto Vendor ${suffix}`,
                vendorType: VendorType.PROFESSIONAL_SERVICES,
                category: VendorCategory.OTHER,
                tier: VendorTier.CRITICAL,
                primaryContact: 'Pat Lee',
                contactEmail: `auto-vendor-${suffix}@example.test`,
                servicesProvided: 'Claims review',
            },
        });
        const finding = await prisma.vendorIssue.create({
            data: {
                organizationId: orgA,
                vendorId: vendor.id,
                title: 'Overdue critical finding',
                description: 'Remediation date has passed.',
                issueType: VendorIssueType.CONTROL_FAILURE,
                severity: IssueSeverity.CRITICAL,
                priority: IssuePriority.URGENT,
                source: IssueSource.INTERNAL_ASSESSMENT,
                identifiedBy: userA,
                assignedTo: userA,
                category: 'Security',
                targetRemediationDate: new Date(Date.now() - 86400000),
            },
        });
        findingId = finding.id;
    });

    it('creates, publishes, previews without writes, then runs once per day', async () => {
        const created = await request(app)
            .post(API)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ templateKey: 'high-finding-remediation-follow-up', ownerUserId: userA });
        expect(created.status).toBe(201);
        automationId = created.body.data.publicId;

        const published = await request(app)
            .post(`${API}/${automationId}/publish`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({});
        expect(published.status).toBe(200);
        expect(published.body.data.status).toBe('ACTIVE');

        const preview = await request(app)
            .post(`${API}/${automationId}/preview`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ sourceModel: 'VendorIssue', sourceId: findingId, event: 'finding.overdue' });
        expect(preview.status).toBe(200);
        expect(preview.body.data.label).toMatch(/PREVIEW/);
        expect(preview.body.data.writes).toBe(false);
        const workBefore = await prisma.automationWorkItem.count({ where: { organizationId: orgA } });
        expect(workBefore).toBe(0);

        const scan = await request(app)
            .post(`${API}/scan`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({});
        expect(scan.status).toBe(200);

        const runs = await request(app)
            .get(`${API}/executions`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(runs.status).toBe(200);
        expect(runs.body.data.length).toBeGreaterThan(0);
        executionPublicId = runs.body.data[0].publicId;
        expect(runs.body.data[0].whatSupremeDidNotDo).toEqual(expect.arrayContaining(['Accept risk', 'Close finding']));
        expect(runs.body.data[0].humanApprovalRequired).toBe(true);

        const again = await request(app)
            .post(`${API}/scan`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({});
        expect(again.status).toBe(200);
        const runCount = await prisma.automationExecution.count({ where: { organizationId: orgA, preview: false } });
        expect(runCount).toBe(1);

        const finding = await prisma.vendorIssue.findUnique({ where: { id: findingId } });
        expect(finding?.status).toBe('OPEN');
    });

    it('blocks cross-tenant lookup, forged organization IDs, and viewer publish', async () => {
        const foreign = await request(app)
            .get(`${API}/${automationId}`)
            .set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(foreign.status);

        const forged = await request(app)
            .get(`${API}/workspace`)
            .query({ organizationId: orgA })
            .set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(forged.status);

        const leak = await request(app)
            .get(`${API}/executions`)
            .set('Authorization', `Bearer ${tokenB}`);
        expect(leak.status).toBe(200);
        expect(JSON.stringify(leak.body)).not.toContain(automationId);
        expect(JSON.stringify(leak.body)).not.toContain(executionPublicId);

        const retry = await request(app)
            .post(`${API}/executions/${executionPublicId}/retry`)
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ organizationId: orgA });
        expect([403, 404]).toContain(retry.status);

        const viewerUser = await prisma.user.findFirst({
            where: { organizationId: orgA, email: { contains: `auto-a-${suffix}` } },
        });
        expect(viewerUser).toBeTruthy();
        await prisma.user.update({
            where: { id: viewerUser!.id },
            data: { role: 'VIEWER' },
        });
        const viewerLogin = await request(app).post('/api/v1/auth/login').send({
            email: `auto-a-${suffix}@tenant-a.test`,
            password: PASSWORD,
        });
        const viewer = await request(app)
            .post(`${API}/${automationId}/publish`)
            .set('Authorization', `Bearer ${viewerLogin.body.data.token}`)
            .send({});
        expect(viewer.status).toBe(403);
        const readable = await request(app)
            .get(`${API}/workspace`)
            .set('Authorization', `Bearer ${viewerLogin.body.data.token}`);
        expect(readable.status).toBe(200);
    });
});
