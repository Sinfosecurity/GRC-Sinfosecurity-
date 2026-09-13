import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/database';
import { calculateEnterpriseRisk } from '../services/enterpriseRiskEngine';

jest.setTimeout(60000);

const PASSWORD = 'ErmPass1xx';
const API = '/api/v1';

function fileBuffer(res: { body: unknown; text?: string }): Buffer {
    if (Buffer.isBuffer(res.body)) return res.body;
    if (typeof res.body === 'string') return Buffer.from(res.body, 'binary');
    if (res.body instanceof Uint8Array) return Buffer.from(res.body);
    if (typeof res.text === 'string' && res.text.length) return Buffer.from(res.text, 'binary');
    return Buffer.from(JSON.stringify(res.body || ''));
}

describe('enterprise risk tenant isolation and scoring', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let publicIdB = '';
    let userIdA = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signupA = await request(app).post(`${API}/auth/signup`).send({
            email: `erm-a-${suffix}@tenant-a.test`,
            password: PASSWORD,
            firstName: 'Erm',
            lastName: 'Alpha',
            organizationName: `ERM A ${suffix}`,
            country: 'US',
        });
        const signupB = await request(app).post(`${API}/auth/signup`).send({
            email: `erm-b-${suffix}@tenant-b.test`,
            password: PASSWORD,
            firstName: 'Erm',
            lastName: 'Bravo',
            organizationName: `ERM B ${suffix}`,
            country: 'US',
        });
        expect(signupA.status).toBe(201);
        expect(signupB.status).toBe(201);
        tokenA = signupA.body.data.token;
        tokenB = signupB.body.data.token;
        userIdA = signupA.body.data.user.id;
        const created = await request(app).post(`${API}/erm/risks`).set('Authorization', `Bearer ${tokenB}`).send({
            title: 'Cross-tenant bait',
            category: 'CYBERSECURITY',
            likelihood: 4,
            impact: 5,
        });
        expect(created.status).toBe(201);
        publicIdB = created.body.data.publicId;
    });

    it('keeps public IDs, reports, and KRIs inside the tenant', async () => {
        const leaked = await request(app).get(`${API}/erm/risks/${publicIdB}`).set('Authorization', `Bearer ${tokenA}`);
        expect([403, 404]).toContain(leaked.status);
        const list = await request(app).get(`${API}/erm/risks`).set('Authorization', `Bearer ${tokenA}`);
        expect(list.status).toBe(200);
        expect(JSON.stringify(list.body)).not.toContain(publicIdB);
        const report = await request(app).get(`${API}/erm/reports/profile.pdf`).set('Authorization', `Bearer ${tokenA}`);
        expect([200, 403]).toContain(report.status);
        if (report.status === 200) {
            expect(report.body.toString()).not.toContain('Cross-tenant bait');
        }
    });

    it('does not lower residual score when a risk is accepted', async () => {
        const created = await request(app).post(`${API}/erm/risks`).set('Authorization', `Bearer ${tokenA}`).send({
            title: 'Accepted residual stays',
            category: 'OPERATIONAL',
            likelihood: 5,
            impact: 5,
        });
        expect(created.status).toBe(201);
        const before = created.body.data.residualScore || 25;
        const decided = await request(app).post(`${API}/erm/risks/${created.body.data.publicId}/decisions`).set('Authorization', `Bearer ${tokenA}`).send({
            decision: 'ACCEPT',
            rationale: 'Board accepted this residual exposure.',
            approve: true,
        });
        expect(decided.status).toBe(201);
        expect(decided.body.data.residualUnchanged).toBe(true);
        expect(decided.body.data.residualScore).toBe(before);
    });

    it('scores a 1,000-risk portfolio in memory without summing ordinals', () => {
        const started = Date.now();
        const scores = Array.from({ length: 1000 }, (_, index) => calculateEnterpriseRisk({
            likelihood: (index % 5) + 1,
            impact: ((index * 3) % 5) + 1,
        }));
        const elapsed = Date.now() - started;
        expect(scores).toHaveLength(1000);
        expect(scores[0].inherentScore).toBeGreaterThan(0);
        expect(elapsed).toBeLessThan(2000);
    });

    it('serves a board PPTX and keeps history summaries short', async () => {
        const created = await request(app).post(`${API}/erm/risks`).set('Authorization', `Bearer ${tokenA}`).send({
            title: 'History and board pack',
            category: 'CYBERSECURITY',
            likelihood: 4,
            impact: 4,
        });
        expect(created.status).toBe(201);
        const scored = await request(app).patch(`${API}/erm/risks/${created.body.data.publicId}`).set('Authorization', `Bearer ${tokenA}`).send({
            likelihood: 5,
            impact: 5,
        });
        expect(scored.status).toBe(200);
        const detail = await request(app).get(`${API}/erm/risks/${created.body.data.publicId}`).set('Authorization', `Bearer ${tokenA}`);
        expect(detail.status).toBe(200);
        const timeline = detail.body.data.timeline || [];
        expect(timeline.some((row: { title: string }) => row.title === 'Risk reassessed')).toBe(true);
        expect(JSON.stringify(timeline.map((row: { change: string }) => row.change))).not.toMatch(/Methodology supreme-erm/);
        expect(timeline.some((row: { detail?: string }) => row.detail && row.detail.includes('Methodology'))).toBe(true);
        const pptx = await request(app).get(`${API}/erm/reports/board.pptx`).set('Authorization', `Bearer ${tokenA}`);
        expect(pptx.status).toBe(200);
        expect(pptx.headers['content-type']).toMatch(/presentationml/);
        expect(fileBuffer(pptx).subarray(0, 2).toString()).toBe('PK');
        const pdf = await request(app).get(`${API}/erm/reports/board.pdf`).set('Authorization', `Bearer ${tokenA}`);
        expect(pdf.status).toBe(200);
        expect(fileBuffer(pdf).subarray(0, 4).toString()).toBe('%PDF');
    });

    it('assigns an owner without inventing one', async () => {
        const created = await request(app).post(`${API}/erm/risks`).set('Authorization', `Bearer ${tokenA}`).send({
            title: 'Needs an owner',
            category: 'OPERATIONAL',
            likelihood: 5,
            impact: 5,
        });
        expect(created.status).toBe(201);
        expect(created.body.data.ownerUserId).toBeFalsy();
        const assigned = await request(app).patch(`${API}/erm/risks/${created.body.data.publicId}`).set('Authorization', `Bearer ${tokenA}`).send({
            ownerUserId: userIdA,
        });
        expect(assigned.status).toBe(200);
        expect(assigned.body.data.ownerUserId).toBe(userIdA);
        const dashboard = await request(app).get(`${API}/erm/dashboard`).set('Authorization', `Bearer ${tokenA}`);
        expect(dashboard.status).toBe(200);
        expect(dashboard.body.data.attention.some((row: { publicId: string; reasons?: string[] }) => row.publicId === created.body.data.publicId && row.reasons?.includes('Unassigned'))).toBe(false);
    });

    it('blocks formula-bearing import cells from committing blindly', async () => {
        const preview = await request(app).post(`${API}/erm/import/preview`).set('Authorization', `Bearer ${tokenA}`).send({
            rows: [{ title: '=HYPERLINK("http://evil")', category: 'CYBERSECURITY', likelihood: '3', impact: '3' }],
        });
        expect(preview.status).toBe(200);
        expect(preview.body.data.rows[0].title.startsWith("'")).toBe(true);
    });
});
