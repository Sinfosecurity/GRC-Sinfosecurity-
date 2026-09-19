import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { getEnv } from '../config/env';
import { createOrgUser } from './helpers/orgUser';

jest.setTimeout(120000);

const PASSWORD = 'Wave2Pass1x';
const API = '/api/v1';

function completeAnswers(overrides: Record<string, string> = {}) {
    return {
        a1: 'consulting',
        a2: 'internal',
        a3: 'none',
        a4: 'none',
        a5: 'internal',
        a6: 'country',
        a7: 'no',
        a8: 'no',
        a9: 'no',
        b1: 'manage',
        b2: 'no',
        b3: 'no',
        b4: 'minor',
        b5: 'easy',
        ...overrides,
    };
}

describe('#12 Wave 2 engagement IRA, tier review, and clarification', () => {
    const suffix = `${Date.now()}`;
    let adminToken = '';
    let analystToken = '';
    let requesterToken = '';
    let otherRequesterToken = '';
    let otherTenantToken = '';
    let analystId = '';
    let orgA = '';
    let azureId = '';
    let m365Id = '';
    let azureEngagementId = '';
    let m365EngagementId = '';
    let azureIraId = '';
    let m365IraId = '';
    let vendorId = '';

    async function createIntake(service: string, purpose: string, token = requesterToken) {
        const created = await request(app).post(`${API}/tprm/intakes`).set('Authorization', `Bearer ${token}`).send({
            proposedThirdPartyName: 'Microsoft Corporation',
            proposedServiceName: service,
            businessPurpose: purpose,
        });
        expect(created.status).toBe(201);
        await request(app).post(`${API}/tprm/intakes/${created.body.data.id}/assign`).set('Authorization', `Bearer ${adminToken}`).send({ analystUserId: analystId });
        await request(app).post(`${API}/tprm/intakes/${created.body.data.id}/start-review`).set('Authorization', `Bearer ${analystToken}`);
        return created.body.data.id as string;
    }

    beforeAll(async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            throw new Error(`PostgreSQL is required. ${(error as Error).message}`);
        }
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `lead-${suffix}@wave2.test`,
            password: PASSWORD,
            firstName: 'Lea',
            lastName: 'Lead',
            organizationName: `Wave2 ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        adminToken = signup.body.data.token;
        orgA = signup.body.data.user.organizationId;
        const analyst = await createOrgUser({ organizationId: orgA, email: `ana-${suffix}@wave2.test`, password: PASSWORD, role: Role.ASSESSOR, firstName: 'Ana', lastName: 'Lyst' });
        analystToken = analyst.token;
        analystId = analyst.user.id;
        const requester = await createOrgUser({ organizationId: orgA, email: `pat-${suffix}@wave2.test`, password: PASSWORD, role: Role.BUSINESS_OWNER, firstName: 'Pat', lastName: 'Requester' });
        requesterToken = requester.token;
        const other = await createOrgUser({ organizationId: orgA, email: `oli-${suffix}@wave2.test`, password: PASSWORD, role: Role.BUSINESS_OWNER, firstName: 'Oli', lastName: 'Other' });
        otherRequesterToken = other.token;
        const tenant = await request(app).post(`${API}/auth/signup`).send({
            email: `other-${suffix}@wave2-b.test`,
            password: PASSWORD,
            firstName: 'Other',
            lastName: 'Tenant',
            organizationName: `Wave2 B ${suffix}`,
            country: 'US',
        });
        otherTenantToken = tenant.body.data.token;
    });

    it('creates separate IRA records for two engagements on one third party', async () => {
        azureId = await createIntake('Azure Hosting', 'Host a customer-facing application.');
        const vendor = await request(app).post(`${API}/tprm/intakes/${azureId}/third-party`).set('Authorization', `Bearer ${analystToken}`).send({
            name: 'Microsoft Corporation',
            website: 'https://microsoft.com',
            country: 'United States',
        });
        expect(vendor.status).toBe(201);
        vendorId = vendor.body.data.matchedVendorId;
        const azure = await request(app).post(`${API}/tprm/intakes/${azureId}/engagement`).set('Authorization', `Bearer ${analystToken}`).send({ serviceName: 'Azure Hosting' });
        expect(azure.status).toBe(201);
        azureEngagementId = azure.body.data.engagement.id;

        m365Id = await createIntake('Microsoft 365', 'Company collaboration suite.');
        await request(app).post(`${API}/tprm/intakes/${m365Id}/match`).set('Authorization', `Bearer ${analystToken}`).send({ vendorId, reason: 'Same legal entity' });
        const m365 = await request(app).post(`${API}/tprm/intakes/${m365Id}/engagement`).set('Authorization', `Bearer ${analystToken}`).send({ serviceName: 'Microsoft 365' });
        expect(m365.status).toBe(201);
        m365EngagementId = m365.body.data.engagement.id;

        const iras = await prisma.engagementIra.findMany({ where: { organizationId: orgA }, orderBy: { createdAt: 'asc' } });
        expect(iras).toHaveLength(2);
        expect(iras[0].engagementId).toBe(azureEngagementId);
        expect(iras[1].engagementId).toBe(m365EngagementId);
        azureIraId = iras[0].id;
        m365IraId = iras[1].id;
        expect(azureIraId).not.toBe(m365IraId);
    });

    it('lets the requester open and submit their own IRA and denies other actors', async () => {
        const actions = await request(app).get(`${API}/tprm/requester/actions`).set('Authorization', `Bearer ${requesterToken}`);
        expect(actions.status).toBe(200);
        expect(actions.body.data.items.some((item: { type: string }) => item.type === 'IRA_REQUIRED')).toBe(true);

        const opened = await request(app).get(`${API}/tprm/requester/iras/${azureIraId}`).set('Authorization', `Bearer ${requesterToken}`);
        expect(opened.status).toBe(200);
        expect(opened.body.data.form.parts).toHaveLength(2);
        expect(opened.body.data.thirdPartyName).toBe('Microsoft Corporation');
        expect(JSON.stringify(opened.body.data)).not.toMatch(/recommendedTier|hardFloors|assignmentHistory/);

        const other = await request(app).get(`${API}/tprm/requester/iras/${azureIraId}`).set('Authorization', `Bearer ${otherRequesterToken}`);
        expect([403, 404]).toContain(other.status);

        const grc = await request(app).get(`${API}/tprm/requester/iras/${azureIraId}`).set('Authorization', `Bearer ${analystToken}`);
        expect(grc.status).toBe(403);

        const vendorToken = jwt.sign(
            { userId: 'vendor-actor', plane: 'VENDOR', kind: 'vendor_session', organizationId: orgA },
            getEnv().jwtSecret
        );
        const vendorDenied = await request(app).get(`${API}/tprm/requester/iras/${azureIraId}`).set('Authorization', `Bearer ${vendorToken}`);
        expect([401, 403]).toContain(vendorDenied.status);
        const vendorTier = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/tier-review`).set('Authorization', `Bearer ${vendorToken}`);
        expect([401, 403]).toContain(vendorTier.status);

        const submitted = await request(app).post(`${API}/tprm/requester/iras/${azureIraId}/submit`).set('Authorization', `Bearer ${requesterToken}`).send({
            attested: true,
            answers: completeAnswers({ a2: 'dont_know' }),
        });
        expect(submitted.status).toBe(200);
        expect(submitted.body.data.requesterStatus).toBe('Risk assessment under review');
    });

    it('calculates Version 3, blocks confirmation while Don\'t know remains, then clarifies and recalculates', async () => {
        const review = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/tier-review`).set('Authorization', `Bearer ${analystToken}`);
        expect(review.status).toBe(200);
        expect(review.body.data.recommendedTier).toBeNull();
        expect(review.body.data.unknownKeys).toEqual(expect.arrayContaining(['a2']));
        expect(review.body.data.wave3Started).toBe(false);

        const blocked = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/tier-review/confirm`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(blocked.status).toBe(409);

        const requesterReview = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/tier-review`).set('Authorization', `Bearer ${requesterToken}`);
        expect(requesterReview.status).toBe(403);

        const clarify = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/tier-review/clarification`).set('Authorization', `Bearer ${analystToken}`).send({
            questionKeys: ['a2'],
            notes: { a2: 'What information will Azure actually see?' },
            generalNote: 'Need the data types.',
        });
        expect(clarify.status).toBe(200);
        expect(clarify.body.data.state).toBe('NEEDS_CLARIFICATION');

        const original = await prisma.engagementIraSubmission.findFirst({ where: { iraId: azureIraId, kind: 'INITIAL' } });
        expect(asAnswer(original?.answers).a2).toBe('dont_know');

        const form = await request(app).get(`${API}/tprm/requester/iras/${azureIraId}`).set('Authorization', `Bearer ${requesterToken}`);
        expect(form.body.data.clarification.items).toHaveLength(1);
        expect(form.body.data.clarification.items[0].previousAnswerValue).toBe('dont_know');
        expect(JSON.stringify(form.body.data)).not.toMatch(/overrideReason|recommendedTier/);

        const responded = await request(app).post(`${API}/tprm/requester/iras/${azureIraId}/clarification`).set('Authorization', `Bearer ${requesterToken}`).send({
            responses: [{ questionKey: 'a2', updatedAnswer: 'personal', comment: 'Customer application data.' }],
        });
        expect(responded.status).toBe(200);

        const after = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/tier-review`).set('Authorization', `Bearer ${analystToken}`);
        expect(after.status).toBe(200);
        expect(after.body.data.recommendedTier).toBe('MEDIUM');
        expect(after.body.data.impactDelta.previousRecommendation).toBeNull();
        expect(after.body.data.history.clarifications[0].previousAnswer).toMatch(/Don't know|Don\'t know/i);
        expect(after.body.data.history.clarifications[0].updatedAnswer).toMatch(/Personal/);
        expect(asAnswer(original?.answers).a2).toBe('dont_know');

        const confirm = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/tier-review/confirm`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(confirm.status).toBe(200);
        expect(confirm.body.data.history.confirmedTier).toBe('MEDIUM');
        expect(confirm.body.data.history.overrideFromTier).toBeNull();
        expect(confirm.body.data.wave3Started).toBe(false);
        const engagement = await prisma.engagement.findUnique({ where: { id: azureEngagementId } });
        expect(engagement?.status).toBe('INHERENT_TIER_CONFIRMED');
    });

    it('overrides with rationale on a separate engagement and preserves the recommendation', async () => {
        await request(app).post(`${API}/tprm/requester/iras/${m365IraId}/submit`).set('Authorization', `Bearer ${requesterToken}`).send({
            attested: true,
            answers: completeAnswers(),
        });
        const silent = await request(app).post(`${API}/tprm/engagements/${m365EngagementId}/tier-review/override`).set('Authorization', `Bearer ${analystToken}`).send({ tier: 'HIGH' });
        expect(silent.status).toBe(400);
        const overridden = await request(app).post(`${API}/tprm/engagements/${m365EngagementId}/tier-review/override`).set('Authorization', `Bearer ${analystToken}`).send({
            tier: 'HIGH',
            reason: 'Collaboration suite is material to operations.',
        });
        expect(overridden.status).toBe(200);
        expect(overridden.body.data.recommendedTier).toBe('LOW');
        expect(overridden.body.data.history.confirmedTier).toBe('HIGH');
        expect(overridden.body.data.history.overrideFromTier).toBe('LOW');
        expect(overridden.body.data.history.overrideReason).toMatch(/material/);
    });

    it('denies cross-tenant IRA access and records audit', async () => {
        const denied = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/tier-review`).set('Authorization', `Bearer ${otherTenantToken}`);
        expect([403, 404]).toContain(denied.status);
        const actions = await prisma.auditEvent.findMany({
            where: { organizationId: orgA, resourceType: 'EngagementIra' },
            select: { action: true },
        });
        expect(actions.map((row) => row.action)).toEqual(expect.arrayContaining([
            'ira.task.created',
            'ira.opened',
            'ira.submitted',
            'ira.calculated',
            'ira.clarification.requested',
            'ira.clarification.submitted',
            'ira.recalculated',
            'ira.tier.confirmed',
            'ira.tier.overridden',
        ]));
        const insurance = await prisma.vendor.findUnique({ where: { id: vendorId } });
        expect(insurance?.id).toBe(vendorId);
    });
});

function asAnswer(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object') return {};
    return value as Record<string, string>;
}
