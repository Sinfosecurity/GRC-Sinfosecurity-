import { shouldSkipRateLimit } from '../middleware/rateLimiter';

describe('production-like rate limit policy', () => {
    it('does not skip the general limiter because DEV_MODE is true', () => {
        expect(shouldSkipRateLimit(
            { path: '/api/v1/vendors' },
            { NODE_ENV: 'development', DEV_MODE: 'true' }
        )).toBe(false);
    });

    it('skips only in Jest unless RATE_LIMIT_ENFORCE is set', () => {
        expect(shouldSkipRateLimit({ path: '/api/v1/vendors' }, { NODE_ENV: 'test' })).toBe(true);
        expect(shouldSkipRateLimit(
            { path: '/api/v1/vendors' },
            { NODE_ENV: 'test', RATE_LIMIT_ENFORCE: 'true' }
        )).toBe(false);
    });

    it('always skips health checks', () => {
        expect(shouldSkipRateLimit({ path: '/health' }, { NODE_ENV: 'production' })).toBe(true);
    });
});
