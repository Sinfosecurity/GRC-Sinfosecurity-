import request from 'supertest';
import { IssuePriority, IssueSeverity, IssueSource, VendorCategory, VendorIssueType, VendorTier, VendorType } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';

jest.setTimeout(120000);

const notifyUser = jest.fn();
jest.mock('../services/notificationDeliveryService', () => {
    const actual = jest.requireActual('../services/notificationDeliveryService');
    return {
        ...actual,
        notifyUser: (...args: unknown[]) => notifyUser(...args),
    };
});

const PASSWORD = 'AutoRetry1x';
const API = '/api/v1/automation';

describe('Supreme Automation retry without duplicate work', () => {
    const suffix = `${Date.now()}`;
    let token = '';
    let userId = '';
    let orgId = '';
    let findingId = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signup = await request(app).post('/api/v1/auth/signup').send({
            email: `auto-retry-${suffix}@tenant-a.test`,
            password: PASSWORD,
            firstName: 'Auto',
            lastName: 'Retry',
            organizationName: `Auto Retry ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        token = signup.body.data.token;
        userId = signup.body.data.user.id;
        orgId = signup.body.data.user.organizationId;
        const vendor = await prisma.vendor.create({
            data: {
                organizationId: orgId,
                name: `Retry Vendor ${suffix}`,
                vendorType: VendorType.PROFESSIONAL_SERVICES,
                category: VendorCategory.OTHER,
                tier: VendorTier.CRITICAL,
                primaryContact: 'Pat Lee',
                contactEmail: `retry-vendor-${suffix}@example.test`,
                servicesProvided: 'Claims review',
            },
        });
        const finding = await prisma.vendorIssue.create({
            data: {
                organizationId: orgId,
                vendorId: vendor.id,
                title: 'Retry overdue finding',
                description: 'Used to prove notification retry does not duplicate work.',
                issueType: VendorIssueType.CONTROL_FAILURE,
                severity: IssueSeverity.HIGH,
                priority: IssuePriority.HIGH,
                source: IssueSource.INTERNAL_ASSESSMENT,
                identifiedBy: userId,
                assignedTo: userId,
                category: 'Security',
                targetRemediationDate: new Date(Date.now() - 86400000),
            },
        });
        findingId = finding.id;
    });

    it('records a retryable notification failure and retries without a second work item', async () => {
        notifyUser
            .mockResolvedValueOnce({ inApp: true, email: 'SKIPPED' })
            .mockRejectedValueOnce(new Error('mailbox unavailable'))
            .mockResolvedValue({ inApp: true, email: 'SKIPPED' });

        const created = await request(app)
            .post(API)
            .set('Authorization', `Bearer ${token}`)
            .send({ templateKey: 'high-finding-remediation-follow-up', ownerUserId: userId });
        expect(created.status).toBe(201);
        await request(app).post(`${API}/${created.body.data.publicId}/publish`).set('Authorization', `Bearer ${token}`).send({});

        const scan = await request(app).post(`${API}/scan`).set('Authorization', `Bearer ${token}`).send({});
        expect(scan.status).toBe(200);

        const runs = await request(app).get(`${API}/executions`).set('Authorization', `Bearer ${token}`);
        const run = runs.body.data.find((row: { triggerEvent: string }) => row.triggerEvent === 'finding.overdue');
        expect(run).toBeTruthy();
        expect(['PARTIAL', 'FAILED']).toContain(run.status);
        expect(run.willRetry).toBe(true);
        expect(run.whatFailed.some((item: { type: string }) => item.type === 'NOTIFY_OWNER' || item.type === 'CREATE_REMINDER')).toBe(true);
        const workBefore = await prisma.automationWorkItem.count({ where: { organizationId: orgId } });
        expect(workBefore).toBeGreaterThan(0);

        const retry = await request(app)
            .post(`${API}/executions/${run.publicId}/retry`)
            .set('Authorization', `Bearer ${token}`)
            .send({});
        expect(retry.status).toBe(200);
        expect(retry.body.data.status).toBe('SUCCEEDED');
        const workAfter = await prisma.automationWorkItem.count({ where: { organizationId: orgId } });
        expect(workAfter).toBe(workBefore);
        const finding = await prisma.vendorIssue.findUnique({ where: { id: findingId } });
        expect(finding?.status).toBe('OPEN');
    });
});
