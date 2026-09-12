import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';

const storeFile = path.join(os.tmpdir(), `supreme-demo-${process.pid}.jsonl`);
process.env.DEMO_REQUEST_STORE_PATH = storeFile;

import { app } from '../server';
import { deliverEmail, isEmailConfigured, salesNotificationRecipient } from '../services/notificationDeliveryService';

jest.mock('../services/notificationDeliveryService', () => {
    const actual = jest.requireActual('../services/notificationDeliveryService');
    return {
        ...actual,
        deliverEmail: jest.fn(),
        isEmailConfigured: jest.fn(),
        salesNotificationRecipient: jest.fn(),
    };
});

const deliver = deliverEmail as jest.MockedFunction<typeof deliverEmail>;
const emailConfigured = isEmailConfigured as jest.MockedFunction<typeof isEmailConfigured>;
const salesRecipient = salesNotificationRecipient as jest.MockedFunction<typeof salesNotificationRecipient>;

const complete = {
    name: 'Jordan Hale',
    email: 'jordan.hale@example.com',
    company: 'Harbor Analytics',
    role: 'CISO',
    companySize: '251–1,000',
    primaryNeed: 'Third-party risk and decision briefs',
};

describe('Public demo request', () => {
    beforeEach(() => {
        if (fs.existsSync(storeFile)) fs.unlinkSync(storeFile);
        deliver.mockReset();
        emailConfigured.mockReturnValue(false);
        salesRecipient.mockReturnValue('');
    });

    afterAll(() => {
        if (fs.existsSync(storeFile)) fs.unlinkSync(storeFile);
    });

    it('rejects an incomplete inquiry with field details', async () => {
        const response = await request(app)
            .post('/api/v1/demo-requests')
            .send({ name: 'A' });
        expect(response.status).toBe(400);
        expect(response.body.error.message).toMatch(/correct the highlighted fields/i);
        expect(JSON.stringify(response.body)).not.toMatch(/NOT_CONFIGURED|SENDGRID|RESEND|SMTP/);
    });

    it('accepts a complete inquiry without exposing delivery internals', async () => {
        const response = await request(app)
            .post('/api/v1/demo-requests')
            .send(complete);
        expect(response.status).toBe(202);
        expect(response.body.accepted).toBe(true);
        expect(response.body.requestId).toBeTruthy();
        expect(response.body.message).toMatch(/request has been received/i);
        expect(response.body.delivery).toBeUndefined();
        expect(JSON.stringify(response.body)).not.toMatch(/NOT_CONFIGURED|FAILED|SENDGRID|RESEND|SMTP/);
        const stored = fs.readFileSync(storeFile, 'utf8');
        expect(stored).toContain('jordan.hale@example.com');
        expect(stored).toContain('NOT_CONFIGURED');
        expect(deliver).not.toHaveBeenCalled();
    });

    it('accepts pricing lead metadata without creating a checkout', async () => {
        const response = await request(app)
            .post('/api/v1/demo-requests')
            .send({
                ...complete,
                intent: 'enterprise-sales',
                selectedPlan: 'ENTERPRISE',
                source: 'pricing',
            });
        expect(response.status).toBe(202);
        expect(response.body.accepted).toBe(true);
        expect(response.body.checkout).toBeUndefined();
        expect(response.body.priceId).toBeUndefined();
        const stored = fs.readFileSync(storeFile, 'utf8');
        expect(stored).toContain('ENTERPRISE');
        expect(stored).toContain('enterprise-sales');
        expect(stored).toContain('pricing');
    });

    it('reuses the shared mail path for sales notification and prospect acknowledgement', async () => {
        emailConfigured.mockReturnValue(true);
        salesRecipient.mockReturnValue('sales@supreme.example');
        deliver.mockResolvedValueOnce({ status: 'DELIVERED', messageId: 'sales-1' });
        deliver.mockResolvedValueOnce({ status: 'FAILED' });

        const response = await request(app)
            .post('/api/v1/demo-requests')
            .send(complete);
        expect(response.status).toBe(202);
        expect(response.body.accepted).toBe(true);
        expect(JSON.stringify(response.body)).not.toMatch(/FAILED|DELIVERED|NOT_CONFIGURED/);
        expect(deliver).toHaveBeenCalledTimes(2);
        expect(deliver).toHaveBeenNthCalledWith(1, expect.objectContaining({
            to: 'sales@supreme.example',
            eventType: 'sales.demo_request',
        }));
        expect(deliver).toHaveBeenNthCalledWith(2, expect.objectContaining({
            to: 'jordan.hale@example.com',
            subject: 'We received your Supreme demo request',
            eventType: 'sales.demo_acknowledgement',
        }));
        const stored = fs.readFileSync(storeFile, 'utf8');
        expect(stored).toContain('"salesNotification":"DELIVERED"');
        expect(stored).toContain('"prospectAcknowledgement":"FAILED"');
    });

    it('suppresses an immediate duplicate without changing customer success', async () => {
        emailConfigured.mockReturnValue(true);
        salesRecipient.mockReturnValue('sales@supreme.example');
        deliver.mockResolvedValue({ status: 'DELIVERED', messageId: 'sales-1' });
        const first = await request(app).post('/api/v1/demo-requests').send(complete);
        const second = await request(app).post('/api/v1/demo-requests').send(complete);
        expect(first.status).toBe(202);
        expect(second.status).toBe(202);
        expect(second.body.accepted).toBe(true);
        expect(deliver).toHaveBeenCalledTimes(2);
    });
});
