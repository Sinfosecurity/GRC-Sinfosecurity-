import request from 'supertest';
import {
    EvidenceLinkRelation,
    EvidenceReviewStatus,
    EvidenceGovernanceTarget,
    IssueReviewState,
    Role,
    ScanStatus,
    VendorIssueStatus,
    VendorStatus,
} from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { createOrgUser } from './helpers/orgUser';
import { canonicalIntakeAnswers } from './helpers/canonicalIntake';
import { CLOSURE_COPY } from '../services/phaseCGovernance';

jest.setTimeout(90000);

const PASSWORD = 'H4Pass12xx';
const API = '/api/v1';

async function stored(orgId: string, vendorId: string, ownerId: string, suffix: string, scan: ScanStatus) {
    return prisma.storedObject.create({
        data: {
            organizationId: orgId,
            ownerType: 'vendor',
            ownerId: vendorId,
            filename: `${suffix}.pdf`,
            storageKey: `h4/${suffix}.pdf`,
            contentType: 'application/pdf',
            size: 24,
            checksum: suffix,
            uploadedBy: ownerId,
            scanStatus: scan,
        },
    });
}

describe('H-4 Phase C governance and evidence integrity', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let tokenViewer = '';
    let orgA = '';
    let userA = '';
    let publicId = '';
    let vendorId = '';
    let otherVendorId = '';
    let findingId = '';
    let secondFindingId = '';
    let cleanId = '';
    let pendingId = '';
    let failedId = '';
    let unrelatedId = '';
    let tokenOther = '';
    let otherOrg = '';

    beforeAll(async () => {
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `h4-a-${suffix}@gov.test`,
            password: PASSWORD,
            firstName: 'Ada',
            lastName: 'Closer',
            organizationName: `H4 ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        tokenA = signup.body.data.token;
        orgA = signup.body.data.user.organizationId;
        userA = signup.body.data.user.id;

        const approver = await createOrgUser({
            organizationId: orgA,
            email: `h4-b-${suffix}@gov.test`,
            password: PASSWORD,
            role: Role.ORGANIZATION_ADMIN,
            firstName: 'Bea',
            lastName: 'Approver',
        });
        tokenB = approver.token;

        const viewer = await createOrgUser({
            organizationId: orgA,
            email: `h4-v-${suffix}@gov.test`,
            password: PASSWORD,
            role: Role.VIEWER,
        });
        tokenViewer = viewer.token;

        const other = await request(app).post(`${API}/auth/signup`).send({
            email: `h4-x-${suffix}@gov.test`,
            password: PASSWORD,
            firstName: 'Cross',
            lastName: 'Tenant',
            organizationName: `H4 Other ${suffix}`,
            country: 'US',
        });
        tokenOther = other.body.data.token;
        otherOrg = other.body.data.user.organizationId;

        const created = await request(app).post(`${API}/vendors/onboarding`).set('Authorization', `Bearer ${tokenA}`).send({
            name: `H4 Vendor ${suffix}`,
            website: `https://h4-${suffix}.example`,
            country: 'United States',
            servicesProvided: 'Payroll processing',
            businessOwnerUserId: userA,
            businessUnit: 'Finance',
            estimatedAnnualSpend: 90000,
        });
        expect(created.status).toBe(201);
        publicId = created.body.data.publicId;
        vendorId = created.body.data.id;
        await request(app).post(`${API}/vendors/onboarding/${publicId}/intake/complete`).set('Authorization', `Bearer ${tokenA}`).send({
            answers: canonicalIntakeAnswers(),
            attested: true,
        });
        await request(app).post(`${API}/vendors/onboarding/${publicId}/tier/confirm`).set('Authorization', `Bearer ${tokenA}`).send({ confirm: true });
        await request(app).post(`${API}/vendors/onboarding/${publicId}/plan/confirm`).set('Authorization', `Bearer ${tokenA}`).send({});

        const second = await request(app).post(`${API}/vendors/onboarding`).set('Authorization', `Bearer ${tokenA}`).send({
            name: `H4 Other Vendor ${suffix}`,
            website: `https://h4-other-${suffix}.example`,
            country: 'United States',
            servicesProvided: 'Storage',
            businessOwnerUserId: userA,
            businessUnit: 'Finance',
            estimatedAnnualSpend: 20000,
        });
        otherVendorId = second.body.data.id;

        const closable = await prisma.vendorIssue.create({
            data: {
                vendorId,
                organizationId: orgA,
                title: 'Privileged access not reviewed',
                description: 'Standing access remains.',
                issueType: 'CONTROL_FAILURE',
                severity: 'HIGH',
                priority: 'HIGH',
                source: 'INTERNAL_ASSESSMENT',
                identifiedBy: userA,
                category: 'Security',
                reviewState: IssueReviewState.CONFIRMED,
                status: VendorIssueStatus.OPEN,
            },
        });
        findingId = closable.id;
        const secondFinding = await prisma.vendorIssue.create({
            data: {
                vendorId,
                organizationId: orgA,
                title: 'Subprocessor inventory incomplete',
                description: 'Fourth parties are incomplete.',
                issueType: 'COMPLIANCE_GAP',
                severity: 'MEDIUM',
                priority: 'MEDIUM',
                source: 'INTERNAL_ASSESSMENT',
                identifiedBy: userA,
                category: 'Compliance',
                reviewState: IssueReviewState.CONFIRMED,
                status: VendorIssueStatus.OPEN,
            },
        });
        secondFindingId = secondFinding.id;

        cleanId = (await stored(orgA, vendorId, userA, `clean-${suffix}`, ScanStatus.CLEAN)).id;
        pendingId = (await stored(orgA, vendorId, userA, `pending-${suffix}`, ScanStatus.PENDING)).id;
        failedId = (await stored(orgA, vendorId, userA, `failed-${suffix}`, ScanStatus.FAILED)).id;
        unrelatedId = (await stored(orgA, vendorId, userA, `unrelated-${suffix}`, ScanStatus.CLEAN)).id;
        await prisma.vendorIssue.update({ where: { id: findingId }, data: { closureEvidence: cleanId } });
        await prisma.scoreCalculation.create({
            data: {
                organizationId: orgA,
                vendorId,
                scoreVersion: 'h4-test',
                inherentRisk: 70,
                controlEffectiveness: 40,
                residualRisk: 58,
                riskBand: 'MEDIUM',
                inputs: { methodologyVersion: 'test' },
                explanation: 'Seeded residual.',
            },
        });
        await prisma.vendor.update({ where: { id: vendorId }, data: { residualRiskScore: 58, inherentRiskScore: 70 } });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('denies close without evidence, pending, failed, unvalidated, foreign, other-vendor, and unrelated evidence', async () => {
        const bare = await prisma.vendorIssue.create({
            data: {
                vendorId,
                organizationId: orgA,
                title: 'Bare finding',
                description: 'No evidence.',
                issueType: 'CONTROL_FAILURE',
                severity: 'LOW',
                priority: 'LOW',
                source: 'INTERNAL_ASSESSMENT',
                identifiedBy: userA,
                category: 'Security',
                reviewState: IssueReviewState.CONFIRMED,
                status: VendorIssueStatus.OPEN,
            },
        });
        await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${bare.id}/validate`).set('Authorization', `Bearer ${tokenA}`).send({
            approved: true,
            notes: 'Validated without evidence.',
        });
        const noEvidence = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${bare.id}/close`).set('Authorization', `Bearer ${tokenA}`).send({});
        expect(noEvidence.status).toBe(409);
        expect(JSON.stringify(noEvidence.body)).toContain(CLOSURE_COPY.noEvidence);
        await prisma.vendorIssue.update({ where: { id: bare.id }, data: { reviewState: IssueReviewState.DISMISSED } });

        await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/validate`).set('Authorization', `Bearer ${tokenA}`).send({
            approved: true,
            notes: 'Validated.',
        });

        const pending = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/close`).set('Authorization', `Bearer ${tokenA}`).send({ evidenceId: pendingId });
        expect(pending.status).toBe(409);
        expect(JSON.stringify(pending.body)).toContain(CLOSURE_COPY.pending);

        const failed = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/close`).set('Authorization', `Bearer ${tokenA}`).send({ evidenceId: failedId });
        expect(failed.status).toBe(409);
        expect(JSON.stringify(failed.body)).toContain(CLOSURE_COPY.failed);

        const unvalidated = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${secondFindingId}/close`).set('Authorization', `Bearer ${tokenA}`).send({ evidenceId: cleanId });
        expect(unvalidated.status).toBe(409);
        expect(JSON.stringify(unvalidated.body)).toContain(CLOSURE_COPY.unvalidated);

        const otherVendorFile = await stored(orgA, otherVendorId, userA, `othervendor-${suffix}`, ScanStatus.CLEAN);
        const otherVendor = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/close`).set('Authorization', `Bearer ${tokenA}`).send({ evidenceId: otherVendorFile.id });
        expect(otherVendor.status).toBe(409);
        expect(JSON.stringify(otherVendor.body)).toContain(CLOSURE_COPY.foreign);

        const foreign = await stored(otherOrg, otherVendorId, userA, `foreign-${suffix}`, ScanStatus.CLEAN).catch(async () => {
            return prisma.storedObject.create({
                data: {
                    organizationId: otherOrg,
                    ownerType: 'vendor',
                    ownerId: 'missing',
                    filename: `foreign-${suffix}.pdf`,
                    storageKey: `h4/foreign-${suffix}.pdf`,
                    contentType: 'application/pdf',
                    size: 12,
                    checksum: `foreign-${suffix}`,
                    uploadedBy: userA,
                    scanStatus: ScanStatus.CLEAN,
                },
            });
        });
        const foreignClose = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/close`).set('Authorization', `Bearer ${tokenA}`).send({ evidenceId: foreign.id });
        expect(foreignClose.status).toBe(409);
        expect(JSON.stringify(foreignClose.body)).toContain(CLOSURE_COPY.foreign);

        const unrelated = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/close`).set('Authorization', `Bearer ${tokenA}`).send({ evidenceId: unrelatedId });
        expect(unrelated.status).toBe(409);
        expect(JSON.stringify(unrelated.body)).toContain(CLOSURE_COPY.unrelated);
    });

    it('denies legacy close, generic status spoof, viewer mutation, and premature approval or activation', async () => {
        const legacy = await request(app).post(`${API}/vendors/issues/${findingId}/close`).set('Authorization', `Bearer ${tokenA}`).send({ closureEvidence: pendingId });
        expect(legacy.status).toBe(409);
        expect(JSON.stringify(legacy.body)).toContain(CLOSURE_COPY.pending);
        const legacyTprm = await request(app).post(`${API}/tprm/findings/${findingId}/close`).set('Authorization', `Bearer ${tokenA}`).send({ closureEvidence: pendingId });
        expect(legacyTprm.status).toBe(409);

        const viewerClose = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/close`).set('Authorization', `Bearer ${tokenViewer}`).send({});
        expect(viewerClose.status).toBe(403);

        const spoof = await request(app).put(`${API}/vendors/${vendorId}`).set('Authorization', `Bearer ${tokenA}`).send({
            status: 'ACTIVE',
            residualRiskScore: 1,
            name: `H4 Vendor ${suffix}`,
        });
        expect([200, 400]).toContain(spoof.status);
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        expect(vendor?.status).not.toBe(VendorStatus.ACTIVE);
        expect(vendor?.residualRiskScore).not.toBe(1);

        const approveEarly = await request(app).post(`${API}/vendors/onboarding/${publicId}/approval`).set('Authorization', `Bearer ${tokenB}`).send({
            decision: 'APPROVE',
            rationale: 'Too early.',
        });
        expect(approveEarly.status).toBe(409);

        const activateEarly = await request(app).post(`${API}/vendors/onboarding/${publicId}/activate`).set('Authorization', `Bearer ${tokenA}`).send({});
        expect(activateEarly.status).toBe(409);

        const legacyApprove = await request(app).post(`${API}/vendors/${vendorId}/approve`).set('Authorization', `Bearer ${tokenB}`).send({ decision: 'APPROVE', rationale: 'Legacy bypass' });
        expect(legacyApprove.status).toBe(409);

        const cross = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/close`).set('Authorization', `Bearer ${tokenOther}`).send({});
        expect([403, 404]).toContain(cross.status);

        const genericIssue = await request(app).put(`${API}/vendors/issues/${findingId}`).set('Authorization', `Bearer ${tokenA}`).send({ status: 'CLOSED' });
        expect([404, 405]).toContain(genericIssue.status);
        const stillOpen = await prisma.vendorIssue.findUnique({ where: { id: findingId } });
        expect(stillOpen?.status).not.toBe(VendorIssueStatus.CLOSED);

        const dismissConfirmed = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/review`).set('Authorization', `Bearer ${tokenA}`).send({
            action: 'dismiss',
            reason: 'Try to skip evidence.',
        });
        expect(dismissConfirmed.status).toBe(409);
    });

    it('closes with CLEAN validated linked evidence and keeps residual after independent acceptance', async () => {
        const closed = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/close`).set('Authorization', `Bearer ${tokenA}`).send({ evidenceId: cleanId });
        expect(closed.status).toBe(200);

        const legacyParity = await request(app).post(`${API}/tprm/findings/${findingId}/close`).set('Authorization', `Bearer ${tokenA}`).send({ evidenceId: cleanId });
        expect([409, 200]).toContain(legacyParity.status);

        const rem = await request(app).post(`${API}/vendors/issues/${secondFindingId}/remediation`).set('Authorization', `Bearer ${tokenA}`).send({
            evidenceUrl: cleanId,
            notes: 'Vendor says this is fixed.',
        });
        expect(rem.status).toBe(200);
        const afterRem = await prisma.vendorIssue.findUnique({ where: { id: secondFindingId } });
        expect(afterRem?.status).not.toBe(VendorIssueStatus.CLOSED);

        const prepared = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${secondFindingId}/accept-risk`).set('Authorization', `Bearer ${tokenA}`).send({
            rationale: 'Monitored monthly.',
            conditions: 'Complete inventory before next review.',
        });
        expect(prepared.status).toBe(200);
        const self = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${secondFindingId}/accept-risk/approve`).set('Authorization', `Bearer ${tokenA}`).send({});
        expect(self.status).toBe(403);
        const before = prepared.body.data.lifecycle.residualRisk;
        const accepted = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${secondFindingId}/accept-risk/approve`).set('Authorization', `Bearer ${tokenB}`).send({});
        expect(accepted.status).toBe(200);
        expect(accepted.body.data.lifecycle.residualRisk).toBe(before);
        const { explainableRiskService } = await import('../services/explainableRiskService');
        await explainableRiskService.recalculate(orgA, vendorId);
        const afterRecalc = await prisma.vendor.findUnique({ where: { id: vendorId } });
        expect(afterRecalc?.residualRiskScore).toBe(before);

        const attest = await request(app).post(`${API}/vendors/onboarding/${publicId}/contract/attest`).set('Authorization', `Bearer ${tokenA}`).send({
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
        expect(attest.status).toBe(200);
        const selfApprove = await request(app).post(`${API}/vendors/onboarding/${publicId}/approval`).set('Authorization', `Bearer ${tokenA}`).send({
            decision: 'APPROVE_WITH_CONDITIONS',
            conditions: 'Keep the inventory current.',
            rationale: 'Gates are satisfied.',
        });
        expect(selfApprove.status).toBe(403);
        const approved = await request(app).post(`${API}/vendors/onboarding/${publicId}/approval`).set('Authorization', `Bearer ${tokenB}`).send({
            decision: 'APPROVE_WITH_CONDITIONS',
            conditions: 'Keep the inventory current.',
            rationale: 'Gates are satisfied.',
        });
        expect(approved.status).toBe(200);
        const activated = await request(app).post(`${API}/vendors/onboarding/${publicId}/activate`).set('Authorization', `Bearer ${tokenA}`).send({});
        expect(activated.status).toBe(200);
        expect(activated.body.data.lifecycle.vendorStatus).toBe(VendorStatus.ACTIVE);
        const monitor = await request(app).get(`${API}/vendors/onboarding/${publicId}`).set('Authorization', `Bearer ${tokenA}`);
        expect(monitor.status).toBe(200);
        expect(monitor.body.data.lifecycle.monitoring).toBeTruthy();
        const reassess = await request(app).get(`${API}/vendors/onboarding/${publicId}/reassessment`).set('Authorization', `Bearer ${tokenA}`);
        expect(reassess.status).toBe(200);
    });

    it('does not treat rejected or deleted evidence as usable closure proof', async () => {
        const extra = await prisma.vendorIssue.create({
            data: {
                vendorId,
                organizationId: orgA,
                title: 'Rejected evidence finding',
                description: 'Must not close on rejected file.',
                issueType: 'CONTROL_FAILURE',
                severity: 'LOW',
                priority: 'LOW',
                source: 'INTERNAL_ASSESSMENT',
                identifiedBy: userA,
                category: 'Security',
                reviewState: IssueReviewState.CONFIRMED,
                status: VendorIssueStatus.OPEN,
                validatedAt: new Date(),
                closureEvidence: cleanId,
            },
        });
        await prisma.evidenceGovernanceLink.create({
            data: {
                organizationId: orgA,
                storedObjectId: cleanId,
                targetType: EvidenceGovernanceTarget.FINDING,
                targetId: extra.id,
                relationship: EvidenceLinkRelation.SUPPORTS,
                rationale: 'Rejected during review.',
                createdBy: userA,
                reviewStatus: EvidenceReviewStatus.REJECTED,
            },
        });
        const rejected = await request(app).post(`${API}/vendors/onboarding/${publicId}/findings/${extra.id}/close`).set('Authorization', `Bearer ${tokenA}`).send({ evidenceId: cleanId });
        expect(rejected.status).toBe(409);
        expect(JSON.stringify(rejected.body)).toContain(CLOSURE_COPY.rejected);
    });
});
