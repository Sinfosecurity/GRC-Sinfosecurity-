import request from 'supertest';
import { VendorCategory, VendorTier, VendorType } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';

jest.setTimeout(180000);

const PASSWORD = 'AutoIntel1x';
const API = '/api/v1';

describe('Supreme Automation Intelligence contract and domain proofs', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let orgA = '';
    let userA = '';
    let vendorId = '';
    let findingId = '';
    let intelPublicId = '';
    let intelRunId = '';
    let workPublicId = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signupA = await request(app).post(`${API}/auth/signup`).send({
            email: `auto-intel-a-${suffix}@tenant-a.test`,
            password: PASSWORD,
            firstName: 'Auto',
            lastName: 'Intel',
            organizationName: `Auto Intel A ${suffix}`,
            country: 'US',
        });
        const signupB = await request(app).post(`${API}/auth/signup`).send({
            email: `auto-intel-b-${suffix}@tenant-b.test`,
            password: PASSWORD,
            firstName: 'Auto',
            lastName: 'Bravo',
            organizationName: `Auto Intel B ${suffix}`,
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
                name: `Intel Vendor ${suffix}`,
                vendorType: VendorType.PROFESSIONAL_SERVICES,
                category: VendorCategory.OTHER,
                tier: VendorTier.CRITICAL,
                primaryContact: 'Pat Lee',
                contactEmail: `intel-vendor-${suffix}@example.test`,
                servicesProvided: 'Claims review',
            },
        });
        vendorId = vendor.id;
    });

    it('emits one Critical Attention run from Intelligence persist and does not duplicate', async () => {
        const published = await request(app)
            .post(`${API}/automation`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ templateKey: 'intelligence-critical-attention', ownerUserId: userA });
        expect(published.status).toBe(201);
        const autId = published.body.data.publicId;
        const active = await request(app)
            .post(`${API}/automation/${autId}/publish`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({});
        expect(active.status).toBe(200);

        const finding = await request(app)
            .post(`${API}/tprm/vendors/${vendorId}/findings`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                title: 'Critical MFA evidence missing',
                description: 'Authoritative finding for Intelligence → Automation.',
                severity: 'CRITICAL',
                priority: 'URGENT',
                assignedTo: userA,
            });
        expect(finding.status).toBe(201);
        findingId = finding.body.data.id;

        const workspace = await request(app).get(`${API}/intelligence/workspace`).set('Authorization', `Bearer ${tokenA}`);
        expect(workspace.status).toBe(200);
        const critical = workspace.body.data.criticalAttention || [];
        const item = critical.find((row: { title: string }) => /Critical finding is open/i.test(row.title));
        expect(item).toBeTruthy();
        expect(item.priority).toBe('CRITICAL_ATTENTION');
        expect(item.current).toBe(true);
        intelPublicId = item.publicId;

        const runs = await request(app).get(`${API}/automation/executions`).set('Authorization', `Bearer ${tokenA}`);
        expect(runs.status).toBe(200);
        const intelRuns = runs.body.data.filter((row: { triggerEvent: string }) => row.triggerEvent === 'intelligence.critical_attention');
        expect(intelRuns).toHaveLength(1);
        expect(intelRuns[0].whatSupremeDid).toEqual(expect.arrayContaining(['CREATE_REVIEW_REQUEST', 'NOTIFY_OWNER']));
        expect(intelRuns[0].whatSupremeDidNotDo).toEqual(expect.arrayContaining(['Accept risk', 'Close finding', 'Approve AI', 'Make a legal conclusion']));
        expect(intelRuns[0].humanApprovalRequired).toBe(true);
        expect(intelRuns[0].workItems.length).toBeGreaterThan(0);
        intelRunId = intelRuns[0].publicId;
        workPublicId = intelRuns[0].workItems[0].publicId;

        const again = await request(app).get(`${API}/intelligence/workspace`).set('Authorization', `Bearer ${tokenA}`);
        expect(again.status).toBe(200);
        const after = await request(app).get(`${API}/automation/executions`).set('Authorization', `Bearer ${tokenA}`);
        const intelRunsAfter = after.body.data.filter((row: { triggerEvent: string }) => row.triggerEvent === 'intelligence.critical_attention');
        expect(intelRunsAfter).toHaveLength(1);

        const findingStillOpen = await prisma.vendorIssue.findUnique({ where: { id: findingId } });
        expect(findingStillOpen?.status).toBe('OPEN');
    });

    it('does not emit Critical Attention for a medium finding that is not Critical Attention', async () => {
        const before = await prisma.automationExecution.count({
            where: { organizationId: orgA, triggerEvent: 'intelligence.critical_attention', preview: false },
        });
        const medium = await request(app)
            .post(`${API}/tprm/vendors/${vendorId}/findings`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                title: 'Medium documentation gap',
                description: 'Should not become Critical Attention.',
                severity: 'MEDIUM',
                priority: 'MEDIUM',
                assignedTo: userA,
            });
        expect(medium.status).toBe(201);
        await request(app).get(`${API}/intelligence/workspace`).set('Authorization', `Bearer ${tokenA}`);
        const after = await prisma.automationExecution.count({
            where: { organizationId: orgA, triggerEvent: 'intelligence.critical_attention', preview: false },
        });
        expect(after).toBe(before);
    });

    it('reconciles Intelligence after human source close and keeps the run historical', async () => {
        const closed = await request(app)
            .post(`${API}/tprm/findings/${findingId}/close`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ closureNotes: 'Human closed the authoritative finding.' });
        expect(closed.status).toBe(200);
        const workspace = await request(app).get(`${API}/intelligence/workspace`).set('Authorization', `Bearer ${tokenA}`);
        expect(workspace.status).toBe(200);
        const stillCurrent = [...(workspace.body.data.criticalAttention || [])].filter((row: { publicId: string }) => row.publicId === intelPublicId);
        expect(stillCurrent).toHaveLength(0);
        const item = await request(app).get(`${API}/intelligence/items/${intelPublicId}`).set('Authorization', `Bearer ${tokenA}`);
        expect(item.body.data.current).toBe(false);
        expect(item.body.data.lifecycle).toBe('RESOLVED_BY_SOURCE');
        const run = await request(app).get(`${API}/automation/executions/${intelRunId}`).set('Authorization', `Bearer ${tokenA}`);
        expect(run.status).toBe(200);
        expect(run.body.data.publicId).toBe(intelRunId);
        expect(run.body.data.status).toBe('SUCCEEDED');
        const finding = await prisma.vendorIssue.findUnique({ where: { id: findingId } });
        expect(finding?.status).toBe('CLOSED');
    });

    it('creates one compliance gap run without declaring compliance', async () => {
        const created = await request(app)
            .post(`${API}/automation`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ templateKey: 'compliance-gap-opened', ownerUserId: userA });
        expect(created.status).toBe(201);
        await request(app).post(`${API}/automation/${created.body.data.publicId}/publish`).set('Authorization', `Bearer ${tokenA}`).send({});
        const gap = await request(app).post(`${API}/compliance/gaps`).set('Authorization', `Bearer ${tokenA}`).send({
            source: 'UNMAPPED',
            title: 'Automation compliance gap',
            explanation: 'Hosted-style proof that Automation does not mark compliant.',
            ownerUserId: userA,
        });
        expect(gap.status).toBe(201);
        expect(gap.body.data.status).not.toMatch(/COMPLIANT/i);
        const runs = await request(app).get(`${API}/automation/executions`).query({ automation: created.body.data.publicId }).set('Authorization', `Bearer ${tokenA}`);
        const gapRuns = (runs.body.data || []).filter((row: { triggerEvent: string }) => row.triggerEvent === 'compliance.gap.opened');
        expect(gapRuns.length).toBeGreaterThan(0);
        expect(gapRuns[0].whatSupremeDidNotDo).toEqual(expect.arrayContaining(['Declare compliance']));
        expect(gapRuns[0].humanApprovalRequired).toBe(true);
    });

    it('creates one privacy deadline run without a legal conclusion', async () => {
        const created = await request(app)
            .post(`${API}/automation`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ templateKey: 'privacy-deadline-reminder', ownerUserId: userA });
        expect(created.status).toBe(201);
        await request(app).post(`${API}/automation/${created.body.data.publicId}/publish`).set('Authorization', `Bearer ${tokenA}`).send({});
        const receivedAt = new Date(Date.now() - 26 * 86400000).toISOString();
        const rights = await request(app).post(`${API}/privacy/rights`).set('Authorization', `Bearer ${tokenA}`).send({
            requestType: 'ACCESS',
            regime: 'GDPR',
            requesterRef: `dsr-${suffix}`,
            receivedAt,
        });
        expect(rights.status).toBe(201);
        expect(rights.body.data.decision || null).toBeFalsy();
        const runs = await request(app).get(`${API}/automation/executions`).set('Authorization', `Bearer ${tokenA}`);
        const privacyRuns = (runs.body.data || []).filter((row: { triggerEvent: string }) => row.triggerEvent === 'privacy.deadline.approaching');
        expect(privacyRuns.length).toBeGreaterThan(0);
        expect(privacyRuns[0].whatSupremeDidNotDo).toEqual(expect.arrayContaining(['Make a legal conclusion']));
        expect(privacyRuns[0].humanApprovalRequired).toBe(true);
        expect(rights.body.data.status).not.toBe('CLOSED');
    });

    it('creates one AI review-due run without approving the system', async () => {
        const created = await request(app)
            .post(`${API}/automation`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ templateKey: 'ai-review-due', ownerUserId: userA });
        expect(created.status).toBe(201);
        await request(app).post(`${API}/automation/${created.body.data.publicId}/publish`).set('Authorization', `Bearer ${tokenA}`).send({});
        const system = await request(app).post(`${API}/ai-governance/systems`).set('Authorization', `Bearer ${tokenA}`).send({
            name: `Automation review AI ${suffix}`,
            businessOwner: 'Risk Manager',
        });
        expect(system.status).toBe(201);
        const reviewAt = new Date(Date.now() + 5 * 86400000).toISOString();
        const updated = await request(app)
            .patch(`${API}/ai-governance/systems/${system.body.data.publicId}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ reviewAt });
        expect(updated.status).toBe(200);
        expect(updated.body.data.lifecycle).not.toMatch(/APPROVED/i);
        const runs = await request(app).get(`${API}/automation/executions`).set('Authorization', `Bearer ${tokenA}`);
        const aiRuns = (runs.body.data || []).filter((row: { triggerEvent: string }) => row.triggerEvent === 'ai.approval.due');
        expect(aiRuns.length).toBeGreaterThan(0);
        expect(aiRuns[0].whatSupremeDidNotDo).toEqual(expect.arrayContaining(['Approve AI']));
        expect(aiRuns[0].humanApprovalRequired).toBe(true);
    });

    it('denies cross-tenant work items, runs, and forged organization IDs', async () => {
        const foreignWork = await request(app).get(`${API}/automation/work/${workPublicId}`).set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(foreignWork.status);
        const foreignRun = await request(app).get(`${API}/automation/executions/${intelRunId}`).set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(foreignRun.status);
        const forged = await request(app)
            .get(`${API}/automation/work/${workPublicId}`)
            .query({ organizationId: orgA })
            .set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(forged.status);
        const leak = await request(app).get(`${API}/automation/executions`).set('Authorization', `Bearer ${tokenB}`);
        expect(JSON.stringify(leak.body)).not.toContain(intelRunId);
        expect(JSON.stringify(leak.body)).not.toContain(workPublicId);
    });
});
