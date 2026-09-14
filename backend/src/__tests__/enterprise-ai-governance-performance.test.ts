/**
 * Isolated database-backed smoke test. Not hosted staging load.
 * Not enterprise scale certification.
 */
import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/database';
import { renderAiBoardPptx, renderAiPdf } from '../reports/enterpriseAiGovernanceReports';

jest.setTimeout(180000);

const PASSWORD = 'AiGovPass1x';
const API = '/api/v1';

describe('AI governance database-backed performance smoke', () => {
    let organizationId = '';
    let token = '';

    beforeAll(async () => {
        const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `ai-perf-${suffix}@tenant-perf.test`,
            password: PASSWORD,
            firstName: 'Ai',
            lastName: 'Perf',
            organizationName: `AI Perf ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        token = signup.body.data.token;
        organizationId = signup.body.data.user.organizationId;
        const rows = Array.from({ length: 1000 }, (_, index) => ({
            organizationId,
            publicId: `AI-${String(index + 1).padStart(5, '0')}`,
            name: `Synthetic AI system ${index + 1}`,
        }));
        await prisma.aiSystem.createMany({ data: rows });
        await prisma.aiCounter.upsert({
            where: { organizationId_kind: { organizationId, kind: 'AI' } },
            create: { organizationId, kind: 'AI', next: 1001 },
            update: { next: 1001 },
        });
    });

    it('serves dashboard, register, detail, affected, and reports from 1000 systems', async () => {
        const started = Date.now();
        const dash = await request(app).get(`${API}/ai-governance/dashboard`).set('Authorization', `Bearer ${token}`);
        const list = await request(app).get(`${API}/ai-governance/systems`).set('Authorization', `Bearer ${token}`);
        const detail = await request(app).get(`${API}/ai-governance/systems/AI-00001`).set('Authorization', `Bearer ${token}`);
        const affected = await request(app).get(`${API}/ai-governance/systems/AI-00001/affected`).set('Authorization', `Bearer ${token}`);
        expect(dash.status).toBe(200);
        expect(list.status).toBe(200);
        expect(detail.status).toBe(200);
        expect(affected.status).toBe(200);
        expect(dash.body.data.totals.activeSystems).toBe(1000);
        expect(list.body.data.length).toBe(1000);
        const pdf = await renderAiPdf(organizationId, 'executive');
        const pptx = await renderAiBoardPptx(organizationId);
        expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
        expect(pptx.buffer.subarray(0, 2).toString()).toBe('PK');
        expect(Date.now() - started).toBeLessThan(120000);
    });
});
