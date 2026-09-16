import request from 'supertest';
import { IssueReviewState, Role, VendorIssueStatus, VendorOnboardingStage } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { canonicalizeRole, hasPermission, PERMISSIONS, roleMatches } from '../security/rbac';
import { INDEPENDENT_REVIEW_REQUIRED, assertIndependentReviewer } from '../security/separationOfDuties';
import { createOrgUser } from './helpers/orgUser';
import { canonicalIntakeAnswers } from './helpers/canonicalIntake';

jest.setTimeout(90000);

const PASSWORD = 'SodPass1xx';
const API = '/api/v1';

describe('H-2 / H-7 authorization and separation of duties', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let tokenViewer = '';
    let tokenAssessor = '';
    let orgA = '';
    let userA = '';
    let userB = '';
    let publicId = '';
    let vendorId = '';
    let findingId = '';
    let tokenOtherTenant = '';

    beforeAll(async () => {
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `sod-a-${suffix}@auth.test`,
            password: PASSWORD,
            firstName: 'Ada',
            lastName: 'Preparer',
            organizationName: `SoD ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        tokenA = signup.body.data.token;
        orgA = signup.body.data.user.organizationId;
        userA = signup.body.data.user.id;

        const approver = await createOrgUser({
            organizationId: orgA,
            email: `sod-b-${suffix}@auth.test`,
            password: PASSWORD,
            role: Role.APPROVER,
            firstName: 'Bea',
            lastName: 'Approver',
        });
        tokenB = approver.token;
        userB = approver.user.id;

        const viewer = await createOrgUser({
            organizationId: orgA,
            email: `sod-viewer-${suffix}@auth.test`,
            password: PASSWORD,
            role: Role.VIEWER,
        });
        tokenViewer = viewer.token;

        const assessor = await createOrgUser({
            organizationId: orgA,
            email: `sod-assessor-${suffix}@auth.test`,
            password: PASSWORD,
            role: Role.ASSESSOR,
        });
        tokenAssessor = assessor.token;

        const other = await request(app).post(`${API}/auth/signup`).send({
            email: `sod-other-${suffix}@auth.test`,
            password: PASSWORD,
            firstName: 'Other',
            lastName: 'Tenant',
            organizationName: `SoD Other ${suffix}`,
            country: 'US',
        });
        tokenOtherTenant = other.body.data.token;

        const created = await request(app).post(`${API}/vendors/onboarding`).set('Authorization', `Bearer ${tokenA}`).send({
            name: `SoD Vendor ${suffix}`,
            website: `https://sod-${suffix}.example`,
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
        const finding = await prisma.vendorIssue.create({
            data: {
                vendorId,
                organizationId: orgA,
                title: 'Incomplete subprocessors',
                description: 'Inventory is incomplete.',
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
        findingId = finding.id;
        await prisma.vendorOnboarding.update({
            where: { vendorId },
            data: { stage: VendorOnboardingStage.REMEDIATION },
        });
        await prisma.scoreCalculation.create({
            data: {
                organizationId: orgA,
                vendorId,
                scoreVersion: 'sod-test',
                inherentRisk: 60,
                controlEffectiveness: 40,
                residualRisk: 36,
                riskBand: 'MEDIUM',
                inputs: { methodologyVersion: 'test' },
                explanation: 'Seeded residual.',
            },
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('fails closed for unknown roles and does not treat EXECUTIVE as VIEWER privilege', () => {
        expect(canonicalizeRole('EXECUTIVE')).toBeNull();
        expect(roleMatches('VIEWER', ['ADMIN', 'RISK_MANAGER', 'EXECUTIVE'])).toBe(false);
        expect(hasPermission('ASSESSOR', PERMISSIONS['approval.decide'])).toBe(false);
        expect(hasPermission('ASSESSOR', PERMISSIONS['finding.close'])).toBe(false);
        expect(() => assertIndependentReviewer(userA, userA)).toThrow(INDEPENDENT_REVIEW_REQUIRED);
    });

    it('denies VIEWER and ASSESSOR restricted approvals and finding close', async () => {
        const viewerAccept = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/accept-risk/approve`)
            .set('Authorization', `Bearer ${tokenViewer}`)
            .send({});
        expect(viewerAccept.status).toBe(403);

        const assessorApprove = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/approval`)
            .set('Authorization', `Bearer ${tokenAssessor}`)
            .send({ decision: 'APPROVE', rationale: 'Should be denied' });
        expect(assessorApprove.status).toBe(403);

        const assessorClose = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/close`)
            .set('Authorization', `Bearer ${tokenAssessor}`)
            .send({});
        expect(assessorClose.status).toBe(403);

        const legacyApprove = await request(app)
            .post(`${API}/vendors/${vendorId}/approve`)
            .set('Authorization', `Bearer ${tokenAssessor}`)
            .send({ approvedBy: userB, organizationId: orgA });
        expect(legacyApprove.status).toBe(403);

        const legacyClose = await request(app)
            .post(`${API}/vendors/issues/${findingId}/close`)
            .set('Authorization', `Bearer ${tokenAssessor}`)
            .send({});
        expect(legacyClose.status).toBe(403);
    });

    it('lets a preparer request acceptance and denies self-approval, spoofing, and cross-tenant approval', async () => {
        const prepared = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/accept-risk`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                rationale: 'Monitored monthly.',
                conditions: 'Complete inventory before next review.',
                approvedBy: userB,
                organizationId: '00000000-0000-4000-8000-000000000099',
            });
        expect(prepared.status).toBe(200);
        expect(prepared.body.data.readyForIndependentApproval).toBe(true);

        const selfApprove = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/accept-risk/approve`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ approvedBy: userB });
        expect(selfApprove.status).toBe(403);
        expect(JSON.stringify(selfApprove.body)).toContain('Another authorized reviewer');

        const crossTenant = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/accept-risk/approve`)
            .set('Authorization', `Bearer ${tokenOtherTenant}`)
            .send({});
        expect([403, 404]).toContain(crossTenant.status);

        const approved = await request(app)
            .post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/accept-risk/approve`)
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ approvedBy: userA, organizationId: orgA });
        expect(approved.status).toBe(200);
        const finding = await prisma.vendorIssue.findUnique({ where: { id: findingId } });
        expect(finding?.acceptanceRequestedBy).toBe(userA);
        expect(finding?.closedBy).toBe(userB);
        expect(finding?.status).toBe(VendorIssueStatus.RISK_ACCEPTED);
        const score = await prisma.scoreCalculation.findFirst({ where: { vendorId }, orderBy: { calculatedAt: 'desc' } });
        expect(score?.residualRisk).toBe(36);
    });

    it('keeps platform and support roles off the customer decision plane', async () => {
        const platform = await prisma.user.create({
            data: {
                email: `sod-platform-${suffix}@auth.test`,
                hashedPassword: (await prisma.user.findUniqueOrThrow({ where: { id: userA } })).hashedPassword,
                firstName: 'Plat',
                lastName: 'Admin',
                role: Role.PLATFORM_ADMIN,
                organizationId: orgA,
                status: 'ACTIVE',
            },
        });
        const support = await prisma.user.create({
            data: {
                email: `sod-support-${suffix}@auth.test`,
                hashedPassword: (await prisma.user.findUniqueOrThrow({ where: { id: userA } })).hashedPassword,
                firstName: 'Sue',
                lastName: 'Support',
                role: Role.SUPPORT_ADMIN,
                organizationId: orgA,
                status: 'ACTIVE',
            },
        });
        const platformLogin = await request(app).post(`${API}/auth/login`).send({
            email: platform.email,
            password: PASSWORD,
            plane: 'PLATFORM',
        });
        const supportLogin = await request(app).post(`${API}/auth/login`).send({
            email: support.email,
            password: PASSWORD,
            plane: 'PLATFORM',
        });
        const platformToken = platformLogin.body.data?.token || platformLogin.body.data?.challengeToken;
        const supportToken = supportLogin.body.data?.token || supportLogin.body.data?.challengeToken;
        if (platformToken) {
            const denied = await request(app)
                .post(`${API}/vendors/onboarding/${publicId}/approval`)
                .set('Authorization', `Bearer ${platformToken}`)
                .send({ decision: 'APPROVE' });
            expect([401, 403]).toContain(denied.status);
        }
        if (supportToken) {
            const denied = await request(app)
                .post(`${API}/vendors/onboarding/${publicId}/findings/${findingId}/accept-risk/approve`)
                .set('Authorization', `Bearer ${supportToken}`)
                .send({});
            expect([401, 403]).toContain(denied.status);
        }
        expect(hasPermission('SUPPORT_ADMIN', PERMISSIONS['approval.decide'])).toBe(false);
        expect(hasPermission('SUPPORT_ANALYST', PERMISSIONS['risk.accept'])).toBe(false);
    });
});
