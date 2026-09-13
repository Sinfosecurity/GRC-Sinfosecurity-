import express from 'express';
import request from 'supertest';
import { applyProviderDeliveryEvent } from '../services/emailDeliveryLifecycle';
import { mapResendEventType, signResendWebhook, verifyResendWebhookSignature } from '../services/resendClient';
import emailWebhookRoutes from '../routes/email.webhook.routes';
import { errorHandler } from '../middleware/errorHandler';

jest.mock('../config/database', () => ({
    prisma: {
        emailDeliveryEvent: { findUnique: jest.fn(), create: jest.fn() },
        accountInvitation: { findFirst: jest.fn(), update: jest.fn() },
        notificationDeliveryLog: { updateMany: jest.fn() },
    },
}));

jest.mock('../services/auditEventService', () => ({
    recordAudit: jest.fn().mockResolvedValue(undefined),
}));

const { prisma } = require('../config/database');
const { recordAudit } = require('../services/auditEventService');

const SECRET = `whsec_${Buffer.from('webhook-test-secret').toString('base64')}`;

function webhookApp() {
    const app = express();
    app.use(express.json({
        verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
            req.rawBody = buf;
        },
    }));
    app.use('/api/v1/webhooks', emailWebhookRoutes);
    app.use(errorHandler);
    return app;
}

describe('Resend delivery webhook', () => {
    const previousSecret = process.env.RESEND_WEBHOOK_SECRET;

    beforeEach(() => {
        process.env.RESEND_WEBHOOK_SECRET = SECRET;
        prisma.emailDeliveryEvent.findUnique.mockResolvedValue(null);
        prisma.emailDeliveryEvent.create.mockResolvedValue({ id: 'evt-1' });
        prisma.accountInvitation.findFirst.mockResolvedValue({
            id: 'inv-1',
            email: 'ashobal@sinfosecurity.com',
            organizationId: 'org-a',
            emailDeliveredAt: null,
            emailFailedAt: null,
            emailLastError: null,
        });
        prisma.accountInvitation.update.mockResolvedValue({});
        prisma.notificationDeliveryLog.updateMany.mockResolvedValue({ count: 1 });
    });

    afterAll(() => {
        if (previousSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
        else process.env.RESEND_WEBHOOK_SECRET = previousSecret;
    });

    it('maps provider events onto application delivery states', () => {
        expect(mapResendEventType('email.delivered')).toBe('DELIVERED');
        expect(mapResendEventType('email.bounced')).toBe('BOUNCED');
        expect(mapResendEventType('email.sent')).toBe('SENT');
        expect(mapResendEventType('email.failed')).toBe('FAILED');
        expect(mapResendEventType('email.opened')).toBeNull();
    });

    it('accepts a valid signature and rejects a stale or wrong one', () => {
        const body = '{"type":"email.delivered"}';
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = signResendWebhook(body, SECRET, 'msg_1', timestamp);
        expect(verifyResendWebhookSignature(body, { id: 'msg_1', timestamp, signature }, SECRET)).toBe(true);
        expect(verifyResendWebhookSignature(body, { id: 'msg_1', timestamp, signature: 'v1,deadbeef' }, SECRET)).toBe(false);
        expect(verifyResendWebhookSignature(body, { id: 'msg_1', timestamp: '1', signature }, SECRET)).toBe(false);
    });

    it('updates invitation delivery on delivered and bounced events', async () => {
        const delivered = await applyProviderDeliveryEvent({
            provider: 'RESEND',
            providerEventId: 'evt_delivered',
            providerMessageId: 'msg_1',
            eventType: 'email.delivered',
            recipient: 'ashobal@sinfosecurity.com',
        });
        expect(delivered).toMatchObject({ applied: true, deliveryStatus: 'DELIVERED', invitationId: 'inv-1' });
        expect(prisma.accountInvitation.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'inv-1' },
            data: expect.objectContaining({ emailDeliveryStatus: 'DELIVERED' }),
        }));

        const bounced = await applyProviderDeliveryEvent({
            provider: 'RESEND',
            providerEventId: 'evt_bounced',
            providerMessageId: 'msg_1',
            eventType: 'email.bounced',
            lastError: 'mailbox unavailable',
        });
        expect(bounced).toMatchObject({ applied: true, deliveryStatus: 'BOUNCED' });
    });

    it('is idempotent for a duplicate provider event id', async () => {
        prisma.emailDeliveryEvent.findUnique.mockResolvedValue({ deliveryStatus: 'DELIVERED' });
        const result = await applyProviderDeliveryEvent({
            provider: 'RESEND',
            providerEventId: 'evt_delivered',
            providerMessageId: 'msg_1',
            eventType: 'email.delivered',
        });
        expect(result).toEqual({ idempotent: true, deliveryStatus: 'DELIVERED' });
        expect(prisma.emailDeliveryEvent.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid webhook signature', async () => {
        const app = webhookApp();
        const response = await request(app)
            .post('/api/v1/webhooks/resend')
            .set('svix-id', 'msg_1')
            .set('svix-timestamp', String(Math.floor(Date.now() / 1000)))
            .set('svix-signature', 'v1,not-valid')
            .send({ type: 'email.delivered', data: { email_id: 'msg_1' } });
        expect(response.status).toBe(400);
        expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'email.webhook',
            result: 'failure',
        }));
    });

    it('accepts a signed delivered event', async () => {
        const app = webhookApp();
        const payload = {
            id: 'revent_1',
            type: 'email.delivered',
            data: { email_id: 'msg_1', to: ['ashobal@sinfosecurity.com'] },
        };
        const raw = JSON.stringify(payload);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = signResendWebhook(raw, SECRET, 'msg_header', timestamp);
        const response = await request(app)
            .post('/api/v1/webhooks/resend')
            .set('svix-id', 'msg_header')
            .set('svix-timestamp', timestamp)
            .set('svix-signature', signature)
            .set('Content-Type', 'application/json')
            .send(raw);
        expect(response.status).toBe(200);
        expect(response.body.received).toBe(true);
    });
});
