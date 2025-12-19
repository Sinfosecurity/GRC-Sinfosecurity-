import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Create a Registry
export const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

export const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const databaseQueryTotal = new client.Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'model', 'status'],
  registers: [register],
});

export const cacheHitRate = new client.Counter({
  name: 'cache_requests_total',
  help: 'Total number of cache requests',
  labelNames: ['result'], // 'hit' or 'miss'
  registers: [register],
});

export const vendorAssessmentStatus = new client.Gauge({
  name: 'vendor_assessments_by_status',
  help: 'Number of vendor assessments by status',
  labelNames: ['status'],
  registers: [register],
});

export const riskScore = new client.Gauge({
  name: 'risk_score_average',
  help: 'Average risk score by type',
  labelNames: ['type'], // 'inherent', 'residual'
  registers: [register],
});

export const authenticationAttempts = new client.Counter({
  name: 'authentication_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['result'], // 'success' or 'failure'
  registers: [register],
});

export const apiErrors = new client.Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['type', 'endpoint'],
  registers: [register],
});

/**
 * Middleware to track HTTP metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Increment active connections
  activeConnections.inc();

  const start = Date.now();
  
  // Track when response finishes
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe(
      { method: req.method, route, status_code: statusCode },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    // Track errors
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      apiErrors.inc({
        type: errorType,
        endpoint: route,
      });
    }

    // Decrement active connections
    activeConnections.dec();
  });

  next();
};

/**
 * Endpoint to expose metrics
 */
export const metricsEndpoint = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Error collecting metrics',
        code: 'METRICS_ERROR',
      },
    });
  }
};

/**
 * Helper function to time database queries
 */
export const timeDatabaseQuery = async <T>(
  operation: string,
  model: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  let status = 'success';

  try {
    const result = await queryFn();
    return result;
  } catch (error) {
    status = 'error';
    throw error;
  } finally {
    const duration = (Date.now() - start) / 1000;
    
    databaseQueryDuration.observe(
      { operation, model },
      duration
    );

    databaseQueryTotal.inc({
      operation,
      model,
      status,
    });
  }
};

/**
 * Helper to track cache hits/misses
 */
export const trackCacheRequest = (hit: boolean) => {
  cacheHitRate.inc({ result: hit ? 'hit' : 'miss' });
};

/**
 * Helper to track authentication attempts
 */
export const trackAuthAttempt = (success: boolean) => {
  authenticationAttempts.inc({ result: success ? 'success' : 'failure' });
};
