import net from 'net';
import { ApiError } from '../middleware/errorHandler';

const BLOCKED_HOSTS = new Set([
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
    'metadata.google.com',
    'metadata.goog',
    'instance-data',
    'kubernetes.default',
    'kubernetes.default.svc',
    'kubernetes.default.svc.cluster.local',
]);

const METADATA_IPV4 = new Set(['169.254.169.254', '169.254.170.2', '169.254.169.253']);
const ALLOWED_PORTS = new Set([443]);

export const SSRF_SAFE_ERROR = 'That destination is not allowed.';

export type ParsedOutboundUrl = {
    href: string;
    hostname: string;
    port: number;
    pathname: string;
};

function mappedIpv4(address: string): string | null {
    const lower = address.toLowerCase();
    if (lower.startsWith('::ffff:')) {
        const mapped = lower.slice('::ffff:'.length);
        return net.isIP(mapped) === 4 ? mapped : null;
    }
    return null;
}

function ipv4Blocked(address: string): boolean {
    const parts = address.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return true;
    const [a, b] = parts;
    if (METADATA_IPV4.has(address)) return true;
    if (a === 0 || a === 127 || a === 10 || a === 255) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
}

function ipv6Blocked(address: string): boolean {
    const value = address.toLowerCase();
    if (value === '::1' || value === '::') return true;
    const mapped = mappedIpv4(value);
    if (mapped) return ipv4Blocked(mapped);
    const expanded = expandIpv6(value);
    if (!expanded) return true;
    if (expanded.startsWith('fe80:')) return true;
    if (expanded.startsWith('fc') || expanded.startsWith('fd')) return true;
    if (expanded.startsWith('ff')) return true;
    return false;
}

function expandIpv6(address: string): string | null {
    if (net.isIP(address) !== 6) return null;
    const [head, tail] = address.split('::');
    const headParts = head ? head.split(':') : [];
    const tailParts = tail ? tail.split(':') : [];
    const missing = 8 - (headParts.filter(Boolean).length + tailParts.filter(Boolean).length);
    const filled = [
        ...headParts.filter(Boolean),
        ...Array.from({ length: Math.max(missing, 0) }, () => '0'),
        ...tailParts.filter(Boolean),
    ].map((part) => part.padStart(4, '0'));
    return filled.join(':').toLowerCase();
}

export function isBlockedIp(address: string): boolean {
    const value = address.toLowerCase().replace(/^\[|\]$/g, '');
    const version = net.isIP(value);
    if (version === 4) return ipv4Blocked(value);
    if (version === 6) return ipv6Blocked(value);
    return false;
}

export function isBlockedHostname(hostname: string): boolean {
    const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (BLOCKED_HOSTS.has(host)) return true;
    if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) return true;
    if (net.isIP(host) && isBlockedIp(host)) return true;
    return false;
}

export function assertSafeOutboundUrl(raw: string, options?: { allowedPorts?: number[] }): ParsedOutboundUrl {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new ApiError(400, 'Enter a valid HTTPS URL.');
    }
    if (url.protocol !== 'https:') {
        throw new ApiError(400, 'Only HTTPS destinations are allowed.');
    }
    if (url.username || url.password) {
        throw new ApiError(400, SSRF_SAFE_ERROR);
    }
    const host = url.hostname.toLowerCase();
    if (!host || isBlockedHostname(host)) {
        throw new ApiError(400, SSRF_SAFE_ERROR);
    }
    const port = url.port ? Number(url.port) : 443;
    const allowed = new Set(options?.allowedPorts || [...ALLOWED_PORTS]);
    if (!allowed.has(port)) {
        throw new ApiError(400, SSRF_SAFE_ERROR);
    }
    return {
        href: url.href,
        hostname: host,
        port,
        pathname: url.pathname,
    };
}

export function assertSafeResolvedAddresses(addresses: Array<{ address: string }>): void {
    if (!addresses.length) {
        throw new ApiError(400, SSRF_SAFE_ERROR);
    }
    if (addresses.some((row) => isBlockedIp(row.address))) {
        throw new ApiError(400, SSRF_SAFE_ERROR);
    }
}

export function issuerHost(raw: string): string {
    const parsed = assertSafeOutboundUrl(raw);
    return parsed.hostname;
}

export function issuerHostAllowed(requestedIssuer: string, configuredIssuer?: string | null, approvedHosts: string[] = []): boolean {
    const requested = issuerHost(requestedIssuer);
    if (configuredIssuer) {
        try {
            if (issuerHost(configuredIssuer) === requested) return true;
        } catch {
            const configured = configuredIssuer.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
            if (configured === requested) return true;
        }
    } else if (!approvedHosts.length) {
        return true;
    }
    return approvedHosts.some((domain) => {
        const host = domain.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
        return requested === host || requested.endsWith(`.${host}`);
    });
}
