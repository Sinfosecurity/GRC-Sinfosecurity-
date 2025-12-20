import { Redis } from 'ioredis';
export interface CacheOptions {
    ttl?: number;
    prefix?: string;
}
export declare class CacheService {
    private redis;
    private defaultTTL;
    constructor(redis: Redis);
    /**
     * Get value from cache
     */
    get<T>(key: string, options?: CacheOptions): Promise<T | null>;
    /**
     * Set value in cache
     */
    set(key: string, value: any, options?: CacheOptions): Promise<boolean>;
    /**
     * Delete key from cache
     */
    delete(key: string, options?: CacheOptions): Promise<boolean>;
    /**
     * Delete multiple keys matching pattern
     */
    deletePattern(pattern: string, options?: CacheOptions): Promise<number>;
    /**
     * Check if key exists
     */
    exists(key: string, options?: CacheOptions): Promise<boolean>;
    /**
     * Get or set (fetch from database if not in cache)
     */
    getOrSet<T>(key: string, fetchFn: () => Promise<T>, options?: CacheOptions): Promise<T>;
    /**
     * Increment counter
     */
    increment(key: string, options?: CacheOptions): Promise<number>;
    /**
     * Clear all cache (use with caution)
     */
    clearAll(): Promise<boolean>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<any>;
    /**
     * Build full cache key with prefix
     */
    private buildKey;
}
export declare const CacheKeys: {
    vendor: (id: string) => string;
    vendorList: (orgId: string, filters: string) => string;
    vendorStats: (orgId: string) => string;
    assessment: (id: string) => string;
    assessmentList: (vendorId: string) => string;
    contract: (id: string) => string;
    user: (id: string) => string;
    userPermissions: (userId: string) => string;
    riskScore: (vendorId: string) => string;
    complianceStatus: (orgId: string, framework: string) => string;
};
export declare const CacheTTL: {
    SHORT: number;
    MEDIUM: number;
    LONG: number;
    VERY_LONG: number;
    DAY: number;
};
//# sourceMappingURL=cacheService.d.ts.map