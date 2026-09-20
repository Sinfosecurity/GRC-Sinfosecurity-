import request from 'supertest';
import jwt from 'jsonwebtoken';
import { EngagementResidualStatus, EngagementStatus, Role, VendorIssueStatus } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { getEnv } from '../config/env';
import { createOrgUser } from './helpers/orgUser';

jest.setTimeout(180000);

const PASSWORD = 'Wave5Pass1x';
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

describe('#12 Wave 5 engagement treatment, acceptance, gate, and activation', () => {
    const suffix = `${Date.now()}`;
    let adminToken = '';
    let analystToken = '';
    let managerToken = '';
    let approverToken = '';
    let requesterToken = '';
    let otherTenantToken = '';
    let analystId = '';
    let orgA = '';
    let vendorId = '';
    let azureId = '';
    let m365Id = '';
    let avoidId = '';
    let azureFindingId = '';
    let firstBriefId = '';
    let firstBriefSnapshot = '';

    async function createIntake(service: string, purpose: string) {
        const created = await request(app).post(`${API}/tprm/intakes`).set('Authorization', `Bearer ${requesterToken}`).send({
            proposedThirdPartyName: 'Microsoft Corporation QA',
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
                reason: 'Confirmed engagement-specific inherent risk for Wave 5.',
            });
            expect(override.status).toBe(200);
        }
    }

    async function seedResidual(engagementId: string, vendor: string, band: string, score: number, tier: 'CRITICAL' | 'MEDIUM' | 'LOW') {
        await prisma.engagementResidualRiskAssessment.create({
            data: {
                organizationId: orgA,
                engagementId,
                vendorId: vendor,
                status: EngagementResidualStatus.CONFIRMED,
                inherentTier: tier,
                inherentScore: score,
                inherentSource: 'EngagementIra.confirmedTier',
                methodologyVersion: 'supreme-risk-engagement-1.0.0',
                calculationVersion: 'engagement-1',
                residualScore: score,
                residualBand: band,
                explanation: `Seeded ${band} ${score} for Wave 5.`,
            },
        });
        await prisma.engagement.update({ where: { id: engagementId }, data: { status: EngagementStatus.TREATMENT_REVIEW } });
    }

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `lead-${suffix}@wave5.test`,
            password: PASSWORD,
            firstName: 'Lea',
            lastName: 'Lead',
            organizationName: `Wave5 ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        adminToken = signup.body.data.token;
        orgA = signup.body.data.user.organizationId;
        const analyst = await createOrgUser({ organizationId: orgA, email: `ana-${suffix}@wave5.test`, password: PASSWORD, role: Role.ASSESSOR, firstName: 'Ana', lastName: 'Lyst' });
        analystToken = analyst.token;
        analystId = analyst.user.id;
        const manager = await createOrgUser({ organizationId: orgA, email: `rm-${suffix}@wave5.test`, password: PASSWORD, role: Role.RISK_MANAGER, firstName: 'Riley', lastName: 'Manager' });
        managerToken = manager.token;
        const approver = await createOrgUser({ organizationId: orgA, email: `apr-${suffix}@wave5.test`, password: PASSWORD, role: Role.APPROVER, firstName: 'Ava', lastName: 'Approver' });
        approverToken = approver.token;
        const requester = await createOrgUser({ organizationId: orgA, email: `pat-${suffix}@wave5.test`, password: PASSWORD, role: Role.BUSINESS_OWNER, firstName: 'Pat', lastName: 'Requester' });
        requesterToken = requester.token;
        const tenant = await request(app).post(`${API}/auth/signup`).send({
            email: `other-${suffix}@wave5-b.test`,
            password: PASSWORD,
            firstName: 'Other',
            lastName: 'Tenant',
            organizationName: `Wave5 B ${suffix}`,
            country: 'US',
        });
        otherTenantToken = tenant.body.data.token;
    });

    it('creates isolated Microsoft engagements and seeded residual records', async () => {
        const azureIntake = await createIntake('Azure Hosting QA', 'Host a customer-facing application.');
        const vendor = await request(app).post(`${API}/tprm/intakes/${azureIntake}/third-party`).set('Authorization', `Bearer ${analystToken}`).send({
            name: 'Microsoft Corporation QA',
            website: 'https://microsoft.com',
            country: 'United States',
        });
        vendorId = vendor.body.data.matchedVendorId;
        const azure = await request(app).post(`${API}/tprm/intakes/${azureIntake}/engagement`).set('Authorization', `Bearer ${analystToken}`).send({ serviceName: 'Azure Hosting QA' });
        azureId = azure.body.data.engagement.id;
        await confirmIra(azureId, completeAnswers({ a1: 'cloud', a4: 'admin' }));
        const m365Intake = await createIntake('Microsoft 365 Collaboration QA', 'Collaboration only.');
        await request(app).post(`${API}/tprm/intakes/${m365Intake}/match`).set('Authorization', `Bearer ${analystToken}`).send({ vendorId, reason: 'Same legal entity' });
        const m365 = await request(app).post(`${API}/tprm/intakes/${m365Intake}/engagement`).set('Authorization', `Bearer ${analystToken}`).send({ serviceName: 'Microsoft 365 Collaboration QA' });
        m365Id = m365.body.data.engagement.id;
        await confirmIra(m365Id, completeAnswers());
        const avoidIntake = await createIntake('Disposable Avoid QA', 'Disposable avoid path.');
        await request(app).post(`${API}/tprm/intakes/${avoidIntake}/match`).set('Authorization', `Bearer ${analystToken}`).send({ vendorId, reason: 'Same legal entity' });
        const avoid = await request(app).post(`${API}/tprm/intakes/${avoidIntake}/engagement`).set('Authorization', `Bearer ${analystToken}`).send({ serviceName: 'Disposable Avoid QA' });
        avoidId = avoid.body.data.engagement.id;
        await confirmIra(avoidId, completeAnswers());
        await seedResidual(azureId, vendorId, 'MEDIUM', 58, 'CRITICAL');
        await seedResidual(m365Id, vendorId, 'LOW', 22, 'LOW');
        await seedResidual(avoidId, vendorId, 'MEDIUM', 40, 'MEDIUM');
        const finding = await prisma.vendorIssue.create({
            data: {
                vendorId,
                organizationId: orgA,
                engagementId: azureId,
                title: 'Azure Hosting QA — Privileged access review not demonstrated',
                description: 'Confirmed finding used as a contract-requirement source.',
                issueType: 'CONTROL_FAILURE',
                severity: 'HIGH',
                recommendedSeverity: 'HIGH',
                priority: 'HIGH',
                source: 'INTERNAL_ASSESSMENT',
                identifiedBy: analystId,
                category: 'Cybersecurity',
                reviewState: 'CONFIRMED',
                status: VendorIssueStatus.OPEN,
            },
        });
        azureFindingId = finding.id;
        const workspace = await request(app).get(`${API}/tprm/engagements/${azureId}/decisions`).set('Authorization', `Bearer ${analystToken}`);
        expect(workspace.status).toBe(200);
        expect(workspace.body.data.residual.residualBand).toBe('MEDIUM');
        expect(workspace.body.data.residual.residualScore).toBe(58);
        expect(workspace.body.data.nextAction).toMatch(/Review risk treatment/);
        expect(workspace.body.data.siblings).toHaveLength(3);
    });

    it('accepts Azure risk without lowering residual or mutating M365', async () => {
        const selected = await request(app).post(`${API}/tprm/engagements/${azureId}/treatment`).set('Authorization', `Bearer ${adminToken}`).send({
            type: 'ACCEPT',
            rationale: 'Azure residual is accepted with an expiry and does not change the score.',
            conditions: 'Quarterly review required.',
            reviewAt: new Date(Date.now() + 86400000 * 90).toISOString(),
            relatedFindingIds: [azureFindingId],
        });
        expect(selected.status).toBe(200);
        expect(selected.body.data.treatment.type).toBe('ACCEPT');
        expect(selected.body.data.acceptance.status).toMatch(/PENDING|REQUESTED/);
        const self = await request(app).post(`${API}/tprm/engagements/${azureId}/acceptance/decide`).set('Authorization', `Bearer ${adminToken}`).send({
            decision: 'APPROVED',
            comment: 'Should be denied for self-approval.',
        });
        expect(self.status).toBe(403);
        const approved = await request(app).post(`${API}/tprm/engagements/${azureId}/acceptance/decide`).set('Authorization', `Bearer ${approverToken}`).send({
            decision: 'APPROVED',
            comment: 'Independent approval of the Engagement acceptance.',
        });
        expect(approved.status).toBe(200);
        expect(approved.body.data.acceptance.status).toBe('APPROVED');
        expect(approved.body.data.residual.residualBand).toBe('MEDIUM');
        expect(approved.body.data.residual.residualScore).toBe(58);
        const residual = await prisma.engagementResidualRiskAssessment.findFirst({ where: { engagementId: azureId }, orderBy: { createdAt: 'desc' } });
        expect(residual?.residualBand).toBe('MEDIUM');
        expect(residual?.residualScore).toBe(58);
        const finding = await prisma.vendorIssue.findUnique({ where: { id: azureFindingId } });
        expect(finding?.status).toBe(VendorIssueStatus.OPEN);
        const m365 = await request(app).get(`${API}/tprm/engagements/${m365Id}/decisions`).set('Authorization', `Bearer ${analystToken}`);
        expect(m365.body.data.treatment).toBeFalsy();
        expect(m365.body.data.acceptance).toBeFalsy();
        expect(m365.body.data.residual.residualScore).toBe(22);
        expect(m365.body.data.engagement.status).not.toBe('ACTIVE');
    });

    it('blocks activation until mandatory requirements are satisfied, then activates only Azure', async () => {
        const created = await request(app).post(`${API}/tprm/engagements/${azureId}/contract-requirements`).set('Authorization', `Bearer ${analystToken}`).send({
            requirement: 'Privileged access review evidence',
            source: 'CONFIRMED_FINDING',
            sourceRef: azureFindingId,
            sourceRationale: 'Sourced from the confirmed Azure privileged-access finding.',
            mandatory: true,
        });
        expect(created.status).toBe(201);
        expect(created.body.data.contractRequirements[0].source).toBe('CONFIRMED_FINDING');
        const m365Reqs = await request(app).get(`${API}/tprm/engagements/${m365Id}/decisions`).set('Authorization', `Bearer ${analystToken}`);
        expect(m365Reqs.body.data.contractRequirements).toHaveLength(0);
        const evaluated = await request(app).post(`${API}/tprm/engagements/${azureId}/gate/evaluate`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(evaluated.status).toBe(200);
        expect(evaluated.body.data.gate.status).toBe('BLOCKED');
        expect(JSON.stringify(evaluated.body.data.gate.blockers)).toMatch(/Privileged access review evidence/);
        const blocked = await request(app).post(`${API}/tprm/engagements/${azureId}/activate`).set('Authorization', `Bearer ${managerToken}`).send({});
        expect(blocked.status).toBe(409);
        expect(blocked.body.error.message).toMatch(/denied|blocker|not recorded/i);
        const requirementId = evaluated.body.data.contractRequirements[0].id;
        const satisfied = await request(app).patch(`${API}/tprm/engagements/${azureId}/contract-requirements/${requirementId}`).set('Authorization', `Bearer ${analystToken}`).send({
            status: 'SATISFIED',
            evidenceRef: 'Recorded on the confirmed finding.',
        });
        expect(satisfied.status).toBe(200);
        const ready = await request(app).post(`${API}/tprm/engagements/${azureId}/gate/evaluate`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(ready.body.data.gate.status).toBe('APPROVED');
        const analystActivate = await request(app).post(`${API}/tprm/engagements/${azureId}/activate`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(analystActivate.status).toBe(403);
        const requesterActivate = await request(app).post(`${API}/tprm/engagements/${azureId}/activate`).set('Authorization', `Bearer ${requesterToken}`).send({});
        expect(requesterActivate.status).toBe(403);
        const activated = await request(app).post(`${API}/tprm/engagements/${azureId}/activate`).set('Authorization', `Bearer ${managerToken}`).send({});
        expect(activated.status).toBe(200);
        expect(activated.body.data.engagement.status).toBe('ACTIVE');
        expect(activated.body.data.nextAction).toMatch(/Monitoring setup pending Wave 6/);
        expect(activated.body.data.wave6Started).toBe(false);
        const azure = await prisma.engagement.findUnique({ where: { id: azureId } });
        const m365 = await prisma.engagement.findUnique({ where: { id: m365Id } });
        const thirdParty = await prisma.vendor.findUnique({ where: { id: vendorId } });
        expect(azure?.status).toBe(EngagementStatus.ACTIVE);
        expect(m365?.status).not.toBe(EngagementStatus.ACTIVE);
        expect(thirdParty?.status).not.toBe('ACTIVE');
    });

    it('keeps decision briefs immutable and isolates MITIGATE, TRANSFER, and AVOID', async () => {
        const first = await request(app).post(`${API}/tprm/engagements/${azureId}/decision-briefs`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(first.status).toBe(201);
        firstBriefId = first.body.data.id;
        firstBriefSnapshot = JSON.stringify(first.body.data.snapshot);
        const mitigate = await request(app).post(`${API}/tprm/engagements/${m365Id}/treatment`).set('Authorization', `Bearer ${analystToken}`).send({
            type: 'MITIGATE',
            rationale: 'Record a governed mitigation plan without closing findings.',
            mitigationAction: 'Collect additional collaboration-control evidence.',
            mitigationDueDate: new Date(Date.now() + 86400000 * 14).toISOString(),
            mitigationCompletionCondition: 'Validated evidence reviewed by TPRM.',
            relatedFindingIds: [],
        });
        expect(mitigate.status).toBe(200);
        expect(mitigate.body.data.treatment.type).toBe('MITIGATE');
        expect(mitigate.body.data.residual.residualScore).toBe(22);
        const transfer = await request(app).post(`${API}/tprm/engagements/${m365Id}/treatment`).set('Authorization', `Bearer ${analystToken}`).send({
            type: 'TRANSFER',
            rationale: 'Document contractual indemnity. Residual does not disappear.',
            transferMechanism: 'CONTRACTUAL_INDEMNITY',
            transferEvidenceRef: 'Indemnity clause reference recorded on the Engagement.',
        });
        expect(transfer.status).toBe(200);
        expect(transfer.body.data.treatment.type).toBe('TRANSFER');
        expect(transfer.body.data.history.treatments.length).toBeGreaterThan(1);
        expect(transfer.body.data.residual.residualScore).toBe(22);
        const avoided = await request(app).post(`${API}/tprm/engagements/${avoidId}/treatment`).set('Authorization', `Bearer ${analystToken}`).send({
            type: 'AVOID',
            rationale: 'This disposable Engagement will not proceed.',
        });
        expect(avoided.status).toBe(200);
        expect(avoided.body.data.engagement.status).toBe('AVOIDED');
        const activateAvoid = await request(app).post(`${API}/tprm/engagements/${avoidId}/activate`).set('Authorization', `Bearer ${managerToken}`).send({});
        expect(activateAvoid.status).toBe(409);
        const azureAfter = await prisma.engagement.findUnique({ where: { id: azureId } });
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        expect(azureAfter?.status).toBe(EngagementStatus.ACTIVE);
        expect(vendor).toBeTruthy();
        const second = await request(app).post(`${API}/tprm/engagements/${azureId}/decision-briefs`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(second.body.data.id).not.toBe(firstBriefId);
        expect(second.body.data.versionNumber).toBeGreaterThan(1);
        const prior = await request(app).get(`${API}/tprm/engagements/${azureId}/decision-briefs/${firstBriefId}`).set('Authorization', `Bearer ${analystToken}`);
        expect(JSON.stringify(prior.body.data.snapshot)).toBe(firstBriefSnapshot);
        const audits = await prisma.auditEvent.findMany({
            where: { organizationId: orgA, action: { in: ['risk_treatment.selected', 'risk_acceptance.approved', 'contract_gate.blocked', 'engagement.activated'] } },
        });
        expect(audits.some((row) => row.action === 'engagement.activated')).toBe(true);
        expect(audits.some((row) => row.action === 'risk_acceptance.approved')).toBe(true);
    });

    it('denies requester, vendor, and cross-tenant Wave 5 internals', async () => {
        const requester = await request(app).get(`${API}/tprm/engagements/${azureId}/decisions`).set('Authorization', `Bearer ${requesterToken}`);
        expect(requester.status).toBe(403);
        const other = await request(app).get(`${API}/tprm/engagements/${azureId}/decisions`).set('Authorization', `Bearer ${otherTenantToken}`);
        expect([403, 404]).toContain(other.status);
        const vendorJwt = jwt.sign(
            { userId: 'vendor-actor', plane: 'VENDOR', kind: 'vendor_session', organizationId: orgA },
            getEnv().jwtSecret
        );
        const vendor = await request(app).get(`${API}/tprm/engagements/${azureId}/decisions`).set('Authorization', `Bearer ${vendorJwt}`);
        expect([401, 403]).toContain(vendor.status);
        const acceptRisk = await request(app).post(`${API}/tprm/engagements/${azureId}/accept-risk`).set('Authorization', `Bearer ${adminToken}`).send({ rationale: 'legacy path' });
        expect([404, 405]).toContain(acceptRisk.status);
    });
});
