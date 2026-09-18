import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/database';

jest.setTimeout(60000);

const PASSWORD = 'IraPathPass1x';
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

describe('Version 3 requester IRA path', () => {
    const suffix = `${Date.now()}`;
    let token = '';
    let publicId = '';
    let vendorId = '';
    let requesterEmail = '';

    beforeAll(async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            throw new Error(`PostgreSQL is required. ${(error as Error).message}`);
        }
        requesterEmail = `requester-${suffix}@ira.test`;
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `grc-${suffix}@ira.test`,
            password: PASSWORD,
            firstName: 'Grc',
            lastName: 'Owner',
            organizationName: `IRA Org ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        token = signup.body.data.token;
    });

    it('creates a record for a requester who does not have a Supreme login', async () => {
        const created = await request(app)
            .post(`${API}/vendors/onboarding`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: `IRA Vendor ${suffix}`,
                servicesProvided: 'Consulting for finance operations',
                requesterName: 'Jordan Request',
                requesterEmail,
            });
        expect(created.status).toBe(201);
        publicId = created.body.data.publicId;
        vendorId = created.body.data.id;
        expect(created.body.data.ira.required).toBe(true);
        expect(created.body.data.ira.sent).toBe(false);
        expect(created.body.data.nextAction).toBe('Send the inherent-risk form');
        expect(created.body.data.dueDate).toBeNull();
    });

    it('blocks IRA send while screening is on hold', async () => {
        await prisma.vendorOnboarding.update({
            where: { vendorId },
            data: { screeningStatus: 'HOLD' },
        });
        const blocked = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/ira/link`)
            .set('Authorization', `Bearer ${token}`)
            .send({});
        expect(blocked.status).toBe(409);
        await prisma.vendorOnboarding.update({
            where: { vendorId },
            data: { screeningStatus: 'CLEAR' },
        });
    });

    it('copies a hashed IRA link and lets the requester submit Don\'t know without a stored tier', async () => {
        const copied = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/ira/link`)
            .set('Authorization', `Bearer ${token}`)
            .send({});
        expect(copied.status).toBe(200);
        const url = copied.body.data.iraLink.url as string;
        expect(url).toMatch(/\/ira\?token=/);
        const raw = new URL(url, 'https://app.example').searchParams.get('token') || '';

        const opened = await request(app).get(`${API}/ira`).query({ token: raw });
        expect(opened.status).toBe(200);
        expect(opened.body.data.vendorName).toMatch(/IRA Vendor/);
        expect(opened.body.data.form.parts).toHaveLength(2);

        const submitted = await request(app).post(`${API}/ira/submit`).send({
            token: raw,
            attested: true,
            answers: completeAnswers({ a4: 'dont_know' }),
        });
        expect(submitted.status).toBe(200);
        expect(submitted.body.data.rating.tier).toBeNull();
        expect(submitted.body.data.rating.message).toMatch(/Not yet rated/);

        const workspace = await request(app)
            .get(`${API}/vendors/onboarding/${publicId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(workspace.body.data.ira.submitted).toBe(true);
        expect(workspace.body.data.tierReview).toBeNull();
        expect(workspace.body.data.stageKey).toBe('TIER_REVIEW');
        expect(workspace.body.data.tierAuthoritative).toBe(false);
        expect(workspace.body.data.ira.unknownMessage).toMatch(/Not yet rated/);
        const stored = await prisma.vendor.findUnique({ where: { id: vendorId } });
        expect(stored?.tier).toBe('MEDIUM');
        expect(workspace.body.data.tierKey).toBeNull();
        const blocked = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/tier/confirm`)
            .set('Authorization', `Bearer ${token}`)
            .send({ confirm: true });
        expect(blocked.status).toBe(409);
        expect(JSON.stringify(blocked.body)).toMatch(/Not yet rated|need confirmation/i);
    });

    it('auto-confirms Low only after a current external rating is present', async () => {
        const second = await request(app)
            .post(`${API}/vendors/onboarding`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: `IRA Low ${suffix}`,
                servicesProvided: 'Office supplies consulting',
                requesterName: 'Jordan Request',
                requesterEmail: `low-${suffix}@ira.test`,
                acknowledgeDuplicate: true,
            });
        expect(second.status).toBe(201);
        await prisma.vendorOnboarding.update({
            where: { vendorId: second.body.data.id },
            data: {
                externalRating: {
                    provider: 'securityscorecard',
                    score: 92,
                    grade: 'A',
                    assessedAt: new Date().toISOString(),
                },
            },
        });
        const copied = await request(app)
            .post(`${API}/vendors/onboarding/${second.body.data.publicId}/ira/link`)
            .set('Authorization', `Bearer ${token}`)
            .send({});
        const raw = new URL(copied.body.data.iraLink.url, 'https://app.example').searchParams.get('token') || '';
        const submitted = await request(app).post(`${API}/ira/submit`).send({
            token: raw,
            attested: true,
            answers: completeAnswers(),
        });
        expect(submitted.status).toBe(200);
        expect(submitted.body.data.autoConfirmed).toBe(true);
        expect(submitted.body.data.rating.tier).toBe('LOW');
        const workspace = await request(app)
            .get(`${API}/vendors/onboarding/${second.body.data.publicId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(workspace.body.data.stageKey).toBe('READY_TO_SEND');
    });

    it('confirms a rateable IRA into READY_TO_SEND and only marks copy sent after Mark as sent', async () => {
        const created = await request(app)
            .post(`${API}/vendors/onboarding`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: `IRA Confirm ${suffix}`,
                servicesProvided: 'Customer payroll processing',
                requesterName: 'Jordan Request',
                requesterEmail: `confirm-${suffix}@ira.test`,
                acknowledgeDuplicate: true,
            });
        expect(created.status).toBe(201);
        const copied = await request(app)
            .post(`${API}/vendors/onboarding/${created.body.data.publicId}/ira/link`)
            .set('Authorization', `Bearer ${token}`)
            .send({});
        const raw = new URL(copied.body.data.iraLink.url, 'https://app.example').searchParams.get('token') || '';
        const submitted = await request(app).post(`${API}/ira/submit`).send({
            token: raw,
            attested: true,
            answers: completeAnswers({ a2: 'personal' }),
        });
        expect(submitted.status).toBe(200);
        expect(submitted.body.data.confirmation).toMatch(/submitted successfully/);
        expect(submitted.body.data.submittedAt || submitted.body.data.submitted).toBeTruthy();
        const before = await request(app)
            .get(`${API}/vendors/onboarding/${created.body.data.publicId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(before.body.data.stageKey).toBe('TIER_REVIEW');
        expect(before.body.data.tierAuthoritative).toBe(false);
        expect(before.body.data.tierReview.confirmedTier).toBeNull();
        const beforeVendor = await prisma.vendor.findUnique({ where: { id: created.body.data.id } });
        expect(beforeVendor?.tier).toBe('MEDIUM');
        const notices = await prisma.inAppNotification.findMany({
            where: { organizationId: beforeVendor?.organizationId, resourceId: created.body.data.id },
        });
        expect(notices.some((row) => /inherent risk submitted/i.test(row.title))).toBe(true);

        const confirmed = await request(app)
            .post(`${API}/vendors/onboarding/${created.body.data.publicId}/tier/confirm`)
            .set('Authorization', `Bearer ${token}`)
            .send({ confirm: true });
        expect(confirmed.status).toBe(200);
        expect(confirmed.body.data.stageKey).toBe('READY_TO_SEND');
        expect(confirmed.body.data.tierReview.confirmedTier).toBeTruthy();
        expect(confirmed.body.data.tierAuthoritative).toBe(true);

        const link = await request(app)
            .post(`${API}/vendors/onboarding/${created.body.data.publicId}/invitation/link`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Vendor Security', email: `vendor-${suffix}@vendor.test` });
        expect(link.status).toBe(200);
        expect(link.body.data.stageKey || link.body.data.stage).toMatch(/READY_TO_SEND|Ready to send/i);
        expect(link.body.data.activationUrl).toMatch(/vendor-assessment\/activate/);

        const afterCopy = await request(app)
            .get(`${API}/vendors/onboarding/${created.body.data.publicId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(afterCopy.body.data.stageKey).toBe('READY_TO_SEND');

        const marked = await request(app)
            .post(`${API}/vendors/onboarding/${created.body.data.publicId}/invitation/shared`)
            .set('Authorization', `Bearer ${token}`)
            .send({});
        expect(marked.status).toBe(200);
        const afterMark = await request(app)
            .get(`${API}/vendors/onboarding/${created.body.data.publicId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(afterMark.body.data.stageKey).toBe('AWAITING_VENDOR');
        expect(afterMark.body.data.plan?.pin || afterMark.body.data.questionnairePlan).toBeTruthy();
        const pinned = await prisma.vendorOnboarding.findFirst({ where: { vendorId: created.body.data.id } });
        expect((pinned?.plan as { pin?: { catalogVersion?: string } } | null)?.pin?.catalogVersion).toBeTruthy();
    });

    it('sends the vendor questionnaire by email and enters AWAITING_VENDOR', async () => {
        const created = await request(app)
            .post(`${API}/vendors/onboarding`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: `IRA Email ${suffix}`,
                servicesProvided: 'Customer payroll processing',
                requesterName: 'Jordan Request',
                requesterEmail: `email-${suffix}@ira.test`,
                acknowledgeDuplicate: true,
            });
        expect(created.status).toBe(201);
        const copied = await request(app)
            .post(`${API}/vendors/onboarding/${created.body.data.publicId}/ira/link`)
            .set('Authorization', `Bearer ${token}`)
            .send({});
        const raw = new URL(copied.body.data.iraLink.url, 'https://app.example').searchParams.get('token') || '';
        await request(app).post(`${API}/ira/submit`).send({
            token: raw,
            attested: true,
            answers: completeAnswers({ a2: 'personal' }),
        });
        const confirmed = await request(app)
            .post(`${API}/vendors/onboarding/${created.body.data.publicId}/tier/confirm`)
            .set('Authorization', `Bearer ${token}`)
            .send({ confirm: true });
        expect(confirmed.status).toBe(200);
        expect(confirmed.body.data.stageKey).toBe('READY_TO_SEND');
        const sent = await request(app)
            .post(`${API}/vendors/onboarding/${created.body.data.publicId}/send`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Vendor Security', email: `email-vendor-${suffix}@vendor.test` });
        expect(sent.status).toBe(201);
        const after = await request(app)
            .get(`${API}/vendors/onboarding/${created.body.data.publicId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(after.body.data.stageKey).toBe('AWAITING_VENDOR');
    });
});
