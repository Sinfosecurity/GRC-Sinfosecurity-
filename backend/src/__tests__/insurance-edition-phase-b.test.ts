import request from 'supertest';
import { Role, VendorTier } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { hashPassword } from '../services/passwordService';
import { recommendPacks } from '../insurance/catalog';
import { FUTURE_JURISDICTIONS, REGULATORY_REQUIREMENTS, generateAssessmentPlan, recommendRegulatoryPacks } from '../insurance/regulatoryCatalog';
import { insuranceIraFloors, INSURANCE_IRA_METADATA } from '../insurance/iraOverlay';
import { enterprisePrivacyService } from '../services/enterprisePrivacyService';
import { CONTROL_EXTENSIONS } from '../insurance/catalog';
import { scoreIra } from '../tprm/iraScoring';
import { IRA_QUESTIONS } from '../tprm/iraCatalog';
import { insuranceOperations } from '../insurance/operationsService';
import { publicApiClientService } from '../publicApi/clientService';

jest.setTimeout(60000);

async function orgWithAdmin(suffix: string) {
    const org = await prisma.organization.create({ data: { name: `InsB ${suffix}`, country: 'NG' } });
    const password = await hashPassword('ValidPass1x');
    const admin = await prisma.user.create({
        data: { email: `insb-admin-${suffix}@a.test`, hashedPassword: password, firstName: 'Ada', lastName: 'Ins', role: Role.ORGANIZATION_ADMIN, organizationId: org.id },
    });
    const viewer = await prisma.user.create({
        data: { email: `insb-viewer-${suffix}@a.test`, hashedPassword: password, firstName: 'Vic', lastName: 'View', role: Role.VIEWER, organizationId: org.id },
    });
    return { org, admin, viewer, password: 'ValidPass1x' };
}

async function login(email: string, password: string) {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password, plane: 'CUSTOMER' });
    expect(res.status).toBe(200);
    return res.body.data.token as string;
}

describe('Insurance Edition Phase B', () => {
    it('stores provenance and keeps requirement kinds separate', () => {
        expect(REGULATORY_REQUIREMENTS.every((row) => row.sourceUrl && row.regulator && row.instrument && row.sourceReference && row.kind)).toBe(true);
        expect(REGULATORY_REQUIREMENTS.some((row) => row.kind === 'AUTHORITATIVE_REQUIREMENT')).toBe(true);
        expect(REGULATORY_REQUIREMENTS.some((row) => row.kind === 'GUIDANCE_SUPERVISORY_EXPECTATION')).toBe(true);
        const naic = REGULATORY_REQUIREMENTS.find((row) => row.id === 'NAIC-668-4');
        expect(naic?.kind).toBe('GUIDANCE_SUPERVISORY_EXPECTATION');
        expect(naic?.requirementText).toMatch(/enforceable only where a state has adopted/i);
        const ny = REGULATORY_REQUIREMENTS.find((row) => row.id === 'NYDFS-500.2');
        expect(ny?.sourceUrl).toMatch(/dfs\.ny\.gov/);
        expect(ny?.jurisdiction).toBe('US-NY');
    });

    it('differentiates Nigerian insurer, broker, and loss-adjuster packs', () => {
        const insurer = recommendRegulatoryPacks({ organizationType: 'INSURER', countries: ['NG'] }).map((row) => row.key);
        const broker = recommendRegulatoryPacks({ organizationType: 'BROKER', countries: ['NG'] }).map((row) => row.key);
        const adjuster = recommendRegulatoryPacks({ organizationType: 'LOSS_ADJUSTER', countries: ['NG'] }).map((row) => row.key);
        expect(insurer).toContain('ng-insurer-core');
        expect(insurer).not.toContain('ng-broker-core');
        expect(insurer).not.toContain('ng-loss-adjuster-core');
        expect(broker).toContain('ng-broker-core');
        expect(broker).not.toContain('ng-insurer-core');
        expect(adjuster).toContain('ng-loss-adjuster-core');
        expect(adjuster).not.toContain('ng-insurer-core');
        expect(insurer).toContain('ng-privacy-ndpa');
    });

    it('keeps US base + overlay architecture and does not apply NYDFS without US-NY', () => {
        const ohio = recommendRegulatoryPacks({ organizationType: 'INSURER', countries: ['US'], subJurisdictions: ['US-OH'] }).map((row) => row.key);
        const york = recommendRegulatoryPacks({ organizationType: 'INSURER', countries: ['US'], subJurisdictions: ['US-NY'] }).map((row) => row.key);
        expect(ohio).toContain('us-base');
        expect(ohio).toContain('naic-data-security-model');
        expect(ohio).not.toContain('nydfs-500');
        expect(york).toContain('nydfs-500');
        expect(recommendPacks({ organizationType: 'INSURER', countries: ['GB'] }).some((row) => row.key === 'nydfs-500')).toBe(false);
        expect(insuranceOperations.futureArchitectureIntact().laterCapableWithoutSchemaChange).toEqual(FUTURE_JURISDICTIONS);
    });

    it('does not fabricate an IRA tier from Don\'t know', () => {
        const baseline = IRA_QUESTIONS.map((question) => ({ questionKey: question.key, response: question.options[0].value }));
        const scored = scoreIra([...baseline, { questionKey: 'ins7', response: 'dont_know' }, { questionKey: 'ins14', response: 'dont_know' }]);
        expect(insuranceIraFloors([...baseline, { questionKey: 'ins7', response: 'dont_know' }]).every((row) => !row.applies || row.code !== 'ins-funds')).toBe(true);
        expect(scored.floors.some((row) => row.code === 'ins-funds' && row.applies)).toBe(false);
        expect(INSURANCE_IRA_METADATA).toHaveLength(14);
        expect(INSURANCE_IRA_METADATA.every((row) => row.dontKnow.toLowerCase().includes('no floor'))).toBe(true);
        expect(INSURANCE_IRA_METADATA.every((row) => row.requesterQualification && row.possibleHumanReview && row.evidenceRationale)).toBe(true);
        expect(VendorTier.HIGH).toBeDefined();
        const brokerPlan = generateAssessmentPlan({ organizationType: 'BROKER', enabledPacks: ['broker-intermediary', 'insurance-core'] });
        const insurerPlan = generateAssessmentPlan({ organizationType: 'INSURER', enabledPacks: ['insurance-core', 'underwriting-pricing'] });
        expect(brokerPlan.some((row) => row.id === 'IQ-UW-01')).toBe(false);
        expect(insurerPlan.some((row) => row.id === 'IQ-UW-01')).toBe(true);
        expect(CONTROL_EXTENSIONS.every((row) => row.controlKey.startsWith('INS-'))).toBe(true);
        expect(enterprisePrivacyService.catalog().insuranceContext.categories).toContain('Policyholder');
        expect(enterprisePrivacyService.catalog().insuranceContext.honesty).toMatch(/not a second privacy module/i);
        expect(FUTURE_JURISDICTIONS).toEqual(['GB', 'EU', 'AE', 'SA', 'ZA', 'KE', 'GH', 'SG', 'AU']);
    });

    it('requires a reason for not-applicable and records license honesty, vendor class, and reports', async () => {
        const suffix = `${Date.now()}`;
        const a = await orgWithAdmin(suffix);
        const token = await login(a.admin.email, a.password);
        const viewer = await login(a.viewer.email, a.password);

        const activated = await request(app).post('/api/v1/insurance/activate').set('Authorization', `Bearer ${token}`).send({
            organizationType: 'INSURER',
            domicileCountryCode: 'NG',
            operatingJurisdictions: ['NG'],
            linesOfBusiness: ['MOTOR'],
            activities: ['CLAIMS', 'UNDERWRITING'],
            dataHandled: ['POLICYHOLDER'],
        });
        expect(activated.status).toBe(201);

        const denied = await request(app).post('/api/v1/insurance/regulatory/applicability').set('Authorization', `Bearer ${viewer}`).send({
            packKey: 'nydfs-500',
            state: 'NOT_APPLICABLE',
            reason: 'Not a New York entity',
        });
        expect(denied.status).toBe(403);

        const missingReason = await request(app).post('/api/v1/insurance/regulatory/applicability').set('Authorization', `Bearer ${token}`).send({
            packKey: 'nydfs-500',
            state: 'NOT_APPLICABLE',
        });
        expect(missingReason.status).toBe(400);

        const reviewed = await request(app).post('/api/v1/insurance/regulatory/applicability').set('Authorization', `Bearer ${token}`).send({
            packKey: 'nydfs-500',
            state: 'NOT_APPLICABLE',
            reason: 'Domicile is Nigeria. New York is not a recorded operating jurisdiction.',
        });
        expect(reviewed.status).toBe(201);

        const regulatory = await request(app).get('/api/v1/insurance/regulatory').set('Authorization', `Bearer ${token}`);
        expect(regulatory.status).toBe(200);
        const nydfs = regulatory.body.data.packs.find((row: { key: string }) => row.key === 'nydfs-500');
        expect(nydfs.applicabilityState).toBe('NOT_APPLICABLE');
        expect(nydfs.requirements[0].sourceUrl).toBeTruthy();
        expect(JSON.stringify(regulatory.body.data)).not.toMatch(/100%/);

        const entity = await request(app).post('/api/v1/insurance/entities').set('Authorization', `Bearer ${token}`).send({
            name: 'Lagos Motor',
            organizationType: 'INSURER',
            domicileCountryCode: 'NG',
            linesOfBusiness: ['MOTOR'],
        });
        expect(entity.status).toBe(201);

        const expired = await request(app).post('/api/v1/insurance/licenses').set('Authorization', `Bearer ${token}`).send({
            entityPublicId: entity.body.data.publicId,
            authorityKey: 'NAICOM',
            jurisdictionCode: 'NG',
            licenseType: 'NG_INSURER',
            status: 'EXPIRED',
            expiryDate: '2020-01-01',
            verificationBasis: 'CUSTOMER_RECORDED',
        });
        expect(expired.status).toBe(201);

        const attention = await request(app).get('/api/v1/insurance/license-attention').set('Authorization', `Bearer ${token}`);
        expect(attention.body.data[0].message).toMatch(/not a finding that the entity is operating illegally/i);
        expect(attention.body.data[0].verificationHonesty).toMatch(/Customer-recorded/);

        const vendor = await prisma.vendor.create({
            data: {
                organizationId: a.org.id,
                name: `TPA ${suffix}`,
                vendorType: 'SAAS',
                category: 'TECHNOLOGY',
                tier: 'HIGH',
                status: 'ACTIVE',
                primaryContact: 'ops@tpa.test',
                contactEmail: `tpa-${suffix}@tpa.test`,
                servicesProvided: 'Claims administration',
                residualRiskScore: 55,
            },
        });
        const classified = await request(app).post('/api/v1/insurance/vendors').set('Authorization', `Bearer ${token}`).send({
            vendorId: vendor.id,
            serviceCategory: 'TPA',
            jurisdictionCode: 'NG',
            claimsAuthority: true,
            regulatedOutsourcing: true,
            criticality: 'CRITICAL',
        });
        expect(classified.status).toBe(201);

        const claims = await request(app).get('/api/v1/insurance/claims').set('Authorization', `Bearer ${token}`);
        expect(claims.status).toBe(200);
        expect(claims.body.data.honesty).toMatch(/not a claims-processing system/i);
        expect(claims.body.data.vendors.some((row: { vendorId: string }) => row.vendorId === vendor.id)).toBe(true);

        const system = await prisma.aiSystem.create({
            data: { organizationId: a.org.id, publicId: `AI-${suffix}`, name: `Claims model ${suffix}` },
        });
        const ai = await request(app).post('/api/v1/insurance/ai-contexts').set('Authorization', `Bearer ${token}`).send({
            aiSystemId: system.id,
            insuranceUseCase: 'CLAIMS',
            claimsInfluence: true,
            humanOversight: 'Required',
        });
        expect(ai.status).toBe(200);

        const reports = await request(app).get('/api/v1/insurance/reports').set('Authorization', `Bearer ${token}`);
        expect(reports.status).toBe(200);
        expect(reports.body.data.reports.map((row: { key: string }) => row.key)).toEqual(['executive', 'third-parties', 'licenses', 'regulatory', 'models', 'concentration']);

        const client = await publicApiClientService.create(a.org.id, a.admin.id, { name: 'Ins B read', scopes: ['insurance:read'] });
        const packs = await request(app).get('/public/v1/insurance/regulatory-packs').set('Authorization', `Bearer ${client.token}`);
        expect(packs.status).toBe(200);
        const writeDenied = await request(app).post('/public/v1/insurance/regulatory-packs').set('Authorization', `Bearer ${client.token}`).send({});
        expect([401, 403, 404, 405]).toContain(writeDenied.status);

        const audit = await prisma.auditEvent.findMany({ where: { organizationId: a.org.id, action: { startsWith: 'insurance.' } } });
        expect(audit.some((row) => row.action === 'insurance.applicability.reviewed')).toBe(true);
        expect(audit.some((row) => row.action === 'insurance.vendor.classified')).toBe(true);
        expect(JSON.stringify(audit)).not.toContain(client.token);
    });
});
