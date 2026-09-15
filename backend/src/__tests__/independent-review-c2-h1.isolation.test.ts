/**
 * Exploit-first isolation for independent-review C-2 / H-1.
 * Org A must not create, read, resolve, or analyze Org B records by ID.
 */
import request from 'supertest';
import {
    AssessmentType,
    ContractType,
    EnterpriseRiskCategory,
    VendorTier,
    VendorType,
} from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import vendorManagementService from '../services/vendorManagementService';
import vendorAssessmentService from '../services/vendorAssessmentService';
import vendorIssueService from '../services/vendorIssueService';
import vendorContractService from '../services/vendorContractService';

jest.setTimeout(60000);

const PASSWORD = 'TenantPass1x';
const API = '/api/v1';

function expectNoMetadata(res: { status: number; body: unknown; text?: string }, forbidden: string[]) {
    expect(res.status).toBe(404);
    const blob = `${JSON.stringify(res.body || {})} ${res.text || ''}`;
    for (const token of forbidden) {
        expect(blob).not.toContain(token);
    }
}

describe('independent review C-2 / H-1 tenant isolation', () => {
    const suffix = `${Date.now()}`;
    const markerB = `VENDOR_B_C2H1_${suffix}`;
    const orgBName = `Org B C2H1 ${suffix}`;
    let tokenA = '';
    let tokenB = '';
    let orgA = '';
    let orgB = '';
    let vendorA = '';
    let vendorA2 = '';
    let vendorB = '';
    let assessmentA = '';
    let assessmentA2 = '';
    let assessmentB = '';
    let contractA = '';
    let contractB = '';
    let breachB = '';
    let unitB = '';
    let templateA = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;

        const signupA = await request(app).post(`${API}/auth/signup`).send({
            email: `c2h1-a-${suffix}@tenant-a.test`,
            password: PASSWORD,
            firstName: 'User',
            lastName: 'A',
            organizationName: `Org A C2H1 ${suffix}`,
            country: 'US',
        });
        const signupB = await request(app).post(`${API}/auth/signup`).send({
            email: `c2h1-b-${suffix}@tenant-b.test`,
            password: PASSWORD,
            firstName: 'User',
            lastName: 'B',
            organizationName: orgBName,
            country: 'US',
        });
        expect(signupA.status).toBe(201);
        expect(signupB.status).toBe(201);
        tokenA = signupA.body.data.token;
        tokenB = signupB.body.data.token;
        orgA = signupA.body.data.user.organizationId;
        orgB = signupB.body.data.user.organizationId;

        const createdA = await vendorManagementService.createVendor({
            name: `Vendor A C2H1 ${suffix}`,
            vendorType: VendorType.SAAS,
            category: 'CLOUD_HOSTING',
            tier: VendorTier.HIGH,
            primaryContact: 'a@tenant-a.test',
            contactEmail: `a-${suffix}@tenant-a.test`,
            servicesProvided: 'Org A software',
            dataTypesAccessed: ['PII'],
            geographicFootprint: ['US'],
            regulatoryScope: ['SOC2'],
            organizationId: orgA,
        });
        vendorA = createdA.id;

        const createdA2 = await vendorManagementService.createVendor({
            name: `Vendor A2 C2H1 ${suffix}`,
            vendorType: VendorType.SAAS,
            category: 'CLOUD_HOSTING',
            tier: VendorTier.MEDIUM,
            primaryContact: 'a2@tenant-a.test',
            contactEmail: `a2-${suffix}@tenant-a.test`,
            servicesProvided: 'Org A second vendor',
            dataTypesAccessed: ['PII'],
            geographicFootprint: ['US'],
            regulatoryScope: ['SOC2'],
            organizationId: orgA,
        });
        vendorA2 = createdA2.id;

        const createdB = await vendorManagementService.createVendor({
            name: markerB,
            vendorType: VendorType.SAAS,
            category: 'CLOUD_HOSTING',
            tier: VendorTier.CRITICAL,
            primaryContact: 'b@tenant-b.test',
            contactEmail: `b-${suffix}@tenant-b.test`,
            servicesProvided: 'Org B software',
            dataTypesAccessed: ['PHI'],
            geographicFootprint: ['US'],
            regulatoryScope: ['HIPAA'],
            organizationId: orgB,
        });
        vendorB = createdB.id;

        const template = await prisma.questionnaireTemplate.create({
            data: {
                name: `C2H1 Template ${suffix}`,
                framework: 'Custom',
                version: '1.0.0',
                scopeKey: `org:${orgA}:c2h1`,
                organizationId: orgA,
                isActive: true,
                sections: {
                    create: [{
                        title: 'Access',
                        sortOrder: 0,
                        questions: { create: [{ questionKey: 'q1', questionText: 'MFA?', sortOrder: 0, category: 'Access' }] },
                    }],
                },
            },
        });
        templateA = template.id;
        await prisma.questionnaireTemplate.create({
            data: {
                name: `C2H1 Template B ${suffix}`,
                framework: 'Custom',
                version: '1.0.0',
                scopeKey: `org:${orgB}:c2h1`,
                organizationId: orgB,
                isActive: true,
                sections: {
                    create: [{
                        title: 'Access',
                        sortOrder: 0,
                        questions: { create: [{ questionKey: 'q1', questionText: 'MFA?', sortOrder: 0, category: 'Access' }] },
                    }],
                },
            },
        });

        const a1 = await vendorAssessmentService.createAssessment({
            vendorId: vendorA,
            organizationId: orgA,
            assessmentType: AssessmentType.INITIAL_DUE_DILIGENCE,
            templateId: templateA,
        });
        assessmentA = a1.id;
        const a2 = await vendorAssessmentService.createAssessment({
            vendorId: vendorA2,
            organizationId: orgA,
            assessmentType: AssessmentType.INITIAL_DUE_DILIGENCE,
            templateId: templateA,
        });
        assessmentA2 = a2.id;
        const bAssess = await vendorAssessmentService.createAssessment({
            vendorId: vendorB,
            organizationId: orgB,
            assessmentType: AssessmentType.INITIAL_DUE_DILIGENCE,
        });
        assessmentB = bAssess.id;

        const contractInput = {
            contractType: ContractType.MASTER_SERVICE_AGREEMENT,
            title: 'MSA',
            effectiveDate: new Date(),
            expirationDate: new Date(Date.now() + 86400000 * 365),
            contractValue: 1000,
        };
        contractA = (await vendorContractService.createContract({
            ...contractInput,
            vendorId: vendorA,
            organizationId: orgA,
        })).id;
        contractB = (await vendorContractService.createContract({
            ...contractInput,
            title: `B CONTRACT ${markerB}`,
            vendorId: vendorB,
            organizationId: orgB,
        })).id;

        const appetite = await prisma.riskAppetite.create({
            data: {
                organization: { connect: { id: orgB } },
                category: 'Third Party Risk',
                appetiteStatement: 'Org B appetite',
                riskTolerance: 70,
                earlyWarningThreshold: 50,
                approvedBy: 'Board',
                approvalDate: new Date(),
                reviewFrequency: 365,
                nextReviewDate: new Date(Date.now() + 86400000 * 365),
            },
        });
        const breach = await prisma.riskAppetiteBreach.create({
            data: {
                riskAppetiteId: appetite.id,
                breachType: 'Threshold Breach',
                actualRiskLevel: 90,
                thresholdExceeded: 70,
                excessAmount: 20,
                triggerEvent: 'Test',
                contributingFactors: [],
                vendorIds: [vendorB],
                notifiedPersonnel: [],
            },
        });
        breachB = breach.id;

        const unit = await prisma.businessUnit.create({
            data: { organizationId: orgB, name: `Unit B ${suffix}` },
        });
        unitB = unit.id;
    });

    afterAll(async () => {
        const orgs = [orgA, orgB].filter(Boolean);
        await prisma.sLATracking.deleteMany({ where: { contract: { organizationId: { in: orgs } } } });
        await prisma.vendorContract.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.riskAppetiteBreach.deleteMany({ where: { riskAppetite: { organizationId: { in: orgs } } } });
        await prisma.riskAppetite.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.enterpriseRisk.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.businessUnit.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.scoreCalculation.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.scoringMethodology.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.vendorIssue.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.vendorAssessment.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.questionnaireTemplate.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.vendor.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.refreshToken.deleteMany({ where: { user: { organizationId: { in: orgs } } } });
        await prisma.auditEvent.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.inAppNotification.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.notificationPreference.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.user.deleteMany({ where: { organizationId: { in: orgs } } });
        await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
        await prisma.$disconnect();
    });

    it('C-2 denies Org A assessment create against Org B vendor via TPRM', async () => {
        const res = await request(app)
            .post(`${API}/tprm/vendors/${vendorB}/assessments`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ assessmentType: 'INITIAL_DUE_DILIGENCE', organizationId: orgB });
        expectNoMetadata(res, [markerB, orgBName]);
        const created = await prisma.vendorAssessment.findFirst({
            where: { organizationId: orgA, vendorId: vendorB },
        });
        expect(created).toBeNull();
    });

    it('C-2 denies Org A assessment create against Org B vendor via legacy route', async () => {
        const res = await request(app)
            .post(`${API}/vendors/${vendorB}/assessments`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                vendorId: vendorB,
                assessmentType: 'DUE_DILIGENCE',
                organizationId: orgB,
            });
        expectNoMetadata(res, [markerB, orgBName]);
    });

    it('C-2 same-tenant assessment create still succeeds', async () => {
        const res = await request(app)
            .post(`${API}/tprm/vendors/${vendorA}/assessments`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ assessmentType: 'ANNUAL_REVIEW', templateId: templateA });
        expect(res.status).toBe(201);
        expect(res.body.data.vendorId).toBe(vendorA);
        expect(res.body.data.organizationId).toBe(orgA);
    });

    it('C-2 denies Org A finding create against Org B vendor', async () => {
        const tprm = await request(app)
            .post(`${API}/tprm/vendors/${vendorB}/findings`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ title: 'Injected', description: 'Cross tenant', severity: 'HIGH', category: 'Security' });
        expectNoMetadata(tprm, [markerB, orgBName]);

        const legacy = await request(app)
            .post(`${API}/vendors/${vendorB}/issues`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                vendorId: vendorB,
                title: 'Injected',
                description: 'Cross tenant',
                severity: 'HIGH',
                category: 'Security',
                organizationId: orgB,
            });
        expectNoMetadata(legacy, [markerB, orgBName]);
        const created = await prisma.vendorIssue.findFirst({
            where: { organizationId: orgA, vendorId: vendorB },
        });
        expect(created).toBeNull();
    });

    it('C-2 denies Org A finding create against Org B assessment', async () => {
        await expect(vendorIssueService.createIssue({
            vendorId: vendorA,
            organizationId: orgA,
            title: 'Mismatched assessment',
            description: 'Foreign assessment',
            issueType: 'AUDIT_FINDING',
            severity: 'HIGH' as any,
            priority: 'MEDIUM',
            source: 'INTERNAL_ASSESSMENT',
            identifiedBy: 'test',
            category: 'Security',
            assessmentId: assessmentB,
        })).rejects.toMatchObject({ statusCode: 404 });
    });

    it('C-2 rejects same-tenant vendor/assessment mismatch', async () => {
        await expect(vendorIssueService.createIssue({
            vendorId: vendorA,
            organizationId: orgA,
            title: 'Wrong vendor assessment',
            description: 'Same tenant mismatch',
            issueType: 'AUDIT_FINDING',
            severity: 'HIGH' as any,
            priority: 'MEDIUM',
            source: 'INTERNAL_ASSESSMENT',
            identifiedBy: 'test',
            category: 'Security',
            assessmentId: assessmentA2,
        })).rejects.toMatchObject({ statusCode: 409 });
    });

    it('C-2 same-tenant finding create succeeds', async () => {
        const res = await request(app)
            .post(`${API}/tprm/vendors/${vendorA}/findings`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                title: 'Same tenant finding',
                description: 'Valid',
                severity: 'MEDIUM',
                category: 'Security',
                assessmentId: assessmentA,
            });
        expect(res.status).toBe(201);
        expect(res.body.data.vendorId).toBe(vendorA);
        expect(res.body.data.organizationId).toBe(orgA);
    });

    it('C-2 child lookup does not include a foreign parent', async () => {
        const leaked = await vendorAssessmentService.getAssessmentById(assessmentB, orgA);
        expect(leaked).toBeNull();
        const owned = await vendorAssessmentService.getAssessmentById(assessmentA, orgA);
        expect(owned?.vendor && 'name' in owned.vendor ? owned.vendor.name : '').not.toContain(markerB);
    });

    it('H-1 denies risk-history snapshot and trend for a foreign vendor', async () => {
        const snap = await request(app)
            .post(`${API}/vendors/risk-history/${vendorB}/snapshot`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ reason: 'probe', organizationId: orgB });
        expectNoMetadata(snap, [markerB, orgBName]);
        const trend = await request(app)
            .get(`${API}/vendors/risk-history/${vendorB}`)
            .set('Authorization', `Bearer ${tokenA}`);
        expectNoMetadata(trend, [markerB, orgBName]);
        const ok = await request(app)
            .post(`${API}/vendors/risk-history/${vendorA}/snapshot`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ reason: 'same tenant' });
        expect(ok.status).toBe(201);
    });

    it('H-1 denies appetite breach resolve for a foreign breach', async () => {
        const denied = await request(app)
            .post(`${API}/risk-appetite/breaches/${breachB}/resolve`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ mitigationPlan: 'None', mitigationOwner: 'User A' });
        expectNoMetadata(denied, [markerB, orgBName, 'Org B appetite']);
        const stillOpen = await prisma.riskAppetiteBreach.findUnique({ where: { id: breachB } });
        expect(stillOpen?.status).toBe('OPEN');
    });

    it('H-1 denies contract analysis and SLA write for a foreign contract', async () => {
        const analysis = await request(app)
            .get(`${API}/vendors/contracts/${contractB}/risk-analysis`)
            .set('Authorization', `Bearer ${tokenA}`);
        expectNoMetadata(analysis, [markerB, orgBName, 'B CONTRACT']);

        const sla = await request(app)
            .post(`${API}/vendors/contracts/${contractB}/sla`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                contractId: contractB,
                incidentType: 'OTHER',
                incidentDate: new Date().toISOString(),
                description: 'probe',
                organizationId: orgB,
            });
        expectNoMetadata(sla, [markerB, orgBName]);

        const local = await vendorContractService.analyzeContractRisk(contractA, orgA);
        expect(local).toBeTruthy();
        const tracked = await vendorContractService.trackSLAMetric({
            organizationId: orgA,
            contractId: contractA,
            metricName: 'Uptime',
            metricType: 'AVAILABILITY',
            target: 99.9,
            actual: 99.95,
            unit: '%',
            period: 'MONTH',
            periodStart: new Date(),
            periodEnd: new Date(),
        });
        expect(tracked.contractId).toBe(contractA);
    });

    it('H-1 denies legacy offboard of a foreign vendor', async () => {
        const denied = await request(app)
            .post(`${API}/vendors/${vendorB}/offboard`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ dataReturned: true, dataDestroyed: true, accessRevoked: true });
        expectNoMetadata(denied, [markerB, orgBName]);
        const stillB = await prisma.vendor.findUnique({ where: { id: vendorB } });
        expect(stillB?.status).not.toBe('TERMINATED');
    });

    it('H-1 denies ERM link to a foreign business unit and ignores forged org', async () => {
        const denied = await request(app)
            .post(`${API}/erm/risks`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                title: 'Linked to B',
                category: EnterpriseRiskCategory.CYBERSECURITY,
                likelihood: 3,
                impact: 3,
                businessUnitId: unitB,
            });
        expect(denied.status).toBe(404);
        expect(JSON.stringify(denied.body)).not.toContain(markerB);
        expect(JSON.stringify(denied.body)).not.toContain(`Unit B ${suffix}`);

        const forged = await request(app)
            .post(`${API}/erm/risks`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                title: 'Forged org',
                category: EnterpriseRiskCategory.CYBERSECURITY,
                likelihood: 3,
                impact: 3,
                organizationId: orgB,
            });
        expect(forged.status).toBe(403);
        const created = await prisma.enterpriseRisk.findFirst({
            where: { organizationId: orgA, businessUnitId: unitB },
        });
        expect(created).toBeNull();

        const unitA = await prisma.businessUnit.create({
            data: { organizationId: orgA, name: `Unit A ${suffix}` },
        });
        const ok = await request(app)
            .post(`${API}/erm/risks`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                title: 'Linked to A',
                category: EnterpriseRiskCategory.CYBERSECURITY,
                likelihood: 2,
                impact: 2,
                businessUnitId: unitA.id,
            });
        expect(ok.status).toBe(201);
        expect(ok.body.data.businessUnitId).toBe(unitA.id);
    });

    it('H-1 customer metrics stay inside the authenticated organization', async () => {
        const res = await request(app)
            .get(`${API}/monitoring/business`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(res.status).toBe(200);
        expect(res.body.vendors).toBeGreaterThanOrEqual(2);
        const orgACount = await prisma.vendor.count({ where: { organizationId: orgA } });
        const orgBCount = await prisma.vendor.count({ where: { organizationId: orgB } });
        expect(orgBCount).toBeGreaterThan(0);
        expect(res.body.vendors).toBe(orgACount);
        expect(JSON.stringify(res.body)).not.toContain(markerB);
    });
});
