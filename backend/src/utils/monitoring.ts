import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import logger from '../config/logger';

/**
 * Comprehensive Monitoring and Metrics System
 */

// Create a custom registry
export const metricsRegistry = new Registry();

// Collect default Node.js metrics
collectDefaultMetrics({ 
    register: metricsRegistry,
    prefix: 'grc_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

/**
 * HTTP Metrics
 */
export const httpRequestCounter = new Counter({
    name: 'grc_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'organization_id'],
    registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
    name: 'grc_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [metricsRegistry],
});

export const httpRequestSize = new Histogram({
    name: 'grc_http_request_size_bytes',
    help: 'HTTP request size in bytes',
    labelNames: ['method', 'route'],
    buckets: [100, 1000, 10000, 100000, 1000000],
    registers: [metricsRegistry],
});

export const httpResponseSize = new Histogram({
    name: 'grc_http_response_size_bytes',
    help: 'HTTP response size in bytes',
    labelNames: ['method', 'route'],
    buckets: [100, 1000, 10000, 100000, 1000000],
    registers: [metricsRegistry],
});

export const activeConnections = new Gauge({
    name: 'grc_active_connections',
    help: 'Number of active connections',
    registers: [metricsRegistry],
});

/**
 * Database Metrics
 */
export const databaseQueryCounter = new Counter({
    name: 'grc_database_queries_total',
    help: 'Total number of database queries',
    labelNames: ['operation', 'model', 'success'],
    registers: [metricsRegistry],
});

export const databaseQueryDuration = new Histogram({
    name: 'grc_database_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation', 'model'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
    registers: [metricsRegistry],
});

export const databaseConnectionPool = new Gauge({
    name: 'grc_database_connection_pool_size',
    help: 'Database connection pool size',
    labelNames: ['database', 'state'],
    registers: [metricsRegistry],
});

export const databaseErrors = new Counter({
    name: 'grc_database_errors_total',
    help: 'Total number of database errors',
    labelNames: ['error_code', 'model'],
    registers: [metricsRegistry],
});

/**
 * Cache Metrics
 */
export const cacheHits = new Counter({
    name: 'grc_cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_key'],
    registers: [metricsRegistry],
});

export const cacheMisses = new Counter({
    name: 'grc_cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_key'],
    registers: [metricsRegistry],
});

export const cacheOperationDuration = new Histogram({
    name: 'grc_cache_operation_duration_seconds',
    help: 'Cache operation duration in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
    registers: [metricsRegistry],
});

export const cacheSize = new Gauge({
    name: 'grc_cache_size_bytes',
    help: 'Cache size in bytes',
    registers: [metricsRegistry],
});

/**
 * Business Metrics
 */
export const vendorCount = new Gauge({
    name: 'grc_vendors_total',
    help: 'Total number of vendors',
    labelNames: ['tier', 'status', 'organization_id'],
    registers: [metricsRegistry],
});

export const assessmentCount = new Gauge({
    name: 'grc_assessments_total',
    help: 'Total number of assessments',
    labelNames: ['status', 'type', 'organization_id'],
    registers: [metricsRegistry],
});

export const riskCount = new Gauge({
    name: 'grc_risks_total',
    help: 'Total number of risks',
    labelNames: ['level', 'category', 'status', 'organization_id'],
    registers: [metricsRegistry],
});

export const controlCount = new Gauge({
    name: 'grc_controls_total',
    help: 'Total number of controls',
    labelNames: ['framework', 'status', 'organization_id'],
    registers: [metricsRegistry],
});

export const incidentCount = new Counter({
    name: 'grc_incidents_total',
    help: 'Total number of incidents',
    labelNames: ['severity', 'status', 'organization_id'],
    registers: [metricsRegistry],
});

export const assessmentCompletionTime = new Histogram({
    name: 'grc_assessment_completion_time_hours',
    help: 'Assessment completion time in hours',
    labelNames: ['type', 'organization_id'],
    buckets: [1, 6, 12, 24, 48, 72, 168],
    registers: [metricsRegistry],
});

export const overdueAssessments = new Gauge({
    name: 'grc_overdue_assessments_total',
    help: 'Number of overdue assessments',
    labelNames: ['organization_id'],
    registers: [metricsRegistry],
});

export const complianceScore = new Gauge({
    name: 'grc_compliance_score',
    help: 'Compliance score percentage',
    labelNames: ['framework', 'organization_id'],
    registers: [metricsRegistry],
});

/**
 * Circuit Breaker Metrics
 */
export const circuitBreakerState = new Gauge({
    name: 'grc_circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['breaker_name'],
    registers: [metricsRegistry],
});

export const circuitBreakerFailures = new Counter({
    name: 'grc_circuit_breaker_failures_total',
    help: 'Total number of circuit breaker failures',
    labelNames: ['breaker_name'],
    registers: [metricsRegistry],
});

export const circuitBreakerSuccesses = new Counter({
    name: 'grc_circuit_breaker_successes_total',
    help: 'Total number of circuit breaker successes',
    labelNames: ['breaker_name'],
    registers: [metricsRegistry],
});

/**
 * Error Metrics
 */
export const errorCounter = new Counter({
    name: 'grc_errors_total',
    help: 'Total number of errors',
    labelNames: ['error_type', 'error_code', 'route', 'organization_id'],
    registers: [metricsRegistry],
});

export const uncaughtExceptions = new Counter({
    name: 'grc_uncaught_exceptions_total',
    help: 'Total number of uncaught exceptions',
    registers: [metricsRegistry],
});

export const unhandledRejections = new Counter({
    name: 'grc_unhandled_rejections_total',
    help: 'Total number of unhandled promise rejections',
    registers: [metricsRegistry],
});

/**
 * Authentication Metrics
 */
export const authAttempts = new Counter({
    name: 'grc_auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['method', 'success'],
    registers: [metricsRegistry],
});

export const authFailures = new Counter({
    name: 'grc_auth_failures_total',
    help: 'Total number of authentication failures',
    labelNames: ['method', 'reason'],
    registers: [metricsRegistry],
});

export const activeSessions = new Gauge({
    name: 'grc_active_sessions',
    help: 'Number of active user sessions',
    labelNames: ['organization_id'],
    registers: [metricsRegistry],
});

/**
 * Queue Metrics
 */
export const queueJobs = new Gauge({
    name: 'grc_queue_jobs',
    help: 'Number of jobs in queue',
    labelNames: ['queue_name', 'state'],
    registers: [metricsRegistry],
});

export const queueJobDuration = new Histogram({
    name: 'grc_queue_job_duration_seconds',
    help: 'Queue job processing duration in seconds',
    labelNames: ['queue_name', 'job_type'],
    buckets: [0.1, 1, 5, 10, 30, 60, 300],
    registers: [metricsRegistry],
});

export const queueJobFailures = new Counter({
    name: 'grc_queue_job_failures_total',
    help: 'Total number of failed queue jobs',
    labelNames: ['queue_name', 'job_type'],
    registers: [metricsRegistry],
});

/**
 * Memory Metrics
 */
export const memoryUsagePercent = new Gauge({
    name: 'grc_memory_usage_percent',
    help: 'Memory usage percentage',
    registers: [metricsRegistry],
});

export const heapUsed = new Gauge({
    name: 'grc_heap_used_bytes',
    help: 'Heap memory used in bytes',
    registers: [metricsRegistry],
});

/**
 * Monitoring Service
 */
export class MonitoringService {
    private updateInterval: NodeJS.Timeout | null = null;
    private businessMetricsInterval: NodeJS.Timeout | null = null;

    /**
     * Start collecting metrics
     */
    start() {
        logger.info('Starting monitoring service...');

        // Update system metrics every 15 seconds
        this.updateInterval = setInterval(() => {
            this.updateSystemMetrics();
        }, 15000);

        // Update business metrics every 60 seconds
        this.businessMetricsInterval = setInterval(() => {
            this.updateBusinessMetrics();
        }, 60000);

        // Initial update
        this.updateSystemMetrics();
        this.updateBusinessMetrics();

        logger.info('Monitoring service started');
    }

    /**
     * Stop collecting metrics
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.businessMetricsInterval) {
            clearInterval(this.businessMetricsInterval);
            this.businessMetricsInterval = null;
        }
        logger.info('Monitoring service stopped');
    }

    /**
     * Update system metrics
     */
    private updateSystemMetrics() {
        try {
            const memUsage = process.memoryUsage();
            heapUsed.set(memUsage.heapUsed);
            
            const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            memoryUsagePercent.set(usagePercent);
        } catch (error) {
            logger.error('Error updating system metrics:', error);
        }
    }

    /**
     * Update business metrics
     */
    private async updateBusinessMetrics() {
        try {
            // This would be implemented with actual database queries
            // For now, we'll skip to avoid database dependencies in this file
            logger.debug('Business metrics update scheduled');
        } catch (error) {
            logger.error('Error updating business metrics:', error);
        }
    }

    /**
     * Record HTTP request
     */
    recordHttpRequest(data: {
        method: string;
        route: string;
        statusCode: number;
        duration: number;
        requestSize?: number;
        responseSize?: number;
        organizationId?: string;
    }) {
        httpRequestCounter.inc({
            method: data.method,
            route: data.route,
            status_code: data.statusCode,
            organization_id: data.organizationId || 'unknown',
        });

        httpRequestDuration.observe(
            {
                method: data.method,
                route: data.route,
                status_code: data.statusCode,
            },
            data.duration
        );

        if (data.requestSize) {
            httpRequestSize.observe(
                { method: data.method, route: data.route },
                data.requestSize
            );
        }

        if (data.responseSize) {
            httpResponseSize.observe(
                { method: data.method, route: data.route },
                data.responseSize
            );
        }
    }

    /**
     * Record database query
     */
    recordDatabaseQuery(data: {
        operation: string;
        model: string;
        duration: number;
        success: boolean;
        errorCode?: string;
    }) {
        databaseQueryCounter.inc({
            operation: data.operation,
            model: data.model,
            success: data.success ? 'true' : 'false',
        });

        databaseQueryDuration.observe(
            {
                operation: data.operation,
                model: data.model,
            },
            data.duration
        );

        if (!data.success && data.errorCode) {
            databaseErrors.inc({
                error_code: data.errorCode,
                model: data.model,
            });
        }
    }

    /**
     * Record cache operation
     */
    recordCacheOperation(data: {
        operation: 'get' | 'set' | 'delete';
        hit: boolean;
        duration: number;
        key?: string;
    }) {
        if (data.operation === 'get') {
            if (data.hit) {
                cacheHits.inc({ cache_key: data.key || 'unknown' });
            } else {
                cacheMisses.inc({ cache_key: data.key || 'unknown' });
            }
        }

        cacheOperationDuration.observe(
            { operation: data.operation },
            data.duration
        );
    }

    /**
     * Record error
     */
    recordError(data: {
        type: string;
        code: string;
        route?: string;
        organizationId?: string;
    }) {
        errorCounter.inc({
            error_type: data.type,
            error_code: data.code,
            route: data.route || 'unknown',
            organization_id: data.organizationId || 'unknown',
        });
    }

    /**
     * Record circuit breaker state
     */
    recordCircuitBreakerState(name: string, state: 'CLOSED' | 'OPEN' | 'HALF_OPEN') {
        const stateValue = state === 'CLOSED' ? 0 : state === 'OPEN' ? 1 : 2;
        circuitBreakerState.set({ breaker_name: name }, stateValue);
    }

    /**
     * Record circuit breaker failure
     */
    recordCircuitBreakerFailure(name: string) {
        circuitBreakerFailures.inc({ breaker_name: name });
    }

    /**
     * Record circuit breaker success
     */
    recordCircuitBreakerSuccess(name: string) {
        circuitBreakerSuccesses.inc({ breaker_name: name });
    }

    /**
     * Record authentication attempt
     */
    recordAuthAttempt(data: {
        method: string;
        success: boolean;
        reason?: string;
    }) {
        authAttempts.inc({
            method: data.method,
            success: data.success ? 'true' : 'false',
        });

        if (!data.success && data.reason) {
            authFailures.inc({
                method: data.method,
                reason: data.reason,
            });
        }
    }

    /**
     * Get metrics as text (Prometheus format)
     */
    async getMetrics(): Promise<string> {
        return await metricsRegistry.metrics();
    }

    /**
     * Get metrics as JSON
     */
    async getMetricsJSON(): Promise<any[]> {
        return await metricsRegistry.getMetricsAsJSON();
    }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
