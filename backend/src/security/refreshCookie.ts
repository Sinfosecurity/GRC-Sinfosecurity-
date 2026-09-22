import type { CookieOptions, Request, Response } from 'express';
import { getEnv } from '../config/env';

export const REFRESH_COOKIE = 'sr_refresh';
export const REFRESH_CSRF_HEADER = 'x-supreme-requested-with';
export const REFRESH_CSRF_VALUE = 'supreme-browser';

export function hostedCookieSecure(env: NodeJS.ProcessEnv = process.env) {
    return env.NODE_ENV === 'production' || env.APP_ENVIRONMENT === 'staging' || env.APP_ENVIRONMENT === 'production';
}

export function refreshCookieOptions(maxAgeMs: number, env: NodeJS.ProcessEnv = process.env): CookieOptions {
    const secure = hostedCookieSecure(env);
    return {
        httpOnly: true,
        secure,
        sameSite: secure ? 'none' : 'lax',
        path: '/api/v1/auth',
        maxAge: maxAgeMs,
    };
}

export function readRefreshToken(req: Request): { token?: string; fromCookie: boolean } {
    const cookie = req.cookies?.[REFRESH_COOKIE];
    if (typeof cookie === 'string' && cookie) {
        return { token: cookie, fromCookie: true };
    }
    if (typeof req.body?.refreshToken === 'string' && req.body.refreshToken) {
        return { token: req.body.refreshToken, fromCookie: false };
    }
    return { fromCookie: false };
}

export function assertRefreshCsrf(req: Request, fromCookie: boolean) {
    if (!fromCookie) return;
    const header = String(req.headers[REFRESH_CSRF_HEADER] || '').toLowerCase();
    if (header !== REFRESH_CSRF_VALUE) {
        const { ApiError } = require('../middleware/errorHandler') as typeof import('../middleware/errorHandler');
        throw new ApiError(403, 'Refresh request is missing the browser CSRF header.');
    }
}

export function setRefreshCookie(res: Response, token: string, maxAgeMs: number) {
    res.cookie(REFRESH_COOKIE, token, refreshCookieOptions(maxAgeMs));
    res.clearCookie('token', { ...refreshCookieOptions(maxAgeMs), path: '/' });
}

export function clearRefreshCookie(res: Response) {
    const options = refreshCookieOptions(0);
    res.clearCookie(REFRESH_COOKIE, options);
    res.clearCookie('token', { ...options, path: '/' });
}

export function shouldExposeRefreshTokenInBody(env: NodeJS.ProcessEnv = process.env) {
    return env.NODE_ENV === 'test' || env.AUTH_REFRESH_BODY_COMPAT === 'true';
}

export function sessionRefreshTtlMs() {
    const env = getEnv();
    const raw = env.jwtRefreshExpiresIn;
    const days = raw.endsWith('d') ? parseInt(raw, 10) : 7;
    return days * 24 * 60 * 60 * 1000;
}
