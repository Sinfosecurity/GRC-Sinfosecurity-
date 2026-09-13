import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/database';

jest.setTimeout(120000);

const PASSWORD = 'PrivPass1x';
const API = '/api/v1';

function fileBuffer(res: { body: unknown; text?: string }): Buffer {
    if (Buffer.isBuffer(res.body)) return res.body;
    if (typeof res.body === 'string') return Buffer.from(res.body, 'binary');
    if (res.body instanceof Uint8Array) return Buffer.from(res.body);
    if (typeof res.text === 'string' && res.text.length) return Buffer.from(res.text, 'binary');
    return Buffer.from(JSON.stringify(res.body || ''));
}

describe('supreme privacy tenant isolation and honesty', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let activityA = '';
    let rightsA = '';
    let transferA = '';
    let orgA = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signupA = await request(app).post(`${API}/auth/signup`).send({
            email: `priv-a-${suffix}@tenant-a.test`,
            password: PASSWORD,
            firstName: 'Priv',
            lastName: 'Alpha',
            organizationName: `PRIV A ${suffix}`,
            country: 'US',
        });
        const signupB = await request(app).post(`${API}/auth/signup`).send({
            email: `priv-b-${suffix}@tenant-b.test`,
            password: PASSWORD,
            firstName: 'Priv',
            lastName: 'Bravo',
            organizationName: `PRIV B ${suffix}`,
            country: 'US',
        });
        expect(signupA.status).toBe(201);
        expect(signupB.status).toBe(201);
        tokenA = signupA.body.data.token;
        tokenB = signupB.body.data.token;
        orgA = signupA.body.data.user.organizationId;

        const created = await request(app).post(`${API}/privacy/activities`).set('Authorization', `Bearer ${tokenA}`).send({
            name: 'Claims servicing',
            businessProcess: 'Claims',
            jurisdictions: ['US-NY', 'IE'],
            sourceOfData: 'Policyholders',
            status: 'ACTIVE',
        });
        expect(created.status).toBe(201);
        activityA = created.body.data.publicId;
        await request(app).post(`${API}/privacy/activities/${activityA}/purposes`).set('Authorization', `Bearer ${tokenA}`).send({ name: 'Service delivery' });
        await request(app).post(`${API}/privacy/activities/${activityA}/basis`).set('Authorization', `Bearer ${tokenA}`).send({
            purposeName: 'Service delivery',
            basisType: 'CONTRACT',
            rationale: 'Needed to pay claims',
            regime: 'GDPR',
        });
        await request(app).post(`${API}/privacy/activities/${activityA}/data`).set('Authorization', `Bearer ${tokenA}`).send({ kind: 'FINANCIAL', label: 'Financial' });
        await request(app).post(`${API}/privacy/activities/${activityA}/subjects`).set('Authorization', `Bearer ${tokenA}`).send({ kind: 'CUSTOMERS' });
        const transfer = await request(app).post(`${API}/privacy/transfers`).set('Authorization', `Bearer ${tokenA}`).send({
            activityPublicId: activityA,
            sourceJurisdiction: 'US-NY',
            destinationJurisdiction: 'IE',
            mechanism: 'SCC',
        });
        expect(transfer.status).toBe(201);
        transferA = transfer.body.data.publicId;
        const rights = await request(app).post(`${API}/privacy/rights`).set('Authorization', `Bearer ${tokenA}`).send({
            activityPublicId: activityA,
            requestType: 'ACCESS',
            regime: 'GDPR',
            requesterRef: 'jane.doe@example.com',
            requesterIdentity: 'Jane Doe',
        });
        expect(rights.status).toBe(201);
        rightsA = rights.body.data.publicId;
    });

    it('keeps activities, DSRs, transfers, DPIAs, reports, and graph paths inside the tenant', async () => {
        const leaked = await request(app).get(`${API}/privacy/activities/${activityA}`).set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(leaked.status);
        const dashB = await request(app).get(`${API}/privacy/dashboard`).set('Authorization', `Bearer ${tokenB}`);
        expect(dashB.status).toBe(200);
        expect(JSON.stringify(dashB.body)).not.toContain(activityA);
        expect(JSON.stringify(dashB.body)).not.toContain(rightsA);
        const rightsB = await request(app).get(`${API}/privacy/rights/${rightsA}`).set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(rightsB.status);
        const transferB = await request(app).get(`${API}/privacy/transfers`).set('Authorization', `Bearer ${tokenB}`);
        expect(JSON.stringify(transferB.body)).not.toContain(transferA);
        const pdf = await request(app).get(`${API}/privacy/reports/board.pdf`).set('Authorization', `Bearer ${tokenA}`);
        expect(pdf.status).toBe(200);
        expect(fileBuffer(pdf).subarray(0, 4).toString()).toBe('%PDF');
        expect(JSON.stringify(pdf.body)).not.toMatch(/this processing is gdpr compliant|this transfer is lawful/i);
        const pptx = await request(app).get(`${API}/privacy/reports/board.pptx`).set('Authorization', `Bearer ${tokenA}`);
        expect(pptx.status).toBe(200);
        expect(fileBuffer(pptx).subarray(0, 2).toString()).toBe('PK');
        const graph = await request(app).get(`${API}/governance/search`).query({ q: activityA }).set('Authorization', `Bearer ${tokenB}`);
        expect(JSON.stringify(graph.body)).not.toContain(activityA);
        const graphA = await request(app).get(`${API}/governance/search`).query({ q: activityA }).set('Authorization', `Bearer ${tokenA}`);
        expect(graphA.status).toBe(200);
        expect(JSON.stringify(graphA.body)).toContain(activityA);
    });

    it('masks requester identity from viewers and keeps formula injection out of import', async () => {
        const admin = await prisma.user.findFirstOrThrow({ where: { organizationId: orgA } });
        const viewer = await prisma.user.create({
            data: {
                email: `priv-viewer-${suffix}@tenant-a.test`,
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
        const list = await request(app).get(`${API}/privacy/rights`).set('Authorization', `Bearer ${viewerLogin.body.data.token}`);
        expect(list.status).toBe(200);
        expect(JSON.stringify(list.body)).not.toContain('Jane Doe');
        expect(JSON.stringify(list.body)).not.toContain('jane.doe@example.com');
        expect(JSON.stringify(list.body)).toMatch(/j•••@example.com|Requester/);
        const adminList = await request(app).get(`${API}/privacy/rights`).set('Authorization', `Bearer ${tokenA}`);
        expect(adminList.status).toBe(200);
        expect(JSON.stringify(adminList.body)).not.toContain('jane.doe@example.com');
        expect(JSON.stringify(adminList.body)).not.toContain('Jane Doe');
        const preview = await request(app).post(`${API}/privacy/import/preview`).set('Authorization', `Bearer ${tokenA}`).send({
            rows: [{ name: '=HYPERLINK("http://evil")', description: '+cmd' }],
        });
        expect(preview.status).toBe(200);
        expect(JSON.stringify(preview.body)).toContain("'=HYPERLINK");
    });

    it('records DPIA screening as a recommendation only', async () => {
        const dpia = await request(app).post(`${API}/privacy/dpias`).set('Authorization', `Bearer ${tokenA}`).send({
            activityPublicId: activityA,
            title: 'Claims DPIA',
            screening: [
                { key: 'sensitive_data', answer: true },
                { key: 'cross_border', answer: true },
            ],
        });
        expect(dpia.status).toBe(201);
        expect(dpia.body.data.advice).toMatch(/may be required \/ review recommended/i);
        expect(dpia.body.data.advice).not.toMatch(/this DPIA is legally required/i);
    });
});
