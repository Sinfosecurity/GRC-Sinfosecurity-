import request from 'supertest';
import { app } from '../server';

describe('Public demo request', () => {
    it('rejects an incomplete inquiry', async () => {
        const response = await request(app)
            .post('/api/v1/demo-requests')
            .send({ name: 'A' });
        expect(response.status).toBe(400);
    });

    it('accepts a complete inquiry when email delivery is not configured', async () => {
        const response = await request(app)
            .post('/api/v1/demo-requests')
            .send({
                name: 'Jordan Hale',
                email: 'jordan.hale@example.com',
                company: 'Harbor Analytics',
                role: 'CISO',
                companySize: '251–1,000',
                primaryNeed: 'Third-party risk and decision briefs',
            });
        expect(response.status).toBe(202);
        expect(response.body.accepted).toBe(true);
        expect(['SENT', 'NOT_CONFIGURED']).toContain(response.body.delivery);
    });

    it('accepts pricing lead metadata without creating a checkout', async () => {
        const response = await request(app)
            .post('/api/v1/demo-requests')
            .send({
                name: 'Jordan Hale',
                email: 'jordan.hale@example.com',
                company: 'Harbor Analytics',
                role: 'CISO',
                companySize: '251–1,000',
                primaryNeed: 'Enterprise pricing conversation',
                intent: 'enterprise-sales',
                selectedPlan: 'ENTERPRISE',
                source: 'pricing',
            });
        expect(response.status).toBe(202);
        expect(response.body.accepted).toBe(true);
        expect(response.body.checkout).toBeUndefined();
        expect(response.body.priceId).toBeUndefined();
    });
});
