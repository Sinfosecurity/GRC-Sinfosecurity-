/**
 * Rate-limit policy, keying, and skip rules.
 * Hosted production-like defaults stay here. Tests inject shorter windows
 * through overrideRateLimitPolicy() without changing staging env.
 */

import { Request } from 'express';
import { resolveClientIp } from '../security/clientIp';

export type RateLimitCategory =
    | 'general'
    | 'login'
    | 'login_ip'
    | 'signup'
    | 'password_reset'
    | 'password_reset_ip'
    | 'activation'
    | 'demo'
    | 'demo_ip'
    | 'upload'
    | 'report'
    | 'billing'
    | 'admin'
    | 'ai'
    | 'mfa'
    | 'sso'
    | 'bulk'
    | 'strict';

export type RateLimitFailurePolicy = 'fail-closed' | 'fail-open';

export type RateLimitSpec = {
    max: number;
    windowMs: number;
    skipSuccessfulRequests: boolean;
    failurePolicy: RateLimitFailurePolicy;
    keying: 'ip' | 'email+ip' | 'user+org' | 'user+org+ip';
};

const DEFAULTS: Record<RateLimitCategory, RateLimitSpec> = {
    general: { max: 800, windowMs: 15 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-open', keying: 'ip' },
    login: { max: 8, windowMs: 15 * 60 * 1000, skipSuccessfulRequests: true, failurePolicy: 'fail-closed', keying: 'email+ip' },
    login_ip: { max: 25, windowMs: 15 * 60 * 1000, skipSuccessfulRequests: true, failurePolicy: 'fail-closed', keying: 'ip' },
    signup: { max: 8, windowMs: 15 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-closed', keying: 'ip' },
    password_reset: { max: 5, windowMs: 60 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-closed', keying: 'email+ip' },
    password_reset_ip: { max: 12, windowMs: 60 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-closed', keying: 'ip' },
    activation: { max: 10, windowMs: 15 * 60 * 1000, skipSuccessfulRequests: true, failurePolicy: 'fail-closed', keying: 'ip' },
    demo: { max: 8, windowMs: 15 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-closed', keying: 'email+ip' },
    demo_ip: { max: 20, windowMs: 15 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-closed', keying: 'ip' },
    upload: { max: 40, windowMs: 60 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-open', keying: 'user+org' },
    report: { max: 40, windowMs: 60 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-open', keying: 'user+org' },
    billing: { max: 10, windowMs: 15 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-open', keying: 'user+org' },
    admin: { max: 20, windowMs: 60 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-open', keying: 'user+org' },
    ai: { max: 30, windowMs: 60 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-open', keying: 'user+org' },
    mfa: { max: 5, windowMs: 15 * 60 * 1000, skipSuccessfulRequests: true, failurePolicy: 'fail-closed', keying: 'ip' },
    sso: { max: 10, windowMs: 15 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-closed', keying: 'ip' },
    bulk: { max: 5, windowMs: 60 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-open', keying: 'user+org' },
    strict: { max: 3, windowMs: 15 * 60 * 1000, skipSuccessfulRequests: false, failurePolicy: 'fail-closed', keying: 'user+org' },
};

let overrides: Partial<Record<RateLimitCategory, Partial<RateLimitSpec>>> = {};

export function overrideRateLimitPolicy(
    next: Partial<Record<RateLimitCategory, Partial<RateLimitSpec>>>
) {
    overrides = { ...overrides, ...next };
}

export function resetRateLimitPolicy() {
    overrides = {};
}

export function getRateLimitSpec(category: RateLimitCategory): RateLimitSpec {
    return { ...DEFAULTS[category], ...overrides[category] };
}

export function rateLimitNamespace(env: NodeJS.ProcessEnv = process.env) {
    return env.RATE_LIMIT_NAMESPACE || (env.NODE_ENV === 'test' ? 'test' : 'default');
}

export function normalizeEmail(value: unknown): string {
    return String(value || '').trim().toLowerCase();
}

export function shouldSkipRateLimit(req: Pick<Request, 'path' | 'originalUrl'>, env: NodeJS.ProcessEnv = process.env) {
    const path = `${req.originalUrl || ''} ${req.path || ''}`;
    return (
        (env.NODE_ENV === 'test' && env.RATE_LIMIT_ENFORCE !== 'true') ||
        env.RATE_LIMIT_RELAXED === 'true' ||
        req.path === '/health' ||
        req.path === '/health/basic' ||
        /\/health(\/|$|\?)/.test(path) ||
        /\/billing\/webhook/.test(path) ||
        req.path === '/metrics'
    );
}

export function limiterKey(category: RateLimitCategory, req: Request): string {
    const spec = getRateLimitSpec(category);
    const ip = resolveClientIp(req);
    const user = (req as { user?: { id?: string; organizationId?: string } }).user;
    const email = normalizeEmail(req.body?.email);

    if (spec.keying === 'email+ip') {
        return `${category}:${email || 'unknown'}:${ip}`;
    }
    if (spec.keying === 'user+org' && user?.organizationId && user?.id) {
        return `${category}:org:${user.organizationId}:user:${user.id}`;
    }
    if (spec.keying === 'user+org+ip' && user?.organizationId && user?.id) {
        return `${category}:org:${user.organizationId}:user:${user.id}:ip:${ip}`;
    }
    return `${category}:ip:${ip}`;
}

export function customerRateLimitBody() {
    return {
        error: {
            code: 'RATE_LIMITED' as const,
            message: 'Too many requests. Please try again later.',
        },
    };
}
