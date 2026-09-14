import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/database';

jest.setTimeout(120000);

const PASSWORD = 'AiGovPass1x';
const API = '/api/v1';

function fileBuffer(res: { body: unknown; text?: string }): Buffer {
    if (Buffer.isBuffer(res.body)) return res.body;
    if (typeof res.body === 'string') return Buffer.from(res.body, 'binary');
    if (res.body instanceof Uint8Array) return Buffer.from(res.body);
    if (typeof res.text === 'string' && res.text.length) return Buffer.from(res.text, 'binary');
    return Buffer.from(JSON.stringify(res.body || ''));
}

describe('supreme AI governance tenant isolation and honesty', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let systemA = '';
    let orgA = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signupA = await request(app).post(`${API}/auth/signup`).send({
            email: `ai-a-${suffix}@tenant-a.test`,
            password: PASSWORD,
            firstName: 'Ai',
            lastName: 'Alpha',
            organizationName: `AI A ${suffix}`,
            country: 'US',
        });
        const signupB = await request(app).post(`${API}/auth/signup`).send({
            email: `ai-b-${suffix}@tenant-b.test`,
            password: PASSWORD,
            firstName: 'Ai',
            lastName: 'Bravo',
            organizationName: `AI B ${suffix}`,
            country: 'US',
        });
        expect(signupA.status).toBe(201);
        expect(signupB.status).toBe(201);
        tokenA = signupA.body.data.token;
        tokenB = signupB.body.data.token;
        orgA = signupA.body.data.user.organizationId;

        const created = await request(app).post(`${API}/ai-governance/systems`).set('Authorization', `Bearer ${tokenA}`).send({
            name: 'Claims triage assistant',
            businessPurpose: 'Claims routing support',
            personalData: true,
        });
        expect(created.status).toBe(201);
        systemA = created.body.data.publicId;
        expect(systemA).toBe('AI-00001');
        expect(created.body.data.lifecycle).toBe('PROPOSED');
        expect(created.body.data.publicId).toMatch(/^AI-\d{5}$/);
    });

    it('keeps systems, assessments, tests, reports, and graph paths inside the tenant', async () => {
        const leaked = await request(app).get(`${API}/ai-governance/systems/${systemA}`).set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(leaked.status);
        const dashB = await request(app).get(`${API}/ai-governance/dashboard`).set('Authorization', `Bearer ${tokenB}`);
        expect(dashB.status).toBe(200);
        expect(JSON.stringify(dashB.body)).not.toContain(systemA);
        expect(dashB.body.data.monitoring).toMatch(/manual \/ not configured/i);
        const pdf = await request(app).get(`${API}/ai-governance/reports/executive.pdf`).set('Authorization', `Bearer ${tokenA}`);
        expect(pdf.status).toBe(200);
        expect(fileBuffer(pdf).subarray(0, 4).toString()).toBe('%PDF');
        const pptx = await request(app).get(`${API}/ai-governance/reports/board.pptx`).set('Authorization', `Bearer ${tokenA}`);
        expect(pptx.status).toBe(200);
        expect(fileBuffer(pptx).subarray(0, 2).toString()).toBe('PK');
        const graph = await request(app).get(`${API}/governance/search`).query({ q: systemA }).set('Authorization', `Bearer ${tokenB}`);
        expect(JSON.stringify(graph.body)).not.toContain(systemA);
        const graphA = await request(app).get(`${API}/governance/search`).query({ q: systemA }).set('Authorization', `Bearer ${tokenA}`);
        expect(graphA.status).toBe(200);
        expect(JSON.stringify(graphA.body)).toContain(systemA);
    });

    it('refuses self-approval and keeps score snapshots immutable', async () => {
        const denied = await request(app).patch(`${API}/ai-governance/systems/${systemA}`).set('Authorization', `Bearer ${tokenA}`).send({
            lifecycle: 'PRODUCTION',
        });
        expect(denied.status).toBe(400);
        expect(denied.body.error?.message || JSON.stringify(denied.body)).toMatch(/human approval/i);
        const score = await request(app).post(`${API}/ai-governance/systems/${systemA}/scores`).set('Authorization', `Bearer ${tokenA}`).send({
            impact: 4,
            likelihood: 3,
            rationale: 'Recorded factors only.',
        });
        expect(score.status).toBe(201);
        const firstId = score.body.data.id;
        const firstScore = score.body.data.score;
        const again = await request(app).post(`${API}/ai-governance/systems/${systemA}/scores`).set('Authorization', `Bearer ${tokenA}`).send({
            impact: 1,
            likelihood: 1,
            rationale: 'Later recorded factors.',
        });
        expect(again.status).toBe(201);
        expect(again.body.data.id).not.toBe(firstId);
        const historic = await prisma.aiScoreSnapshot.findUniqueOrThrow({ where: { id: firstId } });
        expect(historic.score).toBe(firstScore);
        const approval = await request(app).post(`${API}/ai-governance/approvals`).set('Authorization', `Bearer ${tokenA}`).send({
            systemPublicId: systemA,
            decision: 'APPROVED',
            decisionMaker: 'Risk Committee',
            rationale: 'Human review of recorded use and oversight.',
        });
        expect(approval.status).toBe(201);
        const refreshed = await request(app).get(`${API}/ai-governance/systems/${systemA}`).set('Authorization', `Bearer ${tokenA}`);
        expect(refreshed.body.data.lifecycle).toBe('APPROVED');
    });

    it('keeps screening honest and blocks formula import', async () => {
        const assessment = await request(app).post(`${API}/ai-governance/assessments`).set('Authorization', `Bearer ${tokenA}`).send({
            systemPublicId: systemA,
            answers: [{ key: 'employment', answer: true }, { key: 'sensitive', answer: true }],
        });
        expect(assessment.status).toBe(201);
        expect(assessment.body.data.recommendation).toMatch(/enhanced review may be required/i);
        expect(assessment.body.data.recommendation).not.toMatch(/legally prohibited|eu ai act high-risk/i);
        const preview = await request(app).post(`${API}/ai-governance/import/preview`).set('Authorization', `Bearer ${tokenA}`).send({
            rows: [{ name: '=HYPERLINK("http://evil")', purpose: '+cmd' }],
        });
        expect(preview.status).toBe(200);
        expect(JSON.stringify(preview.body)).toContain("'=HYPERLINK");
        const admin = await prisma.user.findFirstOrThrow({ where: { organizationId: orgA } });
        const viewer = await prisma.user.create({
            data: {
                email: `ai-viewer-${suffix}@tenant-a.test`,
                hashedPassword: admin.hashedPassword,
                firstName: 'View',
                lastName: 'Er',
                role: 'VIEWER',
                organizationId: orgA,
                status: 'ACTIVE',
            },
        });
        const viewerLogin = await request(app).post(`${API}/auth/login`).send({
            email: viewer.email,
            password: PASSWORD,
            plane: 'CUSTOMER',
        });
        expect(viewerLogin.status).toBe(200);
        const approve = await request(app).post(`${API}/ai-governance/approvals`).set('Authorization', `Bearer ${viewerLogin.body.data.token}`).send({
            systemPublicId: systemA,
            decision: 'RESTRICTED',
            decisionMaker: 'Viewer',
            rationale: 'Should be denied',
        });
        expect([403, 401]).toContain(approve.status);
    });

    it('links an existing vendor, preserves model versions, and shows only CLEAN evidence', async () => {
        const vendor = await prisma.vendor.create({
            data: {
                organizationId: orgA,
                name: 'Supreme Investigation',
                vendorType: 'SAAS',
                category: 'TECHNOLOGY',
                tier: 'MEDIUM',
                status: 'ACTIVE',
                primaryContact: 'ops@investigation.test',
                contactEmail: `ops-${suffix}@investigation.test`,
                servicesProvided: 'Investigation support',
                residualRiskScore: 42,
            },
        });
        const provider = await request(app).post(`${API}/ai-governance/providers`).set('Authorization', `Bearer ${tokenA}`).send({
            providerName: 'Recorded model provider',
            vendorId: vendor.id,
            modelVersion: 'v1-recorded',
        });
        expect(provider.status).toBe(201);
        expect(provider.body.data.vendorId).toBe(vendor.id);
        const providerId = provider.body.data.publicId;
        const attached = await request(app)
            .post(`${API}/ai-governance/systems/${systemA}/providers/${providerId}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ modelVersion: 'v1-recorded', changeReason: 'Initial recorded provider' });
        expect(attached.status).toBe(200);
        expect(attached.body.data.currentModel.modelVersion).toBe('v1-recorded');
        expect(attached.body.data.vendors[0].name).toBe('Supreme Investigation');

        const leakedVendor = await request(app).get(`${API}/ai-governance/vendors/${vendor.id}`).set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(leakedVendor.status);

        const changed = await request(app)
            .post(`${API}/ai-governance/systems/${systemA}/versions`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ modelVersion: 'v2-recorded', changeReason: 'Provider version change for review' });
        expect(changed.status).toBe(201);
        expect(changed.body.data.currentModel.modelVersion).toBe('v2-recorded');
        expect(changed.body.data.priorModel.modelVersion).toBe('v1-recorded');
        expect(changed.body.data.changeReview.reviewRequired).toBe(true);
        expect(changed.body.data.changeReview.whatChanged).toMatch(/v1-recorded/);
        expect(changed.body.data.modelVersions.some((row: { status: string; modelVersion: string }) => row.status === 'SUPERSEDED' && row.modelVersion === 'v1-recorded')).toBe(true);

        const historic = await prisma.aiSystemModel.findFirstOrThrow({
            where: { organizationId: orgA, systemId: attached.body.data.id, modelVersion: 'v1-recorded' },
        });
        expect(historic.effectiveTo).not.toBeNull();
        expect(historic.status).toBe('SUPERSEDED');

        const controls = await request(app).get(`${API}/scc/controls`).set('Authorization', `Bearer ${tokenA}`);
        const aig = (controls.body.data || []).find((row: { controlKey: string }) => row.controlKey === 'AIG-01');
        expect(aig).toBeTruthy();
        const linked = await request(app).post(`${API}/ai-governance/systems/${systemA}/controls/${aig.id}`).set('Authorization', `Bearer ${tokenA}`);
        expect(linked.status).toBe(200);

        const clean = await prisma.storedObject.create({
            data: {
                organizationId: orgA,
                ownerType: 'organization',
                ownerId: orgA,
                filename: 'sr-clean-evidence.txt',
                storageKey: `${orgA}/ai/sr-clean-evidence.txt`,
                contentType: 'text/plain',
                size: 12,
                checksum: `ai-clean-${suffix}`,
                uploadedBy: (await prisma.user.findFirstOrThrow({ where: { organizationId: orgA } })).id,
                scanStatus: 'CLEAN',
            },
        });
        const pending = await prisma.storedObject.create({
            data: {
                organizationId: orgA,
                ownerType: 'organization',
                ownerId: orgA,
                filename: 'pending-not-supporting.txt',
                storageKey: `${orgA}/ai/pending-not-supporting.txt`,
                contentType: 'text/plain',
                size: 12,
                checksum: `ai-pending-${suffix}`,
                uploadedBy: (await prisma.user.findFirstOrThrow({ where: { organizationId: orgA } })).id,
                scanStatus: 'PENDING',
            },
        });
        const support = await request(app).post(`${API}/scc/evidence/links`).set('Authorization', `Bearer ${tokenA}`).send({
            storedObjectId: clean.id,
            targetType: 'CONTROL',
            targetId: aig.id,
            relationship: 'SUPPORTS',
            rationale: 'Recorded CLEAN evidence for AIG-01',
        });
        expect(support.status).toBe(201);
        const rejectedPending = await request(app).post(`${API}/scc/evidence/links`).set('Authorization', `Bearer ${tokenA}`).send({
            storedObjectId: pending.id,
            targetType: 'CONTROL',
            targetId: aig.id,
            relationship: 'SUPPORTS',
            rationale: 'Pending must not become supporting evidence',
        });
        expect(rejectedPending.status).toBe(403);

        const detail = await request(app).get(`${API}/ai-governance/systems/${systemA}`).set('Authorization', `Bearer ${tokenA}`);
        const workspace = (detail.body.data.controlWorkspace || []).find((row: { controlKey: string }) => row.controlKey === 'AIG-01');
        expect(workspace.cleanEvidence.some((row: { filename: string }) => row.filename === 'sr-clean-evidence.txt')).toBe(true);
        expect(JSON.stringify(workspace.cleanEvidence)).not.toContain('pending-not-supporting.txt');

        const nist = await request(app).get(`${API}/ai-governance/readiness/NIST_AI_RMF`).set('Authorization', `Bearer ${tokenA}`);
        expect(nist.status).toBe(200);
        expect(nist.body.data.certified).toBe(false);
        expect(JSON.stringify(nist.body.data)).toMatch(/not certified/i);
        expect(nist.body.data.areas.map((row: { key: string }) => row.key)).toEqual(expect.arrayContaining(['GOVERN', 'MAP', 'MEASURE', 'MANAGE']));

        const iso = await request(app).get(`${API}/ai-governance/readiness/ISO_42001`).set('Authorization', `Bearer ${tokenA}`);
        expect(iso.status).toBe(200);
        expect(iso.body.data.certified).toBe(false);
        expect(JSON.stringify(iso.body.data)).not.toMatch(/this organization is certified/i);

        const leakedReady = await request(app).get(`${API}/ai-governance/readiness/NIST_AI_RMF`).set('Authorization', `Bearer ${tokenB}`);
        expect(leakedReady.status).toBe(200);
        expect(JSON.stringify(leakedReady.body)).not.toContain(systemA);

        const affected = await request(app).get(`${API}/ai-governance/systems/${systemA}/affected`).set('Authorization', `Bearer ${tokenA}`);
        expect(affected.body.data.humanDecision).toMatch(/no automatic approval/i);
        expect(affected.body.data.whatChanged.newVersion).toBe('v2-recorded');
        expect((affected.body.data.vendors || []).some((row: { name: string }) => row.name === 'Supreme Investigation')).toBe(true);

        const providerDetail = await request(app).get(`${API}/ai-governance/providers/${providerId}`).set('Authorization', `Bearer ${tokenA}`);
        expect(providerDetail.status).toBe(200);
        expect(providerDetail.body.data.vendor.name).toBe('Supreme Investigation');
        expect(providerDetail.body.data.monitoring).toMatch(/manual \/ not configured/i);
    });
});
