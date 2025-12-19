/**
 * Integration Tests for Health Check and Middleware
 */

import request from 'supertest';
import { app } from '../server';

describe('Health Check API', () => {
    describe('GET /health', () => {
        it('should return healthy status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body.status).toMatch(/healthy|degraded/);
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('environment');
        });

        it('should include memory usage', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('memory');
            expect(response.body.memory).toHaveProperty('rss');
            expect(response.body.memory).toHaveProperty('heapUsed');
        });

        it('should include version information', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('version');
        });

        it('should check database connections in production mode', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            if (!response.body.devMode) {
                expect(response.body).toHaveProperty('checks');
                expect(response.body.checks).toHaveProperty('database');
            }
        });

        it('should add request ID header', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.headers).toHaveProperty('x-request-id');
        });

        it('should add response time header', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.headers).toHaveProperty('x-response-time');
        });
    });
});

describe('Error Handling Middleware', () => {
    it('should return 404 for non-existent routes', async () => {
        const response = await request(app)
            .get('/api/v1/non-existent-route')
            .expect(404);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
    });

    it('should return structured error responses', async () => {
        const response = await request(app)
            .get('/api/v1/invalid-endpoint');

        expect(response.body).toHaveProperty('error');
        if (response.body.error && typeof response.body.error === 'object') {
            // Structured error
            expect(response.body.error).toHaveProperty('message');
        }
    });
});

describe('Security Middleware', () => {
    it('should set security headers (helmet)', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        // Helmet sets these headers
        expect(response.headers).toHaveProperty('x-content-type-options');
        expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should limit request body size', async () => {
        const hugePayload = { data: 'x'.repeat(20 * 1024 * 1024) }; // 20MB

        const response = await request(app)
            .post('/api/v1/vendors')
            .send(hugePayload);

        expect(response.status).toBe(413); // Payload Too Large
    });
});

describe('CORS Middleware', () => {
    it('should set CORS headers', async () => {
        const response = await request(app)
            .get('/health')
            .set('Origin', 'http://localhost:3000')
            .expect(200);

        expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
});
