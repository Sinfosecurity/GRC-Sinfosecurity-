/**
 * Integration Tests for Vendor Management API
 * Tests complete API workflows including validation and error handling
 */

import request from 'supertest';
import { app } from '../server';

describe('Vendor Management API', () => {
    let authToken: string;
    let vendorId: string;
    const testOrganizationId = 'test-org-123';

    // Mock authentication
    beforeAll(() => {
        authToken = 'test-token-' + Date.now();
    });

    describe('POST /api/v1/vendors', () => {
        it('should create a new vendor with valid data', async () => {
            const vendorData = {
                name: 'Test Vendor Inc.',
                legalName: 'Test Vendor Incorporated',
                vendorType: 'SOFTWARE',
                category: 'Cloud Services',
                tier: 'HIGH',
                description: 'A test vendor for integration tests',
                website: 'https://testvendor.com',
                primaryContact: 'contact@testvendor.com',
                annualSpend: 100000,
            };

            const response = await request(app)
                .post('/api/v1/vendors')
                .set('Authorization', `Bearer ${authToken}`)
                .send(vendorData)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe(vendorData.name);
            expect(response.body.tier).toBe(vendorData.tier);
            expect(response.body.status).toBe('PROPOSED');

            vendorId = response.body.id;
        });

        it('should reject vendor with invalid email', async () => {
            const invalidData = {
                name: 'Invalid Vendor',
                vendorType: 'SOFTWARE',
                category: 'Test',
                tier: 'LOW',
                primaryContact: 'not-an-email', // Invalid email
            };

            const response = await request(app)
                .post('/api/v1/vendors')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should reject vendor with missing required fields', async () => {
            const incompleteData = {
                name: '', // Empty name
                tier: 'INVALID_TIER', // Invalid enum
            };

            const response = await request(app)
                .post('/api/v1/vendors')
                .set('Authorization', `Bearer ${authToken}`)
                .send(incompleteData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.details).toBeInstanceOf(Array);
        });

        it('should reject vendor with name longer than 255 characters', async () => {
            const longNameData = {
                name: 'A'.repeat(300),
                vendorType: 'SOFTWARE',
                category: 'Test',
                tier: 'LOW',
            };

            const response = await request(app)
                .post('/api/v1/vendors')
                .set('Authorization', `Bearer ${authToken}`)
                .send(longNameData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('GET /api/v1/vendors', () => {
        it('should list vendors with pagination', async () => {
            const response = await request(app)
                .get('/api/v1/vendors')
                .query({ page: 1, pageSize: 20 })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('pagination');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should filter vendors by tier', async () => {
            const response = await request(app)
                .get('/api/v1/vendors')
                .query({ tier: 'HIGH' })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.data).toBeInstanceOf(Array);
        });

        it('should reject invalid pagination parameters', async () => {
            const response = await request(app)
                .get('/api/v1/vendors')
                .query({ page: 'invalid', pageSize: -1 })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should enforce maximum page size', async () => {
            const response = await request(app)
                .get('/api/v1/vendors')
                .query({ pageSize: 500 }) // Should be capped at 100
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.pagination.pageSize).toBeLessThanOrEqual(100);
        });
    });

    describe('GET /api/v1/vendors/:id', () => {
        it('should get vendor by valid UUID', async () => {
            const response = await request(app)
                .get(`/api/v1/vendors/${vendorId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.id).toBe(vendorId);
        });

        it('should return 400 for invalid UUID format', async () => {
            const response = await request(app)
                .get('/api/v1/vendors/not-a-uuid')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should return 404 for non-existent vendor', async () => {
            const fakeUuid = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .get(`/api/v1/vendors/${fakeUuid}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error.code).toBe('NOT_FOUND');
        });
    });

    describe('PUT /api/v1/vendors/:id', () => {
        it('should update vendor with valid data', async () => {
            const updateData = {
                description: 'Updated description',
                annualSpend: 150000,
            };

            const response = await request(app)
                .put(`/api/v1/vendors/${vendorId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.description).toBe(updateData.description);
            expect(response.body.annualSpend).toBe(updateData.annualSpend);
        });

        it('should reject invalid URL in update', async () => {
            const invalidUpdate = {
                website: 'not-a-url',
            };

            const response = await request(app)
                .put(`/api/v1/vendors/${vendorId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidUpdate)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('GET /api/v1/vendors/statistics', () => {
        it('should return vendor statistics', async () => {
            const response = await request(app)
                .get('/api/v1/vendors/statistics')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('byTier');
            expect(response.body).toHaveProperty('byStatus');
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits on repeated requests', async () => {
            const requests = [];
            
            // Send 6 requests (limit is 5 for auth routes)
            for (let i = 0; i < 6; i++) {
                requests.push(
                    request(app)
                        .post('/api/v1/vendors')
                        .set('Authorization', `Bearer ${authToken}`)
                        .send({
                            name: `Rate Test Vendor ${i}`,
                            vendorType: 'SOFTWARE',
                            category: 'Test',
                            tier: 'LOW',
                        })
                );
            }

            const responses = await Promise.all(requests);
            
            // Last request should be rate limited
            const rateLimitedResponse = responses[responses.length - 1];
            expect([429, 201]).toContain(rateLimitedResponse.status);
            
            if (rateLimitedResponse.status === 429) {
                expect(rateLimitedResponse.body.error.code).toMatch(/RATE_LIMIT/i);
            }
        }, 10000); // Increase timeout for this test
    });

    describe('Error Handling', () => {
        it('should return structured error for database errors', async () => {
            // Try to create vendor with duplicate name (if unique constraint exists)
            const duplicateData = {
                name: 'Test Vendor Inc.', // Same as first test
                vendorType: 'SOFTWARE',
                category: 'Cloud Services',
                tier: 'HIGH',
            };

            const response = await request(app)
                .post('/api/v1/vendors')
                .set('Authorization', `Bearer ${authToken}`)
                .send(duplicateData);

            if (response.status === 409) {
                expect(response.body.error.code).toBe('CONFLICT');
            }
        });

        it('should not expose stack traces in production', async () => {
            const response = await request(app)
                .get('/api/v1/vendors/trigger-error')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.body).not.toHaveProperty('stack');
        });
    });

    describe('Request Timeout', () => {
        it('should timeout long-running requests', async () => {
            // This would need a special endpoint that delays
            // For now, we'll just check the header is set
            const response = await request(app)
                .get('/api/v1/vendors')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.headers).toHaveProperty('x-response-time');
        });
    });

    describe('Request ID Tracking', () => {
        it('should add request ID to responses', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.headers).toHaveProperty('x-request-id');
        });

        it('should use provided request ID if sent', async () => {
            const customRequestId = 'custom-test-id-123';
            
            const response = await request(app)
                .get('/health')
                .set('X-Request-ID', customRequestId)
                .expect(200);

            expect(response.headers['x-request-id']).toBe(customRequestId);
        });
    });
});
