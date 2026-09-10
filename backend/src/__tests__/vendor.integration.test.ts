/**
 * Vendor API authentication enforcement.
 * Fake bearer tokens must not reach vendor handlers.
 */
import request from 'supertest';
import { app } from '../server';

describe('Vendor Management API authentication', () => {
    it('rejects vendor create without a valid JWT', async () => {
        const response = await request(app)
            .post('/api/v1/vendors')
            .set('Authorization', 'Bearer test-token-not-a-jwt')
            .send({ name: 'Test Vendor Inc.' });

        expect(response.status).toBe(401);
    });

    it('rejects vendor list without a token', async () => {
        const response = await request(app).get('/api/v1/vendors');
        expect(response.status).toBe(401);
    });

    it('rejects vendor get with a tampered token', async () => {
        const response = await request(app)
            .get('/api/v1/vendors/00000000-0000-4000-8000-000000000001')
            .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.not-valid');
        expect(response.status).toBe(401);
    });
});
