import { CacheService, CacheKeys, CacheTTL } from '../../src/services/cacheService';
import { Redis } from 'ioredis';

// Mock Redis client
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  exists: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  flushdb: jest.fn(),
  info: jest.fn(),
  dbsize: jest.fn(),
} as unknown as Redis;

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new CacheService(mockRedis);
  });

  describe('get', () => {
    it('should return cached value when key exists', async () => {
      const testData = { id: '123', name: 'Test Vendor' };
      (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('vendor:123');

      expect(mockRedis.get).toHaveBeenCalledWith('grc:vendor:123');
      expect(result).toEqual(testData);
    });

    it('should return null when key does not exist', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);

      const result = await cacheService.get('vendor:999');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      (mockRedis.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('vendor:123');

      expect(result).toBeNull();
    });

    it('should use custom prefix', async () => {
      await cacheService.get('vendor:123', { prefix: 'custom' });

      expect(mockRedis.get).toHaveBeenCalledWith('grc:custom:vendor:123');
    });
  });

  describe('set', () => {
    it('should store value with default TTL', async () => {
      const testData = { id: '123', name: 'Test Vendor' };
      (mockRedis.set as jest.Mock).mockResolvedValue('OK');

      const result = await cacheService.set('vendor:123', testData);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'grc:vendor:123',
        JSON.stringify(testData),
        'EX',
        300 // default TTL
      );
      expect(result).toBe(true);
    });

    it('should store value with custom TTL', async () => {
      const testData = { id: '123', name: 'Test Vendor' };
      (mockRedis.set as jest.Mock).mockResolvedValue('OK');

      await cacheService.set('vendor:123', testData, { ttl: 600 });

      expect(mockRedis.set).toHaveBeenCalledWith(
        'grc:vendor:123',
        JSON.stringify(testData),
        'EX',
        600
      );
    });

    it('should handle Redis errors gracefully', async () => {
      (mockRedis.set as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.set('vendor:123', { id: '123' });

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete key from cache', async () => {
      (mockRedis.del as jest.Mock).mockResolvedValue(1);

      const result = await cacheService.delete('vendor:123');

      expect(mockRedis.del).toHaveBeenCalledWith('grc:vendor:123');
      expect(result).toBe(true);
    });
  });

  describe('deletePattern', () => {
    it('should delete all keys matching pattern', async () => {
      const keys = ['grc:vendor:1', 'grc:vendor:2', 'grc:vendor:3'];
      (mockRedis.keys as jest.Mock).mockResolvedValue(keys);
      (mockRedis.del as jest.Mock).mockResolvedValue(3);

      const result = await cacheService.deletePattern('vendor:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('grc:vendor:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
      expect(result).toBe(3);
    });

    it('should return 0 when no keys match', async () => {
      (mockRedis.keys as jest.Mock).mockResolvedValue([]);

      const result = await cacheService.deletePattern('vendor:*');

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const cachedData = { id: '123', name: 'Cached Vendor' };
      (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const fetchFn = jest.fn();
      const result = await cacheService.getOrSet('vendor:123', fetchFn);

      expect(result).toEqual(cachedData);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache value if not exists', async () => {
      const fetchedData = { id: '123', name: 'Fetched Vendor' };
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockRedis.set as jest.Mock).mockResolvedValue('OK');
      
      const fetchFn = jest.fn().mockResolvedValue(fetchedData);
      const result = await cacheService.getOrSet('vendor:123', fetchFn);

      expect(result).toEqual(fetchedData);
      expect(fetchFn).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('increment', () => {
    it('should increment counter', async () => {
      (mockRedis.incr as jest.Mock).mockResolvedValue(5);

      const result = await cacheService.increment('counter:requests');

      expect(mockRedis.incr).toHaveBeenCalledWith('grc:counter:requests');
      expect(result).toBe(5);
    });

    it('should set TTL if provided', async () => {
      (mockRedis.incr as jest.Mock).mockResolvedValue(1);
      (mockRedis.expire as jest.Mock).mockResolvedValue(1);

      await cacheService.increment('counter:requests', { ttl: 3600 });

      expect(mockRedis.expire).toHaveBeenCalledWith('grc:counter:requests', 3600);
    });
  });

  describe('CacheKeys', () => {
    it('should generate correct vendor key', () => {
      expect(CacheKeys.vendor('123')).toBe('vendor:123');
    });

    it('should generate correct vendor list key', () => {
      expect(CacheKeys.vendorList('org-1', 'tier:HIGH')).toBe('vendors:org-1:tier:HIGH');
    });

    it('should generate correct assessment key', () => {
      expect(CacheKeys.assessment('assess-1')).toBe('assessment:assess-1');
    });

    it('should generate correct risk score key', () => {
      expect(CacheKeys.riskScore('vendor-123')).toBe('risk_score:vendor-123');
    });
  });

  describe('CacheTTL', () => {
    it('should have correct TTL values', () => {
      expect(CacheTTL.SHORT).toBe(60);
      expect(CacheTTL.MEDIUM).toBe(300);
      expect(CacheTTL.LONG).toBe(1800);
      expect(CacheTTL.VERY_LONG).toBe(3600);
      expect(CacheTTL.DAY).toBe(86400);
    });
  });
});
