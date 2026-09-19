import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { app } from '../server';
import { getEnv } from '../config/env';
import { createOrgUser } from './helpers/orgUser';

jest.setTimeout(90000);

const PASSWORD = 'ReqPass12x';
const API = '/api/v1';

describe('#12 requester workspace boundary', () => {
    const suffix = `${Date.now()}`;
    let adminToken = '';
    let requesterToken = '';
    let otherRequesterToken = '';
    let analystToken = '';
    let analystId = '';
    let orgA = '';
    let intakeId = '';
    let publicId = '';

    beforeAll(async () => {
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `lead-${suffix}@req-a.test`,
            password: PASSWORD,
            firstName: 'Lea',
            lastName: 'Lead',
            organizationName: `Requester A ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        adminToken = signup.body.data.token;
        orgA = signup.body.data.user.organizationId;
        expect(signup.body.data.user.nextPath).toBe('/dashboard');

        const requester = await createOrgUser({
            organizationId: orgA,
            email: `pat-${suffix}@req-a.test`,
            password: PASSWORD,
            role: Role.BUSINESS_OWNER,
            firstName: 'Pat',
            lastName: 'Requester',
        });
        requesterToken = requester.token;
        const login = await request(app).post(`${API}/auth/login`).send({
            email: `pat-${suffix}@req-a.test`,
            password: PASSWORD,
            plane: 'CUSTOMER',
        });
        expect(login.status).toBe(200);
        expect(login.body.data.user.nextPath).toBe('/request');
        expect(login.body.data.user.permissions).not.toContain('vendor.read');
        expect(login.body.data.user.permissions).toContain('intake.create_own');

        const other = await createOrgUser({
            organizationId: orgA,
            email: `other-${suffix}@req-a.test`,
            password: PASSWORD,
            role: Role.BUSINESS_OWNER,
            firstName: 'Oli',
            lastName: 'Other',
        });
        otherRequesterToken = other.token;

        const analyst = await createOrgUser({
            organizationId: orgA,
            email: `ana-${suffix}@req-a.test`,
            password: PASSWORD,
            role: Role.ASSESSOR,
            firstName: 'Ana',
            lastName: 'Lyst',
        });
        analystToken = analyst.token;
        analystId = analyst.user.id;
    });

    it('lets a requester create and list only their own minimized records', async () => {
        const created = await request(app)
            .post(`${API}/tprm/requester/intakes`)
            .set('Authorization', `Bearer ${requesterToken}`)
            .send({
                proposedThirdPartyName: 'Microsoft Corporation',
                proposedServiceName: 'Azure Hosting',
                businessPurpose: 'Host a customer-facing application.',
            });
        expect(created.status).toBe(201);
        intakeId = created.body.data.id;
        publicId = created.body.data.publicId;
        expect(created.body.data.requesterStatus).toBe('Submitted');
        expect(created.body.data.assignmentHistory).toBeUndefined();
        expect(created.body.data.matchCandidates).toBeUndefined();
        expect(created.body.data.confirmation.reference).toBe(publicId);

        const list = await request(app).get(`${API}/tprm/requester/intakes`).set('Authorization', `Bearer ${requesterToken}`);
        expect(list.status).toBe(200);
        expect(list.body.data.items).toHaveLength(1);

        const otherList = await request(app).get(`${API}/tprm/requester/intakes`).set('Authorization', `Bearer ${otherRequesterToken}`);
        expect(otherList.status).toBe(200);
        expect(otherList.body.data.items).toHaveLength(0);

        const otherDetail = await request(app)
            .get(`${API}/tprm/requester/intakes/${intakeId}`)
            .set('Authorization', `Bearer ${otherRequesterToken}`);
        expect([403, 404]).toContain(otherDetail.status);
    });

    it('denies requester access to GRC practitioner APIs', async () => {
        const denied = await Promise.all([
            request(app).get(`${API}/tprm/intakes`).set('Authorization', `Bearer ${requesterToken}`),
            request(app).get(`${API}/tprm/intakes/${intakeId}`).set('Authorization', `Bearer ${requesterToken}`),
            request(app).get(`${API}/vendors`).set('Authorization', `Bearer ${requesterToken}`),
            request(app).get(`${API}/risks`).set('Authorization', `Bearer ${requesterToken}`),
            request(app).get(`${API}/compliance`).set('Authorization', `Bearer ${requesterToken}`),
            request(app).get(`${API}/automation`).set('Authorization', `Bearer ${requesterToken}`),
            request(app).get(`${API}/platform/organizations`).set('Authorization', `Bearer ${requesterToken}`),
        ]);
        for (const response of denied) {
            expect([401, 403, 404]).toContain(response.status);
        }
    });

    it('denies requester access to findings, assessments, decisions, risk, and admin', async () => {
        const denied = await Promise.all([
            request(app).get(`${API}/tprm/findings`).set('Authorization', `Bearer ${requesterToken}`),
            request(app).get(`${API}/tprm/assessments`).set('Authorization', `Bearer ${requesterToken}`),
            request(app).get(`${API}/tprm/decision-briefs`).set('Authorization', `Bearer ${requesterToken}`),
            request(app).get(`${API}/risks`).set('Authorization', `Bearer ${requesterToken}`),
            request(app).get(`${API}/users`).set('Authorization', `Bearer ${requesterToken}`),
            request(app).get(`${API}/vendor-portal/assessments/not-a-vendor-session`).set('Authorization', `Bearer ${requesterToken}`),
        ]);
        for (const response of denied) {
            expect([401, 403, 404]).toContain(response.status);
        }
    });

    it('keeps vendor plane sessions out of requester and intake queue APIs', async () => {
        const vendorToken = jwt.sign(
            { userId: 'vendor-actor', plane: 'VENDOR', kind: 'vendor_session', organizationId: orgA },
            getEnv().jwtSecret
        );
        const denied = await Promise.all([
            request(app).get(`${API}/tprm/requester/intakes`).set('Authorization', `Bearer ${vendorToken}`),
            request(app).get(`${API}/tprm/intakes`).set('Authorization', `Bearer ${vendorToken}`),
            request(app).get(`${API}/tprm/requester/home`).set('Authorization', `Bearer ${vendorToken}`),
        ]);
        for (const response of denied) {
            expect([401, 403]).toContain(response.status);
        }
    });

    it('denies GRC practitioners the requester workspace even if they retain tenant permissions', async () => {
        const denied = await Promise.all([
            request(app).get(`${API}/tprm/requester/home`).set('Authorization', `Bearer ${analystToken}`),
            request(app).get(`${API}/tprm/requester/intakes`).set('Authorization', `Bearer ${analystToken}`),
            request(app).post(`${API}/tprm/requester/intakes`).set('Authorization', `Bearer ${analystToken}`).send({
                proposedThirdPartyName: 'Dual Role Co',
                proposedServiceName: 'Dual Service',
                businessPurpose: 'Analyst must not become the requester.',
            }),
            request(app).get(`${API}/tprm/requester/home`).set('Authorization', `Bearer ${adminToken}`),
            request(app).post(`${API}/tprm/requester/intakes`).set('Authorization', `Bearer ${adminToken}`).send({
                proposedThirdPartyName: 'Admin Form',
                proposedServiceName: 'Admin Service',
                businessPurpose: 'Admin must not use Requester Workspace.',
            }),
        ]);
        for (const response of denied) {
            expect(response.status).toBe(403);
        }
        const queue = await request(app).get(`${API}/tprm/intakes`).set('Authorization', `Bearer ${analystToken}`);
        expect(queue.status).toBe(200);
        const login = await request(app).post(`${API}/auth/login`).send({
            email: `ana-${suffix}@req-a.test`,
            password: PASSWORD,
            plane: 'CUSTOMER',
        });
        expect(login.status).toBe(200);
        expect(login.body.data.user.nextPath).toBe('/dashboard');
        expect(login.body.data.user.permissions).not.toContain('intake.create_own');
        expect(login.body.data.user.permissions).toContain('intake.triage');
        const adminLogin = await request(app).post(`${API}/auth/login`).send({
            email: `lead-${suffix}@req-a.test`,
            password: PASSWORD,
            plane: 'CUSTOMER',
        });
        expect(adminLogin.status).toBe(200);
        expect(adminLogin.body.data.user.nextPath).toBe('/dashboard');
    });

    it('lets the requester respond from the requester API after GRC asks for information', async () => {
        await request(app)
            .post(`${API}/tprm/intakes/${intakeId}/assign`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ analystUserId: analystId });
        await request(app).post(`${API}/tprm/intakes/${intakeId}/start-review`).set('Authorization', `Bearer ${analystToken}`);
        await request(app)
            .post(`${API}/tprm/intakes/${intakeId}/request-information`)
            .set('Authorization', `Bearer ${analystToken}`)
            .send({ fields: ['businessPurpose'], note: 'Please describe the real business purpose.' });

        const actions = await request(app).get(`${API}/tprm/requester/actions`).set('Authorization', `Bearer ${requesterToken}`);
        expect(actions.status).toBe(200);
        expect(actions.body.data.items[0].requestNote).toMatch(/business purpose/i);

        const answered = await request(app)
            .post(`${API}/tprm/requester/intakes/${publicId}/information-response`)
            .set('Authorization', `Bearer ${requesterToken}`)
            .send({ response: 'Customer analytics for product usage.' });
        expect(answered.status).toBe(200);
        expect(answered.body.data.requesterStatus).toBe('Under review');
        expect(answered.body.data.informationRequests[0].response).toMatch(/Customer analytics/);
        expect(answered.body.data.assignmentHistory).toBeUndefined();

        const grcView = await request(app).get(`${API}/tprm/intakes/${intakeId}`).set('Authorization', `Bearer ${analystToken}`);
        expect(grcView.status).toBe(200);
        expect(grcView.body.data.requesterName).toBe('Pat Requester');
        expect(grcView.body.data.requesterEmail).toBe(`pat-${suffix}@req-a.test`);
        expect(grcView.body.data.businessPurpose).toBeTruthy();
        expect(grcView.body.data.informationRequests[0].response).toMatch(/Customer analytics/);
        expect(grcView.body.data.assignmentHistory).toBeDefined();
    });
});
