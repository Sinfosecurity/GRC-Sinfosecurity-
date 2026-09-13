/**
 * Isolated database-backed smoke test. Not hosted staging load.
 * Not enterprise scale certification.
 */
import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/database';
import { enterpriseComplianceService } from '../services/enterpriseComplianceService';
import { renderComplianceBoardPptx, renderCompliancePdf } from '../reports/enterpriseComplianceReports';
import { seedPlatformCatalog, adoptCatalogForOrganization } from '../services/sharedControlEvidenceService';

jest.setTimeout(180000);

const PASSWORD = 'CmpPerf1xx';
const API = '/api/v1';

describe('compliance database-backed performance smoke', () => {
    let organizationId = '';
    let token = '';
    let activationId = '';

    beforeAll(async () => {
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `cmp-perf-${Date.now()}@tenant-perf.test`,
            password: PASSWORD,
            firstName: 'Cmp',
            lastName: 'Perf',
            organizationName: `CMP Perf ${Date.now()}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        token = signup.body.data.token;
        organizationId = signup.body.data.user.organizationId;
        await seedPlatformCatalog();
        await adoptCatalogForOrganization(organizationId);
        const framework = await prisma.frameworkDefinition.create({
            data: { frameworkKey: `PERF_${Date.now()}`, name: 'Performance pack', publisher: 'Supreme' },
        });
        const version = await prisma.frameworkVersion.create({
            data: { frameworkId: framework.id, version: 'perf-ref', status: 'ACTIVE' },
        });
        const createdReqs = Array.from({ length: 1000 }, (_, index) => ({
            frameworkVersionId: version.id,
            requirementKey: `PERF-${index}`,
            supremeSummary: `Supreme summary: synthetic performance requirement ${index}.`,
        }));
        await prisma.frameworkRequirement.createMany({ data: createdReqs });
        const created = await request(app).post(`${API}/compliance/activations`).set('Authorization', `Bearer ${token}`).send({
            frameworkVersionId: version.id,
        });
        expect(created.status).toBe(201);
        activationId = created.body.data.publicId;
    });

    it('measures dashboard, requirements, and report generation', async () => {
        const mark = async <T>(name: string, work: () => Promise<T>, limit: number) => {
            const start = Date.now();
            await work();
            const ms = Date.now() - start;
            expect(ms).toBeLessThan(limit);
            return [name, ms] as const;
        };
        const dashboard = await mark('dashboard', () => enterpriseComplianceService.dashboard(organizationId), 15000);
        const detail = await mark('frameworkDetail', () => enterpriseComplianceService.getActivation(organizationId, activationId), 12000);
        const list = await mark('requirements', () => enterpriseComplianceService.listRequirements(organizationId, {}), 12000);
        const cross = await mark('crossFramework', () => enterpriseComplianceService.crossFramework(organizationId), 12000);
        const pdf = await mark('reportPdf', () => renderCompliancePdf(organizationId, 'board'), 20000);
        const pptx = await mark('reportPptx', () => renderComplianceBoardPptx(organizationId), 20000);
        // eslint-disable-next-line no-console
        console.log('CMP_DB_PERFORMANCE_MS', {
            dashboard: dashboard[1],
            frameworkDetail: detail[1],
            requirements: list[1],
            crossFramework: cross[1],
            reportPdf: pdf[1],
            reportPptx: pptx[1],
            honesty: 'Isolated test database. Not hosted staging. Not enterprise scale certification.',
        });
    });
});
