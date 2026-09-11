/**
 * Differentiated rate limits.
 * A legitimate authenticated TPRM journey (login through all report downloads)
 * must complete without 429. Auth abuse stays strict.
 *
 * DEV_MODE no longer skips the general API limiter. Tests skip via NODE_ENV=test.
 * RATE_LIMIT_RELAXED=true is the only explicit bypass for local soak tests.
 */

import rateLimit from 'express-rate-limit';
import { Request } from 'express';

export function shouldSkipRateLimit(req: Pick<Request, 'path'>, env: NodeJS.ProcessEnv = process.env) {
    return (
        (env.NODE_ENV === 'test' && env.RATE_LIMIT_ENFORCE !== 'true') ||
        env.RATE_LIMIT_RELAXED === 'true' ||
        req.path === '/health' ||
        req.path === '/health/basic'
    );
}

function skipInfrastructure(req: Request) {
    return shouldSkipRateLimit(req);
}

function ipKey(req: Request) {
    return req.ip || req.socket.remoteAddress || 'unknown';
}

function userOrIp(req: Request) {
    return (req as any).user?.id || ipKey(req);
}

/** General API: enough for a full TPRM session, still bounds suspicious bursts. */
export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 800,
    message: {
        success: false,
        error: {
            message: 'Too many requests from this IP, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInfrastructure,
    keyGenerator: ipKey,
});

/** Login / signup failures — 5 per 15 minutes. Successful logins do not count. */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    skip: skipInfrastructure,
    keyGenerator: ipKey,
    message: {
        success: false,
        error: {
            message: 'Too many login attempts, please try again after 15 minutes',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
        },
    },
});

export const mfaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    skip: skipInfrastructure,
    keyGenerator: ipKey,
    message: {
        success: false,
        error: {
            message: 'Too many MFA verification attempts, please try again later',
            code: 'MFA_RATE_LIMIT_EXCEEDED',
        },
    },
});

export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    skip: skipInfrastructure,
    keyGenerator: ipKey,
    message: {
        success: false,
        error: {
            message: 'Too many password reset attempts, please try again after an hour',
            code: 'PASSWORD_RESET_LIMIT_EXCEEDED',
        },
    },
});

export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 40,
    skip: skipInfrastructure,
    keyGenerator: userOrIp,
    message: {
        success: false,
        error: {
            message: 'Upload limit exceeded, please try again later',
            code: 'UPLOAD_LIMIT_EXCEEDED',
        },
    },
});

/** Full report pack is ~10 files; 40/hour allows a session plus retries. */
export const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 40,
    skip: skipInfrastructure,
    keyGenerator: userOrIp,
    message: {
        success: false,
        error: {
            message: 'Report generation limit exceeded, please try again later',
            code: 'REPORT_LIMIT_EXCEEDED',
        },
    },
});

export const bulkOperationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    skip: skipInfrastructure,
    keyGenerator: userOrIp,
    message: {
        success: false,
        error: {
            message: 'Bulk operation limit exceeded, please try again later',
            code: 'BULK_OPERATION_LIMIT_EXCEEDED',
        },
    },
});

export const ssoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skip: skipInfrastructure,
    keyGenerator: ipKey,
    message: {
        success: false,
        error: {
            message: 'Too many SSO attempts, please try again later',
            code: 'SSO_RATE_LIMIT_EXCEEDED',
        },
    },
});

export const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    skip: skipInfrastructure,
    keyGenerator: userOrIp,
    message: {
        success: false,
        error: {
            message: 'Rate limit exceeded for sensitive operation',
            code: 'STRICT_RATE_LIMIT_EXCEEDED',
        },
    },
});
