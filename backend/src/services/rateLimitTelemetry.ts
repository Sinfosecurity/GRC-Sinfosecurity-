import { Counter } from 'prom-client';
import { register } from '../config/metrics';
import logger from '../config/logger';
import type { RateLimitCategory } from '../middleware/rateLimitPolicy';
import { maskEmail } from './publicFrontendUrl';

export const rateLimitThrottles = new Counter({
    name: 'supreme_rate_limit_throttles_total',
    help: 'Customer-safe throttle counts by limiter category',
    labelNames: ['category'],
    registers: [register],
});

export const rateLimitStoreFailures = new Counter({
    name: 'supreme_rate_limit_store_failures_total',
    help: 'Rate-limit store unavailability events by category and policy',
    labelNames: ['category', 'policy'],
    registers: [register],
});

const METRIC_GROUP: Record<string, string> = {
    login: 'auth',
    login_ip: 'auth',
    signup: 'auth',
    password_reset: 'auth',
    password_reset_ip: 'auth',
    activation: 'auth',
    mfa: 'auth',
    sso: 'auth',
    general: 'api',
    report: 'report',
    upload: 'upload',
    demo: 'demo',
    demo_ip: 'demo',
    billing: 'billing',
    admin: 'admin',
    ai: 'ai',
    bulk: 'api',
    strict: 'api',
};

function maskIdentity(value: string) {
    if (value.includes('@')) {
        return maskEmail(value);
    }
    return value.replace(/[a-f0-9]{8,}/gi, '[id]');
}

export function recordRateLimitThrottle(input: {
    category: RateLimitCategory;
    requestId?: string;
    organizationId?: string;
    key: string;
    route?: string;
}) {
    const group = METRIC_GROUP[input.category] || input.category;
    rateLimitThrottles.inc({ category: group });
    logger.warn('rate_limit_throttled', {
        eventType: 'rate_limit_throttled',
        category: input.category,
        group,
        requestId: input.requestId,
        organizationId: input.organizationId,
        route: input.route,
        identity: maskIdentity(input.key),
        result: 'RATE_LIMITED',
        timestamp: new Date().toISOString(),
    });
}

export function recordRateLimitStoreFailure(input: {
    category: RateLimitCategory;
    policy: 'fail-closed' | 'fail-open';
    error: unknown;
}) {
    rateLimitStoreFailures.inc({ category: input.category, policy: input.policy });
    logger.error('rate_limit_store_unavailable', {
        eventType: 'rate_limit_store_unavailable',
        category: input.category,
        policy: input.policy,
        result: input.policy === 'fail-closed' ? 'FAIL_CLOSED' : 'FAIL_OPEN',
        error: input.error instanceof Error ? input.error.message : String(input.error),
        timestamp: new Date().toISOString(),
    });
}
