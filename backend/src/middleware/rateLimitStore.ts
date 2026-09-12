/**
 * Fixed-window counters for express-rate-limit.
 *
 * Redis when REDIS_URL is configured (hosted multi-instance).
 * In-memory when Redis is absent (single process / unit tests).
 *
 * Failure policy is category-specific and always logged:
 *   fail-closed (auth/signup/reset/activation/demo): treat store errors as over-limit
 *   fail-open (general/report/upload/billing): allow the request, log the downgrade
 */

import type { Store, ClientRateLimitInfo, IncrementResponse } from 'express-rate-limit';
import { redisClient } from '../config/database';
import {
    getRateLimitSpec,
    rateLimitNamespace,
    type RateLimitCategory,
} from './rateLimitPolicy';
import { recordRateLimitStoreFailure } from '../services/rateLimitTelemetry';

export const rateLimitClock = {
    now: () => Date.now(),
};

type Bucket = { hits: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();

export function resetMemoryRateLimitStore() {
    memoryBuckets.clear();
}

export function rateLimitStoreMode(env: NodeJS.ProcessEnv = process.env): 'redis' | 'memory' {
    return env.REDIS_URL ? 'redis' : 'memory';
}

function prefix(category: RateLimitCategory) {
    return `rl:${rateLimitNamespace()}:${category}:`;
}

function redisReady() {
    return Boolean(redisClient && (redisClient.isReady || redisClient.isOpen));
}

export class WindowCounterStore implements Store {
    localKeys = false;

    constructor(private readonly category: RateLimitCategory) {}

    init() {
        // Window and max are read from policy at increment time so tests can override.
    }

    async get(key: string): Promise<ClientRateLimitInfo | undefined> {
        const fullKey = prefix(this.category) + key;
        const now = rateLimitClock.now();
        if (rateLimitStoreMode() === 'redis' && redisReady() && redisClient) {
            const hits = Number(await redisClient.get(fullKey) || 0);
            const ttl = await redisClient.pTTL(fullKey);
            if (!hits) return undefined;
            return {
                totalHits: hits,
                resetTime: new Date(now + Math.max(ttl, 0)),
            };
        }
        const bucket = memoryBuckets.get(fullKey);
        if (!bucket || bucket.resetAt <= now) return undefined;
        return { totalHits: bucket.hits, resetTime: new Date(bucket.resetAt) };
    }

    async increment(key: string): Promise<IncrementResponse> {
        const spec = getRateLimitSpec(this.category);
        const now = rateLimitClock.now();
        const fullKey = prefix(this.category) + key;

        if (rateLimitStoreMode() === 'redis') {
            try {
                if (!redisReady() || !redisClient) {
                    throw new Error('Redis rate-limit store is not connected');
                }
                const hits = await redisClient.incr(fullKey);
                if (hits === 1) {
                    await redisClient.pExpire(fullKey, spec.windowMs);
                }
                let ttl = await redisClient.pTTL(fullKey);
                if (ttl < 0) {
                    await redisClient.pExpire(fullKey, spec.windowMs);
                    ttl = spec.windowMs;
                }
                return { totalHits: hits, resetTime: new Date(now + ttl) };
            } catch (error) {
                recordRateLimitStoreFailure({
                    category: this.category,
                    policy: spec.failurePolicy,
                    error,
                });
                if (spec.failurePolicy === 'fail-closed') {
                    return { totalHits: spec.max + 1, resetTime: new Date(now + spec.windowMs) };
                }
                return { totalHits: 0, resetTime: new Date(now + spec.windowMs) };
            }
        }

        let bucket = memoryBuckets.get(fullKey);
        if (!bucket || bucket.resetAt <= now) {
            bucket = { hits: 0, resetAt: now + spec.windowMs };
        }
        bucket.hits += 1;
        memoryBuckets.set(fullKey, bucket);
        return { totalHits: bucket.hits, resetTime: new Date(bucket.resetAt) };
    }

    async decrement(key: string): Promise<void> {
        const fullKey = prefix(this.category) + key;
        if (rateLimitStoreMode() === 'redis' && redisReady() && redisClient) {
            try {
                const hits = await redisClient.decr(fullKey);
                if (hits < 0) {
                    await redisClient.set(fullKey, '0');
                }
            } catch {
                // skipSuccessful decrement must not take the request down
            }
            return;
        }
        const bucket = memoryBuckets.get(fullKey);
        if (bucket && bucket.hits > 0) {
            bucket.hits -= 1;
        }
    }

    async resetKey(key: string): Promise<void> {
        const fullKey = prefix(this.category) + key;
        if (rateLimitStoreMode() === 'redis' && redisReady() && redisClient) {
            await redisClient.del(fullKey);
            return;
        }
        memoryBuckets.delete(fullKey);
    }
}

export function createRateLimitStore(category: RateLimitCategory) {
    return new WindowCounterStore(category);
}
