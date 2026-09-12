/**
 * Safe client IP resolution behind Render / reverse proxies.
 *
 * Express `trust proxy = 1` trusts only the immediate hop (Render).
 * `req.ip` is then the address assigned by that hop — not the leftmost
 * attacker-controlled X-Forwarded-For value.
 *
 * Never use X-Forwarded-For[0] as the limiter key.
 */

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-fA-F:]+$/;

export function normalizeIp(value: string | undefined | null): string {
    const raw = String(value || '').trim();
    if (!raw) return 'unknown';
    const unbracketed = raw.replace(/^\[|\]$/g, '');
    const withoutMapped = unbracketed.replace(/^::ffff:/i, '');
    if (IPV4.test(withoutMapped) || IPV6.test(withoutMapped)) {
        return withoutMapped;
    }
    return 'unknown';
}

export function resolveClientIp(req: { ip?: string; socket?: { remoteAddress?: string } }): string {
    return normalizeIp(req.ip || req.socket?.remoteAddress);
}

/**
 * The leftmost XFF value is attacker-controlled on the public internet.
 * Limiters must not use this as a key.
 */
export function leftmostForwardedIp(header: string | string[] | undefined): string {
    const raw = Array.isArray(header) ? header.join(',') : String(header || '');
    return normalizeIp(raw.split(',')[0]);
}
