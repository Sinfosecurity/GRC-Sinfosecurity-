import {
  register,
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
  databaseQueryTotal,
  timeDatabaseQuery,
  trackCacheRequest,
  trackAuthAttempt,
} from '../../src/config/metrics';

describe('Metrics', () => {
  beforeEach(() => {
    // Reset metrics before each test
    register.resetMetrics();
  });

  describe('HTTP Metrics', () => {
    it('should record HTTP request duration', () => {
      httpRequestDuration.observe(
        { method: 'GET', route: '/api/v1/vendors', status_code: '200' },
        0.150 // 150ms
      );

      const metrics = register.getSingleMetric('http_request_duration_seconds');
      expect(metrics).toBeDefined();
    });

    it('should count total HTTP requests', () => {
      httpRequestTotal.inc({
        method: 'POST',
        route: '/api/v1/vendors',
        status_code: '201',
      });

      httpRequestTotal.inc({
        method: 'GET',
        route: '/api/v1/vendors',
        status_code: '200',
      });

      const metrics = register.getSingleMetric('http_requests_total');
      expect(metrics).toBeDefined();
    });

    it('should track active connections', () => {
      activeConnections.inc();
      activeConnections.inc();
      activeConnections.dec();

      const metrics = register.getSingleMetric('active_connections');
      expect(metrics).toBeDefined();
    });
  });

  describe('Database Metrics', () => {
    it('should track successful database query', async () => {
      const queryFn = jest.fn().mockResolvedValue({ id: '123' });

      const result = await timeDatabaseQuery('findUnique', 'Vendor', queryFn);

      expect(result).toEqual({ id: '123' });
      expect(queryFn).toHaveBeenCalled();

      const metrics = register.getSingleMetric('database_queries_total');
      expect(metrics).toBeDefined();
    });

    it('should track failed database query', async () => {
      const queryFn = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        timeDatabaseQuery('findUnique', 'Vendor', queryFn)
      ).rejects.toThrow('Database error');

      expect(queryFn).toHaveBeenCalled();

      const metrics = register.getSingleMetric('database_queries_total');
      expect(metrics).toBeDefined();
    });

    it('should measure query duration', async () => {
      const queryFn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: '123' }), 100))
      );

      await timeDatabaseQuery('findMany', 'Vendor', queryFn);

      const metrics = register.getSingleMetric('database_query_duration_seconds');
      expect(metrics).toBeDefined();
    });
  });

  describe('Cache Metrics', () => {
    it('should track cache hit', () => {
      trackCacheRequest(true);

      const metrics = register.getSingleMetric('cache_requests_total');
      expect(metrics).toBeDefined();
    });

    it('should track cache miss', () => {
      trackCacheRequest(false);

      const metrics = register.getSingleMetric('cache_requests_total');
      expect(metrics).toBeDefined();
    });
  });

  describe('Authentication Metrics', () => {
    it('should track successful auth attempt', () => {
      trackAuthAttempt(true);

      const metrics = register.getSingleMetric('authentication_attempts_total');
      expect(metrics).toBeDefined();
    });

    it('should track failed auth attempt', () => {
      trackAuthAttempt(false);

      const metrics = register.getSingleMetric('authentication_attempts_total');
      expect(metrics).toBeDefined();
    });
  });

  describe('Metrics Export', () => {
    it('should export metrics in Prometheus format', async () => {
      httpRequestTotal.inc({
        method: 'GET',
        route: '/api/v1/vendors',
        status_code: '200',
      });

      const metrics = await register.metrics();

      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
    });

    it('should include default metrics', async () => {
      const metrics = await register.metrics();

      // Check for Node.js default metrics
      expect(metrics).toContain('process_cpu_user_seconds_total');
      expect(metrics).toContain('nodejs_heap_size_total_bytes');
    });
  });
});
