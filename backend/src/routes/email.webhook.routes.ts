import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { applyProviderDeliveryEvent } from '../services/emailDeliveryLifecycle';
import { providerValuePresent } from '../services/emailProvider';
import { verifyResendWebhookSignature } from '../services/resendClient';
import { recordAudit } from '../services/auditEventService';

const router = Router();

router.post('/resend', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!providerValuePresent(process.env, 'RESEND_WEBHOOK_SECRET')) {
            throw new ApiError(503, 'Email delivery tracking is not configured');
        }
        const raw = (req as { rawBody?: Buffer }).rawBody;
        const payload = Buffer.isBuffer(raw)
            ? raw.toString('utf8')
            : typeof req.body === 'string'
                ? req.body
                : JSON.stringify(req.body || {});
        const valid = verifyResendWebhookSignature(payload, {
            id: String(req.headers['svix-id'] || ''),
            timestamp: String(req.headers['svix-timestamp'] || ''),
            signature: String(req.headers['svix-signature'] || ''),
        }, process.env.RESEND_WEBHOOK_SECRET as string);
        if (!valid) {
            await recordAudit({
                action: 'email.webhook',
                resourceType: 'Email',
                result: 'failure',
                metadata: { reason: 'invalid_signature', provider: 'RESEND' },
            });
            throw new ApiError(400, 'Invalid webhook signature');
        }
        const body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(payload);
        const data = body.data || {};
        const result = await applyProviderDeliveryEvent({
            provider: 'RESEND',
            providerEventId: String(body.id || `${body.type}:${data.email_id}:${body.created_at || ''}`),
            providerMessageId: data.email_id || data.id || null,
            eventType: String(body.type || ''),
            recipient: Array.isArray(data.to) ? data.to[0] : data.to,
            lastError: data.bounce?.message || data.failed?.message || null,
        });
        res.json({ received: true, ...result });
    } catch (error) {
        next(error);
    }
});

export default router;
