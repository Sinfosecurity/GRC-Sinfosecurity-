import express, { Request, Response } from 'express';
import request from 'supertest';
import {
    createCategoryLimiter,
    resetMemoryRateLimitStore,
    rateLimitClock,
} from '../middleware/rateLimiter';
import { getRateLimitSpec, overrideRateLimitPolicy, resetRateLimitPolicy } from '../middleware/rateLimitPolicy';
import { WindowCounterStore } from '../middleware/rateLimitStore';

function appFor(
    category: Parameters<typeof createCategoryLimiter>[0],
    handler: (req: Request, res: Response) => void = (_req, res) => res.status(200).json({ ok: true })
) {
    const app = express();
    app.set('trust proxy', 1);
    app.use(express.json());
    app.post('/x', createCategoryLimiter(category), handler);
    app.get('/x', createCategoryLimiter(category), handler);
    return app;
}

describe('deterministic rate-limit abuse', () => {
    const previousEnforce = process.env.RATE_LIMIT_ENFORCE;
    const previousRedis = process.env.REDIS_URL;

    beforeEach(() => {
        process.env.RATE_LIMIT_ENFORCE = 'true';
        delete process.env.REDIS_URL;
        resetRateLimitPolicy();
        resetMemoryRateLimitStore();
        rateLimitClock.now = () => Date.now();
        overrideRateLimitPolicy({
            login: { max: 2, windowMs: 60_000 },
            login_ip: { max: 8, windowMs: 60_000 },
            signup: { max: 2, windowMs: 60_000 },
            password_reset: { max: 2, windowMs: 60_000 },
            activation: { max: 2, windowMs: 60_000 },
            demo: { max: 2, windowMs: 60_000 },
            report: { max: 2, windowMs: 60_000 },
            upload: { max: 2, windowMs: 60_000 },
            billing: { max: 2, windowMs: 60_000 },
            general: { max: 3, windowMs: 60_000 },
        });
    });

    afterEach(() => {
        resetRateLimitPolicy();
        resetMemoryRateLimitStore();
        if (previousEnforce) process.env.RATE_LIMIT_ENFORCE = previousEnforce;
        else delete process.env.RATE_LIMIT_ENFORCE;
        if (previousRedis) process.env.REDIS_URL = previousRedis;
        else delete process.env.REDIS_URL;
        rateLimitClock.now = () => Date.now();
    });

    it('returns a standardized 429 body and Retry-After', async () => {
        const app = appFor('login', (_req, res) => res.status(401).json({ error: 'invalid' }));
        await request(app).post('/x').send({ email: 'a@example.com' }).expect(401);
        await request(app).post('/x').send({ email: 'a@example.com' }).expect(401);
        const limited = await request(app).post('/x').send({ email: 'a@example.com' });
        expect(limited.status).toBe(429);
        expect(limited.body).toEqual({
            error: {
                code: 'RATE_LIMITED',
                message: 'Too many requests. Please try again later.',
            },
        });
        expect(limited.headers['retry-after']).toBeDefined();
        expect(limited.text).not.toMatch(/redis|hash|threshold|WINDOW/i);
    });

    it('does not count a successful login against the failed-attempt budget', async () => {
        const app = appFor('login', (_req, res) => res.status(200).json({ ok: true }));
        await request(app).post('/x').send({ email: 'a@example.com' }).expect(200);
        await request(app).post('/x').send({ email: 'a@example.com' }).expect(200);
        await request(app).post('/x').send({ email: 'a@example.com' }).expect(200);
    });

    it('recovers after the window without sleeping', async () => {
        let now = 1_000_000;
        rateLimitClock.now = () => now;
        const app = appFor('demo', (_req, res) => res.status(202).json({ accepted: true }));
        await request(app).post('/x').send({ email: 'lead@example.com' }).expect(202);
        await request(app).post('/x').send({ email: 'lead@example.com' }).expect(202);
        await request(app).post('/x').send({ email: 'lead@example.com' }).expect(429);
        now += 61_000;
        await request(app).post('/x').send({ email: 'lead@example.com' }).expect(202);
    });

    it('does not let Org A consume Org B report allowance', async () => {
        const app = express();
        app.set('trust proxy', 1);
        app.use(express.json());
        app.post('/report', (req, _res, next) => {
            (req as any).user = {
                id: req.headers['x-user-id'],
                organizationId: req.headers['x-org-id'],
            };
            next();
        }, createCategoryLimiter('report'), (_req, res) => res.json({ ok: true }));

        await request(app).post('/report').set('x-org-id', 'org-a').set('x-user-id', 'user-a').expect(200);
        await request(app).post('/report').set('x-org-id', 'org-a').set('x-user-id', 'user-a').expect(200);
        await request(app).post('/report').set('x-org-id', 'org-a').set('x-user-id', 'user-a').expect(429);
        await request(app).post('/report').set('x-org-id', 'org-b').set('x-user-id', 'user-b').expect(200);
    });

    it('cannot bypass the limiter by spoofing X-Forwarded-For', () => {
        const { limiterKey } = require('../middleware/rateLimitPolicy');
        const req = {
            ip: '203.0.113.10',
            socket: { remoteAddress: '10.0.0.8' },
            headers: { 'x-forwarded-for': '8.8.8.8, 203.0.113.10' },
            body: { email: 'a@example.com' },
        };
        expect(limiterKey('signup', req)).toContain('203.0.113.10');
        expect(limiterKey('signup', req)).not.toContain('8.8.8.8');
        expect(limiterKey('login', req)).toBe('login:a@example.com:203.0.113.10');
    });

    it('does not apply the general IP limiter to Stripe webhooks', async () => {
        const app = express();
        app.set('trust proxy', 1);
        app.use(createCategoryLimiter('general'));
        app.post('/billing/webhook', (_req, res) => res.json({ received: true }));
        await request(app).post('/billing/webhook').expect(200);
        await request(app).post('/billing/webhook').expect(200);
        await request(app).post('/billing/webhook').expect(200);
        await request(app).post('/billing/webhook').expect(200);
    });

    it('fails closed for auth when Redis is configured but unavailable', async () => {
        process.env.REDIS_URL = 'redis://127.0.0.1:59999';
        const store = new WindowCounterStore('login');
        const result = await store.increment('login:user@example.com:203.0.113.1');
        expect(result.totalHits).toBeGreaterThan(2);
    });

    it('fails open for general API when Redis is configured but unavailable', async () => {
        process.env.REDIS_URL = 'redis://127.0.0.1:59999';
        const store = new WindowCounterStore('general');
        const result = await store.increment('general:ip:203.0.113.1');
        expect(result.totalHits).toBe(0);
    });

    it('throttles report, upload, billing, and password-reset bursts', async () => {
        delete process.env.REDIS_URL;
        for (const category of ['report', 'upload', 'billing', 'password_reset'] as const) {
            overrideRateLimitPolicy({ [category]: { max: 2, windowMs: 60_000 } });
            expect(getRateLimitSpec(category).max).toBe(2);
            resetMemoryRateLimitStore();
            const app = express();
            app.set('trust proxy', 1);
            app.use(express.json());
            app.post('/x', (req, _res, next) => {
                (req as any).user = { id: `user-${category}`, organizationId: `org-${category}` };
                next();
            }, createCategoryLimiter(category), (_req, res) => res.status(200).json({ ok: true }));
            await request(app).post('/x').send({ email: `${category}@example.com` }).expect(200);
            await request(app).post('/x').send({ email: `${category}@example.com` }).expect(200);
            await request(app).post('/x').send({ email: `${category}@example.com` }).expect(429);
        }
    });

    it('throttles repeated invalid activation attempts', async () => {
        delete process.env.REDIS_URL;
        overrideRateLimitPolicy({ activation: { max: 2, windowMs: 60_000 } });
        resetMemoryRateLimitStore();
        const app = appFor('activation', (_req, res) => res.status(400).json({ error: 'invalid token' }));
        await request(app).post('/x').send({ token: 'bad' }).expect(400);
        await request(app).post('/x').send({ token: 'bad' }).expect(400);
        await request(app).post('/x').send({ token: 'bad' }).expect(429);
    });
});
