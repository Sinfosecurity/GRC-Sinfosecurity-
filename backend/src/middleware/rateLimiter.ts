/**
 * Differentiated, proxy-safe rate limits.
 * A legitimate authenticated TPRM journey must complete without 429.
 * Auth and public-form abuse stay strict. Stripe webhooks are exempt.
 *
 * DEV_MODE does not skip the general API limiter. Tests skip via NODE_ENV=test
 * unless RATE_LIMIT_ENFORCE=true. RATE_LIMIT_RELAXED=true is local soak only.
 */

import rateLimit, { type Options, type RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import {
    customerRateLimitBody,
    getRateLimitSpec,
    limiterKey,
    shouldSkipRateLimit,
    type RateLimitCategory,
} from './rateLimitPolicy';
import { createRateLimitStore } from './rateLimitStore';
import { recordRateLimitThrottle } from '../services/rateLimitTelemetry';

export { shouldSkipRateLimit, limiterKey, getRateLimitSpec } from './rateLimitPolicy';
export { rateLimitStoreMode, resetMemoryRateLimitStore, rateLimitClock } from './rateLimitStore';

function skipInfrastructure(req: Request) {
    return shouldSkipRateLimit(req);
}

function retryAfterSeconds(req: Request, windowMs: number) {
    const reset = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
    if (reset) {
        return Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 1000));
    }
    return Math.max(1, Math.ceil(windowMs / 1000));
}

export function createCategoryLimiter(category: RateLimitCategory): RateLimitRequestHandler {
    const spec = getRateLimitSpec(category);
    return rateLimit({
        windowMs: spec.windowMs,
        max: () => getRateLimitSpec(category).max,
        skipSuccessfulRequests: spec.skipSuccessfulRequests,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        skip: skipInfrastructure,
        keyGenerator: (req) => limiterKey(category, req),
        store: createRateLimitStore(category),
        validate: {
            xForwardedForHeader: false,
            ip: false,
            creationStack: false,
        },
        handler: (req: Request, res: Response, _next, options: Options) => {
            const user = (req as Request & { user?: { organizationId?: string } }).user;
            recordRateLimitThrottle({
                category,
                requestId: (req as Request & { id?: string }).id || String(req.headers['x-request-id'] || ''),
                organizationId: user?.organizationId,
                key: limiterKey(category, req),
                route: req.originalUrl || req.path,
            });
            const retryAfter = retryAfterSeconds(req, options.windowMs);
            res.setHeader('Retry-After', String(retryAfter));
            res.status(429).json(customerRateLimitBody());
        },
    });
}

/** General API: enough for a full TPRM session, still bounds suspicious bursts. */
export const rateLimiter = createCategoryLimiter('general');

/** Login failures — email + IP. Successful logins do not count. */
export const authRateLimiter = createCategoryLimiter('login');
export const loginIpLimiter = createCategoryLimiter('login_ip');

/** Public signup / organization creation. */
export const signupRateLimiter = createCategoryLimiter('signup');

export const mfaLimiter = createCategoryLimiter('mfa');

export const passwordResetLimiter = createCategoryLimiter('password_reset');
export const passwordResetIpLimiter = createCategoryLimiter('password_reset_ip');

export const activationRateLimiter = createCategoryLimiter('activation');

export const demoRequestLimiter = createCategoryLimiter('demo');
export const demoRequestIpLimiter = createCategoryLimiter('demo_ip');

export const uploadLimiter = createCategoryLimiter('upload');

/** Full report pack is ~10 files; 40/hour allows a session plus retries. */
export const reportLimiter = createCategoryLimiter('report');

export const billingLimiter = createCategoryLimiter('billing');

export const adminLimiter = createCategoryLimiter('admin');

export const aiLimiter = createCategoryLimiter('ai');

export const bulkOperationLimiter = createCategoryLimiter('bulk');

export const ssoLimiter = createCategoryLimiter('sso');

export const strictLimiter = createCategoryLimiter('strict');
