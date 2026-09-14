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
});
