import { Redis } from 'ioredis';
import logger from '../config/logger';
import { trackCacheRequest } from '../config/metrics';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
}

export class CacheService {
  private redis: Redis;
  private defaultTTL: number = 300; // 5 minutes default

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const value = await this.redis.get(fullKey);

      if (value) {
        trackCacheRequest(true); // Cache hit
        logger.debug(`Cache hit: ${fullKey}`);
        return JSON.parse(value);
      }

      trackCacheRequest(false); // Cache miss
      logger.debug(`Cache miss: ${fullKey}`);
      return null;
    } catch (error: any) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;
      const serialized = JSON.stringify(value);

      await this.redis.set(fullKey, serialized, 'EX', ttl);
      logger.debug(`Cache set: ${fullKey} (TTL: ${ttl}s)`);
      return true;
    } catch (error: any) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      await this.redis.del(fullKey);
      logger.debug(`Cache delete: ${fullKey}`);
      return true;
    } catch (error: any) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string, options?: CacheOptions): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, options?.prefix);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await this.redis.del(...keys);
      logger.debug(`Cache delete pattern: ${fullPattern} (${keys.length} keys)`);
      return keys.length;
    } catch (error: any) {
      logger.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error: any) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get or set (fetch from database if not in cache)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
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
  async increment(key: string, options?: CacheOptions): Promise<number> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.incr(fullKey);
      
      // Set TTL if specified
      if (options?.ttl) {
        await this.redis.expire(fullKey, options.ttl);
      }
      
      return result;
    } catch (error: any) {
      logger.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      logger.warn('Cache cleared: All keys deleted');
      return true;
    } catch (error: any) {
      logger.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();
      
      return {
        dbSize,
        info: info.split('\r\n').reduce((acc: any, line: string) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {}),
      };
    } catch (error: any) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    const defaultPrefix = 'grc';
    const fullPrefix = prefix ? `${defaultPrefix}:${prefix}` : defaultPrefix;
    return `${fullPrefix}:${key}`;
  }
}

// Cache key builders for common entities
export const CacheKeys = {
  vendor: (id: string) => `vendor:${id}`,
  vendorList: (orgId: string, filters: string) => `vendors:${orgId}:${filters}`,
  vendorStats: (orgId: string) => `vendor_stats:${orgId}`,
  assessment: (id: string) => `assessment:${id}`,
  assessmentList: (vendorId: string) => `assessments:vendor:${vendorId}`,
  contract: (id: string) => `contract:${id}`,
  user: (id: string) => `user:${id}`,
  userPermissions: (userId: string) => `permissions:${userId}`,
  riskScore: (vendorId: string) => `risk_score:${vendorId}`,
  complianceStatus: (orgId: string, framework: string) => `compliance:${orgId}:${framework}`,
};

// Cache TTL configurations (in seconds)
export const CacheTTL = {
  SHORT: 60,           // 1 minute - frequently changing data
  MEDIUM: 300,         // 5 minutes - default
  LONG: 1800,          // 30 minutes - stable data
  VERY_LONG: 3600,     // 1 hour - rarely changing data
  DAY: 86400,          // 24 hours - static data
};
