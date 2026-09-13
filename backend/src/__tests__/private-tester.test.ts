import request from 'supertest';
import { Role } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { totpAt } from '../security/totp';

jest.setTimeout(60000);

const PASSWORD = 'PrivateBeta1x';
const API = '/api/v1';

async function signup(suffix: string, name: string) {
    const response = await request(app).post(`${API}/auth/signup`).send({
        email: `${name}-${suffix}@beta.test`,
        password: PASSWORD,
        firstName: name,
        lastName: 'User',
        organizationName: `${name} Org ${suffix}`,
        country: 'US',
    });
    expect(response.status).toBe(201);
    return {
        token: response.body.data.token as string,
        userId: response.body.data.user.id as string,
        orgId: response.body.data.user.organizationId as string,
        email: `${name}-${suffix}@beta.test`,
    };
}

async function enrollPlatform(email: string) {
    const login = await request(app).post(`${API}/auth/login`).send({ email, password: PASSWORD, plane: 'PLATFORM' });
    const enrollToken = login.body.data.enrollmentToken as string;
    const start = await request(app).post(`${API}/auth/mfa/enroll/start`).set('Authorization', `Bearer ${enrollToken}`);
    const secret = start.body.data.secret as string;
    const confirm = await request(app)
        .post(`${API}/auth/mfa/enroll/confirm`)
        .set('Authorization', `Bearer ${enrollToken}`)
        .send({ code: totpAt(secret) });
    expect(confirm.status).toBe(200);
    return confirm.body.data.token as string;
}

describe('private tester management', () => {
    const suffix = `${Date.now()}`;
    let customer: Awaited<ReturnType<typeof signup>>;
    let other: Awaited<ReturnType<typeof signup>>;
    let owner: Awaited<ReturnType<typeof signup>>;
    let ownerToken = '';

    beforeAll(async () => {
        customer = await signup(suffix, 'cust');
        other = await signup(suffix, 'other');
        owner = await signup(suffix, 'owner');
        await prisma.user.update({ where: { id: owner.userId }, data: { role: Role.PLATFORM_OWNER } });
        ownerToken = await enrollPlatform(owner.email);
    });

    it('refuses customer provisioning of testers', async () => {
        const denied = await request(app)
            .post(`${API}/platform/testers`)
            .set('Authorization', `Bearer ${customer.token}`)
            .send({ organizationName: 'Should Fail', testerEmail: `fail-${suffix}@beta.test` });
        expect(denied.status).toBeGreaterThanOrEqual(401);
    });

    it('provisions unique testers in isolated demo orgs and blocks cross-tenant reads', async () => {
        const first = await request(app)
            .post(`${API}/platform/testers`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                organizationName: `Beta A ${suffix}`,
                testerEmail: `tester-a-${suffix}@beta.test`,
                testerRole: 'ORGANIZATION_ADMIN',
            });
        expect(first.status).toBe(201);
        expect(first.body.data.organization.isDemo).toBe(true);
        expect(first.body.data.sharedPassword).toBe(false);
        expect(first.body.data.activationUrl).toContain('/activate?token=');
        expect(first.body.data.token).toBeTruthy();

        const activated = await request(app).post(`${API}/auth/activate`).send({
            token: first.body.data.token,
            firstName: 'Tester',
            lastName: 'Alpha',
            password: PASSWORD,
        });
        expect(activated.status).toBe(200);
        const testerAToken = activated.body.data.token as string;
        const testerAOrg = activated.body.data.user.organizationId as string;

        const vendorA = await request(app)
            .post(`${API}/vendors`)
            .set('Authorization', `Bearer ${testerAToken}`)
            .send({
                name: `Vendor A ${suffix}`,
                vendorType: 'SAAS',
                category: 'TECHNOLOGY',
                tier: 'MEDIUM',
                primaryContact: 'Owner A',
                contactEmail: `vendor-a-${suffix}@beta.test`,
                servicesProvided: 'Private-beta software',
            });
        expect(vendorA.status).toBe(201);
        const vendorAId = vendorA.body.data?.id || vendorA.body.id;

        const second = await request(app)
            .post(`${API}/platform/testers`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                organizationName: `Beta B ${suffix}`,
                testerEmail: `tester-b-${suffix}@beta.test`,
            });
        expect(second.status).toBe(201);
        const activatedB = await request(app).post(`${API}/auth/activate`).send({
            token: second.body.data.token,
            firstName: 'Tester',
            lastName: 'Bravo',
            password: PASSWORD,
        });
        const testerBToken = activatedB.body.data.token as string;

        const cross = await request(app)
            .get(`${API}/vendors/${vendorAId}`)
            .set('Authorization', `Bearer ${testerBToken}`);
        expect([403, 404]).toContain(cross.status);

        const otherCross = await request(app)
            .get(`${API}/vendors/${vendorAId}`)
            .set('Authorization', `Bearer ${other.token}`);
        expect([403, 404]).toContain(otherCross.status);

        const offboard = await request(app)
            .post(`${API}/tprm/vendors/${vendorAId}/offboard`)
            .set('Authorization', `Bearer ${testerAToken}`)
            .send({ exitNotes: 'Private-beta offboarding', acknowledgeOutstanding: true });
        expect(offboard.status).toBe(200);
        expect(offboard.body.data.recordsRetained).toBe(true);
        expect(['OFFBOARDING', 'TERMINATED']).toContain(offboard.body.data.nextStatus);

        const stillThere = await request(app)
            .get(`${API}/vendors/${vendorAId}`)
            .set('Authorization', `Bearer ${testerAToken}`);
        expect(stillThere.status).toBe(200);

        const disable = await request(app)
            .post(`${API}/platform/testers/${testerAOrg}/disable`)
            .set('Authorization', `Bearer ${ownerToken}`);
        expect(disable.status).toBe(200);

        const loginDisabled = await request(app).post(`${API}/auth/login`).send({
            email: `tester-a-${suffix}@beta.test`,
            password: PASSWORD,
            plane: 'CUSTOMER',
        });
        expect(loginDisabled.status).toBeGreaterThanOrEqual(401);

        const reuse = await request(app)
            .post(`${API}/platform/testers`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                organizationName: `Beta reuse ${suffix}`,
                testerEmail: `tester-a-${suffix}@beta.test`,
            });
        expect(reuse.status).toBe(409);
    });
});
