import request from 'supertest';
import { EngagementResidualStatus, EngagementStatus, Role, VendorIssueStatus } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { createOrgUser } from './helpers/orgUser';

jest.setTimeout(180000);

const PASSWORD = 'Wave7Pass1x';
const API = '/api/v1';

const ANSWERS = {
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
};

describe('#12 Wave 7 engagement reassessment', () => {
    const suffix = `${Date.now()}`;
    let analystToken = '';
    let managerToken = '';
    let requesterToken = '';
    let otherTenantToken = '';
    let orgA = '';
    let vendorId = '';
    let azureId = '';
    let m365Id = '';
    let residualId = '';
    let recommendationId = '';
    let cycleId = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `lead-${suffix}@wave7.test`,
            password: PASSWORD,
            firstName: 'Lea',
            lastName: 'Lead',
            organizationName: `Wave7 ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        orgA = signup.body.data.user.organizationId;
        const analyst = await createOrgUser({ organizationId: orgA, email: `ana-${suffix}@wave7.test`, password: PASSWORD, role: Role.ASSESSOR, firstName: 'Ana', lastName: 'Lyst' });
        analystToken = analyst.token;
        const manager = await createOrgUser({ organizationId: orgA, email: `rm-${suffix}@wave7.test`, password: PASSWORD, role: Role.RISK_MANAGER, firstName: 'Riley', lastName: 'Manager' });
        managerToken = manager.token;
        const requester = await createOrgUser({ organizationId: orgA, email: `pat-${suffix}@wave7.test`, password: PASSWORD, role: Role.BUSINESS_OWNER, firstName: 'Pat', lastName: 'Requester' });
        requesterToken = requester.token;
        const tenant = await request(app).post(`${API}/auth/signup`).send({
            email: `other-${suffix}@wave7-b.test`,
            password: PASSWORD,
            firstName: 'Other',
            lastName: 'Tenant',
            organizationName: `Wave7 B ${suffix}`,
            country: 'US',
        });
        otherTenantToken = tenant.body.data.token;
        const vendor = await prisma.vendor.create({
            data: {
                organization: { connect: { id: orgA } },
                publicId: `VND-W7-${suffix}`,
                name: 'Microsoft Corporation QA',
                country: 'United States',
                vendorType: 'CLOUD_SERVICE',
                category: 'CLOUD_HOSTING',
                tier: 'CRITICAL',
                primaryContact: 'QA Contact',
                contactEmail: `vendor-${suffix}@wave7.test`,
                servicesProvided: 'Cloud hosting',
            },
        });
        vendorId = vendor.id;
        const azure = await prisma.engagement.create({
            data: {
                organization: { connect: { id: orgA } },
                vendor: { connect: { id: vendorId } },
                publicId: `ENG-W7-A-${suffix}`,
                serviceName: 'Azure Hosting QA',
                businessPurpose: 'Host a customer-facing application.',
                status: EngagementStatus.ACTIVE,
                assignedAnalystUserId: analyst.user.id,
                requesterUserId: requester.user.id,
            },
        });
        azureId = azure.id;
        const m365 = await prisma.engagement.create({
            data: {
                organization: { connect: { id: orgA } },
                vendor: { connect: { id: vendorId } },
                publicId: `ENG-W7-M-${suffix}`,
                serviceName: 'Microsoft 365 Collaboration QA',
                businessPurpose: 'Collaboration only.',
                status: EngagementStatus.ACTIVE,
                assignedAnalystUserId: analyst.user.id,
            },
        });
        m365Id = m365.id;
        await prisma.engagementIra.create({
            data: {
                organizationId: orgA,
                engagementId: azureId,
                status: 'CONFIRMED',
                currentAnswers: ANSWERS,
                recommendedTier: 'CRITICAL',
                confirmedTier: 'CRITICAL',
                scoringVersion: '3',
                explanation: 'Seeded Version 3 IRA.',
            },
        });
        const residual = await prisma.engagementResidualRiskAssessment.create({
            data: {
                organizationId: orgA,
                engagementId: azureId,
                vendorId,
                status: EngagementResidualStatus.CONFIRMED,
                inherentTier: 'CRITICAL',
                inherentScore: 58,
                inherentSource: 'EngagementIra.confirmedTier',
                methodologyVersion: 'supreme-risk-engagement-1.0.0',
                calculationVersion: 'engagement-1',
                residualScore: 58,
                residualBand: 'MEDIUM',
                explanation: 'Seeded MEDIUM 58 for Wave 7.',
            },
        });
        residualId = residual.id;
        await prisma.engagementControlEffectiveness.create({
            data: {
                organizationId: orgA,
                engagementId: azureId,
                vendorId,
                controlId: `ctl-${suffix}`,
                controlKey: 'GOVERNANCE',
                controlTitle: 'Governance',
                domain: 'Governance',
                rating: 'PARTIALLY_EFFECTIVE',
                rationale: 'Partial coverage remains.',
            },
        });
        await prisma.engagementDueDiligencePlan.create({
            data: {
                organizationId: orgA,
                engagementId: azureId,
                vendorId,
                status: 'CONFIRMED',
                confirmedTier: 'CRITICAL',
                scoringVersion: '3',
                recommendedSnapshot: {},
                includedPackKeys: ['cybersecurity', 'privacy'],
            },
        });
        const recommendation = await prisma.reassessmentRecommendation.create({
            data: {
                organizationId: orgA,
                engagementId: azureId,
                reason: 'Material privileged-access lapse should be reassessed.',
                recommendedScope: 'Targeted residual and due diligence',
                urgency: 'NORMAL',
                triggerType: 'MATERIAL_SECURITY_INCIDENT',
                requestedByUserId: analyst.user.id,
                status: 'RECOMMENDED',
                wave7Started: false,
            },
        });
        recommendationId = recommendation.id;
    });

    it('starts a targeted cycle without rewriting Azure residual or M365', async () => {
        const requesterDenied = await request(app).get(`${API}/tprm/engagements/${azureId}/reassessment`).set('Authorization', `Bearer ${requesterToken}`);
        expect(requesterDenied.status).toBe(200);
        expect(requesterDenied.body.data.experience).toBe('requester');
        const otherDenied = await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/start`).set('Authorization', `Bearer ${otherTenantToken}`).send({ kind: 'TARGETED' });
        expect([403, 404]).toContain(otherDenied.status);
        const started = await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/start`).set('Authorization', `Bearer ${analystToken}`).send({
            kind: 'TARGETED',
            recommendationId,
            reason: 'Event-driven reassessment from Wave 6 recommendation.',
            triggerType: 'MATERIAL_SECURITY_INCIDENT',
        });
        expect(started.status).toBe(201);
        expect(started.body.data.engagement.status).toBe('ACTIVE');
        expect(started.body.data.historicalResidual.residualScore).toBe(58);
        expect(started.body.data.active.cycleNumber).toBe(2);
        expect(started.body.data.active.wave8Started).toBe(false);
        expect(started.body.data.items.some((row: any) => row.disposition === 'REUSE')).toBe(true);
        expect(started.body.data.items.some((row: any) => row.disposition === 'REFRESH')).toBe(true);
        cycleId = started.body.data.active.id;
        const second = await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/start`).set('Authorization', `Bearer ${analystToken}`).send({ kind: 'FULL' });
        expect(second.status).toBe(409);
        const historical = await prisma.engagementResidualRiskAssessment.findUnique({ where: { id: residualId } });
        expect(historical?.residualScore).toBe(58);
        expect(historical?.residualBand).toBe('MEDIUM');
        const m365 = await request(app).get(`${API}/tprm/engagements/${m365Id}/reassessment`).set('Authorization', `Bearer ${analystToken}`);
        expect(m365.status).toBe(200);
        expect(m365.body.data.active).toBeNull();
        const rec = await prisma.reassessmentRecommendation.findUnique({ where: { id: recommendationId } });
        expect(rec?.wave7Started).toBe(true);
    });

    it('records delta, IRA version 3, new residual, and returns to monitoring', async () => {
        const delta = await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/requester-delta`).set('Authorization', `Bearer ${requesterToken}`).send({
            summary: 'No material service or data-scope change.',
        });
        expect(delta.status).toBe(200);
        const ira = await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/ira`).set('Authorization', `Bearer ${analystToken}`).send({ answers: { a4: 'none' } });
        expect(ira.status).toBe(200);
        const submissions = await prisma.engagementIraSubmission.findMany({ where: { organizationId: orgA } });
        expect(submissions.some((row) => row.kind.startsWith('REASSESSMENT_CYCLE_'))).toBe(true);
        const original = await prisma.engagementResidualRiskAssessment.findUnique({ where: { id: residualId } });
        expect(original?.residualScore).toBe(58);
        await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/tier-review`).set('Authorization', `Bearer ${analystToken}`).send({ confirmedTier: 'CRITICAL' });
        await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/delta-plan`).set('Authorization', `Bearer ${analystToken}`).send({});
        await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/vendor-refresh`).set('Authorization', `Bearer ${analystToken}`).send({});
        await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/advance`).set('Authorization', `Bearer ${analystToken}`).send({ status: 'RESIDUAL_REVIEW' });
        const residual = await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/residual`).set('Authorization', `Bearer ${managerToken}`).send({ note: 'Cycle 2 residual.' });
        expect(residual.status).toBe(200);
        expect(residual.body.data.historicalUnchanged.residualScore).toBe(58);
        const still = await prisma.engagementResidualRiskAssessment.findUnique({ where: { id: residualId } });
        expect(still?.residualScore).toBe(58);
        expect(still?.reassessmentId).toBeNull();
        const decide = await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/decide`).set('Authorization', `Bearer ${managerToken}`).send({
            decision: 'CONTINUE_MONITORING',
            rationale: 'No termination. Return to monitoring.',
            startWave8: true,
        });
        expect(decide.status).toBe(409);
        const decided = await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/decide`).set('Authorization', `Bearer ${managerToken}`).send({
            decision: 'CONTINUE_MONITORING',
            rationale: 'Material facts reviewed. Continue monitoring.',
        });
        expect(decided.status).toBe(200);
        const closed = await request(app).post(`${API}/tprm/engagements/${azureId}/reassessment/return-to-monitoring`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(closed.status).toBe(200);
        expect(closed.body.data.active).toBeNull();
        const azure = await prisma.engagement.findUnique({ where: { id: azureId } });
        expect(azure?.status).toBe(EngagementStatus.ACTIVE);
        const cycle = await prisma.engagementReassessment.findUnique({ where: { id: cycleId } });
        expect(cycle?.status).toBe('COMPLETED');
        expect(cycle?.wave8Started).toBe(false);
        const audits = await prisma.auditEvent.findMany({ where: { organizationId: orgA, action: { startsWith: 'reassessment.' } } });
        expect(audits.map((row) => row.action)).toEqual(expect.arrayContaining([
            'reassessment.started',
            'reassessment.ira_refreshed',
            'reassessment.residual_calculated',
            'reassessment.decided',
            'reassessment.returned_to_monitoring',
        ]));
        expect(await prisma.vendorIssue.count({ where: { organizationId: orgA, engagementId: azureId } })).toBe(0);
    });
});
