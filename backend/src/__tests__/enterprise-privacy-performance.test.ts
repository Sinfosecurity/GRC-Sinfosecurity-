/**
 * Isolated database-backed smoke test. Not hosted staging load.
 * Not enterprise scale certification.
 */
import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/database';
import { enterprisePrivacyService } from '../services/enterprisePrivacyService';
import { renderPrivacyBoardPptx, renderPrivacyPdf } from '../reports/enterprisePrivacyReports';

jest.setTimeout(180000);

const PASSWORD = 'PrivPerf1x';
const API = '/api/v1';

describe('privacy database-backed performance smoke', () => {
    let organizationId = '';
    let token = '';

    beforeAll(async () => {
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `priv-perf-${Date.now()}@tenant-perf.test`,
            password: PASSWORD,
            firstName: 'Priv',
            lastName: 'Perf',
            organizationName: `PRIV Perf ${Date.now()}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        token = signup.body.data.token;
        organizationId = signup.body.data.user.organizationId;
        const rows = Array.from({ length: 1000 }, (_, index) => ({
            organizationId,
            publicId: `PA-${String(index + 1).padStart(5, '0')}`,
            name: `Synthetic activity ${index + 1}`,
            status: 'ACTIVE' as const,
            jurisdictions: ['US-NY'],
            storageLocations: ['US-East'],
        }));
        await prisma.privacyProcessingActivity.createMany({ data: rows });
        await prisma.privacyCounter.upsert({
            where: { organizationId_kind: { organizationId, kind: 'PA' } },
            create: { organizationId, kind: 'PA', next: 1001 },
            update: { next: 1001 },
        });
    });

    it('serves dashboard, list, detail, data-map, and reports from 1000 activities', async () => {
        const started = Date.now();
        const dash = await request(app).get(`${API}/privacy/dashboard`).set('Authorization', `Bearer ${token}`);
        expect(dash.status).toBe(200);
        expect(dash.body.data.totals.activeActivities).toBeGreaterThanOrEqual(1000);
        const list = await enterprisePrivacyService.listActivities(organizationId, { take: 200 });
        expect(list.length).toBe(200);
        const counted = await prisma.privacyProcessingActivity.count({ where: { organizationId } });
        expect(counted).toBeGreaterThanOrEqual(1000);
        const detail = await enterprisePrivacyService.getActivity(organizationId, 'PA-00001');
        expect(detail.publicId).toBe('PA-00001');
        const map = await enterprisePrivacyService.dataMap(organizationId);
        expect(map.rows.length).toBeGreaterThan(0);
        const pdf = await renderPrivacyPdf(organizationId, 'executive');
        expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
        const pptx = await renderPrivacyBoardPptx(organizationId);
        expect(pptx.buffer.subarray(0, 2).toString()).toBe('PK');
        expect(Date.now() - started).toBeLessThan(120000);
    });
});
