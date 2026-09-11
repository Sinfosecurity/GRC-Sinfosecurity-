import request from 'supertest';
import { app } from '../server';

describe('Stripe webhook policy without keys', () => {
    it('rejects a webhook when billing is not configured', async () => {
        const response = await request(app)
            .post('/api/v1/billing/webhook')
            .set('stripe-signature', 't=1,v1=deadbeef')
            .set('Content-Type', 'application/json')
            .send({ id: 'evt_replay', type: 'checkout.session.completed' });
        expect([400, 503]).toContain(response.status);
    });

    it('rejects a webhook without a signature', async () => {
        const response = await request(app)
            .post('/api/v1/billing/webhook')
            .set('Content-Type', 'application/json')
            .send({ id: 'evt_missing_sig' });
        expect(response.status).toBe(400);
    });
});
