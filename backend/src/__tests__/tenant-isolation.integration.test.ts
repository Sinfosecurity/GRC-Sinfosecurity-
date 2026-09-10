/**
 * PostgreSQL-backed tenant isolation.
 * Uses production auth, vendor, evidence, approval, and export routes.
 */
import request from 'supertest';
import {
    AssessmentType,
    IssuePriority,
    IssueSeverity,
    IssueSource,
    ScanStatus,
    VendorIssueStatus,
    VendorIssueType,
    VendorTier,
    VendorType,
    WorkflowType,
} from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import vendorManagementService from '../services/vendorManagementService';
import vendorApprovalWorkflow from '../services/vendorApprovalWorkflow';

jest.setTimeout(60000);

const PASSWORD = 'TenantPass1x';
const API = '/api/v1';

function expectDenied(status: number) {
    expect([403, 404]).toContain(status);
}

describe('two-tenant isolation (PostgreSQL)', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let orgA = '';
    let orgB = '';
    let userA = '';
    let userB = '';
    let vendorA = '';
    let vendorB = '';
    let assessmentB = '';
    let issueB = '';
    let evidenceB = '';
    let workflowB = '';

    beforeAll(async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            throw new Error(
                `PostgreSQL is required for tenant isolation tests. Set TEST_DATABASE_URL. ${(error as Error).message}`
            );
        }

        const signupA = await request(app)
            .post(`${API}/auth/signup`)
            .send({
                email: `user-a-${suffix}@tenant-a.test`,
                password: PASSWORD,
                firstName: 'User',
                lastName: 'A',
                organizationName: `Org A ${suffix}`,
                country: 'US',
            });
        expect(signupA.status).toBe(201);
        tokenA = signupA.body.data.token;
        orgA = signupA.body.data.user.organizationId;
        userA = signupA.body.data.user.id;

        const signupB = await request(app)
            .post(`${API}/auth/signup`)
            .send({
                email: `user-b-${suffix}@tenant-b.test`,
                password: PASSWORD,
                firstName: 'User',
                lastName: 'B',
                organizationName: `Org B ${suffix}`,
                country: 'US',
            });
        expect(signupB.status).toBe(201);
        tokenB = signupB.body.data.token;
        orgB = signupB.body.data.user.organizationId;
        userB = signupB.body.data.user.id;
        expect(orgA).not.toBe(orgB);

        const createdA = await vendorManagementService.createVendor({
            name: `Vendor A Isolation ${suffix}`,
            vendorType: VendorType.SAAS,
            category: 'CLOUD_HOSTING',
            tier: VendorTier.HIGH,
            primaryContact: 'contact-a@tenant-a.test',
            contactEmail: 'contact-a@tenant-a.test',
            servicesProvided: 'Org A software',
            dataTypesAccessed: ['PII'],
            geographicFootprint: ['US'],
            regulatoryScope: ['SOC2'],
            organizationId: orgA,
        });
        vendorA = createdA.id;

        const createdB = await vendorManagementService.createVendor({
            name: `VENDOR_B_ISOLATION_MARKER_${suffix}`,
            vendorType: VendorType.SAAS,
            category: 'CLOUD_HOSTING',
            tier: VendorTier.CRITICAL,
            primaryContact: 'contact-b@tenant-b.test',
            contactEmail: 'contact-b@tenant-b.test',
            servicesProvided: 'Org B software',
            dataTypesAccessed: ['PHI'],
            geographicFootprint: ['US'],
            regulatoryScope: ['HIPAA'],
            organizationId: orgB,
        });
        vendorB = createdB.id;

        const assessment = await prisma.vendorAssessment.create({
            data: {
                vendorId: vendorB,
                organizationId: orgB,
                assessmentType: AssessmentType.ANNUAL_REVIEW,
                frameworkUsed: 'SIG',
            },
        });
        assessmentB = assessment.id;

        const issue = await prisma.vendorIssue.create({
            data: {
                vendorId: vendorB,
                organizationId: orgB,
                title: `Finding B ${suffix}`,
                description: 'Tenant B finding',
                issueType: VendorIssueType.AUDIT_FINDING,
                severity: IssueSeverity.HIGH,
                priority: IssuePriority.HIGH,
                source: IssueSource.INTERNAL_ASSESSMENT,
                identifiedBy: userB,
                category: 'Security',
                status: VendorIssueStatus.OPEN,
            },
        });
        issueB = issue.id;

        const evidence = await prisma.storedObject.create({
            data: {
                organizationId: orgB,
                ownerType: 'vendor',
                ownerId: vendorB,
                filename: `evidence-b-${suffix}.pdf`,
                storageKey: `${orgB}/vendor/${vendorB}/evidence-b-${suffix}.pdf`,
                contentType: 'application/pdf',
                size: 12,
                checksum: 'abc',
                uploadedBy: userB,
                scanStatus: ScanStatus.CLEAN,
            },
        });
        evidenceB = evidence.id;

        const workflow = await vendorApprovalWorkflow.createWorkflow({
            vendorId: vendorB,
            organizationId: orgB,
            workflowType: WorkflowType.ONBOARDING,
            initiatedBy: userB,
            businessJustification: 'Onboard vendor B',
            approvalChain: [{ approverRole: 'ORGANIZATION_ADMIN', approverUserId: userB, approverName: 'User B' }],
        });
        workflowB = workflow.id;
    });

    afterAll(async () => {
        await prisma.riskDecisionBrief.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.scoreCalculation.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.evidenceLink.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.vendorDocument.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.scoringMethodology.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.aiOperationLog.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.storedObject.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.vendorApprovalStep.deleteMany({
            where: { workflow: { organizationId: { in: [orgA, orgB].filter(Boolean) } } },
        });
        await prisma.vendorApprovalWorkflow.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.vendorIssue.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.vendorAssessment.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.vendor.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.refreshToken.deleteMany({ where: { user: { organizationId: { in: [orgA, orgB].filter(Boolean) } } } });
        await prisma.auditEvent.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.user.deleteMany({ where: { organizationId: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB].filter(Boolean) } } });
        await prisma.$disconnect();
    });

    it('lists only the caller tenant vendors', async () => {
        const resA = await request(app).get(`${API}/vendors`).set('Authorization', `Bearer ${tokenA}`);
        expect(resA.status).toBe(200);
        const idsA = (resA.body.vendors || resA.body.data || []).map((v: { id: string }) => v.id);
        expect(idsA).toContain(vendorA);
        expect(idsA).not.toContain(vendorB);

        const resB = await request(app).get(`${API}/vendors`).set('Authorization', `Bearer ${tokenB}`);
        const idsB = (resB.body.vendors || resB.body.data || []).map((v: { id: string }) => v.id);
        expect(idsB).toContain(vendorB);
        expect(idsB).not.toContain(vendorA);
    });

    it('User A cannot GET Vendor B', async () => {
        const res = await request(app).get(`${API}/vendors/${vendorB}`).set('Authorization', `Bearer ${tokenA}`);
        expectDenied(res.status);
        expect(JSON.stringify(res.body)).not.toContain('VENDOR_B_ISOLATION_MARKER_');
    });

    it('User A cannot UPDATE Vendor B', async () => {
        const res = await request(app)
            .put(`${API}/vendors/${vendorB}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ name: 'Hacked Vendor B' });
        expectDenied(res.status);
        const stillB = await prisma.vendor.findUnique({ where: { id: vendorB } });
        expect(stillB?.name).toContain('VENDOR_B_ISOLATION_MARKER_');
        expect(stillB?.organizationId).toBe(orgB);
    });

    it('User A cannot DELETE Vendor B', async () => {
        const res = await request(app).delete(`${API}/vendors/${vendorB}`).set('Authorization', `Bearer ${tokenA}`);
        expectDenied(res.status);
        const stillB = await prisma.vendor.findUnique({ where: { id: vendorB } });
        expect(stillB).toBeTruthy();
        expect(stillB?.status).not.toBe('TERMINATED');
    });

    it('User A cannot access Vendor B assessments', async () => {
        const listed = await request(app)
            .get(`${API}/vendors/${vendorB}/assessments`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect([200, 403, 404]).toContain(listed.status);
        if (listed.status === 200) {
            const rows = Array.isArray(listed.body) ? listed.body : listed.body.data || [];
            expect(rows).toHaveLength(0);
        }
        const byId = await request(app)
            .get(`${API}/vendors/assessments/${assessmentB}`)
            .set('Authorization', `Bearer ${tokenA}`);
        expectDenied(byId.status);
        expect(JSON.stringify(byId.body)).not.toContain(assessmentB);
    });

    it('User A cannot access Vendor B evidence', async () => {
        const res = await request(app)
            .get(`${API}/documents/${evidenceB}/download`)
            .set('Authorization', `Bearer ${tokenA}`);
        expectDenied(res.status);
    });

    it('User A cannot access Vendor B findings', async () => {
        const listed = await request(app)
            .get(`${API}/vendors/${vendorB}/issues`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect([200, 403, 404]).toContain(listed.status);
        if (listed.status === 200) {
            const rows = Array.isArray(listed.body) ? listed.body : listed.body.data || [];
            expect(rows).toHaveLength(0);
        }
    });

    it('User A cannot access Vendor B approval workflows', async () => {
        const res = await request(app)
            .get(`${API}/vendors/approvals/workflows/${workflowB}`)
            .set('Authorization', `Bearer ${tokenA}`);
        expectDenied(res.status);
    });

    it('User A cannot export Vendor B data', async () => {
        const res = await request(app).get(`${API}/exports/vendors.csv`).set('Authorization', `Bearer ${tokenA}`);
        expect(res.status).toBe(200);
        expect(res.text).not.toContain('VENDOR_B_ISOLATION_MARKER_');
        expect(res.text).toContain(`Vendor A Isolation ${suffix}`);
    });

    it('User A cannot read Vendor B risk explanation', async () => {
        const res = await request(app)
            .get(`${API}/tprm/vendors/${vendorB}/risk-explanation`)
            .set('Authorization', `Bearer ${tokenA}`);
        expectDenied(res.status);
    });

    it('User A cannot generate a decision brief for Vendor B', async () => {
        const res = await request(app)
            .post(`${API}/tprm/vendors/${vendorB}/decision-briefs`)
            .set('Authorization', `Bearer ${tokenA}`);
        expectDenied(res.status);
    });

    it('User B can generate and User A cannot read that decision brief', async () => {
        const created = await request(app)
            .post(`${API}/tprm/vendors/${vendorB}/decision-briefs`)
            .set('Authorization', `Bearer ${tokenB}`);
        expect(created.status).toBe(201);
        const briefId = created.body.data.id;
        const leaked = await request(app)
            .get(`${API}/tprm/decision-briefs/${briefId}`)
            .set('Authorization', `Bearer ${tokenA}`);
        expectDenied(leaked.status);
    });

    it('rejects ID tampering of a non-existent vendor', async () => {
        const res = await request(app)
            .get(`${API}/vendors/00000000-0000-4000-8000-000000000099`)
            .set('Authorization', `Bearer ${tokenA}`);
        expectDenied(res.status);
    });

    it('User B cannot GET Vendor A (reciprocal)', async () => {
        const res = await request(app).get(`${API}/vendors/${vendorA}`).set('Authorization', `Bearer ${tokenB}`);
        expectDenied(res.status);
    });

    it('cannot persist a score for another tenant vendor id', async () => {
        const { persistVendorScore } = await import('../services/explainableRiskService');
        const { calculateVendorRiskAt } = await import('../services/deterministicRiskEngine');
        const before = await prisma.vendor.findFirst({ where: { id: vendorB, organizationId: orgB } });
        expect(before).toBeTruthy();
        await expect(
            persistVendorScore({
                organizationId: orgA,
                vendorId: vendorB,
                result: calculateVendorRiskAt({ vendorCriticality: 'LOW' }, new Date()),
            })
        ).rejects.toMatchObject({ statusCode: 404 });
        const after = await prisma.vendor.findFirst({ where: { id: vendorB, organizationId: orgB } });
        expect(after?.residualRiskScore).toBe(before?.residualRiskScore);
        expect(after?.inherentRiskScore).toBe(before?.inherentRiskScore);
    });
});
