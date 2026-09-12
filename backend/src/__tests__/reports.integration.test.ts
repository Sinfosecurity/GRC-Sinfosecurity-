import request from 'supertest';
import { VendorTier, VendorType } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import vendorManagementService from '../services/vendorManagementService';

jest.setTimeout(60000);

const PASSWORD = 'ReportPass1x';
const API = '/api/v1';

function fileBuffer(res: { body: unknown; text?: string }): Buffer {
    if (Buffer.isBuffer(res.body)) return res.body;
    if (typeof res.body === 'string') return Buffer.from(res.body, 'binary');
    if (res.body instanceof Uint8Array) return Buffer.from(res.body);
    if (typeof res.text === 'string' && res.text.length) return Buffer.from(res.text, 'binary');
    return Buffer.from(JSON.stringify(res.body || ''));
}

describe('report generation and tenant isolation', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let orgA = '';
    let orgB = '';
    let vendorA = '';
    let briefA = '';
    let residualA = 0;

    beforeAll(async () => {
        const signupA = await request(app).post(`${API}/auth/signup`).send({
            email: `report-a-${suffix}@tenant-a.test`,
            password: PASSWORD,
            firstName: 'Rep',
            lastName: 'A',
            organizationName: `Report Org A ${suffix}`,
            country: 'US',
        });
        expect(signupA.status).toBe(201);
        tokenA = signupA.body.data.token;
        orgA = signupA.body.data.user.organizationId;

        const signupB = await request(app).post(`${API}/auth/signup`).send({
            email: `report-b-${suffix}@tenant-b.test`,
            password: PASSWORD,
            firstName: 'Rep',
            lastName: 'B',
            organizationName: `Report Org B ${suffix}`,
            country: 'US',
        });
        expect(signupB.status).toBe(201);
        tokenB = signupB.body.data.token;
        orgB = signupB.body.data.user.organizationId;

        const vendor = await vendorManagementService.createVendor({
            name: `Acme Reports ${suffix}`,
            vendorType: VendorType.SAAS,
            category: 'CLOUD_HOSTING',
            tier: VendorTier.HIGH,
            primaryContact: 'a@tenant-a.test',
            contactEmail: 'a@tenant-a.test',
            servicesProvided: 'Cloud hosting',
            dataTypesAccessed: ['PII'],
            geographicFootprint: ['US'],
            regulatoryScope: ['SOC2'],
            organizationId: orgA,
        });
        vendorA = vendor.id;

        const brief = await request(app)
            .post(`${API}/tprm/vendors/${vendorA}/decision-briefs`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(brief.status).toBe(201);
        briefA = brief.body.data.id;
        residualA = brief.body.data.residualRisk;
        await request(app)
            .post(`${API}/tprm/decision-briefs/${briefA}/decide`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ decision: 'RISK_ACCEPTED', reviewerAnalysis: 'Accepted for reports test' });
    });

    afterAll(async () => {
        await prisma.riskDecisionBrief.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.scoreCalculation.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.evidenceLink.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.vendorDocument.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.scoringMethodology.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.aiOperationLog.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.vendorIssue.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.vendorAssessment.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.vendor.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.refreshToken.deleteMany({ where: { user: { organizationId: { in: [orgA, orgB] } } } });
        await prisma.auditEvent.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.inAppNotification.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.notificationPreference.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.user.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
        await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    });

    it('downloads an authorized decision brief PDF with correct type and filename', async () => {
        const res = await request(app)
            .get(`${API}/tprm/decision-briefs/${briefA}/pdf`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/pdf/);
        expect(res.headers['content-disposition']).toMatch(/Supreme-Risk-Decision-Brief/);
        expect(res.headers['content-disposition']).toMatch(/\.pdf/);
        const pdf = fileBuffer(res);
        expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
        expect(pdf.length).toBeGreaterThan(500);
    });

    it('uses the immutable snapshot residual after acceptance', async () => {
        const brief = await prisma.riskDecisionBrief.findFirst({ where: { id: briefA, organizationId: orgA } });
        expect(brief?.residualRisk).toBe(residualA);
        const snapshot = brief?.immutableSnapshot as { score?: { residualRisk?: number }; acceptance?: { residualRisk?: number } };
        expect(snapshot.score?.residualRisk).toBe(residualA);
        expect(snapshot.acceptance?.residualRisk).toBe(residualA);
    });

    it('denies unauthenticated PDF download', async () => {
        const res = await request(app).get(`${API}/tprm/decision-briefs/${briefA}/pdf`);
        expect(res.status).toBe(401);
    });

    it('denies cross-tenant brief PDF download', async () => {
        const res = await request(app)
            .get(`${API}/tprm/decision-briefs/${briefA}/pdf`)
            .set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(res.status);
    });

    it('returns 404 for a missing brief', async () => {
        const res = await request(app)
            .get(`${API}/tprm/decision-briefs/00000000-0000-4000-8000-000000000099/pdf`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(res.status).toBe(404);
    });

    it('downloads findings CSV and XLSX', async () => {
        const csv = await request(app)
            .get(`${API}/tprm/reports/findings.csv`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(csv.status).toBe(200);
        expect(csv.headers['content-type']).toMatch(/text\/csv/);
        expect(csv.text).toContain('vendor,title,severity,status');

        const xlsx = await request(app)
            .get(`${API}/tprm/reports/findings.xlsx`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(xlsx.status).toBe(200);
        expect(xlsx.headers['content-type']).toMatch(/spreadsheetml/);
        expect(fileBuffer(xlsx).subarray(0, 2).toString()).toBe('PK');
    });

    it('downloads monitoring CSV without inventing events', async () => {
        const res = await request(app)
            .get(`${API}/tprm/reports/monitoring.csv`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/csv/);
        expect(res.text.split('\n')[0]).toContain('providerStatus');
    });

    it('downloads executive PDF and board PPTX', async () => {
        const pdf = await request(app)
            .get(`${API}/tprm/reports/executive.pdf`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(pdf.status).toBe(200);
        expect(pdf.headers['content-type']).toMatch(/application\/pdf/);
        expect(fileBuffer(pdf).subarray(0, 4).toString()).toBe('%PDF');

        const pptx = await request(app)
            .get(`${API}/tprm/reports/board.pptx`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(pptx.status).toBe(200);
        expect(pptx.headers['content-type']).toMatch(/presentationml/);
        expect(fileBuffer(pptx).subarray(0, 2).toString()).toBe('PK');
    });
});
