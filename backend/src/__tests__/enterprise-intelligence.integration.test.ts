import request from 'supertest';
import { Role, UserAccountStatus, VendorCategory, VendorIssueType, IssuePriority, IssueSeverity, IssueSource, VendorTier, VendorType } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { hashPassword } from '../services/passwordService';

jest.setTimeout(120000);

const PASSWORD = 'IntelPass1x';
const API = '/api/v1';

function fileBuffer(res: { body: unknown; text?: string }): Buffer {
    if (Buffer.isBuffer(res.body)) return res.body;
    if (typeof res.body === 'string') return Buffer.from(res.body, 'binary');
    if (res.body instanceof Uint8Array) return Buffer.from(res.body);
    if (typeof res.text === 'string' && res.text.length) return Buffer.from(res.text, 'binary');
    return Buffer.from(JSON.stringify(res.body || ''));
}

describe('supreme intelligence tenant isolation and honesty', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let orgA = '';
    let findingId = '';
    let itemA = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signupA = await request(app).post(`${API}/auth/signup`).send({
            email: `intel-a-${suffix}@tenant-a.test`,
            password: PASSWORD,
            firstName: 'Intel',
            lastName: 'Alpha',
            organizationName: `Intel A ${suffix}`,
            country: 'US',
        });
        const signupB = await request(app).post(`${API}/auth/signup`).send({
            email: `intel-b-${suffix}@tenant-b.test`,
            password: PASSWORD,
            firstName: 'Intel',
            lastName: 'Bravo',
            organizationName: `Intel B ${suffix}`,
            country: 'US',
        });
        expect(signupA.status).toBe(201);
        expect(signupB.status).toBe(201);
        tokenA = signupA.body.data.token;
        tokenB = signupB.body.data.token;
        orgA = signupA.body.data.user.organizationId;

        const vendor = await prisma.vendor.create({
            data: {
                organizationId: orgA,
                name: 'Northwind Claims Review',
                vendorType: VendorType.PROFESSIONAL_SERVICES,
                category: VendorCategory.OTHER,
                tier: VendorTier.CRITICAL,
                primaryContact: 'Pat Lee',
                contactEmail: `vendor-${suffix}@example.test`,
                servicesProvided: 'Claims review',
            },
        });
        const finding = await prisma.vendorIssue.create({
            data: {
                organizationId: orgA,
                vendorId: vendor.id,
                title: 'MFA evidence missing',
                description: 'Critical vendor MFA evidence is not current.',
                issueType: VendorIssueType.CONTROL_FAILURE,
                severity: IssueSeverity.CRITICAL,
                priority: IssuePriority.URGENT,
                source: IssueSource.INTERNAL_ASSESSMENT,
                identifiedBy: signupA.body.data.user.id,
                category: 'Security',
            },
        });
        findingId = finding.id;

        await prisma.user.create({
            data: {
                email: `intel-viewer-${suffix}@tenant-a.test`,
                hashedPassword: await hashPassword(PASSWORD),
                firstName: 'View',
                lastName: 'Only',
                role: Role.VIEWER,
                organizationId: orgA,
                status: UserAccountStatus.ACTIVE,
                emailVerifiedAt: new Date(),
                passwordChangedAt: new Date(),
            },
        });
    });

    it('generates prioritized intelligence from live records and keeps it tenant-scoped', async () => {
        const workspaceA = await request(app).get(`${API}/intelligence/workspace`).set('Authorization', `Bearer ${tokenA}`);
        expect(workspaceA.status).toBe(200);
        expect(workspaceA.body.data.honesty).toMatch(/interprets recorded Supreme facts/i);
        expect(workspaceA.body.data.externalIntelligence.status).toBe('NOT_CONFIGURED');
        expect(workspaceA.body.data.externalIntelligence.message).toMatch(/not configured/i);
        const attention = [...(workspaceA.body.data.criticalAttention || []), ...(workspaceA.body.data.highAttention || [])];
        expect(attention.some((row: { title: string }) => /finding is open/i.test(row.title))).toBe(true);
        itemA = attention.find((row: { title: string }) => /finding is open/i.test(row.title))?.publicId;
        expect(itemA).toMatch(/^INT-\d{5}$/);

        const workspaceB = await request(app).get(`${API}/intelligence/workspace`).set('Authorization', `Bearer ${tokenB}`);
        expect(workspaceB.status).toBe(200);
        expect(JSON.stringify(workspaceB.body)).not.toContain(itemA);
        expect(JSON.stringify(workspaceB.body)).not.toContain('MFA evidence missing');

        const leaked = await request(app).get(`${API}/intelligence/items/${itemA}`).set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(leaked.status);
        expect(JSON.stringify(leaked.body)).not.toContain('MFA evidence missing');

        const forged = await request(app).get(`${API}/intelligence/workspace`).set('Authorization', `Bearer ${tokenB}`).query({ organizationId: orgA });
        expect([403, 404]).toContain(forged.status);
        expect(JSON.stringify(forged.body)).not.toContain(itemA);

        const external = await request(app).get(`${API}/intelligence/external`).set('Authorization', `Bearer ${tokenA}`);
        expect(external.body.data.status).toBe('NOT_CONFIGURED');

        const narrative = await request(app).get(`${API}/intelligence/items/${itemA}/narrative`).set('Authorization', `Bearer ${tokenA}`);
        expect(narrative.status).toBe(200);
        expect(narrative.body.data.status).toBe('NOT_CONFIGURED');
        expect(narrative.body.data.authority).toBe('AI-GENERATED NARRATIVE');

        const pdf = await request(app).get(`${API}/intelligence/reports/brief.pdf`).set('Authorization', `Bearer ${tokenA}`);
        expect(pdf.status).toBe(200);
        expect(fileBuffer(pdf).subarray(0, 4).toString()).toBe('%PDF');
        expect(fileBuffer(pdf).toString('utf8')).toMatch(/Supreme Intelligence Brief|Supreme Governance Platform/);
    });

    it('acknowledges intelligence without changing the source finding', async () => {
        const ack = await request(app).post(`${API}/intelligence/items/${itemA}/acknowledge`).set('Authorization', `Bearer ${tokenA}`).send({});
        expect(ack.status).toBe(200);
        expect(ack.body.data.lifecycle).toBe('ACKNOWLEDGED');
        const finding = await prisma.vendorIssue.findUnique({ where: { id: findingId } });
        expect(finding?.status).toBe('OPEN');

        const viewerLogin = await request(app).post(`${API}/auth/login`).send({
            email: `intel-viewer-${suffix}@tenant-a.test`,
            password: PASSWORD,
            plane: 'CUSTOMER',
        });
        expect(viewerLogin.status).toBe(200);
        const denied = await request(app).post(`${API}/intelligence/items/${itemA}/acknowledge`).set('Authorization', `Bearer ${viewerLogin.body.data.token}`).send({});
        expect([401, 403]).toContain(denied.status);
    });

    it('resolves current intelligence when the source condition ends and keeps history', async () => {
        await prisma.vendorIssue.update({
            where: { id: findingId },
            data: { status: 'CLOSED', closedAt: new Date() },
        });
        const workspace = await request(app).get(`${API}/intelligence/workspace`).set('Authorization', `Bearer ${tokenA}`);
        expect(workspace.status).toBe(200);
        const currentOpen = [...(workspace.body.data.criticalAttention || []), ...(workspace.body.data.highAttention || [])]
            .filter((row: { publicId: string; changeType: string }) => row.publicId === itemA);
        expect(currentOpen).toHaveLength(0);
        const historical = await request(app).get(`${API}/intelligence/items/${itemA}`).query({}).set('Authorization', `Bearer ${tokenA}`);
        expect(historical.status).toBe(200);
        expect(historical.body.data.current).toBe(false);
        expect(historical.body.data.lifecycle).toBe('RESOLVED_BY_SOURCE');
        expect(historical.body.data.timeline.some((event: { eventType: string }) => event.eventType === 'resolved')).toBe(true);
        expect(workspace.body.data.positiveMovement.some((row: { title: string }) => /finding closed/i.test(row.title))).toBe(true);
    });
});
