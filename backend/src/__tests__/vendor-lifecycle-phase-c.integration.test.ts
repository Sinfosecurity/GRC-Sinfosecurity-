import request from 'supertest';
import { IssueReviewState, ScanStatus, VendorIssueStatus, VendorOnboardingStage, VendorStatus } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';

jest.setTimeout(90000);

const PASSWORD = 'PhaseCPass1x';
const API = '/api/v1';

async function completePhaseA(token: string, ownerId: string, suffix: string) {
    const created = await request(app).post(`${API}/vendors/onboarding`).set('Authorization', `Bearer ${token}`).send({
        name: `Phase C Vendor ${suffix}`,
        website: `https://phase-c-${suffix}.example`,
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

describe('Supreme Third Party lifecycle Phase C', () => {
    const suffix = `${Date.now()}`;
    let token = '';
    let orgId = '';
    let ownerId = '';
    let publicId = '';
    let vendorId = '';

    beforeAll(async () => {
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `phasec-${suffix}@lifecycle.test`,
            password: PASSWORD,
            firstName: 'Cara',
            lastName: 'Closer',
            organizationName: `Lifecycle ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        token = signup.body.data.token;
        orgId = signup.body.data.user.organizationId;
        ownerId = signup.body.data.user.id;
        const ready = await completePhaseA(token, ownerId, suffix);
        publicId = ready.publicId;
        vendorId = ready.vendorId;
        await prisma.scoreCalculation.create({
            data: {
                organizationId: orgId,
                vendorId,
                scoreVersion: 'phase-c-test',
                inherentRisk: 70,
                controlEffectiveness: 40,
                residualRisk: 42,
                riskBand: 'MEDIUM',
                inputs: { methodologyVersion: 'test' },
                explanation: 'Seeded residual for Phase C residual-neutrality.',
            },
        });
        await prisma.vendorIssue.createMany({
            data: [
                {
                    vendorId,
                    organizationId: orgId,
                    title: 'Privileged access not reviewed',
                    description: 'Vendor retains standing privileged access.',
                    issueType: 'CONTROL_FAILURE',
                    severity: 'HIGH',
                    priority: 'HIGH',
                    source: 'INTERNAL_ASSESSMENT',
                    identifiedBy: ownerId,
                    category: 'Security',
                    reviewState: IssueReviewState.CONFIRMED,
                    status: VendorIssueStatus.OPEN,
                },
                {
                    vendorId,
                    organizationId: orgId,
                    title: 'Subprocessor inventory incomplete',
                    description: 'Fourth parties are not fully listed.',
                    issueType: 'COMPLIANCE_GAP',
                    severity: 'MEDIUM',
                    priority: 'MEDIUM',
                    source: 'INTERNAL_ASSESSMENT',
                    identifiedBy: ownerId,
                    category: 'Compliance',
                    reviewState: IssueReviewState.CONFIRMED,
                    status: VendorIssueStatus.OPEN,
                },
            ],
        });
        const evidence = await prisma.storedObject.create({
            data: {
                organizationId: orgId,
                ownerType: 'vendor',
                ownerId: vendorId,
                filename: 'remediation.pdf',
                storageKey: `phase-c/${suffix}/remediation.pdf`,
                contentType: 'application/pdf',
                size: 24,
                checksum: `phase-c-${suffix}`,
                uploadedBy: ownerId,
                scanStatus: ScanStatus.CLEAN,
            },
        });
        const closable = await prisma.vendorIssue.findFirst({ where: { vendorId, title: 'Privileged access not reviewed' } });
        await prisma.vendorIssue.update({
            where: { id: closable!.id },
            data: { closureEvidence: evidence.id },
        });
        await prisma.vendorOnboarding.update({
            where: { vendorId },
            data: { stage: VendorOnboardingStage.REMEDIATION },
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('closes one finding, accepts the other without changing residual, then activates and offboards', async () => {
        const workspace = await request(app).get(`${API}/vendors/onboarding/${publicId}`).set('Authorization', `Bearer ${token}`);
        expect(workspace.status).toBe(200);
        expect(workspace.body.data.lifecycle.residualRisk).toBe(42);
        const closable = workspace.body.data.lifecycle.findings.find((row: any) => row.title === 'Privileged access not reviewed');
        const acceptable = workspace.body.data.lifecycle.findings.find((row: any) => row.title === 'Subprocessor inventory incomplete');
        expect(closable).toBeTruthy();
        expect(acceptable).toBeTruthy();

        const remediated = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${closable.id}/remediate`).set('Authorization', `Bearer ${token}`).send({
            cap: 'Remove standing privileged access and attach current access review.',
        });
        expect(remediated.status).toBe(200);

        const validated = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${closable.id}/validate`).set('Authorization', `Bearer ${token}`).send({
            approved: true,
            notes: 'Access review is current.',
        });
        expect(validated.status).toBe(200);

        const closed = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${closable.id}/close`).set('Authorization', `Bearer ${token}`).send({});
        expect(closed.status).toBe(200);

        const accepted = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${acceptable.id}/accept-risk`).set('Authorization', `Bearer ${token}`).send({
            rationale: 'Fourth-party inventory is incomplete but monitored monthly.',
            conditions: 'Complete the inventory before the next review.',
        });
        expect(accepted.status).toBe(200);
        expect(accepted.body.data.lifecycle.residualRisk).toBe(42);

        const attested = await request(app).post(`${API}/vendors/onboarding/${publicId}/contract/attest`).set('Authorization', `Bearer ${token}`).send({
            attested: true,
            clauses: {
                security_addendum: true,
                breach_notification: true,
                subprocessor: true,
                dpa: true,
                baa: true,
                deletion_return: true,
                right_to_audit: true,
            },
        });
        expect(attested.status).toBe(200);

        const approved = await request(app).post(`${API}/vendors/onboarding/${publicId}/approval`).set('Authorization', `Bearer ${token}`).send({
            decision: 'APPROVE',
            rationale: 'Findings are closed or time-bounded. Contract controls are attested.',
        });
        expect(approved.status).toBe(200);
        expect(approved.body.data.lifecycle.approvalDecision).toBe('APPROVE');
        expect(approved.body.data.lifecycle.residualAtApproval).toBe(42);

        const activated = await request(app).post(`${API}/vendors/onboarding/${publicId}/activate`).set('Authorization', `Bearer ${token}`).send({});
        expect(activated.status).toBe(200);
        expect(activated.body.data.lifecycle.vendorStatus).toBe(VendorStatus.ACTIVE);
        expect(activated.body.data.lifecycle.stage).toBe(VendorOnboardingStage.ACTIVE);

        const recommendation = await request(app).get(`${API}/vendors/onboarding/${publicId}/reassessment`).set('Authorization', `Bearer ${token}`);
        expect(recommendation.status).toBe(200);
        expect(recommendation.body.data.recommendation).toBeTruthy();

        const offboarded = await request(app).post(`${API}/vendors/onboarding/${publicId}/offboard`).set('Authorization', `Bearer ${token}`).send({
            exitNotes: 'Engagement ended. Retain evidence and history.',
            acknowledgeOutstanding: true,
        });
        expect(offboarded.status).toBe(200);
        expect(offboarded.body.data.lifecycle.stage).toBe(VendorOnboardingStage.OFFBOARDING);
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        expect(vendor?.status).toBe(VendorStatus.OFFBOARDING);
        const score = await prisma.scoreCalculation.findFirst({ where: { vendorId }, orderBy: { calculatedAt: 'desc' } });
        expect(score?.residualRisk).toBe(42);
        const evidence = await prisma.storedObject.findMany({ where: { ownerId: vendorId } });
        expect(evidence.length).toBeGreaterThan(0);
    });
});
