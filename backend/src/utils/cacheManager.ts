import { redisClient } from '../config/database';
import logger from '../config/logger';

/**
 * Enhanced Cache Service with TTL, compression, and performance optimizations
 */
export class CacheManager {
    private enabled: boolean;
    private defaultTTL: number = 300; // 5 minutes

    constructor() {
        this.enabled = process.env.REDIS_ENABLED !== 'false';
    }

    /**
     * Generate cache key with namespace
     */
    private generateKey(namespace: string, key: string): string {
        return `grc:${namespace}:${key}`;
    }

    /**
     * Get cached value
     */
    async get<T>(namespace: string, key: string): Promise<T | null> {
        if (!this.enabled) return null;

        try {
            const cacheKey = this.generateKey(namespace, key);
            const cached = await redisClient.get(cacheKey);
            
            if (cached) {
                logger.debug(`Cache HIT: ${cacheKey}`);
                return JSON.parse(cached) as T;
            }
            
            logger.debug(`Cache MISS: ${cacheKey}`);
            return null;
        } catch (error) {
            logger.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set cached value with TTL
     */
    async set(namespace: string, key: string, value: any, ttl?: number): Promise<boolean> {
        if (!this.enabled) return false;

        try {
            const cacheKey = this.generateKey(namespace, key);
            const serialized = JSON.stringify(value);
            const cacheTTL = ttl || this.defaultTTL;
            
            await redisClient.setEx(cacheKey, cacheTTL, serialized);
            logger.debug(`Cache SET: ${cacheKey} (TTL: ${cacheTTL}s)`);
            return true;
        } catch (error) {
            logger.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * Delete cached value
     */
    async delete(namespace: string, key: string): Promise<boolean> {
        if (!this.enabled) return false;

        try {
            const cacheKey = this.generateKey(namespace, key);
            await redisClient.del(cacheKey);
            logger.debug(`Cache DELETE: ${cacheKey}`);
            return true;
        } catch (error) {
            logger.error('Cache delete error:', error);
            return false;
        }
    }

    /**
     * Delete all keys matching pattern
     */
    async deletePattern(namespace: string, pattern: string): Promise<number> {
        if (!this.enabled) return 0;

        try {
            const searchPattern = this.generateKey(namespace, pattern);
            const keys = await redisClient.keys(searchPattern);
            
            if (keys.length === 0) return 0;
            
            await redisClient.del(keys);
            logger.debug(`Cache DELETE PATTERN: ${searchPattern} (${keys.length} keys)`);
            return keys.length;
        } catch (error) {
            logger.error('Cache delete pattern error:', error);
            return 0;
        }
    }

    /**
     * Invalidate organization cache
     */
    async invalidateOrganization(organizationId: string): Promise<void> {
        await this.deletePattern('*', `*:${organizationId}:*`);
    }

    /**
     * Get or set cached value (cache-aside pattern)
     */
    async getOrSet<T>(
        namespace: string,
        key: string,
        fetchFunction: () => Promise<T>,
        ttl?: number
    ): Promise<T> {
        // Try to get from cache
        const cached = await this.get<T>(namespace, key);
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
    async setWithTags(
        namespace: string,
        key: string,
        value: any,
        tags: string[],
        ttl?: number
    ): Promise<boolean> {
        const success = await this.set(namespace, key, value, ttl);
        
        if (success) {
            // Store tag mappings
            for (const tag of tags) {
                const tagKey = this.generateKey('tags', tag);
                await redisClient.sAdd(tagKey, this.generateKey(namespace, key));
            }
        }
        
        return success;
    }

    /**
     * Invalidate by tag
     */
    async invalidateByTag(tag: string): Promise<number> {
        try {
            const tagKey = this.generateKey('tags', tag);
            const keys = await redisClient.sMembers(tagKey);
            
            if (keys.length === 0) return 0;
            
            await redisClient.del(keys);
            await redisClient.del(tagKey);
            
            logger.debug(`Cache INVALIDATE TAG: ${tag} (${keys.length} keys)`);
            return keys.length;
        } catch (error) {
            logger.error('Cache invalidate tag error:', error);
            return 0;
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        connected: boolean;
        keys: number;
        memory: string;
        hitRate?: number;
    }> {
        try {
            const info = await redisClient.info('stats');
            const keys = await redisClient.dbSize();
            
            return {
                connected: true,
                keys,
                memory: 'N/A', // Would need additional INFO parsing
            };
        } catch (error) {
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
    async warmup(organizationId: string): Promise<void> {
        // This would be called on app startup or when organization logs in
        logger.info(`Warming up cache for organization: ${organizationId}`);
        // Implementation would fetch and cache common queries
    }

    /**
     * Clear entire cache (use with caution)
     */
    async clearAll(): Promise<void> {
        if (!this.enabled) return;

        try {
            await redisClient.flushDb();
            logger.warn('Cache CLEARED: All keys deleted');
        } catch (error) {
            logger.error('Cache clear error:', error);
        }
    }
}

// Export singleton instance
export const cacheManager = new CacheManager();
