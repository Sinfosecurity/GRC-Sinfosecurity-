import request from 'supertest';
import { Role, ScanStatus, VendorTier } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { hashPassword } from '../services/passwordService';
import { supremeAutomationService } from '../services/supremeAutomationService';

jest.setTimeout(120000);

async function orgWithAdmin(suffix: string) {
    const org = await prisma.organization.create({ data: { name: `InsGap ${suffix}`, country: 'NG' } });
    const password = await hashPassword('ValidPass1x');
    const admin = await prisma.user.create({
        data: { email: `insgap-admin-${suffix}@a.test`, hashedPassword: password, firstName: 'Ada', lastName: 'Ins', role: Role.ORGANIZATION_ADMIN, organizationId: org.id },
    });
    const viewer = await prisma.user.create({
        data: { email: `insgap-viewer-${suffix}@a.test`, hashedPassword: password, firstName: 'Vic', lastName: 'View', role: Role.VIEWER, organizationId: org.id },
    });
    return { org, admin, viewer, password: 'ValidPass1x' };
}

async function login(email: string, password: string) {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password, plane: 'CUSTOMER' });
    expect(res.status).toBe(200);
    return res.body.data.token as string;
}

async function stored(orgId: string, userId: string, filename: string, scan: ScanStatus) {
    return prisma.storedObject.create({
        data: {
            organizationId: orgId,
            ownerType: 'organization',
            ownerId: orgId,
            filename,
            storageKey: `${orgId}/${filename}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            contentType: 'application/pdf',
            size: 24,
            checksum: `gap-${filename}`,
            uploadedBy: userId,
            scanStatus: scan,
        },
    });
}

describe('Insurance Edition bounded gap closure', () => {
    it('closes license evidence, reports, reinsurance vendor, automation dates, applicability attribution, and isolation', async () => {
        const suffix = `${Date.now()}`;
        const a = await orgWithAdmin(`a-${suffix}`);
        const b = await orgWithAdmin(`b-${suffix}`);
        const tokenA = await login(a.admin.email, a.password);
        const viewerA = await login(a.viewer.email, a.password);
        const tokenB = await login(b.admin.email, b.password);

        for (const token of [tokenA, tokenB]) {
            const activated = await request(app).post('/api/v1/insurance/activate').set('Authorization', `Bearer ${token}`).send({
                organizationType: 'INSURER',
                domicileCountryCode: 'NG',
                operatingJurisdictions: ['NG'],
                linesOfBusiness: ['MOTOR'],
                activities: ['CLAIMS'],
            });
            expect(activated.status).toBe(201);
        }

        const entityA = await request(app).post('/api/v1/insurance/entities').set('Authorization', `Bearer ${tokenA}`).send({
            name: 'Lagos Motor A',
            organizationType: 'INSURER',
            domicileCountryCode: 'NG',
            linesOfBusiness: ['MOTOR'],
        });
        expect(entityA.status).toBe(201);
        const licenseA = await request(app).post('/api/v1/insurance/licenses').set('Authorization', `Bearer ${tokenA}`).send({
            entityPublicId: entityA.body.data.publicId,
            authorityKey: 'NAICOM',
            jurisdictionCode: 'NG',
            licenseType: 'NG_INSURER',
            status: 'ACTIVE',
            expiryDate: new Date(Date.now() + 10 * 86400000).toISOString(),
            reviewDueAt: new Date(Date.now() + 5 * 86400000).toISOString(),
            verificationBasis: 'CUSTOMER_RECORDED',
        });
        expect(licenseA.status).toBe(201);
        const licensePublicId = licenseA.body.data.publicId;

        const cleanA = await stored(a.org.id, a.admin.id, `license-a-${suffix}.pdf`, ScanStatus.CLEAN);
        const dirtyA = await stored(a.org.id, a.admin.id, `dirty-a-${suffix}.pdf`, ScanStatus.INFECTED);
        const cleanB = await stored(b.org.id, b.admin.id, `license-b-${suffix}.pdf`, ScanStatus.CLEAN);

        const viewerAttach = await request(app).post(`/api/v1/insurance/licenses/${licensePublicId}/evidence`).set('Authorization', `Bearer ${viewerA}`).send({ evidenceObjectId: cleanA.id });
        expect(viewerAttach.status).toBe(403);

        const dirty = await request(app).post(`/api/v1/insurance/licenses/${licensePublicId}/evidence`).set('Authorization', `Bearer ${tokenA}`).send({ evidenceObjectId: dirtyA.id });
        expect(dirty.status).toBe(403);

        const foreign = await request(app).post(`/api/v1/insurance/licenses/${licensePublicId}/evidence`).set('Authorization', `Bearer ${tokenA}`).send({ evidenceObjectId: cleanB.id });
        expect([403, 404]).toContain(foreign.status);

        const otherLicense = await request(app).post(`/api/v1/insurance/licenses/${licensePublicId}/evidence`).set('Authorization', `Bearer ${tokenB}`).send({ evidenceObjectId: cleanB.id });
        expect([403, 404]).toContain(otherLicense.status);

        const attached = await request(app).post(`/api/v1/insurance/licenses/${licensePublicId}/evidence`).set('Authorization', `Bearer ${tokenA}`).send({ evidenceObjectId: cleanA.id });
        expect(attached.status).toBe(201);
        expect(attached.body.data.evidence.id).toBe(cleanA.id);
        expect(attached.body.data.evidence.usable).toBe(true);

        const listed = await request(app).get('/api/v1/insurance/licenses').set('Authorization', `Bearer ${tokenA}`);
        expect(listed.body.data[0].evidence.filename).toBe(cleanA.filename);
        const otherList = await request(app).get('/api/v1/insurance/licenses').set('Authorization', `Bearer ${tokenB}`);
        expect(JSON.stringify(otherList.body)).not.toContain(licensePublicId);
        expect(JSON.stringify(otherList.body)).not.toContain(cleanA.id);

        const downloadA = await request(app).get(`/api/v1/documents/${cleanA.id}/download`).set('Authorization', `Bearer ${tokenA}`);
        expect([200, 404, 409]).toContain(downloadA.status);
        expect(downloadA.status).not.toBe(403);
        const downloadB = await request(app).get(`/api/v1/documents/${cleanA.id}/download`).set('Authorization', `Bearer ${tokenB}`);
        expect([403, 404]).toContain(downloadB.status);
        const anon = await request(app).get(`/api/v1/documents/${cleanA.id}/download`);
        expect(anon.status).toBe(401);

        const audit = await prisma.auditEvent.findMany({ where: { organizationId: a.org.id, action: 'insurance.license.evidence.attached' } });
        expect(audit[0].metadata).toEqual(expect.objectContaining({ evidenceObjectId: cleanA.id, action: 'attached' }));

        const applicability = await request(app).post('/api/v1/insurance/regulatory/applicability').set('Authorization', `Bearer ${tokenA}`).send({
            packKey: 'ng-insurer-core',
            state: 'APPLICABLE',
            reason: 'Nigerian insurer domicile recorded.',
        });
        expect(applicability.status).toBe(201);
        const viewerApp = await request(app).post('/api/v1/insurance/regulatory/applicability').set('Authorization', `Bearer ${viewerA}`).send({
            packKey: 'ng-insurer-core',
            state: 'NOT_APPLICABLE',
            reason: 'Viewer cannot decide.',
        });
        expect(viewerApp.status).toBe(403);
        const regulatory = await request(app).get('/api/v1/insurance/regulatory').set('Authorization', `Bearer ${tokenA}`);
        const pack = regulatory.body.data.packs.find((row: { key: string }) => row.key === 'ng-insurer-core');
        expect(pack.applicabilityState).toBe('APPLICABLE');
        expect(pack.lastDecidedBy).toMatch(/Ada/);
        expect(pack.lastDecidedAt).toBeTruthy();
        expect(pack.lastReason).toMatch(/Nigerian insurer/);
        expect(pack.recommendationVsDecision).toMatch(/Human applicability decision/);

        const vendorA = await prisma.vendor.create({
            data: {
                organizationId: a.org.id,
                name: `Reinsurer A ${suffix}`,
                vendorType: 'SAAS',
                category: 'TECHNOLOGY',
                tier: VendorTier.HIGH,
                status: 'ACTIVE',
                primaryContact: 're@a.test',
                contactEmail: `re-a-${suffix}@a.test`,
                servicesProvided: 'Treaty',
                residualRiskScore: 40,
            },
        });
        const vendorB = await prisma.vendor.create({
            data: {
                organizationId: b.org.id,
                name: `Reinsurer B ${suffix}`,
                vendorType: 'SAAS',
                category: 'TECHNOLOGY',
                tier: VendorTier.HIGH,
                status: 'ACTIVE',
                primaryContact: 're@b.test',
                contactEmail: `re-b-${suffix}@b.test`,
                servicesProvided: 'Treaty',
                residualRiskScore: 40,
            },
        });
        const stolenVendor = await request(app).post('/api/v1/insurance/counterparties').set('Authorization', `Bearer ${tokenA}`).send({
            name: 'Stolen',
            vendorId: vendorB.id,
            relationshipType: 'TREATY',
        });
        expect([403, 404]).toContain(stolenVendor.status);
        const counterparty = await request(app).post('/api/v1/insurance/counterparties').set('Authorization', `Bearer ${tokenA}`).send({
            name: 'Treaty partner',
            vendorId: vendorA.id,
            relationshipType: 'TREATY',
            jurisdictionCode: 'NG',
            criticality: 'MATERIAL',
        });
        expect(counterparty.status).toBe(201);
        expect(counterparty.body.data.vendorId).toBe(vendorA.id);
        const viewerCounter = await request(app).post('/api/v1/insurance/counterparties').set('Authorization', `Bearer ${viewerA}`).send({
            name: 'Viewer cannot write',
            vendorId: vendorA.id,
            relationshipType: 'TREATY',
        });
        expect(viewerCounter.status).toBe(403);
        const reinsurance = await request(app).get('/api/v1/insurance/reinsurance').set('Authorization', `Bearer ${tokenA}`);
        expect(reinsurance.body.data.counterparties[0].vendorId).toBe(vendorA.id);
        expect(reinsurance.body.data.counterparties[0].vendorName).toBe(vendorA.name);
        const otherRe = await request(app).get('/api/v1/insurance/reinsurance').set('Authorization', `Bearer ${tokenB}`);
        expect(JSON.stringify(otherRe.body)).not.toContain(vendorA.id);
        expect(JSON.stringify(otherRe.body)).not.toContain(counterparty.body.data.publicId);

        const reports = await request(app).get('/api/v1/insurance/reports').set('Authorization', `Bearer ${tokenA}`);
        expect(reports.status).toBe(200);
        expect(reports.body.data.honesty).toMatch(/not fabricated/i);
        expect(JSON.stringify(reports.body.data)).not.toMatch(/100%/);
        const keys = reports.body.data.reports.map((row: { key: string }) => row.key);
        expect(keys).toEqual(['executive', 'third-parties', 'licenses', 'regulatory', 'models', 'concentration']);
        expect(reports.body.data.reports.find((row: { key: string }) => row.key === 'licenses').data.length).toBeGreaterThan(0);
        expect(reports.body.data.reports.find((row: { key: string }) => row.key === 'regulatory').data.packs[0].decidedBy).toBeTruthy();

        const system = await prisma.aiSystem.create({
            data: { organizationId: a.org.id, publicId: `AI-GAP-${suffix}`, name: `Claims model ${suffix}`, businessOwner: 'Underwriting owner' },
        });
        const ai = await request(app).post('/api/v1/insurance/ai-contexts').set('Authorization', `Bearer ${tokenA}`).send({
            aiSystemId: system.id,
            insuranceUseCase: 'CLAIMS',
            claimsInfluence: true,
            humanOversight: 'Required',
            nextReviewAt: new Date(Date.now() - 86400000).toISOString(),
        });
        expect(ai.status).toBe(200);

        const licenseAuto = await request(app).post('/api/v1/automation').set('Authorization', `Bearer ${tokenA}`).send({
            templateKey: 'insurance-license-review-due',
            ownerUserId: a.admin.id,
        });
        expect(licenseAuto.status).toBe(201);
        await request(app).post(`/api/v1/automation/${licenseAuto.body.data.publicId}/publish`).set('Authorization', `Bearer ${tokenA}`).send({});
        const modelAuto = await request(app).post('/api/v1/automation').set('Authorization', `Bearer ${tokenA}`).send({
            templateKey: 'insurance-model-review-overdue',
            ownerUserId: a.admin.id,
        });
        expect(modelAuto.status).toBe(201);
        await request(app).post(`/api/v1/automation/${modelAuto.body.data.publicId}/publish`).set('Authorization', `Bearer ${tokenA}`).send({});

        const first = await supremeAutomationService.scan(a.org.id);
        expect(first.runs).toBeGreaterThan(0);
        const executions = await prisma.automationExecution.findMany({ where: { organizationId: a.org.id } });
        const licenseRuns = executions.filter((row) => row.sourceModel === 'InsuranceLicense' && row.triggerEvent === 'scheduled.review');
        const aiRuns = executions.filter((row) => row.sourceModel === 'InsuranceAiContext' && row.triggerEvent === 'ai.approval.due');
        expect(licenseRuns.length).toBe(1);
        expect(aiRuns.length).toBe(1);
        expect(JSON.stringify(licenseRuns[0])).not.toMatch(/operating illegally/i);
        const second = await supremeAutomationService.scan(a.org.id);
        void second;
        const after = await prisma.automationExecution.findMany({ where: { organizationId: a.org.id } });
        expect(after.filter((row) => row.sourceModel === 'InsuranceLicense').length).toBe(1);
        expect(after.filter((row) => row.sourceModel === 'InsuranceAiContext').length).toBe(1);
        const still = await prisma.aiSystem.findUnique({ where: { id: system.id } });
        expect(String(still?.lifecycle || '')).not.toMatch(/APPROVED/i);

        const viewerReports = await request(app).get('/api/v1/insurance/reports').set('Authorization', `Bearer ${viewerA}`);
        expect(viewerReports.status).toBe(200);
    });
});
