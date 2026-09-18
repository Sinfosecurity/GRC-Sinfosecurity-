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
});
