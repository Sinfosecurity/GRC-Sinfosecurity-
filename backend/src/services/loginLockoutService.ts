import { redisClient } from '../config/database';
import { rateLimitNamespace } from '../middleware/rateLimitPolicy';
import { recordAudit } from './auditEventService';
import { ApiError } from '../middleware/errorHandler';

const THRESHOLD = 8;
const LOCK_MS = 15 * 60 * 1000;

type MemoryLock = { failures: number; lockedUntil?: number };
const memory = new Map<string, MemoryLock>();

function key(email: string) {
    return `lockout:${rateLimitNamespace()}:${email.trim().toLowerCase()}`;
}

function redisReady() {
    return Boolean(redisClient && (redisClient.isReady || redisClient.isOpen));
}

export const loginLockoutService = {
    threshold: THRESHOLD,
    lockMs: LOCK_MS,
    reset() {
        memory.clear();
    },
    async assertNotLocked(email: string) {
        const now = Date.now();
        const id = key(email);
        if (redisReady() && redisClient) {
            const lockedUntil = Number(await redisClient.get(`${id}:until`) || 0);
            if (lockedUntil > now) {
                throw new ApiError(429, 'This account is temporarily locked after too many sign-in attempts. Wait a few minutes and try again.');
            }
            return;
        }
        const row = memory.get(id);
        if (row?.lockedUntil && row.lockedUntil > now) {
            throw new ApiError(429, 'This account is temporarily locked after too many sign-in attempts. Wait a few minutes and try again.');
        }
        if (row?.lockedUntil && row.lockedUntil <= now) {
            memory.delete(id);
        }
    },
    async recordFailure(email: string, meta?: { organizationId?: string; userId?: string; ip?: string; userAgent?: string; requestId?: string }) {
        const now = Date.now();
        const id = key(email);
        let failures = 1;
        let locked = false;
        if (redisReady() && redisClient) {
            failures = await redisClient.incr(`${id}:fail`);
            if (failures === 1) await redisClient.pExpire(`${id}:fail`, LOCK_MS);
            if (failures >= THRESHOLD) {
                await redisClient.set(`${id}:until`, String(now + LOCK_MS), { PX: LOCK_MS });
                locked = true;
            }
        } else {
            const row = memory.get(id) || { failures: 0 };
            row.failures += 1;
            failures = row.failures;
            if (row.failures >= THRESHOLD) {
                row.lockedUntil = now + LOCK_MS;
                locked = true;
            }
            memory.set(id, row);
        }
        if (locked) {
            await recordAudit({
                organizationId: meta?.organizationId,
                actorUserId: meta?.userId,
                action: 'auth.lockout',
                resourceType: 'User',
                resourceId: meta?.userId,
                result: 'failure',
                ipAddress: meta?.ip,
                userAgent: meta?.userAgent,
                requestId: meta?.requestId,
                metadata: { reason: 'progressive_lockout', failures },
            });
        }
    },
    async recordSuccess(email: string) {
        const id = key(email);
        if (redisReady() && redisClient) {
            await redisClient.del([`${id}:fail`, `${id}:until`]);
            return;
        }
        memory.delete(id);
    },
};
