import dns from 'dns/promises';
import { ApiError } from '../middleware/errorHandler';
import { assertSafeOutboundUrl, isBlockedIp as blockedDestination } from '../security/ssrfPolicy';

export function isBlockedIp(address: string) {
    return blockedDestination(address);
}

export function assertSafeWebhookUrl(raw: string) {
    try {
        const parsed = assertSafeOutboundUrl(raw);
        return new URL(parsed.href);
    } catch (error) {
        if (error instanceof ApiError) {
            throw new ApiError(400, error.message.includes('HTTPS') ? 'Webhook URLs must use HTTPS.' : 'That webhook destination is not allowed.');
        }
        throw new ApiError(400, 'Enter a valid HTTPS webhook URL.');
    }
}

export async function assertSafeWebhookDestination(raw: string) {
    const url = assertSafeWebhookUrl(raw);
    const lookedUp = await dns.lookup(url.hostname, { all: true }).catch(() => []);
    if (!lookedUp.length) throw new ApiError(400, 'The webhook host could not be resolved.');
    if (lookedUp.some((row) => isBlockedIp(row.address))) {
        throw new ApiError(400, 'That webhook destination is not allowed.');
    }
    return url;
}
