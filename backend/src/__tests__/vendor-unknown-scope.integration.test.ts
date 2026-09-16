import request from 'supertest';
import { VendorOnboardingStage } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { canonicalIntakeAnswers } from './helpers/canonicalIntake';

jest.setTimeout(90000);

const PASSWORD = 'UnknownScope1x';
const API = '/api/v1';

describe('Unknown controlling-fact lifecycle', () => {
    const suffix = `${Date.now()}`;
    let token = '';
    let ownerId = '';
    let publicId = '';
    let vendorId = '';
    let intakeAssessmentId = '';

    beforeAll(async () => {
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `unknown-scope-${suffix}@onboard.test`,
            password: PASSWORD,
            firstName: 'Una',
            lastName: 'Owner',
            organizationName: `Unknown Scope ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        token = signup.body.data.token;
        ownerId = signup.body.data.user.id;
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('saves Unknown honestly and blocks finalize, package confirmation, and invitation', async () => {
        const created = await request(app).post(`${API}/vendors/onboarding`).set('Authorization', `Bearer ${token}`).send({
            name: `Unknown Scope Vendor ${suffix}`,
            website: `https://unknown-scope-${suffix}.example`,
            country: 'United States',
            servicesProvided: 'Privileged remote administration',
            businessOwnerUserId: ownerId,
            businessUnit: 'Security',
        });
        expect(created.status).toBe(201);
        publicId = created.body.data.publicId;
        vendorId = created.body.data.id;

        const saved = await request(app)
            .patch(`${API}/vendors/onboarding/${publicId}/intake`)
            .set('Authorization', `Bearer ${token}`)
            .send({ answers: canonicalIntakeAnswers({ ir_04: 'Unknown', ir_05: 'Low' }) });
        expect(saved.status).toBe(200);
        expect(saved.body.data.stageKey).toBe('INTAKE');
        const persisted = saved.body.data.intake.sections
            .flatMap((section: { questions: Array<{ key: string; response: string }> }) => section.questions)
            .find((row: { key: string }) => row.key === 'ir_04');
        expect(persisted.response).toBe('Unknown');
        expect(JSON.stringify(saved.body.data.unresolvedScope)).toMatch(/privileged administrative access/i);

        const blockedComplete = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/intake/complete`)
            .set('Authorization', `Bearer ${token}`)
            .send({ attested: true, answers: canonicalIntakeAnswers({ ir_04: 'Unknown', ir_05: 'Low' }) });
        expect(blockedComplete.status).toBe(400);
        expect(blockedComplete.body.error.message).toMatch(/privileged administrative access/i);
        expect(blockedComplete.body.error.message).not.toMatch(/Unknown cannot remain/i);

        const stillIntake = await request(app).get(`${API}/vendors/onboarding/${publicId}`).set('Authorization', `Bearer ${token}`);
        expect(stillIntake.status).toBe(200);
        expect(stillIntake.body.data.stageKey).toBe('INTAKE');

        const blockedPlan = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/plan/confirm`)
            .set('Authorization', `Bearer ${token}`)
            .send({});
        expect(blockedPlan.status).toBe(409);

        const blockedSend = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/send`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Vendor Contact', email: `contact-${suffix}@vendor.test` });
        expect(blockedSend.status).toBe(409);
    });

    it('recalculates packs and allows send after the controlling fact is resolved', async () => {
        const completed = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/intake/complete`)
            .set('Authorization', `Bearer ${token}`)
            .send({ attested: true, answers: canonicalIntakeAnswers({ ir_04: 'High', ir_05: 'Low' }) });
        expect(completed.status).toBe(200);
        expect(completed.body.data.stageKey).toBe('TIER_REVIEW');
        expect(completed.body.data.unresolvedScope).toHaveLength(0);
        expect(JSON.stringify(completed.body.data.plan.package.required)).toMatch(/privileged-network/i);

        const confirmed = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/tier/confirm`)
            .set('Authorization', `Bearer ${token}`)
            .send({ confirm: true });
        expect(confirmed.status).toBe(200);

        const plan = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/plan/confirm`)
            .set('Authorization', `Bearer ${token}`)
            .send({});
        expect(plan.status).toBe(200);
        expect(plan.body.data.stageKey).toBe('READY_TO_SEND');

        const onboarding = await prisma.vendorOnboarding.findFirst({ where: { vendorId } });
        intakeAssessmentId = onboarding?.intakeAssessmentId || '';
        await prisma.assessmentResponse.updateMany({
            where: { assessmentId: intakeAssessmentId, questionId: 'ir_04' },
            data: { response: 'Unknown' },
        });

        const blockedAgain = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/send`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Vendor Contact', email: `contact-recheck-${suffix}@vendor.test` });
        expect(blockedAgain.status).toBe(409);
        expect(blockedAgain.body.error.message).toMatch(/privileged administrative access/i);

        await prisma.assessmentResponse.updateMany({
            where: { assessmentId: intakeAssessmentId, questionId: 'ir_04' },
            data: { response: 'High' },
        });
        await prisma.vendorOnboarding.update({
            where: { vendorId },
            data: { stage: VendorOnboardingStage.READY_TO_SEND },
        });

        const sent = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/send`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Vendor Contact', email: `contact-ok-${suffix}@vendor.test` });
        expect([200, 201]).toContain(sent.status);
    });
});
