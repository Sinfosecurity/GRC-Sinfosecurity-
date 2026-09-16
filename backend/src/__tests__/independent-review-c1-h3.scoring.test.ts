/**
 * C-1 / H-3: authoritative inherent, control source, floors, and history.
 */
import request from 'supertest';
import { AssessmentStatus, AssessmentType, VendorIssueStatus, VendorTier } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { explainableRiskService } from '../services/explainableRiskService';
import { recommendTierFromIntake } from '../services/vendorOnboardingScoring';
import { canonicalIntakeAnswers } from './helpers/canonicalIntake';
import vendorIssueService from '../services/vendorIssueService';

jest.setTimeout(90000);

const PASSWORD = 'ScorePass1x';
const API = '/api/v1';

const LOW_ANSWERS = canonicalIntakeAnswers({
    ir_01: 'Low',
    ir_02: 'Low',
    ir_03: 'Low',
    ir_04: 'Low',
    ir_05: 'Low',
    ir_06: 'Low',
    ir_07: 'Low',
    ir_08: 'Low',
    ir_09: 'Low',
    ir_10: 'Low',
    ir_11: 'Low',
    ir_12: 'Low',
    ir_13: 'Low',
    ir_14: 'Low',
    ir_15: 'Low',
    ir_eng_data: 'Public',
});

const HIGH_ANSWERS = canonicalIntakeAnswers({
    ir_01: 'High',
    ir_02: 'High',
    ir_03: 'High',
    ir_04: 'Low',
    ir_05: 'High',
    ir_06: 'High',
    ir_07: 'High',
    ir_08: 'High',
    ir_09: 'High',
    ir_10: 'High',
    ir_11: 'High',
    ir_12: 'High',
    ir_13: 'Low',
    ir_14: 'High',
    ir_15: 'High',
    ir_eng_data: 'Confidential',
});

const FLOOR_ANSWERS = canonicalIntakeAnswers({
    ir_04: 'High',
    ir_eng_data: 'Cardholder (PCI)',
});

describe('independent review C-1 / H-3 scoring and tier integrity', () => {
    const suffix = `${Date.now()}`;
    let token = '';
    let orgId = '';
    let ownerId = '';
    let lowVendorId = '';
    let highVendorId = '';
    let floorVendorId = '';
    let floorPublicId = '';

    async function requestVendor(name: string) {
        const created = await request(app)
            .post(`${API}/vendors/onboarding`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name,
                servicesProvided: 'Scoring fixture',
                businessOwnerUserId: ownerId,
            });
        expect(created.status).toBe(201);
        return created.body.data as { id: string; publicId: string };
    }

    async function completeIntake(publicId: string, answers: Array<{ questionKey: string; response: string }>) {
        const completed = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/intake/complete`)
            .set('Authorization', `Bearer ${token}`)
            .send({ attested: true, answers });
        expect(completed.status).toBe(200);
        return completed.body.data;
    }

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `c1h3-${suffix}@score-a.test`,
            password: PASSWORD,
            firstName: 'Score',
            lastName: 'Owner',
            organizationName: `Score Org ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        token = signup.body.data.token;
        orgId = signup.body.data.user.organizationId;
        ownerId = signup.body.data.user.id;

        const low = await requestVendor(`Low Exposure ${suffix}`);
        const high = await requestVendor(`High Exposure ${suffix}`);
        const floor = await requestVendor(`Floor Critical ${suffix}`);
        lowVendorId = low.id;
        highVendorId = high.id;
        floorVendorId = floor.id;
        floorPublicId = floor.publicId;
        await completeIntake(low.publicId, LOW_ANSWERS);
        await completeIntake(high.publicId, HIGH_ANSWERS);
        await completeIntake(floor.publicId, FLOOR_ANSWERS);
    });

    afterAll(async () => {
        if (!orgId) return;
        await prisma.scoreCalculation.deleteMany({ where: { organizationId: orgId } });
        await prisma.assessmentResponse.deleteMany({ where: { assessment: { organizationId: orgId } } });
        await prisma.vendorAssessment.deleteMany({ where: { organizationId: orgId } });
        await prisma.vendorIssue.deleteMany({ where: { organizationId: orgId } });
        await prisma.vendorOnboarding.deleteMany({ where: { organizationId: orgId } });
        await prisma.vendor.deleteMany({ where: { organizationId: orgId } });
        await prisma.refreshToken.deleteMany({ where: { user: { organizationId: orgId } } });
        await prisma.user.deleteMany({ where: { organizationId: orgId } });
        await prisma.organization.deleteMany({ where: { id: orgId } });
        await prisma.$disconnect();
    });

    it('does not collapse different intake exposure to a placeholder-derived score', async () => {
        const expectedLow = recommendTierFromIntake(LOW_ANSWERS);
        const expectedHigh = recommendTierFromIntake(HIGH_ANSWERS);
        expect(expectedLow.inherentRisk).not.toBe(expectedHigh.inherentRisk);

        const low = await prisma.vendor.findUnique({ where: { id: lowVendorId } });
        const high = await prisma.vendor.findUnique({ where: { id: highVendorId } });
        expect(low?.inherentRiskScore).toBe(expectedLow.inherentRisk);
        expect(high?.inherentRiskScore).toBe(expectedHigh.inherentRisk);
        expect(low?.inherentRiskScore).not.toBe(43);
        expect(high?.inherentRiskScore).not.toBe(low?.inherentRiskScore);
        expect(low?.residualRiskScore).toBe(low?.inherentRiskScore);
        expect(high?.residualRiskScore).toBe(high?.inherentRiskScore);
        expect(low?.tier).toBe(expectedLow.recommendedTier);
        expect(high?.tier).toBe(expectedHigh.recommendedTier);
    });

    it('does not treat completed intake as control credit', async () => {
        const scored = await explainableRiskService.recalculate(orgId, highVendorId);
        expect(scored.controlEffectiveness).toBe(0);
        expect(scored.residualRisk).toBe(scored.inherentRisk);
        expect(scored.controlAssessmentId).toBeNull();
        expect(scored.scoreVersion).toBe('supreme-risk-1.2.0');
    });

    it('rejects below-floor confirmation and legacy update', async () => {
        const denied = await request(app)
            .post(`${API}/vendors/onboarding/${floorPublicId}/tier/confirm`)
            .set('Authorization', `Bearer ${token}`)
            .send({ overrideTier: 'LOW', reason: 'n/a' });
        expect(denied.status).toBe(409);

        const confirmed = await request(app)
            .post(`${API}/vendors/onboarding/${floorPublicId}/tier/confirm`)
            .set('Authorization', `Bearer ${token}`)
            .send({ confirm: true });
        expect(confirmed.status).toBe(200);
        expect(confirmed.body.data.tierReview.confirmedTier).toBe('Critical');

        const legacy = await request(app)
            .put(`${API}/vendors/${floorVendorId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ tier: 'MEDIUM' });
        expect(legacy.status).toBe(409);
        const still = await prisma.vendor.findUnique({ where: { id: floorVendorId } });
        expect(still?.tier).toBe(VendorTier.CRITICAL);

        const forged = await request(app)
            .put(`${API}/vendors/${highVendorId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ inherentRiskScore: 1, residualRiskScore: 1, tier: 'LOW' });
        expect(forged.status).toBe(409);
        const high = await prisma.vendor.findUnique({ where: { id: highVendorId } });
        expect(high?.tier).not.toBe(VendorTier.LOW);
        expect(high?.inherentRiskScore).not.toBe(1);
        expect(high?.residualRiskScore).not.toBe(1);

        const workspace = await request(app)
            .get(`${API}/vendors/onboarding/${floorPublicId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(workspace.status).toBe(200);
        expect(workspace.body.data.tierKey || workspace.body.data.tier).toBeTruthy();
        expect(workspace.body.data.inherentRiskScore).toBe(still?.inherentRiskScore);
        expect(workspace.body.data.residualRiskScore).toBe(still?.residualRiskScore);
        expect(workspace.body.data.lifecycle.residualRisk).toBe(still?.residualRiskScore);

        const stats = await request(app)
            .get(`${API}/vendors/statistics`)
            .set('Authorization', `Bearer ${token}`);
        expect(stats.status).toBe(200);
        expect(stats.body.summary.criticalVendors).toBeGreaterThanOrEqual(1);
        expect(stats.body.tierCounts.CRITICAL).toBe(stats.body.summary.criticalVendors);
    });

    it('uses reviewed due-diligence answers, not intake, for residual and preserves history', async () => {
        const before = await explainableRiskService.recalculate(orgId, highVendorId);
        const historyA = await prisma.scoreCalculation.findMany({ where: { organizationId: orgId, vendorId: highVendorId } });

        const assessment = await prisma.vendorAssessment.create({
            data: {
                organizationId: orgId,
                vendorId: highVendorId,
                assessmentType: AssessmentType.ANNUAL_REVIEW,
                status: AssessmentStatus.COMPLETED,
                respondentPlane: 'VENDOR',
                completedAt: new Date(),
                overallScore: 10,
                responses: {
                    create: [{
                        questionId: 'ctrl-1',
                        questionText: 'MFA?',
                        questionCategory: 'Access',
                        response: 'No',
                        score: 2,
                        maxScore: 10,
                        weight: 1,
                    }],
                },
            },
        });

        const afterWeak = await explainableRiskService.recalculate(orgId, highVendorId);
        expect(afterWeak.controlAssessmentId).toBe(assessment.id);
        expect(afterWeak.controlEffectiveness).toBeGreaterThan(0);
        expect(afterWeak.controlEffectiveness).toBeLessThan(50);
        expect(afterWeak.inherentRisk).toBe(before.inherentRisk);
        expect(afterWeak.residualRisk).toBeLessThan(before.residualRisk);

        await prisma.assessmentResponse.updateMany({
            where: { assessmentId: assessment.id },
            data: { response: 'Yes', score: 9 },
        });
        const afterStrong = await explainableRiskService.recalculate(orgId, highVendorId);
        expect(afterStrong.residualRisk).toBeLessThanOrEqual(afterWeak.residualRisk);
        expect(afterStrong.inherentRisk).toBe(before.inherentRisk);

        const historyB = await prisma.scoreCalculation.findMany({ where: { organizationId: orgId, vendorId: highVendorId } });
        expect(historyB.length).toBeGreaterThan(historyA.length);
        const first = historyA[0];
        const preserved = await prisma.scoreCalculation.findUnique({ where: { id: first.id } });
        expect(preserved?.inherentRisk).toBe(first.inherentRisk);
        expect(preserved?.residualRisk).toBe(first.residualRisk);
    });

    it('does not lower residual solely because risk is accepted', async () => {
        const before = await prisma.vendor.findUnique({ where: { id: highVendorId } });
        const issue = await vendorIssueService.createIssue({
            vendorId: highVendorId,
            organizationId: orgId,
            title: 'Accepted finding',
            description: 'Governance only',
            issueType: 'AUDIT_FINDING',
            severity: 'HIGH' as any,
            priority: 'MEDIUM',
            source: 'INTERNAL_ASSESSMENT',
            identifiedBy: ownerId,
            category: 'Security',
        });
        await explainableRiskService.recalculate(orgId, highVendorId);
        const withFinding = await prisma.vendor.findUnique({ where: { id: highVendorId } });
        await prisma.vendorIssue.update({
            where: { id: issue.id },
            data: {
                status: VendorIssueStatus.RISK_ACCEPTED,
                closedBy: ownerId,
                closedAt: new Date(),
                closureNotes: 'Accepted for go-live',
            },
        });
        const afterAccept = await explainableRiskService.recalculate(orgId, highVendorId);
        expect(afterAccept.residualRisk).toBe(withFinding?.residualRiskScore);
        expect(afterAccept.residualRisk).toBeGreaterThanOrEqual(before?.residualRiskScore || 0);
        const stillAccepted = await prisma.vendorIssue.findUnique({ where: { id: issue.id } });
        expect(stillAccepted?.status).toBe(VendorIssueStatus.RISK_ACCEPTED);
    });

    it('proves monotonic matrix A-F from the approved methodology', async () => {
        const cases = [
            { answers: LOW_ANSWERS, control: 'Yes' as const },
            { answers: LOW_ANSWERS, control: 'No' as const },
            { answers: HIGH_ANSWERS, control: 'Yes' as const },
            { answers: HIGH_ANSWERS, control: 'No' as const },
            { answers: FLOOR_ANSWERS, control: 'Yes' as const },
            { answers: FLOOR_ANSWERS, control: 'No' as const },
        ];
        const results = [];
        for (const [index, item] of cases.entries()) {
            const intake = recommendTierFromIntake(item.answers);
            const vendor = await requestVendor(`Matrix ${index} ${suffix}`);
            await completeIntake(vendor.publicId, item.answers);
            await prisma.vendorAssessment.create({
                data: {
                    organizationId: orgId,
                    vendorId: vendor.id,
                    assessmentType: AssessmentType.ANNUAL_REVIEW,
                    status: AssessmentStatus.COMPLETED,
                    respondentPlane: 'VENDOR',
                    completedAt: new Date(),
                    responses: {
                        create: [{
                            questionId: `m-${index}`,
                            questionText: 'Control',
                            questionCategory: 'Access',
                            response: item.control,
                            maxScore: 10,
                            weight: 1,
                        }],
                    },
                },
            });
            const scored = await explainableRiskService.recalculate(orgId, vendor.id);
            results.push({ ...scored, recommendedTier: intake.recommendedTier });
        }
        expect(results[0].residualRisk).toBeLessThanOrEqual(results[1].residualRisk);
        expect(results[2].residualRisk).toBeLessThanOrEqual(results[3].residualRisk);
        expect(results[0].inherentRisk).toBeLessThanOrEqual(results[2].inherentRisk);
        expect(results[4].recommendedTier).toBe(VendorTier.CRITICAL);
        expect(results[5].recommendedTier).toBe(VendorTier.CRITICAL);
        const floorVendor = await prisma.vendor.findUnique({ where: { id: floorVendorId } });
        expect(floorVendor?.tier).toBe(VendorTier.CRITICAL);
    });
});
