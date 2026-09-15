import crypto from 'crypto';
import { emailFromAddress, emailFromName, emailReplyTo, resendApiKey, safeProviderError } from './emailProvider';

export type ResendSendResult = {
    messageId?: string;
    providerStatus?: string;
};

type ResendWebhookHeaders = {
    id?: string;
    timestamp?: string;
    signature?: string;
};

export function verifyResendWebhookSignature(
    rawBody: string,
    headers: ResendWebhookHeaders,
    secret: string,
    nowSeconds = Math.floor(Date.now() / 1000)
) {
    if (!headers.id || !headers.timestamp || !headers.signature) {
        return false;
    }
    const timestamp = Number(headers.timestamp);
    if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300) {
        return false;
    }
    const key = secret.startsWith('whsec_') ? Buffer.from(secret.slice(6), 'base64') : Buffer.from(secret);
    const expected = crypto.createHmac('sha256', key).update(`${headers.id}.${headers.timestamp}.${rawBody}`).digest('base64');
    return headers.signature.split(' ').some((part) => {
        const signature = part.includes(',') ? part.split(',')[1] : part;
        if (!signature) return false;
        const left = Buffer.from(signature);
        const right = Buffer.from(expected);
        return left.length === right.length && crypto.timingSafeEqual(left, right);
    });
}

export function signResendWebhook(rawBody: string, secret: string, id: string, timestamp: string) {
    const key = secret.startsWith('whsec_') ? Buffer.from(secret.slice(6), 'base64') : Buffer.from(secret);
    const signature = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64');
    return `v1,${signature}`;
}

export function mapResendEventType(type?: string) {
    switch (type) {
        case 'email.sent':
            return 'SENT';
        case 'email.delivered':
            return 'DELIVERED';
        case 'email.bounced':
            return 'BOUNCED';
        case 'email.complained':
            return 'COMPLAINED';
        case 'email.failed':
        case 'email.suppressed':
            return 'FAILED';
        case 'email.delivery_delayed':
            return 'SENT';
        default:
            return null;
    }
}

export async function sendResendEmail(input: {
    to: string;
    subject: string;
    body: string;
    html?: string;
    fromName?: string;
    tags?: Array<{ name: string; value: string }>;
    env?: NodeJS.ProcessEnv;
}): Promise<ResendSendResult> {
    const env = input.env || process.env;
    const apiKey = resendApiKey(env);
    const fromEmail = emailFromAddress(env, 'RESEND');
    if (!apiKey) {
        throw new Error('RESEND_API_KEY is not configured');
    }
    if (!fromEmail) {
        throw new Error('RESEND_FROM_EMAIL is not configured');
    }
    const fromName = input.fromName || emailFromName(env, 'RESEND');
    const replyTo = emailReplyTo(env);
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [input.to],
            subject: input.subject,
            text: input.body,
            html: input.html || undefined,
            reply_to: replyTo || undefined,
            tags: input.tags,
        }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const status = (payload as { statusCode?: number; name?: string; message?: string }).message
            || (payload as { name?: string }).name
            || `Resend responded ${response.status}`;
        throw new Error(safeProviderError(status));
    }
    return {
        messageId: (payload as { id?: string }).id,
        providerStatus: String(response.status),
    };
}

export async function getResendEmail(messageId: string, env: NodeJS.ProcessEnv = process.env) {
    const apiKey = resendApiKey(env);
    if (!apiKey || !messageId) {
        return null;
    }
    const response = await fetch(`https://api.resend.com/emails/${messageId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
        return null;
    }
    const payload = await response.json() as { last_event?: string; id?: string };
    return {
        messageId: payload.id || messageId,
        lastEvent: payload.last_event || null,
    };
}
