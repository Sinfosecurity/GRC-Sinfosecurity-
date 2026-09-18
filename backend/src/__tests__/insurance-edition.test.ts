import request from 'supertest';
import { Role, VendorTier } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { hashPassword } from '../services/passwordService';
import { insuranceService } from '../insurance/insuranceService';
import { recommendPacks, typesForCountry } from '../insurance/catalog';
import { iraQuestionsForEdition, insuranceIraFloors } from '../insurance/iraOverlay';
import { IRA_QUESTIONS } from '../tprm/iraCatalog';
import { scoreIra } from '../tprm/iraScoring';
import { publicApiClientService } from '../publicApi/clientService';

jest.setTimeout(60000);

async function orgWithAdmin(suffix: string) {
    const org = await prisma.organization.create({ data: { name: `Ins ${suffix}`, country: 'NG' } });
    const password = await hashPassword('ValidPass1x');
    const admin = await prisma.user.create({
        data: { email: `ins-admin-${suffix}@a.test`, hashedPassword: password, firstName: 'Ada', lastName: 'Ins', role: Role.ORGANIZATION_ADMIN, organizationId: org.id },
    });
    const viewer = await prisma.user.create({
        data: { email: `ins-viewer-${suffix}@a.test`, hashedPassword: password, firstName: 'Vic', lastName: 'View', role: Role.VIEWER, organizationId: org.id },
    });
    return { org, admin, viewer, password: 'ValidPass1x' };
}

async function login(email: string, password: string) {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password, plane: 'CUSTOMER' });
    expect(res.status).toBe(200);
    return res.body.data.token as string;
}

describe('Insurance Edition Phase A', () => {
    it('keeps catalogs global and does not treat Nigeria or US types as universal', () => {
        expect(typesForCountry('NG').some((row) => row.key === 'TAKAFUL_OPERATOR')).toBe(true);
        expect(typesForCountry('US').some((row) => row.key === 'TAKAFUL_OPERATOR')).toBe(false);
        expect(typesForCountry('GB').length).toBeGreaterThan(typesForCountry('NG').length);
        const recommended = recommendPacks({ organizationType: 'INSURER', activities: ['CLAIMS'], countries: ['NG'], dataHandled: [] });
        expect(recommended.some((row) => row.key === 'claims-operations')).toBe(true);
        expect(recommended.find((row) => row.key === 'naicom-placeholder')?.reason).toMatch(/Not a statement of legal applicability/);
        expect(recommendPacks({ organizationType: 'INSURER', activities: [], countries: ['US'] }).some((row) => row.key === 'nydfs-overlay')).toBe(false);
    });

    it('does not change baseline IRA scoring when insurance answers are absent', () => {
        expect(iraQuestionsForEdition(false)).toEqual(IRA_QUESTIONS);
        expect(iraQuestionsForEdition(true).length).toBeGreaterThan(IRA_QUESTIONS.length);
        const baseline = IRA_QUESTIONS.map((question) => ({ questionKey: question.key, response: question.options[0].value }));
        const without = scoreIra(baseline);
        const withEmptyOverlay = scoreIra(baseline);
        expect(without.percent).toBe(withEmptyOverlay.percent);
        expect(insuranceIraFloors(baseline)).toEqual([]);
        const overlay = scoreIra([...baseline, { questionKey: 'ins7', response: 'yes' }]);
        expect(overlay.floors.some((row) => row.code === 'ins-funds' && row.applies)).toBe(true);
    });

    it('activates a versioned edition, isolates tenants, versions history, and denies viewers writes', async () => {
        await prisma.$queryRaw`SELECT 1`;
        const suffix = `${Date.now()}`;
        const a = await orgWithAdmin(`a-${suffix}`);
        const b = await orgWithAdmin(`b-${suffix}`);
        const adminToken = await login(a.admin.email, a.password);
        const viewerToken = await login(a.viewer.email, a.password);
        const otherToken = await login(b.admin.email, b.password);

        const catalog = await request(app).get('/api/v1/insurance/catalog').set('Authorization', `Bearer ${adminToken}`);
        expect(catalog.status).toBe(200);
        expect(catalog.body.data.honesty).toMatch(/not applicable regulation/i);

        const denied = await request(app).post('/api/v1/insurance/activate').set('Authorization', `Bearer ${viewerToken}`).send({
            organizationType: 'INSURER',
            domicileCountryCode: 'NG',
        });
        expect(denied.status).toBe(403);

        const activated = await request(app).post('/api/v1/insurance/activate').set('Authorization', `Bearer ${adminToken}`).send({
            organizationType: 'INSURER',
            domicileCountryCode: 'NG',
            operatingJurisdictions: ['NG', 'US'],
            linesOfBusiness: ['MOTOR', 'LIFE'],
            activities: ['CLAIMS', 'UNDERWRITING'],
            dataHandled: ['POLICYHOLDER'],
        });
        expect(activated.status).toBe(201);
        expect(activated.body.data.version).toBe(1);
        expect(JSON.stringify(activated.body.data.recommendedPacks)).toMatch(/Recommended based on your configuration/);

        const revised = await request(app).post('/api/v1/insurance/activate').set('Authorization', `Bearer ${adminToken}`).send({
            organizationType: 'INSURER',
            domicileCountryCode: 'NG',
            operatingJurisdictions: ['NG', 'US', 'GB'],
            linesOfBusiness: ['MOTOR'],
            activities: ['CLAIMS'],
            dataHandled: ['POLICYHOLDER'],
        });
        expect(revised.status).toBe(201);
        expect(revised.body.data.version).toBe(2);
        const history = await request(app).get('/api/v1/insurance/configuration').set('Authorization', `Bearer ${adminToken}`);
        expect(history.body.data.history.some((row: { status: string; version: number }) => row.version === 1 && row.status === 'SUPERSEDED')).toBe(true);

        const group = await request(app).post('/api/v1/insurance/entities').set('Authorization', `Bearer ${adminToken}`).send({
            name: 'Atlantic HoldCo',
            organizationType: 'INSURER',
            domicileCountryCode: 'NG',
            isGroup: true,
            linesOfBusiness: ['MOTOR'],
        });
        expect(group.status).toBe(201);
        const nigeria = await request(app).post('/api/v1/insurance/entities').set('Authorization', `Bearer ${adminToken}`).send({
            name: 'Lagos Life',
            organizationType: 'INSURER',
            domicileCountryCode: 'NG',
            linesOfBusiness: ['LIFE'],
            parentEntityId: group.body.data.id,
        });
        const united = await request(app).post('/api/v1/insurance/entities').set('Authorization', `Bearer ${adminToken}`).send({
            name: 'Ohio Casualty',
            organizationType: 'INSURER',
            domicileCountryCode: 'US',
            domicileSubJurisdiction: 'US-OTHER',
            linesOfBusiness: ['CASUALTY'],
        });
        expect(nigeria.status).toBe(201);
        expect(united.status).toBe(201);

        const license = await request(app).post('/api/v1/insurance/licenses').set('Authorization', `Bearer ${adminToken}`).send({
            entityPublicId: nigeria.body.data.publicId,
            authorityKey: 'NAICOM',
            jurisdictionCode: 'NG',
            licenseType: 'NG_INSURER',
            reference: 'placeholder-not-a-real-license',
            status: 'UNKNOWN',
        });
        expect(license.status).toBe(201);
        expect(license.body.data.notes).toMatch(/Not a legal determination/);

        const graph = await insuranceService.graphLinks(a.org.id);
        expect(graph.some((row) => row.nodeType === 'INSURANCE_ENTITY' && row.displayLabel === 'Lagos Life')).toBe(true);
        expect(graph.some((row) => row.nodeType === 'REGULATOR' && row.sourceId === 'NAICOM')).toBe(true);
        expect(graph.some((row) => row.nodeType === 'BUSINESS_PROCESS' && row.sourceId === 'CLAIMS')).toBe(true);
        expect(graph.some((row) => row.nodeType === 'CRITICAL_SERVICE' && row.sourceId === 'CLAIMS')).toBe(true);

        const otherEntities = await request(app).get('/api/v1/insurance/entities').set('Authorization', `Bearer ${otherToken}`);
        expect(otherEntities.status).toBe(200);
        expect(otherEntities.body.data).toEqual([]);

        const client = await publicApiClientService.create(a.org.id, a.admin.id, { name: 'Ins read', scopes: ['insurance:read'] });
        const publicOk = await request(app).get('/public/v1/insurance/configuration').set('Authorization', `Bearer ${client.token}`);
        expect(publicOk.status).toBe(200);
        const sessionDenied = await request(app).get('/api/v1/insurance/activate').set('Authorization', `Bearer ${client.token}`);
        expect([401, 403, 404]).toContain(sessionDenied.status);
        const listed = JSON.stringify(await publicApiClientService.list(a.org.id));
        expect(listed).not.toContain(client.token);

        const audit = await prisma.auditEvent.findMany({ where: { organizationId: a.org.id, action: { startsWith: 'insurance.' } } });
        expect(audit.some((row) => row.action === 'insurance.edition.activated')).toBe(true);
        expect(audit.some((row) => row.action === 'insurance.configuration.changed')).toBe(true);
        expect(JSON.stringify(audit)).not.toContain(client.token);

        const viewerRead = await request(app).get('/api/v1/insurance/overview').set('Authorization', `Bearer ${viewerToken}`);
        expect(viewerRead.status).toBe(200);
        expect(viewerRead.body.data.metrics.entities.value).toBeGreaterThan(0);
    });
});
