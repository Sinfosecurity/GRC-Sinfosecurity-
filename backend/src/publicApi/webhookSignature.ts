import crypto from 'crypto';

export const WEBHOOK_SCHEMA_VERSION = '2026-09-18';

export function signWebhook(secret: string, timestamp: string, body: string) {
    const digest = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
    return `v1=${digest}`;
}

export function verifyWebhookSignature(input: {
    secret: string;
    timestamp: string;
    body: string;
    signature: string;
    now?: number;
    maxSkewSeconds?: number;
}) {
    const now = input.now ?? Date.now();
    const maxSkew = (input.maxSkewSeconds ?? 300) * 1000;
    const ts = Number(input.timestamp) * (input.timestamp.length <= 10 ? 1000 : 1);
    if (!Number.isFinite(ts) || Math.abs(now - ts) > maxSkew) {
        return false;
    }
    const expected = signWebhook(input.secret, input.timestamp, input.body);
    const provided = String(input.signature || '');
    const left = Buffer.from(expected);
    const right = Buffer.from(provided);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}
