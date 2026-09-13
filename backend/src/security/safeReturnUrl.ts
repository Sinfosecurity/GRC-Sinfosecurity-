import { ApiError } from '../middleware/errorHandler';
import { isAllowedCorsOrigin } from './corsOrigins';
import { publicFrontendUrl } from '../services/publicFrontendUrl';

function isLocalHost(hostname: string) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function assertSafeAppReturnUrl(candidate: string | undefined, fallbackPath: string): string {
    const fallback = `${publicFrontendUrl()}${fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`}`;
    const raw = (candidate && String(candidate).trim()) || fallback;
    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        throw new ApiError(400, 'Return URL is not allowed');
    }
    const hosted = process.env.NODE_ENV === 'production' || process.env.APP_ENVIRONMENT === 'staging';
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new ApiError(400, 'Return URL is not allowed');
    }
    if (hosted && parsed.protocol !== 'https:') {
        throw new ApiError(400, 'Return URL is not allowed');
    }
    if (hosted && isLocalHost(parsed.hostname)) {
        throw new ApiError(400, 'Return URL is not allowed');
    }
    if (parsed.username || parsed.password) {
        throw new ApiError(400, 'Return URL is not allowed');
    }
    if (!isAllowedCorsOrigin(parsed.origin)) {
        throw new ApiError(400, 'Return URL is not allowed');
    }
    return parsed.toString();
}
