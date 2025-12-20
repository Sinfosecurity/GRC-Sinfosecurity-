"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheTTL = exports.CacheKeys = exports.CacheService = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const metrics_1 = require("../config/metrics");
class CacheService {
    constructor(redis) {
        this.defaultTTL = 300; // 5 minutes default
        this.redis = redis;
    }
    /**
     * Get value from cache
     */
    async get(key, options) {
        try {
            const fullKey = this.buildKey(key, options?.prefix);
            const value = await this.redis.get(fullKey);
            if (value) {
                (0, metrics_1.trackCacheRequest)(true); // Cache hit
                logger_1.default.debug(`Cache hit: ${fullKey}`);
                return JSON.parse(value);
            }
            (0, metrics_1.trackCacheRequest)(false); // Cache miss
            logger_1.default.debug(`Cache miss: ${fullKey}`);
            return null;
        }
        catch (error) {
            logger_1.default.error('Cache get error:', error);
            return null;
        }
    }
    /**
     * Set value in cache
     */
    async set(key, value, options) {
        try {
            const fullKey = this.buildKey(key, options?.prefix);
            const ttl = options?.ttl || this.defaultTTL;
            const serialized = JSON.stringify(value);
            await this.redis.set(fullKey, serialized, 'EX', ttl);
            logger_1.default.debug(`Cache set: ${fullKey} (TTL: ${ttl}s)`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Cache set error:', error);
            return false;
        }
    }
    /**
     * Delete key from cache
     */
    async delete(key, options) {
        try {
            const fullKey = this.buildKey(key, options?.prefix);
            await this.redis.del(fullKey);
            logger_1.default.debug(`Cache delete: ${fullKey}`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Cache delete error:', error);
            return false;
        }
    }
    /**
     * Delete multiple keys matching pattern
     */
    async deletePattern(pattern, options) {
        try {
            const fullPattern = this.buildKey(pattern, options?.prefix);
            const keys = await this.redis.keys(fullPattern);
            if (keys.length === 0) {
                return 0;
            }
            await this.redis.del(...keys);
            logger_1.default.debug(`Cache delete pattern: ${fullPattern} (${keys.length} keys)`);
            return keys.length;
        }
        catch (error) {
            logger_1.default.error('Cache delete pattern error:', error);
            return 0;
        }
    }
    /**
     * Check if key exists
     */
    async exists(key, options) {
        try {
            const fullKey = this.buildKey(key, options?.prefix);
            const result = await this.redis.exists(fullKey);
            return result === 1;
        }
        catch (error) {
            logger_1.default.error('Cache exists error:', error);
            return false;
        }
    }
    /**
     * Get or set (fetch from database if not in cache)
     */
    async getOrSet(key, fetchFn, options) {
        // Try to get from cache
        const cached = await this.get(key, options);
        if (cached !== null) {
            return cached;
        }
        // Fetch from database
        const value = await fetchFn();
        // Store in cache
        await this.set(key, value, options);
        return value;
    }
    /**
     * Increment counter
     */
    async increment(key, options) {
        try {
            const fullKey = this.buildKey(key, options?.prefix);
            const result = await this.redis.incr(fullKey);
            // Set TTL if specified
            if (options?.ttl) {
                await this.redis.expire(fullKey, options.ttl);
            }
            return result;
        }
        catch (error) {
            logger_1.default.error('Cache increment error:', error);
            return 0;
        }
    }
    /**
     * Clear all cache (use with caution)
     */
    async clearAll() {
        try {
            await this.redis.flushdb();
            logger_1.default.warn('Cache cleared: All keys deleted');
            return true;
        }
        catch (error) {
            logger_1.default.error('Cache clear error:', error);
            return false;
        }
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        try {
            const info = await this.redis.info('stats');
            const dbSize = await this.redis.dbsize();
            return {
                dbSize,
                info: info.split('\r\n').reduce((acc, line) => {
                    const [key, value] = line.split(':');
                    if (key && value) {
                        acc[key] = value;
                    }
                    return acc;
                }, {}),
            };
        }
        catch (error) {
            logger_1.default.error('Cache stats error:', error);
            return null;
        }
    }
    /**
     * Build full cache key with prefix
     */
    buildKey(key, prefix) {
        const defaultPrefix = 'grc';
        const fullPrefix = prefix ? `${defaultPrefix}:${prefix}` : defaultPrefix;
        return `${fullPrefix}:${key}`;
    }
}
exports.CacheService = CacheService;
// Cache key builders for common entities
exports.CacheKeys = {
    vendor: (id) => `vendor:${id}`,
    vendorList: (orgId, filters) => `vendors:${orgId}:${filters}`,
    vendorStats: (orgId) => `vendor_stats:${orgId}`,
    assessment: (id) => `assessment:${id}`,
    assessmentList: (vendorId) => `assessments:vendor:${vendorId}`,
    contract: (id) => `contract:${id}`,
    user: (id) => `user:${id}`,
    userPermissions: (userId) => `permissions:${userId}`,
    riskScore: (vendorId) => `risk_score:${vendorId}`,
    complianceStatus: (orgId, framework) => `compliance:${orgId}:${framework}`,
};
// Cache TTL configurations (in seconds)
exports.CacheTTL = {
    SHORT: 60, // 1 minute - frequently changing data
    MEDIUM: 300, // 5 minutes - default
    LONG: 1800, // 30 minutes - stable data
    VERY_LONG: 3600, // 1 hour - rarely changing data
    DAY: 86400, // 24 hours - static data
};
//# sourceMappingURL=cacheService.js.map