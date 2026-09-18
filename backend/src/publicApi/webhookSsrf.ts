import dns from 'dns/promises';
import { ApiError } from '../middleware/errorHandler';

const BLOCKED_HOSTS = new Set(['localhost', 'metadata.google.internal', 'metadata.google.com']);

function ipParts(address: string) {
    return address.split('.').map((part) => Number(part));
}

export function isBlockedIp(address: string) {
    const value = address.toLowerCase().replace(/^\[|\]$/g, '');
    if (value === '::1' || value.startsWith('fe80:') || value.startsWith('fc') || value.startsWith('fd')) return true;
    if (value.includes(':')) return false;
    const [a, b] = ipParts(value);
    if (a === 10 || a === 127 || a === 0 || a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
}

export function assertSafeWebhookUrl(raw: string) {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new ApiError(400, 'Enter a valid HTTPS webhook URL.');
    }
    if (url.protocol !== 'https:') {
        throw new ApiError(400, 'Webhook URLs must use HTTPS.');
    }
    const host = url.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
        throw new ApiError(400, 'That webhook destination is not allowed.');
    }
    if (isBlockedIp(host)) {
        throw new ApiError(400, 'That webhook destination is not allowed.');
    }
    return url;
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
