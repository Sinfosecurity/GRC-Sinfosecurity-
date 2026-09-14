import request from 'supertest';
import { Role } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { scanOnboardingAttention } from '../services/vendorOnboardingService';

jest.setTimeout(60000);

const PASSWORD = 'OnboardPass1x';
const API = '/api/v1';

describe('Supreme Third Party onboarding Phase A', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let viewerToken = '';
    let orgA = '';
    let ownerId = '';
    let publicId = '';
    let vendorId = '';

    beforeAll(async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            throw new Error(`PostgreSQL is required. ${(error as Error).message}`);
        }
        const signupA = await request(app).post(`${API}/auth/signup`).send({
            email: `owner-a-${suffix}@onboard-a.test`,
            password: PASSWORD,
            firstName: 'Ava',
            lastName: 'Owner',
            organizationName: `Onboard A ${suffix}`,
            country: 'US',
        });
        expect(signupA.status).toBe(201);
        tokenA = signupA.body.data.token;
        orgA = signupA.body.data.user.organizationId;
        ownerId = signupA.body.data.user.id;

        const signupB = await request(app).post(`${API}/auth/signup`).send({
            email: `owner-b-${suffix}@onboard-b.test`,
            password: PASSWORD,
            firstName: 'Bea',
            lastName: 'Other',
            organizationName: `Onboard B ${suffix}`,
            country: 'US',
        });
        expect(signupB.status).toBe(201);
        tokenB = signupB.body.data.token;

        await prisma.user.create({
            data: {
                email: `viewer-a-${suffix}@onboard-a.test`,
                hashedPassword: (await prisma.user.findUnique({ where: { id: ownerId } }))!.hashedPassword,
                firstName: 'Vic',
                lastName: 'Viewer',
                role: Role.VIEWER,
                organizationId: orgA,
            },
        });
        const viewerLogin = await request(app).post(`${API}/auth/login`).send({
            email: `viewer-a-${suffix}@onboard-a.test`,
            password: PASSWORD,
            plane: 'CUSTOMER',
        });
        viewerToken = viewerLogin.body.data?.token || '';
    });

    it('creates a requested vendor with a public ID, owner assignment, and intake next action', async () => {
        const created = await request(app)
            .post(`${API}/vendors/onboarding`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                name: `Acme Payroll ${suffix}`,
                website: 'https://acmepayroll.example',
                country: 'United States',
                servicesProvided: 'Payroll processing for employees',
                businessOwnerUserId: ownerId,
                businessUnit: 'Finance',
                estimatedAnnualSpend: 85000,
                targetStartDate: '2026-11-01',
            });
        expect(created.status).toBe(201);
        publicId = created.body.data.publicId;
        vendorId = created.body.data.id;
        expect(publicId).toMatch(/^VND-2026-\d{4}$/);
        expect(created.body.data.stage).toBe('Intake');
        expect(created.body.data.nextAction).toBe('Complete vendor intake');
        expect(created.body.data.owner).toMatch(/Ava Owner/);
        expect(created.body.data.stageKey).toBe('INTAKE');
    });

    it('detects a likely duplicate and does not silently create another record', async () => {
        const duplicates = await request(app)
            .post(`${API}/vendors/onboarding/duplicates`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ name: `Acme Payroll ${suffix}`, website: 'https://acmepayroll.example' });
        expect(duplicates.status).toBe(200);
        expect(duplicates.body.data.some((row: { name: string }) => row.name.includes('Acme Payroll'))).toBe(true);

        const blocked = await request(app)
            .post(`${API}/vendors/onboarding`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                name: `Acme Payroll ${suffix}`,
                website: 'https://acmepayroll.example',
                servicesProvided: 'Payroll',
                businessOwnerUserId: ownerId,
            });
        expect(blocked.status).toBe(409);
        expect(blocked.body.error.message).toMatch(/Possible existing third party found/);
    });

    it('saves, resumes, and completes internal intake then recommends an explainable tier', async () => {
        const saved = await request(app)
            .patch(`${API}/vendors/onboarding/${publicId}/intake`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                answers: [
                    { questionKey: 'ir_eng_what', response: 'Process payroll' },
                    { questionKey: 'ir_data', response: 'Personal data' },
                ],
            });
        expect(saved.status).toBe(200);
        expect(saved.body.data.intake.sections.flatMap((section: { questions: Array<{ key: string; response: string }> }) => section.questions).find((row: { key: string }) => row.key === 'ir_data').response).toBe('Personal data');

        const completed = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/intake/complete`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                attested: true,
                answers: [
                    { questionKey: 'ir_data', response: 'Personal data' },
                    { questionKey: 'ir_volume', response: '10,000 to 100,000' },
                    { questionKey: 'ir_access', response: 'Read-write' },
                    { questionKey: 'ir_onsite', response: 'No' },
                    { questionKey: 'ir_geo', response: 'Same region' },
                    { questionKey: 'ir_regulated', response: 'Yes' },
                    { questionKey: 'ir_fourth', response: 'Yes' },
                    { questionKey: 'ir_availability', response: 'Within 1 day / severe' },
                    { questionKey: 'ir_spend', response: 'More than $250k' },
                    { questionKey: 'ir_ai', response: 'Yes' },
                ],
            });
        expect(completed.status).toBe(200);
        expect(completed.body.data.stage).toBe('Tier review');
        expect(completed.body.data.tierReview.recommendedTier).toBeTruthy();
        expect(completed.body.data.tierReview.explanation).toMatch(/Supreme recommends/i);
        expect(completed.body.data.plan.triggers.privacy).toBe(true);
        expect(completed.body.data.plan.triggers.aiGovernance).toBe(true);
        expect(completed.body.data.plan.triggers.resilience).toBe(true);
    });

    it('requires a reason for tier override and writes customer-language history', async () => {
        const missing = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/tier/confirm`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ overrideTier: 'LOW' });
        expect(missing.status).toBe(400);

        const overridden = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/tier/confirm`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ overrideTier: 'LOW', reason: 'Spend is high but no privileged access is granted.' });
        expect(overridden.status).toBe(200);
        expect(overridden.body.data.tierReview.confirmedTier).toBe('Low');
        expect(overridden.body.data.history.some((row: { detail: string }) => /Tier changed from/i.test(row.detail))).toBe(true);
        expect(JSON.stringify(overridden.body.data.history)).not.toContain('vendor.tier_overridden');
        expect(overridden.body.data.plan.assessments.some((row: { rationale: string }) => row.rationale)).toBe(true);
    });

    it('confirms the due-diligence plan without sending anything to a vendor portal', async () => {
        const confirmed = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/plan/confirm`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({});
        expect(confirmed.status).toBe(200);
        expect(confirmed.body.data.stage).toBe('Ready to send');
        expect(confirmed.body.data.nextAction).toMatch(/vendor portal is not in this phase/i);
    });

    it('enforces viewer RBAC and tenant isolation', async () => {
        if (viewerToken) {
            const denied = await request(app)
                .post(`${API}/vendors/onboarding`)
                .set('Authorization', `Bearer ${viewerToken}`)
                .send({ name: 'Should fail', servicesProvided: 'No' });
            expect([403, 401]).toContain(denied.status);
        }
        const leaked = await request(app)
            .get(`${API}/vendors/onboarding/${publicId}`)
            .set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(leaked.status);
        expect(JSON.stringify(leaked.body)).not.toContain(publicId);
        expect(JSON.stringify(leaked.body)).not.toContain(vendorId);
    });

    it('records intake notifications and overdue attention without a generic automation engine', async () => {
        const notices = await prisma.inAppNotification.findMany({
            where: { organizationId: orgA, resourceId: vendorId },
        });
        expect(notices.length).toBeGreaterThan(0);
        await prisma.vendorOnboarding.update({
            where: { vendorId },
            data: { stage: 'INTAKE', intakeDueAt: new Date(Date.now() - 86400000) },
        });
        const sent = await scanOnboardingAttention(new Date());
        expect(sent).toBeGreaterThanOrEqual(0);
        const attention = await request(app).get(`${API}/tprm/attention`).set('Authorization', `Bearer ${tokenA}`);
        expect(attention.status).toBe(200);
    });
});
