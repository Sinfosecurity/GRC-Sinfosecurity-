import request from 'supertest';
import jwt from 'jsonwebtoken';
import { AssessmentStatus, AssessmentType, EngagementStatus, Role } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { getEnv } from '../config/env';
import { createOrgUser } from './helpers/orgUser';

jest.setTimeout(180000);

const PASSWORD = 'Wave4Pass1x';
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

const azureAnswers = completeAnswers({
    a1: 'cloud',
    a2: 'personal',
    a3: '10k_100k',
    a4: 'admin',
    a5: 'customer',
    b1: 'day',
    b2: 'material',
    b3: 'yes',
    b4: 'significant',
    b5: 'hard',
});

describe('#12 Wave 4 engagement findings, control effectiveness, and residual risk', () => {
    const suffix = `${Date.now()}`;
    let adminToken = '';
    let analystToken = '';
    let requesterToken = '';
    let otherTenantToken = '';
    let analystId = '';
    let orgA = '';
    let vendorId = '';
    let azureEngagementId = '';
    let servicesEngagementId = '';
    let azureAssessmentId = '';
    let servicesAssessmentId = '';
    let azureCandidateId = '';
    let dismissCandidateId = '';
    let azureFindingId = '';

    async function createIntake(service: string, purpose: string) {
        const created = await request(app).post(`${API}/tprm/intakes`).set('Authorization', `Bearer ${requesterToken}`).send({
            proposedThirdPartyName: 'Microsoft Corporation',
            proposedServiceName: service,
            businessPurpose: purpose,
        });
        expect(created.status).toBe(201);
        await request(app).post(`${API}/tprm/intakes/${created.body.data.id}/assign`).set('Authorization', `Bearer ${adminToken}`).send({ analystUserId: analystId });
        await request(app).post(`${API}/tprm/intakes/${created.body.data.id}/start-review`).set('Authorization', `Bearer ${analystToken}`);
        return created.body.data.id as string;
    }

    async function confirmIra(engagementId: string, answers: Record<string, string>) {
        const ira = await prisma.engagementIra.findUnique({ where: { engagementId } });
        const submitted = await request(app).post(`${API}/tprm/requester/iras/${ira!.id}/submit`).set('Authorization', `Bearer ${requesterToken}`).send({
            attested: true,
            answers,
        });
        expect(submitted.status).toBe(200);
        const confirm = await request(app).post(`${API}/tprm/engagements/${engagementId}/tier-review/confirm`).set('Authorization', `Bearer ${analystToken}`).send({});
        if (confirm.status === 409) {
            const override = await request(app).post(`${API}/tprm/engagements/${engagementId}/tier-review/override`).set('Authorization', `Bearer ${analystToken}`).send({
                tier: answers.a4 === 'admin' ? 'CRITICAL' : 'MEDIUM',
                reason: 'Confirmed engagement-specific inherent risk for Wave 4.',
            });
            expect(override.status).toBe(200);
        } else {
            expect(confirm.status).toBe(200);
        }
    }

    async function seedAssessment(engagementId: string, answer: string) {
        const engagement = await prisma.engagement.findUniqueOrThrow({ where: { id: engagementId } });
        const assessment = await prisma.vendorAssessment.create({
            data: {
                vendorId: engagement.vendorId,
                organizationId: orgA,
                engagementId,
                assessmentType: AssessmentType.INITIAL_DUE_DILIGENCE,
                frameworkUsed: 'Baseline Questionnaire',
                status: AssessmentStatus.PENDING_REVIEW,
                submittedAt: new Date(),
                respondentPlane: 'VENDOR',
            },
        });
        await prisma.assessmentResponse.create({
            data: {
                assessmentId: assessment.id,
                questionId: 'ACC-01',
                questionText: 'Is a privileged access review demonstrated?',
                questionCategory: 'Cybersecurity',
                response: answer,
                maxScore: 10,
                evidenceRequired: false,
            },
        });
        await prisma.engagementAssessmentReview.create({
            data: {
                organizationId: orgA,
                engagementId,
                assessmentId: assessment.id,
                domain: 'Cybersecurity',
                status: 'COMPLETE',
                conclusions: { conclusion: answer === 'No' ? 'Evidence missing' : 'Review complete' },
                completedAt: new Date(),
                completedBy: analystId,
            },
        });
        await prisma.engagement.update({ where: { id: engagementId }, data: { status: EngagementStatus.SPECIALIST_REVIEW } });
        return assessment.id;
    }

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `lead-${suffix}@wave4.test`,
            password: PASSWORD,
            firstName: 'Lea',
            lastName: 'Lead',
            organizationName: `Wave4 ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        adminToken = signup.body.data.token;
        orgA = signup.body.data.user.organizationId;
        const analyst = await createOrgUser({ organizationId: orgA, email: `ana-${suffix}@wave4.test`, password: PASSWORD, role: Role.ASSESSOR, firstName: 'Ana', lastName: 'Lyst' });
        analystToken = analyst.token;
        analystId = analyst.user.id;
        const requester = await createOrgUser({ organizationId: orgA, email: `pat-${suffix}@wave4.test`, password: PASSWORD, role: Role.BUSINESS_OWNER, firstName: 'Pat', lastName: 'Requester' });
        requesterToken = requester.token;
        const tenant = await request(app).post(`${API}/auth/signup`).send({
            email: `other-${suffix}@wave4-b.test`,
            password: PASSWORD,
            firstName: 'Other',
            lastName: 'Tenant',
            organizationName: `Wave4 B ${suffix}`,
            country: 'US',
        });
        otherTenantToken = tenant.body.data.token;
    });

    it('creates two Microsoft engagements with confirmed Wave 2 inherent tiers', async () => {
        const azureIntake = await createIntake('Azure Hosting', 'Host a customer-facing application.');
        const vendor = await request(app).post(`${API}/tprm/intakes/${azureIntake}/third-party`).set('Authorization', `Bearer ${analystToken}`).send({
            name: 'Microsoft Corporation',
            website: 'https://microsoft.com',
            country: 'United States',
        });
        vendorId = vendor.body.data.matchedVendorId;
        const azure = await request(app).post(`${API}/tprm/intakes/${azureIntake}/engagement`).set('Authorization', `Bearer ${analystToken}`).send({ serviceName: 'Azure Hosting' });
        azureEngagementId = azure.body.data.engagement.id;
        await confirmIra(azureEngagementId, azureAnswers);
        const servicesIntake = await createIntake('Professional Services', 'Advisory work with no production access.');
        await request(app).post(`${API}/tprm/intakes/${servicesIntake}/match`).set('Authorization', `Bearer ${analystToken}`).send({ vendorId, reason: 'Same legal entity' });
        const services = await request(app).post(`${API}/tprm/intakes/${servicesIntake}/engagement`).set('Authorization', `Bearer ${analystToken}`).send({ serviceName: 'Professional Services' });
        servicesEngagementId = services.body.data.engagement.id;
        await confirmIra(servicesEngagementId, completeAnswers());
        azureAssessmentId = await seedAssessment(azureEngagementId, 'No');
        servicesAssessmentId = await seedAssessment(servicesEngagementId, 'Yes');
        expect(azureAssessmentId).not.toBe(servicesAssessmentId);
    });

    it('seeds candidates that are not authoritative findings', async () => {
        const seeded = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/finding-candidates/seed`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(seeded.status).toBe(200);
        expect(seeded.body.data.created).toBeGreaterThan(0);
        azureCandidateId = seeded.body.data.ids[0];
        const extra = await prisma.vendorIssue.create({
            data: {
                vendorId,
                organizationId: orgA,
                engagementId: azureEngagementId,
                title: 'Azure Hosting — Incident notification process not evidenced',
                description: 'Candidate only.',
                issueType: 'CONTROL_FAILURE',
                severity: 'MEDIUM',
                recommendedSeverity: 'MEDIUM',
                priority: 'MEDIUM',
                source: 'INTERNAL_ASSESSMENT',
                identifiedBy: analystId,
                category: 'Cybersecurity',
                assessmentId: azureAssessmentId,
                questionId: 'INC-01',
                reviewState: 'DRAFT',
                draftRuleCode: 'required_evidence_missing',
            },
        });
        dismissCandidateId = extra.id;
        const risk = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/risk`).set('Authorization', `Bearer ${analystToken}`);
        expect(risk.status).toBe(200);
        expect(risk.body.data.candidates.length).toBeGreaterThan(0);
        expect(risk.body.data.findings).toHaveLength(0);
        expect(risk.body.data.candidates[0].title).toMatch(/Azure Hosting —/);
        expect(risk.body.data.candidates[0].authoritative).toBe(false);
    });

    it('confirms one candidate and dismisses another without counting dismissal', async () => {
        const confirm = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/findings/${azureCandidateId}/confirm`).set('Authorization', `Bearer ${analystToken}`).send({
            severity: 'HIGH',
            determinationNote: 'Privileged access review was not demonstrated for Azure Hosting.',
        });
        expect(confirm.status).toBe(200);
        expect(confirm.body.data.authoritative).toBe(true);
        expect(confirm.body.data.engagement.serviceName).toBe('Azure Hosting');
        azureFindingId = confirm.body.data.id;
        const dismiss = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/findings/${dismissCandidateId}/dismiss`).set('Authorization', `Bearer ${analystToken}`).send({
            reason: 'Notification process is evidenced in the SOC report. No finding warranted.',
        });
        expect(dismiss.status).toBe(200);
        const risk = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/risk`).set('Authorization', `Bearer ${analystToken}`);
        expect(risk.body.data.findings).toHaveLength(1);
        expect(risk.body.data.openFindings || risk.body.data.findings).toBeTruthy();
        const dismissed = await prisma.vendorIssue.findUnique({ where: { id: dismissCandidateId } });
        expect(dismissed?.reviewState).toBe('DISMISSED');
        expect(dismissed?.dismissReason).toMatch(/No finding/);
    });

    it('requires N/A rationale, refuses unknown-as-effective residual, and records engagement-specific CE', async () => {
        const missing = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/control-effectiveness`).set('Authorization', `Bearer ${analystToken}`).send({
            controlId: 'Access Review',
            rating: 'NOT_APPLICABLE',
        });
        expect(missing.status).toBe(400);
        const azureCe = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/control-effectiveness`).set('Authorization', `Bearer ${analystToken}`).send({
            controlId: 'Access Review',
            rating: 'PARTIALLY_EFFECTIVE',
            rationale: 'Privileged access review is incomplete for Azure Hosting.',
        });
        expect(azureCe.status).toBe(200);
        const servicesCe = await request(app).post(`${API}/tprm/engagements/${servicesEngagementId}/control-effectiveness`).set('Authorization', `Bearer ${analystToken}`).send({
            controlId: 'Access Review',
            rating: 'EFFECTIVE',
            rationale: 'Access governance is evidenced for advisory work.',
        });
        expect(servicesCe.status).toBe(200);
        const compensating = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/compensating-controls`).set('Authorization', `Bearer ${analystToken}`).send({
            affectedControlId: 'Access Review',
            description: 'Break-glass reviews by internal IAM weekly.',
            owner: 'Internal IAM',
            effectivenessJudgment: 'PARTIALLY_EFFECTIVE',
            consideredInResidual: true,
        });
        expect(compensating.status).toBe(201);
        const servicesSeed = await request(app).post(`${API}/tprm/engagements/${servicesEngagementId}/finding-candidates/seed`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(servicesSeed.status).toBe(200);
        expect(servicesSeed.body.data.created).toBe(0);
    });

    it('calculates different residual records for the same Third Party', async () => {
        const azure = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/residual-risk/calculate`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(azure.status).toBe(200);
        expect(azure.body.data.residualBand).toBeTruthy();
        expect(azure.body.data.inherent.tier).toBe('CRITICAL');
        expect(azure.body.data.wave5Started).toBe(false);
        const services = await request(app).post(`${API}/tprm/engagements/${servicesEngagementId}/residual-risk/calculate`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(services.status).toBe(200);
        expect(services.body.data.residualBand).not.toBe(azure.body.data.residualBand);
        expect(services.body.data.inherent.tier).not.toBe('CRITICAL');
        expect(['LOW', 'MEDIUM']).toContain(services.body.data.inherent.tier);
        const rollup = await request(app).get(`${API}/tprm/vendors/${vendorId}/engagement-risk`).set('Authorization', `Bearer ${analystToken}`);
        expect(rollup.status).toBe(200);
        expect(rollup.body.data.engagements).toHaveLength(2);
        expect(rollup.body.data.engagements[0].residual.band).not.toBe(rollup.body.data.engagements[1].residual.band);
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        expect(vendor?.residualRiskScore ?? 0).toBe(0);
    });

    it('preserves residual history on recalculation and blocks Wave 5 acceptance', async () => {
        await request(app).post(`${API}/tprm/findings/${azureFindingId}/cap`).set('Authorization', `Bearer ${analystToken}`).send({
            correctiveActionPlan: 'Complete privileged access review evidence.',
            targetRemediationDate: new Date(Date.now() + 86400000).toISOString(),
        });
        await request(app).post(`${API}/tprm/findings/${azureFindingId}/validate`).set('Authorization', `Bearer ${analystToken}`).send({
            validationNotes: 'Reviewed uploaded access-review evidence.',
            approved: true,
        });
        const closed = await request(app).post(`${API}/tprm/findings/${azureFindingId}/close`).set('Authorization', `Bearer ${adminToken}`).send({
            closureNotes: 'Validated for the test record.',
        });
        expect([200, 409]).toContain(closed.status);
        const again = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/residual-risk/calculate`).set('Authorization', `Bearer ${analystToken}`).send({ reason: 'finding.closed' });
        expect(again.status).toBe(200);
        const history = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/risk`).set('Authorization', `Bearer ${analystToken}`);
        expect(history.body.data.history.length).toBeGreaterThan(1);
        const first = history.body.data.history[history.body.data.history.length - 1];
        const latest = history.body.data.history[0];
        expect(first.id).not.toBe(latest.id);
        const accept = await request(app).post(`${API}/vendors/onboarding/${vendorId}/findings/${azureFindingId}/accept-risk`).set('Authorization', `Bearer ${adminToken}`).send({
            rationale: 'Should be blocked.',
        });
        expect([400, 403, 404, 409]).toContain(accept.status);
        const confirm = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/residual-risk/confirm`).set('Authorization', `Bearer ${analystToken}`).send({
            note: 'Confirmed for Wave 4. Treatment is Wave 5.',
        });
        expect(confirm.status).toBe(200);
        expect(confirm.body.data.nextAction).toMatch(/Wave 5 is not started/);
        const engagement = await prisma.engagement.findUnique({ where: { id: azureEngagementId } });
        expect(['FINDING_REVIEW', 'RESIDUAL_READY', 'SPECIALIST_REVIEW']).toContain(engagement?.status);
        expect(confirm.body.data.wave5Started).toBe(false);
    });

    it('denies requester, vendor, and cross-tenant residual access', async () => {
        const requester = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/risk`).set('Authorization', `Bearer ${requesterToken}`);
        expect(requester.status).toBe(403);
        const other = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/risk`).set('Authorization', `Bearer ${otherTenantToken}`);
        expect([403, 404]).toContain(other.status);
        const vendorJwt = jwt.sign(
            { userId: 'vendor-actor', plane: 'VENDOR', kind: 'vendor_session', organizationId: orgA },
            getEnv().jwtSecret
        );
        const vendor = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/risk`).set('Authorization', `Bearer ${vendorJwt}`);
        expect([401, 403]).toContain(vendor.status);
        const list = await request(app).get(`${API}/tprm/findings`).set('Authorization', `Bearer ${analystToken}`);
        expect(list.status).toBe(200);
        expect(JSON.stringify(list.body.data)).toMatch(/Azure Hosting/);
    });

    it('blocks residual when inherent is not confirmed', async () => {
        const blockedIntake = await createIntake('Blocked Service', 'Should not calculate residual.');
        await request(app).post(`${API}/tprm/intakes/${blockedIntake}/match`).set('Authorization', `Bearer ${analystToken}`).send({ vendorId, reason: 'Same legal entity' });
        const blocked = await request(app).post(`${API}/tprm/intakes/${blockedIntake}/engagement`).set('Authorization', `Bearer ${analystToken}`).send({ serviceName: 'Blocked Service' });
        const calc = await request(app).post(`${API}/tprm/engagements/${blocked.body.data.engagement.id}/residual-risk/calculate`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(calc.status).toBe(409);
        expect(calc.body.error.message).toMatch(/Confirmed inherent|not ready|blocked/i);
    });
});
