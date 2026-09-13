import request from 'supertest';
import { app } from '../server';

jest.setTimeout(60000);

describe('administration APIs', () => {
    const suffix = `${Date.now()}`;
    const password = 'AdminPass1x';
    let token = '';

    beforeAll(async () => {
        const signup = await request(app).post('/api/v1/auth/signup').send({
            email: `admin-${suffix}@org.test`,
            password,
            firstName: 'Org',
            lastName: 'Admin',
            organizationName: `Admin Org ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        token = signup.body.data.token;
    });

    it('reads and updates the organization profile', async () => {
        const current = await request(app)
            .get('/api/v1/organization/current')
            .set('Authorization', `Bearer ${token}`);
        expect(current.status).toBe(200);
        expect(current.body.data.name).toContain('Admin Org');
        expect(current.body.data.allowanceEnforcement).toBe('COMMERCIAL_NOT_ENFORCED');
        expect(current.body.data.entitlements.maxVendors).toBe(25);

        const updated = await request(app)
            .patch('/api/v1/organization/current')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: `Admin Org ${suffix}`,
                legalName: 'Admin Org LLC',
                industry: 'Technology',
                country: 'US',
                timezone: 'America/New_York',
                contactName: 'Org Admin',
                contactEmail: `admin-${suffix}@org.test`,
                contactPhone: '+15555550100',
            });
        expect(updated.status).toBe(200);
        expect(updated.body.data.legalName).toBe('Admin Org LLC');
        expect(updated.body.data.timezone).toBe('America/New_York');
    });

    it('lists tenant users and rejects privilege escalation', async () => {
        const users = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${token}`);
        expect(users.status).toBe(200);
        expect(users.body.data.length).toBeGreaterThan(0);

        const self = users.body.data[0];
        const escalate = await request(app)
            .patch(`/api/v1/users/${self.id}/role`)
            .set('Authorization', `Bearer ${token}`)
            .send({ role: 'SUPERADMIN' });
        expect(escalate.status).toBe(403);
    });

    it('returns a searchable tenant-scoped audit log', async () => {
        const logs = await request(app)
            .get('/api/v1/audit/logs')
            .query({ q: 'organization', page: 1, pageSize: 25 })
            .set('Authorization', `Bearer ${token}`);
        expect(logs.status).toBe(200);
        expect(Array.isArray(logs.body.data)).toBe(true);
        expect(logs.body.page).toBe(1);
        expect(typeof logs.body.total).toBe('number');
    });
});
