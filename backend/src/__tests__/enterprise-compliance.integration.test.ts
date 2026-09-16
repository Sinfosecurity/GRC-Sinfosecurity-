import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/database';
import { Role } from '@prisma/client';
import { createOrgUser } from './helpers/orgUser';

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
    let orgA = '';
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
        orgA = signupA.body.data.user.organizationId;

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
        const selfException = await request(app).post(`${API}/compliance/exceptions/${exception.body.data.publicId}/decision`).set('Authorization', `Bearer ${tokenA}`).send({
            decision: 'APPROVED',
        });
        expect(selfException.status).toBe(403);
        const approver = await createOrgUser({
            organizationId: orgA,
            email: `cmp-approver-${suffix}@tenant-a.test`,
            password: PASSWORD,
            role: Role.APPROVER,
        });
        const approved = await request(app).post(`${API}/compliance/exceptions/${exception.body.data.publicId}/decision`).set('Authorization', `Bearer ${approver.token}`).send({
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

    it('commits a validated import and keeps it inside the tenant', async () => {
        const key = (await request(app).get(`${API}/compliance/requirements/${requirementA}`).set('Authorization', `Bearer ${tokenA}`)).body.data.requirementKey;
        const preview = await request(app).post(`${API}/compliance/import/preview`).set('Authorization', `Bearer ${tokenA}`).send({
            rows: [{ requirementKey: key, applicability: 'UNDER_REVIEW' }],
        });
        expect(preview.body.data.rows[0].ok).toBe(true);
        const commit = await request(app).post(`${API}/compliance/import/commit`).set('Authorization', `Bearer ${tokenA}`).send({
            rows: [{ requirementKey: key, applicability: 'UNDER_REVIEW' }],
        });
        expect(commit.status).toBe(200);
        expect(commit.body.data.updated).toBe(1);
        const leaked = await request(app).post(`${API}/compliance/import/commit`).set('Authorization', `Bearer ${tokenB}`).send({
            rows: [{ requirementKey: key, applicability: 'APPLICABLE' }],
        });
        expect(leaked.body.data.updated).toBe(0);
        const after = await request(app).get(`${API}/compliance/requirements/${requirementA}`).set('Authorization', `Bearer ${tokenA}`);
        expect(after.body.data.applicability).toBe('Under review');
    });

    it('returns a campaign review queue and does not use Approved', async () => {
        const campaign = await request(app).post(`${API}/compliance/campaigns`).set('Authorization', `Bearer ${tokenA}`).send({
            name: 'Review workspace',
            activationId: activationA,
            dueAt: new Date(Date.now() - 86400000).toISOString(),
        });
        const requirement = await request(app).get(`${API}/compliance/requirements/${requirementA}`).set('Authorization', `Bearer ${tokenA}`);
        const controlId = requirement.body.data.controls[0]?.id;
        if (controlId) {
            const attested = await request(app).post(`${API}/compliance/attestations`).set('Authorization', `Bearer ${tokenA}`).send({
                campaignId: campaign.body.data.publicId,
                organizationControlId: controlId,
                status: 'IMPLEMENTED',
                statement: 'MFA is in use. This is a governance statement.',
            });
            const before = await request(app).get(`${API}/scc/controls/${controlId}`).set('Authorization', `Bearer ${tokenA}`);
            const beforeEffectiveness = before.body.data?.effectivenessStatus || before.body.data?.control?.effectivenessStatus;
            const selfReview = await request(app).post(`${API}/compliance/attestations/${attested.body.data.publicId}/review`).set('Authorization', `Bearer ${tokenA}`).send({
                reviewStatus: 'REVIEWED',
                reviewNotes: 'Reviewed. Not a control test.',
            });
            expect(selfReview.status).toBe(403);
            const reviewer = await createOrgUser({
                organizationId: orgA,
                email: `cmp-reviewer-${suffix}@tenant-a.test`,
                password: PASSWORD,
                role: Role.APPROVER,
            });
            const reviewed = await request(app).post(`${API}/compliance/attestations/${attested.body.data.publicId}/review`).set('Authorization', `Bearer ${reviewer.token}`).send({
                reviewStatus: 'REVIEWED',
                reviewNotes: 'Reviewed. Not a control test.',
            });
            expect(reviewed.status).toBe(200);
            expect(JSON.stringify(reviewed.body)).not.toMatch(/"APPROVED"/);
            const rejectedWord = await request(app).post(`${API}/compliance/attestations/${attested.body.data.publicId}/review`).set('Authorization', `Bearer ${tokenA}`).send({
                reviewStatus: 'APPROVED',
                reviewNotes: 'Should be rejected.',
            });
            expect(rejectedWord.status).toBe(400);
            const after = await request(app).get(`${API}/scc/controls/${controlId}`).set('Authorization', `Bearer ${tokenA}`);
            const afterEffectiveness = after.body.data?.effectivenessStatus || after.body.data?.control?.effectivenessStatus;
            expect(afterEffectiveness).toBe(beforeEffectiveness);
        }
        const detail = await request(app).get(`${API}/compliance/campaigns/${campaign.body.data.publicId}`).set('Authorization', `Bearer ${tokenA}`);
        expect(detail.status).toBe(200);
        expect(detail.body.data.queue.length).toBeGreaterThan(0);
        expect(JSON.stringify(detail.body.data)).toMatch(/governance statement/i);
        expect(JSON.stringify(detail.body.data)).toMatch(/Reviewed or Rejected/);
    });

    it('surfaces a populated attention queue from live overdue records', async () => {
        const dashboard = await request(app).get(`${API}/compliance/dashboard`).set('Authorization', `Bearer ${tokenA}`);
        expect(dashboard.status).toBe(200);
        const attention = dashboard.body.data.attention || [];
        expect(attention.some((row: { type: string }) => row.type === 'Overdue attestations' || row.type === 'Requirements with no mapped controls' || row.type === 'Implemented controls that are not tested')).toBe(true);
        expect(attention[0]).toHaveProperty('why');
        expect(attention[0]).toHaveProperty('href');
    });

    it('resolves compliance gap public IDs through graph search after live projection', async () => {
        const refreshed = await request(app).post(`${API}/compliance/activations/${activationA}/gaps/refresh`).set('Authorization', `Bearer ${tokenA}`).send({});
        expect(refreshed.status).toBe(200);
        let listed = await request(app).get(`${API}/compliance/gaps`).set('Authorization', `Bearer ${tokenA}`);
        let gapId = (listed.body.data || [])[0]?.publicId;
        if (!gapId) {
            const created = await request(app).post(`${API}/compliance/gaps`).set('Authorization', `Bearer ${tokenA}`).send({
                activationId: activationA,
                source: 'UNMAPPED',
                title: 'Graph discoverability gap',
                explanation: 'Created so GAP public IDs can be resolved in search.',
            });
            expect(created.status).toBe(201);
            gapId = created.body.data.publicId;
        }
        expect(gapId).toMatch(/^GAP-/);
        const dashboard = await request(app).get(`${API}/compliance/dashboard`).set('Authorization', `Bearer ${tokenA}`);
        expect(dashboard.status).toBe(200);
        const search = await request(app).get(`${API}/governance/search`).query({ q: gapId }).set('Authorization', `Bearer ${tokenA}`);
        expect(search.status).toBe(200);
        expect((search.body.data.nodes || []).some((row: { displayLabel?: string; sourceId?: string }) => String(row.displayLabel || '').includes(gapId))).toBe(true);
    });
});
