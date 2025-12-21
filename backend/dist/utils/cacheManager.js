"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheManager = exports.CacheManager = void 0;
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Enhanced Cache Service with TTL, compression, and performance optimizations
 */
class CacheManager {
    constructor() {
        this.defaultTTL = 300; // 5 minutes
        this.enabled = process.env.REDIS_ENABLED !== 'false';
    }
    /**
     * Generate cache key with namespace
     */
    generateKey(namespace, key) {
        return `grc:${namespace}:${key}`;
    }
    /**
     * Get cached value
     */
    async get(namespace, key) {
        if (!this.enabled)
            return null;
        try {
            const cacheKey = this.generateKey(namespace, key);
            const cached = await database_1.redisClient.get(cacheKey);
            if (cached) {
                logger_1.default.debug(`Cache HIT: ${cacheKey}`);
                return JSON.parse(cached);
            }
            logger_1.default.debug(`Cache MISS: ${cacheKey}`);
            return null;
        }
        catch (error) {
            logger_1.default.error('Cache get error:', error);
            return null;
        }
    }
    /**
     * Set cached value with TTL
     */
    async set(namespace, key, value, ttl) {
        if (!this.enabled)
            return false;
        try {
            const cacheKey = this.generateKey(namespace, key);
            const serialized = JSON.stringify(value);
            const cacheTTL = ttl || this.defaultTTL;
            await database_1.redisClient.setEx(cacheKey, cacheTTL, serialized);
            logger_1.default.debug(`Cache SET: ${cacheKey} (TTL: ${cacheTTL}s)`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Cache set error:', error);
            return false;
        }
    }
    /**
     * Delete cached value
     */
    async delete(namespace, key) {
        if (!this.enabled)
            return false;
        try {
            const cacheKey = this.generateKey(namespace, key);
            await database_1.redisClient.del(cacheKey);
            logger_1.default.debug(`Cache DELETE: ${cacheKey}`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Cache delete error:', error);
            return false;
        }
    }
    /**
     * Delete all keys matching pattern
     */
    async deletePattern(namespace, pattern) {
        if (!this.enabled)
            return 0;
        try {
            const searchPattern = this.generateKey(namespace, pattern);
            const keys = await database_1.redisClient.keys(searchPattern);
            if (keys.length === 0)
                return 0;
            await database_1.redisClient.del(keys);
            logger_1.default.debug(`Cache DELETE PATTERN: ${searchPattern} (${keys.length} keys)`);
            return keys.length;
        }
        catch (error) {
            logger_1.default.error('Cache delete pattern error:', error);
            return 0;
        }
    }
    /**
     * Invalidate organization cache
     */
    async invalidateOrganization(organizationId) {
        await this.deletePattern('*', `*:${organizationId}:*`);
    }
    /**
     * Get or set cached value (cache-aside pattern)
     */
    async getOrSet(namespace, key, fetchFunction, ttl) {
        // Try to get from cache
        const cached = await this.get(namespace, key);
        if (cached !== null) {
            return cached;
        }
        // Fetch from source
        const value = await fetchFunction();
        // Store in cache
        await this.set(namespace, key, value, ttl);
        return value;
    }
    /**
     * Cache with tags for easier invalidation
     */
    async setWithTags(namespace, key, value, tags, ttl) {
        const success = await this.set(namespace, key, value, ttl);
        if (success) {
            // Store tag mappings
            for (const tag of tags) {
                const tagKey = this.generateKey('tags', tag);
                await database_1.redisClient.sAdd(tagKey, this.generateKey(namespace, key));
            }
        }
        return success;
    }
    /**
     * Invalidate by tag
     */
    async invalidateByTag(tag) {
        try {
            const tagKey = this.generateKey('tags', tag);
            const keys = await database_1.redisClient.sMembers(tagKey);
            if (keys.length === 0)
                return 0;
            await database_1.redisClient.del(keys);
            await database_1.redisClient.del(tagKey);
            logger_1.default.debug(`Cache INVALIDATE TAG: ${tag} (${keys.length} keys)`);
            return keys.length;
        }
        catch (error) {
            logger_1.default.error('Cache invalidate tag error:', error);
            return 0;
        }
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        try {
            const info = await database_1.redisClient.info('stats');
            const keys = await database_1.redisClient.dbSize();
            return {
                connected: true,
                keys,
                memory: 'N/A', // Would need additional INFO parsing
            };
        }
        catch (error) {
            return {
                connected: false,
                keys: 0,
                memory: 'N/A',
            };
        }
    }
    /**
     * Warm up cache with frequently accessed data
     */
    async warmup(organizationId) {
        // This would be called on app startup or when organization logs in
        logger_1.default.info(`Warming up cache for organization: ${organizationId}`);
        // Implementation would fetch and cache common queries
    }
    /**
     * Clear entire cache (use with caution)
     */
    async clearAll() {
        if (!this.enabled)
            return;
        try {
            await database_1.redisClient.flushDb();
            logger_1.default.warn('Cache CLEARED: All keys deleted');
        }
        catch (error) {
            logger_1.default.error('Cache clear error:', error);
        }
    }
}
exports.CacheManager = CacheManager;
// Export singleton instance
exports.cacheManager = new CacheManager();
//# sourceMappingURL=cacheManager.js.map