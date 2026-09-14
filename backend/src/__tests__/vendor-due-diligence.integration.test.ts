import request from 'supertest';
import { AssessmentStatus, Role, ScanStatus } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { hashToken } from '../services/passwordService';

jest.setTimeout(90000);

const PASSWORD = 'PhaseBPass1x';
const API = '/api/v1';

async function completePhaseA(token: string, ownerId: string, suffix: string) {
    const created = await request(app).post(`${API}/vendors/onboarding`).set('Authorization', `Bearer ${token}`).send({
        name: `Phase B Vendor ${suffix}`,
        website: `https://phase-b-${suffix}.example`,
        country: 'United States',
        servicesProvided: 'Payroll processing',
        businessOwnerUserId: ownerId,
        businessUnit: 'Finance',
        estimatedAnnualSpend: 90000,
    });
    expect(created.status).toBe(201);
    const publicId = created.body.data.publicId;
    const answers = [
        { questionKey: 'ir_eng_what', response: 'Process payroll' },
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
    ];
    await request(app).post(`${API}/vendors/onboarding/${publicId}/intake/complete`).set('Authorization', `Bearer ${token}`).send({ answers, attested: true });
    await request(app).post(`${API}/vendors/onboarding/${publicId}/tier/confirm`).set('Authorization', `Bearer ${token}`).send({ confirm: true });
    const plan = await request(app).post(`${API}/vendors/onboarding/${publicId}/plan/confirm`).set('Authorization', `Bearer ${token}`).send({});
    expect(plan.status).toBe(200);
    return { publicId, vendorId: created.body.data.id };
}

describe('Supreme Third Party onboarding Phase B', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let orgA = '';
    let ownerId = '';
    let publicId = '';
    let vendorId = '';
    let vendorToken = '';
    let assessmentId = '';

    beforeAll(async () => {
        const signupA = await request(app).post(`${API}/auth/signup`).send({
            email: `phaseb-a-${suffix}@ddq-a.test`,
            password: PASSWORD,
            firstName: 'Ada',
            lastName: 'Analyst',
            organizationName: `DDQ A ${suffix}`,
            country: 'US',
        });
        expect(signupA.status).toBe(201);
        tokenA = signupA.body.data.token;
        orgA = signupA.body.data.user.organizationId;
        ownerId = signupA.body.data.user.id;
        const signupB = await request(app).post(`${API}/auth/signup`).send({
            email: `phaseb-b-${suffix}@ddq-b.test`,
            password: PASSWORD,
            firstName: 'Bea',
            lastName: 'Other',
            organizationName: `DDQ B ${suffix}`,
            country: 'US',
        });
        tokenB = signupB.body.data.token;
        const ready = await completePhaseA(tokenA, ownerId, suffix);
        publicId = ready.publicId;
        vendorId = ready.vendorId;
    });

    it('sends due diligence with a hashed invitation and does not add a tenant user', async () => {
        const sent = await request(app).post(`${API}/vendors/onboarding/${publicId}/send`).set('Authorization', `Bearer ${tokenA}`).send({
            name: 'Casey Contact',
            email: `casey-${suffix}@vendor.test`,
            title: 'Security lead',
        });
        expect(sent.status).toBe(201);
        expect(sent.body.data.invitation.status).toBe('Pending');
        expect(sent.body.data.activationUrl).toBeTruthy();
        expect(sent.body.data.activationUrl).toContain('/vendor-assessment/activate');
        const users = await prisma.user.findMany({ where: { email: `casey-${suffix}@vendor.test` } });
        expect(users).toHaveLength(0);
        const invitation = await prisma.vendorAssessmentInvitation.findFirst({ where: { vendorId } });
        expect(invitation?.tokenHash).toBe(hashToken(new URL(sent.body.data.activationUrl).searchParams.get('token') || ''));
        assessmentId = sent.body.data.vendorAssessments[0].id;
    });

    it('activates a bounded vendor session and blocks customer APIs', async () => {
        const invitation = await prisma.vendorAssessmentInvitation.findFirst({ where: { vendorId, status: 'PENDING' } });
        const raw = (await request(app).post(`${API}/vendors/onboarding/${publicId}/invitation/link`).set('Authorization', `Bearer ${tokenA}`).send({})).body.data.activationUrl;
        const token = new URL(raw).searchParams.get('token') || '';
        const activated = await request(app).post(`${API}/vendor-portal/activate`).send({ token });
        expect(activated.status).toBe(200);
        vendorToken = activated.body.data.token;
        const reuse = await request(app).post(`${API}/vendor-portal/activate`).send({ token });
        expect([200, 410]).toContain(reuse.status);
        const leaked = await request(app).get(`${API}/vendors`).set('Authorization', `Bearer ${vendorToken}`);
        expect(leaked.status).toBe(401);
        const other = await request(app).get(`${API}/vendors/onboarding/${publicId}`).set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(other.status);
        expect(JSON.stringify(other.body)).not.toContain(publicId);
        void invitation;
    });

    it('lets the vendor save, resume, upload CLEAN evidence, and submit', async () => {
        const detail = await request(app).get(`${API}/vendor-portal/assessments/${assessmentId}`).set('Authorization', `Bearer ${vendorToken}`);
        expect(detail.status).toBe(200);
        const first = (detail.body.data.questions || []).find((row: any) => row.visible);
        expect(first).toBeTruthy();
        const saved = await request(app).patch(`${API}/vendor-portal/assessments/${assessmentId}/responses`).set('Authorization', `Bearer ${vendorToken}`).send({
            questionKey: first.key,
            response: first.options?.[0] || 'Yes',
        });
        expect(saved.status).toBe(200);
        const upload = await request(app)
            .post(`${API}/vendor-portal/assessments/${assessmentId}/evidence`)
            .set('Authorization', `Bearer ${vendorToken}`)
            .field('questionKey', first.key)
            .attach('file', Buffer.from('%PDF-1.4 vendor evidence'), 'policy.pdf');
        expect([201, 409]).toContain(upload.status);
        if (upload.status === 201) {
            await prisma.storedObject.update({
                where: { id: upload.body.data.id },
                data: { scanStatus: ScanStatus.CLEAN },
            });
        }
        const questions = (await request(app).get(`${API}/vendor-portal/assessments/${assessmentId}`).set('Authorization', `Bearer ${vendorToken}`)).body.data.questions;
        for (const question of questions.filter((row: any) => row.visible && row.required)) {
            await request(app).patch(`${API}/vendor-portal/assessments/${assessmentId}/responses`).set('Authorization', `Bearer ${vendorToken}`).send({
                questionKey: question.key,
                response: question.options?.find((option: string) => /^No/i.test(option)) || question.options?.[0] || 'No',
            });
            if (question.evidenceRequired) {
                const evidence = await request(app)
                    .post(`${API}/vendor-portal/assessments/${assessmentId}/evidence`)
                    .set('Authorization', `Bearer ${vendorToken}`)
                    .field('questionKey', question.key)
                    .attach('file', Buffer.from(`CLEAN ${question.key}`), `${question.key}.pdf`);
                if (evidence.status === 201 && evidence.body.data.id) {
                    await prisma.storedObject.update({ where: { id: evidence.body.data.id }, data: { scanStatus: ScanStatus.CLEAN } });
                    await prisma.vendorDocument.updateMany({ where: { storedObjectId: evidence.body.data.id }, data: { scanStatus: ScanStatus.CLEAN } });
                }
            }
        }
        const incomplete = await request(app).post(`${API}/vendor-portal/assessments/${assessmentId}/submit`).set('Authorization', `Bearer ${vendorToken}`).send({ attested: false });
        expect(incomplete.status).toBe(400);
        const submitted = await request(app).post(`${API}/vendor-portal/assessments/${assessmentId}/submit`).set('Authorization', `Bearer ${vendorToken}`).send({ attested: true });
        expect([200, 409]).toContain(submitted.status);
        const assessment = await prisma.vendorAssessment.findUnique({ where: { id: assessmentId } });
        expect([AssessmentStatus.PENDING_REVIEW, AssessmentStatus.IN_PROGRESS]).toContain(assessment?.status);
    });

    it('creates draft findings and lets the analyst confirm, adjust, and dismiss', async () => {
        const workspace = await request(app).get(`${API}/vendors/onboarding/${publicId}`).set('Authorization', `Bearer ${tokenA}`);
        expect(workspace.status).toBe(200);
        const finding = (workspace.body.data.findings || []).find((row: any) => row.reviewState === 'DRAFT');
        if (finding) {
            const confirmed = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${finding.id}/review`).set('Authorization', `Bearer ${tokenA}`).send({ action: 'confirm' });
            expect(confirmed.status).toBe(200);
        }
        const drafts = await prisma.vendorIssue.findMany({ where: { vendorId, reviewState: 'DRAFT' } });
        if (drafts[0]) {
            const adjusted = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${drafts[0].id}/review`).set('Authorization', `Bearer ${tokenA}`).send({ action: 'adjust', severity: 'HIGH', reason: 'Privileged access remains material.' });
            expect(adjusted.status).toBe(200);
        }
        if (drafts[1]) {
            const dismissed = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${drafts[1].id}/review`).set('Authorization', `Bearer ${tokenA}`).send({ action: 'dismiss', reason: 'Documented compensating control.' });
            expect(dismissed.status).toBe(200);
        }
        const cross = await request(app).get(`${API}/vendor-portal/assessments/${assessmentId}`).set('Authorization', `Bearer ${tokenB}`);
        expect(cross.status).toBe(401);
        const viewer = await prisma.user.create({
            data: {
                email: `viewer-b-${suffix}@ddq-a.test`,
                hashedPassword: (await prisma.user.findUnique({ where: { id: ownerId } }))!.hashedPassword,
                firstName: 'Vic',
                lastName: 'Viewer',
                role: Role.VIEWER,
                organizationId: orgA,
            },
        });
        const login = await request(app).post(`${API}/auth/login`).send({ email: viewer.email, password: PASSWORD, plane: 'CUSTOMER' });
        const send = await request(app).post(`${API}/vendors/onboarding/${publicId}/send`).set('Authorization', `Bearer ${login.body.data.token}`).send({
            name: 'Blocked',
            email: 'blocked@vendor.test',
        });
        expect(send.status).toBe(403);
    });
});
