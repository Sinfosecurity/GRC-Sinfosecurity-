/**
 * Enhanced Cache Service with TTL, compression, and performance optimizations
 */
export declare class CacheManager {
    private enabled;
    private defaultTTL;
    constructor();
    /**
     * Generate cache key with namespace
     */
    private generateKey;
    /**
     * Get cached value
     */
    get<T>(namespace: string, key: string): Promise<T | null>;
    /**
     * Set cached value with TTL
     */
    set(namespace: string, key: string, value: any, ttl?: number): Promise<boolean>;
    /**
     * Delete cached value
     */
    delete(namespace: string, key: string): Promise<boolean>;
    /**
     * Delete all keys matching pattern
     */
    deletePattern(namespace: string, pattern: string): Promise<number>;
    /**
     * Invalidate organization cache
     */
    invalidateOrganization(organizationId: string): Promise<void>;
    /**
     * Get or set cached value (cache-aside pattern)
     */
    getOrSet<T>(namespace: string, key: string, fetchFunction: () => Promise<T>, ttl?: number): Promise<T>;
    /**
     * Cache with tags for easier invalidation
     */
    setWithTags(namespace: string, key: string, value: any, tags: string[], ttl?: number): Promise<boolean>;
    /**
     * Invalidate by tag
     */
    invalidateByTag(tag: string): Promise<number>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<{
        connected: boolean;
        keys: number;
        memory: string;
        hitRate?: number;
    }>;
    /**
     * Warm up cache with frequently accessed data
     */
    warmup(organizationId: string): Promise<void>;
    /**
     * Clear entire cache (use with caution)
     */
    clearAll(): Promise<void>;
}
export declare const cacheManager: CacheManager;
//# sourceMappingURL=cacheManager.d.ts.map