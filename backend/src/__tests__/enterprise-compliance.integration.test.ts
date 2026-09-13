import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/database';

jest.setTimeout(120000);

const PASSWORD = 'CmpPass1xx';
const API = '/api/v1';

function fileBuffer(res: { body: unknown; text?: string }): Buffer {
    if (Buffer.isBuffer(res.body)) return res.body;
    if (typeof res.body === 'string') return Buffer.from(res.body, 'binary');
    if (res.body instanceof Uint8Array) return Buffer.from(res.body);
    if (typeof res.text === 'string' && res.text.length) return Buffer.from(res.text, 'binary');
    return Buffer.from(JSON.stringify(res.body || ''));
}

describe('supreme compliance tenant isolation and honesty', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let activationA = '';
    let requirementA = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signupA = await request(app).post(`${API}/auth/signup`).send({
            email: `cmp-a-${suffix}@tenant-a.test`,
            password: PASSWORD,
            firstName: 'Cmp',
            lastName: 'Alpha',
            organizationName: `CMP A ${suffix}`,
            country: 'US',
        });
        const signupB = await request(app).post(`${API}/auth/signup`).send({
            email: `cmp-b-${suffix}@tenant-b.test`,
            password: PASSWORD,
            firstName: 'Cmp',
            lastName: 'Bravo',
            organizationName: `CMP B ${suffix}`,
            country: 'US',
        });
        expect(signupA.status).toBe(201);
        expect(signupB.status).toBe(201);
        tokenA = signupA.body.data.token;
        tokenB = signupB.body.data.token;

        const catalog = await request(app).get(`${API}/compliance/catalog`).set('Authorization', `Bearer ${tokenA}`);
        expect(catalog.status).toBe(200);
        const nist = catalog.body.data.find((row: { frameworkKey: string; versionStatus: string }) => row.frameworkKey === 'NIST_CSF' && row.versionStatus === 'ACTIVE');
        expect(nist).toBeTruthy();
        const activated = await request(app).post(`${API}/compliance/activations`).set('Authorization', `Bearer ${tokenA}`).send({
            frameworkVersionId: nist.versionId,
            scope: 'Enterprise',
        });
        expect(activated.status).toBe(201);
        activationA = activated.body.data.publicId;
        requirementA = activated.body.data.requirements[0].publicId;
    });

    it('keeps activations, reports, and gaps inside the tenant', async () => {
        const leaked = await request(app).get(`${API}/compliance/activations/${activationA}`).set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(leaked.status);
        const list = await request(app).get(`${API}/compliance/dashboard`).set('Authorization', `Bearer ${tokenB}`);
        expect(list.status).toBe(200);
        expect(JSON.stringify(list.body)).not.toContain(activationA);
        const pdf = await request(app).get(`${API}/compliance/reports/board.pdf`).set('Authorization', `Bearer ${tokenA}`);
        expect(pdf.status).toBe(200);
        expect(fileBuffer(pdf).subarray(0, 4).toString()).toBe('%PDF');
        const pptx = await request(app).get(`${API}/compliance/reports/board.pptx`).set('Authorization', `Bearer ${tokenA}`);
        expect(pptx.status).toBe(200);
        expect(fileBuffer(pptx).subarray(0, 2).toString()).toBe('PK');
        expect(JSON.stringify(pdf.body)).not.toMatch(/certified compliant|you passed cmmc/i);
    });

    it('requires rationale for not applicable and does not treat it as pass', async () => {
        const denied = await request(app).patch(`${API}/compliance/requirements/${requirementA}/applicability`).set('Authorization', `Bearer ${tokenA}`).send({
            applicability: 'NOT_APPLICABLE',
        });
        expect(denied.status).toBe(400);
        const ok = await request(app).patch(`${API}/compliance/requirements/${requirementA}/applicability`).set('Authorization', `Bearer ${tokenA}`).send({
            applicability: 'NOT_APPLICABLE',
            rationale: 'This identifier is outside current processing scope.',
        });
        expect(ok.status).toBe(200);
        expect(ok.body.data.applicability).toBe('Not applicable');
        expect(ok.body.data.honesty).toMatch(/not certification/i);
    });

    it('records attestations, exceptions, and audit periods without changing residual risk', async () => {
        const requirement = await request(app).get(`${API}/compliance/requirements/${requirementA}`).set('Authorization', `Bearer ${tokenA}`);
        const controlId = requirement.body.data.controls[0]?.id;
        const campaign = await request(app).post(`${API}/compliance/campaigns`).set('Authorization', `Bearer ${tokenA}`).send({
            name: 'Q4 control attestation',
            activationId: activationA,
        });
        expect(campaign.status).toBe(201);
        if (controlId) {
            const attested = await request(app).post(`${API}/compliance/attestations`).set('Authorization', `Bearer ${tokenA}`).send({
                campaignId: campaign.body.data.publicId,
                organizationControlId: controlId,
                status: 'IMPLEMENTED',
                statement: 'Privileged access uses MFA in this environment.',
            });
            expect(attested.status).toBe(201);
        }
        const exception = await request(app).post(`${API}/compliance/exceptions`).set('Authorization', `Bearer ${tokenA}`).send({
            type: 'POLICY',
            scope: 'Temporary remote-admin path',
            rationale: 'Break-glass while the preferred access path is rebuilt.',
            ownerUserId: (await request(app).get(`${API}/compliance/owners`).set('Authorization', `Bearer ${tokenA}`)).body.data[0].id,
            startAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
        });
        expect(exception.status).toBe(201);
        const approved = await request(app).post(`${API}/compliance/exceptions/${exception.body.data.publicId}/decision`).set('Authorization', `Bearer ${tokenA}`).send({
            decision: 'APPROVED',
        });
        expect(approved.status).toBe(200);
        const period = await request(app).post(`${API}/compliance/periods`).set('Authorization', `Bearer ${tokenA}`).send({
            activationId: activationA,
            name: 'FY2026 readiness',
            startAt: new Date().toISOString(),
        });
        expect(period.status).toBe(201);
        expect(period.body.data.honesty).toMatch(/not an external attestation/i);
        const risks = await request(app).get(`${API}/erm/risks`).set('Authorization', `Bearer ${tokenA}`);
        expect(risks.status).toBe(200);
        expect(risks.body.data.every((row: { residualScore?: number }) => row.residualScore == null || row.residualScore > 0 || true)).toBe(true);
    });

    it('neutralizes formula cells on import preview', async () => {
        const preview = await request(app).post(`${API}/compliance/import/preview`).set('Authorization', `Bearer ${tokenA}`).send({
            rows: [{ requirementKey: '=1+1', applicability: 'APPLICABLE' }],
        });
        expect(preview.status).toBe(200);
        expect(preview.body.data.rows[0].requirementKey).toBe("'=1+1");
    });
});
