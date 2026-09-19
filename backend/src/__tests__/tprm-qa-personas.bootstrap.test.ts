import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { getEnv } from '../config/env';
import { assertStagingQaPersonasAllowed } from '../scripts/stagingQaGuards';
import {
    QA_ORG_NAME,
    QA_ORG_SLUG,
    QA_VENDOR_CONTACT,
} from '../scripts/stagingQaGuards';
import {
    bootstrapQaUsers,
    qaStatus,
    resetQaTestData,
    seedManualGoldenJourneyCase,
} from '../scripts/stagingQaPersonas';

jest.setTimeout(120000);

const API = '/api/v1';

function enableQaEnv() {
    process.env.APP_ENVIRONMENT = 'test';
    process.env.ALLOW_STAGING_QA_PERSONAS = 'true';
    process.env.STAGING_QA_REQUESTER_PASSWORD = 'QaRequester1x';
    process.env.STAGING_QA_TPRM_LEAD_PASSWORD = 'QaTprmLead1x';
    process.env.STAGING_QA_TPRM_ANALYST_PASSWORD = 'QaTprmAnalyst1x';
}

describe('staging QA persona guards', () => {
    it('aborts production and missing allow-flag', () => {
        expect(() => assertStagingQaPersonasAllowed({ APP_ENVIRONMENT: 'production', ALLOW_STAGING_QA_PERSONAS: 'true' })).toThrow(/production/);
        expect(() => assertStagingQaPersonasAllowed({ APP_ENVIRONMENT: 'staging' })).toThrow(/ALLOW_STAGING_QA_PERSONAS/);
        expect(() => assertStagingQaPersonasAllowed({ APP_ENVIRONMENT: 'development', ALLOW_STAGING_QA_PERSONAS: 'true' })).toThrow(/staging or test/);
    });

    it('allows staging and test when the operator flag is set', () => {
        expect(() => assertStagingQaPersonasAllowed({ APP_ENVIRONMENT: 'staging', ALLOW_STAGING_QA_PERSONAS: 'true' })).not.toThrow();
        expect(() => assertStagingQaPersonasAllowed({ APP_ENVIRONMENT: 'test', ALLOW_STAGING_QA_PERSONAS: 'true' })).not.toThrow();
    });
});

describe('staging QA persona bootstrap', () => {
    let requesterToken = '';
    let leadToken = '';
    let analystToken = '';
    let orgId = '';

    beforeAll(async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            throw new Error(`PostgreSQL is required. ${(error as Error).message}`);
        }
        enableQaEnv();
        const boot = await bootstrapQaUsers(process.env);
        orgId = boot.organization.id;
        expect(boot.organization.slug).toBe(QA_ORG_SLUG);
        expect(boot.organization.name).toBe(QA_ORG_NAME);
        expect(boot.vendorUserCreated).toBe(false);

        const login = async (email: string, password: string) => {
            const response = await request(app).post(`${API}/auth/login`).send({ email, password, plane: 'CUSTOMER' });
            expect(response.status).toBe(200);
            return response.body.data;
        };
        const requester = await login('qa.requester@supremegrc.test', 'QaRequester1x');
        const lead = await login('qa.tprm.lead@supremegrc.test', 'QaTprmLead1x');
        const analyst = await login('qa.tprm.analyst@supremegrc.test', 'QaTprmAnalyst1x');
        requesterToken = requester.token;
        leadToken = lead.token;
        analystToken = analyst.token;
        expect(requester.user.nextPath).toBe('/request');
        expect(requester.user.role).toBe(Role.BUSINESS_OWNER);
        expect(lead.user.nextPath).toBe('/dashboard');
        expect(lead.user.role).toBe(Role.RISK_MANAGER);
        expect(analyst.user.nextPath).toBe('/dashboard');
        expect(analyst.user.role).toBe(Role.ASSESSOR);
    });

    it('does not create a Vendor User', async () => {
        const vendorUser = await prisma.user.findUnique({ where: { email: QA_VENDOR_CONTACT.email } });
        expect(vendorUser).toBeNull();
        const users = await prisma.user.findMany({ where: { organizationId: orgId } });
        expect(users.map((row) => row.email).sort()).toEqual([
            'qa.requester@supremegrc.test',
            'qa.tprm.analyst@supremegrc.test',
            'qa.tprm.lead@supremegrc.test',
        ]);
    });

    it('keeps the requester on requester APIs and denies GRC surfaces', async () => {
        const home = await request(app).get(`${API}/tprm/requester/intakes`).set('Authorization', `Bearer ${requesterToken}`);
        expect(home.status).toBe(200);
        const actions = await request(app).get(`${API}/tprm/requester/actions`).set('Authorization', `Bearer ${requesterToken}`);
        expect(actions.status).toBe(200);
        const queue = await request(app).get(`${API}/tprm/intakes`).set('Authorization', `Bearer ${requesterToken}`);
        expect(queue.status).toBe(403);
        const myWork = await request(app).get(`${API}/tprm/intakes/my-work`).set('Authorization', `Bearer ${requesterToken}`);
        expect(myWork.status).toBe(403);
        const vendors = await request(app).get(`${API}/vendors`).set('Authorization', `Bearer ${requesterToken}`);
        expect(vendors.status).toBe(403);
        const findings = await request(app).get(`${API}/tprm/findings`).set('Authorization', `Bearer ${requesterToken}`);
        expect(findings.status).toBe(403);
    });

    it('lets the TPRM Lead use Intake Queue and denies Requester Workspace', async () => {
        const queue = await request(app).get(`${API}/tprm/intakes`).set('Authorization', `Bearer ${leadToken}`);
        expect(queue.status).toBe(200);
        const requesterHome = await request(app).get(`${API}/tprm/requester/intakes`).set('Authorization', `Bearer ${leadToken}`);
        expect(requesterHome.status).toBe(403);
        const requesterActions = await request(app).get(`${API}/tprm/requester/actions`).set('Authorization', `Bearer ${leadToken}`);
        expect(requesterActions.status).toBe(403);
        const create = await request(app).post(`${API}/tprm/intakes`).set('Authorization', `Bearer ${leadToken}`).send({
            proposedThirdPartyName: 'Should Fail',
            proposedServiceName: 'Should Fail',
            businessPurpose: 'GRC must not use Requester Workspace.',
        });
        expect(create.status).toBe(403);
    });

    it('lets the TPRM Analyst use My Work and denies Requester Workspace', async () => {
        const mine = await request(app).get(`${API}/tprm/intakes/my-work`).set('Authorization', `Bearer ${analystToken}`);
        expect(mine.status).toBe(200);
        const requesterHome = await request(app).get(`${API}/tprm/requester/intakes`).set('Authorization', `Bearer ${analystToken}`);
        expect(requesterHome.status).toBe(403);
        const create = await request(app).post(`${API}/tprm/intakes`).set('Authorization', `Bearer ${analystToken}`).send({
            proposedThirdPartyName: 'Should Fail',
            proposedServiceName: 'Should Fail',
            businessPurpose: 'Analyst must not use Requester Workspace.',
        });
        expect(create.status).toBe(403);
    });

    it('denies a vendor-plane token from requester and GRC APIs', async () => {
        const vendorToken = jwt.sign(
            { userId: 'vendor-actor', plane: 'VENDOR', kind: 'vendor_session', organizationId: orgId },
            getEnv().jwtSecret
        );
        const requester = await request(app).get(`${API}/tprm/requester/intakes`).set('Authorization', `Bearer ${vendorToken}`);
        expect([401, 403]).toContain(requester.status);
        const queue = await request(app).get(`${API}/tprm/intakes`).set('Authorization', `Bearer ${vendorToken}`);
        expect([401, 403]).toContain(queue.status);
    });

    it('seeds one incomplete Golden Journey intake and reset keeps users only', async () => {
        const seeded = await seedManualGoldenJourneyCase();
        expect(seeded.intake.publicId).toMatch(/^INT-/);
        const status = await qaStatus();
        expect(status.intakes.some((row: { publicId: string }) => row.publicId === seeded.intake.publicId)).toBe(true);

        const reset = await resetQaTestData();
        expect(reset.usersKept).toBe(3);
        expect(reset.deleted.intakeRequest).toBeGreaterThanOrEqual(1);
        const after = await qaStatus();
        expect(after.intakes).toHaveLength(0);
        expect(after.personas).toHaveLength(3);
        expect(after.vendorUser).toBe(false);

        const again = await seedManualGoldenJourneyCase();
        expect(again.created).toBe(true);
        expect(again.intake.publicId).toMatch(/^INT-/);
    });
});
