import { shouldSkipRateLimit, limiterKey, getRateLimitSpec } from '../middleware/rateLimitPolicy';
import { leftmostForwardedIp, resolveClientIp } from '../security/clientIp';

describe('production-like rate limit policy', () => {
    it('does not skip the general limiter because DEV_MODE is true', () => {
        expect(shouldSkipRateLimit(
            { path: '/api/v1/vendors', originalUrl: '/api/v1/vendors' },
            { NODE_ENV: 'development', DEV_MODE: 'true' }
        )).toBe(false);
    });

    it('skips only in Jest unless RATE_LIMIT_ENFORCE is set', () => {
        expect(shouldSkipRateLimit({ path: '/api/v1/vendors', originalUrl: '/api/v1/vendors' }, { NODE_ENV: 'test' })).toBe(true);
        expect(shouldSkipRateLimit(
            { path: '/api/v1/vendors', originalUrl: '/api/v1/vendors' },
            { NODE_ENV: 'test', RATE_LIMIT_ENFORCE: 'true' }
        )).toBe(false);
    });

    it('always skips health checks', () => {
        expect(shouldSkipRateLimit({ path: '/health', originalUrl: '/health' }, { NODE_ENV: 'production' })).toBe(true);
    });

    it('skips Stripe webhooks from end-user IP limiting', () => {
        expect(shouldSkipRateLimit(
            { path: '/v1/billing/webhook', originalUrl: '/api/v1/billing/webhook' },
            { NODE_ENV: 'production' }
        )).toBe(true);
    });
});

describe('proxy-safe client IP', () => {
    it('uses Express req.ip, not the leftmost X-Forwarded-For value', () => {
        const req = {
            ip: '203.0.113.10',
            socket: { remoteAddress: '10.0.0.2' },
        };
        expect(resolveClientIp(req)).toBe('203.0.113.10');
        expect(leftmostForwardedIp('1.2.3.4, 203.0.113.10')).toBe('1.2.3.4');
        expect(leftmostForwardedIp('1.2.3.4, 203.0.113.10')).not.toBe(resolveClientIp(req));
    });

    it('does not treat a spoofed X-Forwarded-For as the limiter identity', () => {
        const req = { ip: '198.51.100.20', socket: { remoteAddress: '10.1.1.1' } };
        expect(resolveClientIp(req)).toBe('198.51.100.20');
        expect(resolveClientIp(req)).not.toBe(leftmostForwardedIp('8.8.8.8'));
    });
});

describe('tenant-aware limiter keys', () => {
    it('keeps Org A and Org B on separate report/upload buckets', () => {
        const orgA = {
            ip: '203.0.113.10',
            socket: { remoteAddress: '203.0.113.10' },
            body: {},
            user: { id: 'user-a', organizationId: 'org-a' },
        } as any;
        const orgB = {
            ip: '203.0.113.10',
            socket: { remoteAddress: '203.0.113.10' },
            body: {},
            user: { id: 'user-b', organizationId: 'org-b' },
        } as any;
        expect(limiterKey('report', orgA)).not.toBe(limiterKey('report', orgB));
        expect(limiterKey('upload', orgA)).toContain('org:org-a');
        expect(limiterKey('billing', orgB)).toContain('org:org-b');
    });

    it('combines normalized email and IP for login and demo keys', () => {
        const req = {
            ip: '203.0.113.9',
            socket: { remoteAddress: '203.0.113.9' },
            body: { email: 'Admin@Example.com' },
        } as any;
        expect(limiterKey('login', req)).toBe('login:admin@example.com:203.0.113.9');
        expect(limiterKey('demo', req)).toBe('demo:admin@example.com:203.0.113.9');
    });

    it('keeps general API at 800 / 15 minutes', () => {
        const spec = getRateLimitSpec('general');
        expect(spec.max).toBe(800);
        expect(spec.windowMs).toBe(15 * 60 * 1000);
    });
});
