import request from 'supertest';
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

    it('saves Unknown honestly, allows intake submit, and blocks send until scope is confirmed', async () => {
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

        const unknownAnswers = canonicalIntakeAnswers({
            ir_04: 'Unknown',
            ir_05: 'Low',
            scope_privileged_network: 'Unknown',
        });
        const saved = await request(app)
            .patch(`${API}/vendors/onboarding/${publicId}/intake`)
            .set('Authorization', `Bearer ${token}`)
            .send({ answers: unknownAnswers });
        expect(saved.status).toBe(200);
        expect(saved.body.data.stageKey).toBe('INTAKE');
        const persisted = saved.body.data.intake.sections
            .flatMap((section: { questions: Array<{ key: string; response: string }> }) => section.questions)
            .find((row: { key: string }) => row.key === 'scope_privileged_network');
        expect(persisted.response).toBe('Unknown');
        expect(saved.body.data.questionnairePlan.sendBlocked).toBe(true);
        expect(saved.body.data.questionnairePlan.sendBlockMessage).toMatch(/1 pack requires scope confirmation/i);

        const completed = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/intake/complete`)
            .set('Authorization', `Bearer ${token}`)
            .send({ attested: true, answers: unknownAnswers });
        expect(completed.status).toBe(200);
        expect(completed.body.data.stageKey).toBe('TIER_REVIEW');
        expect(completed.body.data.questionnairePlan.sendBlocked).toBe(true);

        const confirmed = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/tier/confirm`)
            .set('Authorization', `Bearer ${token}`)
            .send({ confirm: true });
        expect(confirmed.status).toBe(200);

        const blockedPlan = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/plan/confirm`)
            .set('Authorization', `Bearer ${token}`)
            .send({});
        expect(blockedPlan.status).toBe(409);
        expect(blockedPlan.body.error.message).toMatch(/pack requires scope confirmation/i);

        const blockedSend = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/send`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Vendor Contact', email: `contact-${suffix}@vendor.test` });
        expect(blockedSend.status).toBe(409);
        expect(blockedSend.body.error.message).toMatch(/plan must be confirmed|pack requires scope confirmation/i);
    });

    it('recalculates packs and allows send after the analyst resolves Confirm scope', async () => {
        const workspace = await request(app).get(`${API}/vendors/onboarding/${publicId}`).set('Authorization', `Bearer ${token}`);
        const unresolved = (workspace.body.data.questionnairePlan?.packs || []).filter((row: { state: string }) => row.state === 'CONFIRM_SCOPE');
        expect(unresolved.length).toBeGreaterThan(0);
        const plan = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/plan/confirm`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                reason: 'Vendor receives production administrative access.',
                packDecisions: unresolved.map((row: { key: string }) => ({
                    key: row.key,
                    state: row.key === 'privileged-network' ? 'INCLUDED' : 'EXCLUDED',
                    reason: 'Vendor receives production administrative access.',
                })),
            });
        expect(plan.status).toBe(200);
        expect(plan.body.data.stageKey).toBe('READY_TO_SEND');
        expect(plan.body.data.questionnairePlan.sendBlocked).toBe(false);
        expect(JSON.stringify(plan.body.data.questionnairePlan.packs)).toMatch(/privileged-network/i);
        const privileged = plan.body.data.questionnairePlan.packs.find((row: { key: string }) => row.key === 'privileged-network');
        expect(privileged.originalScopeAnswer).toBe('UNKNOWN');
        expect(privileged.state).toBe('INCLUDED');

        const sent = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/send`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Vendor Contact', email: `contact-ok-${suffix}@vendor.test` });
        expect([200, 201]).toContain(sent.status);
        expect(sent.body.data.plan.pin.catalogVersion).toBe('workbook-1.0.0');
        expect(sent.body.data.plan.pin.includedPacks).toEqual(expect.arrayContaining(['baseline', 'privileged-network']));
    });
});
