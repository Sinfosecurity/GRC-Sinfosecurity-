"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = exports.MonitoringService = exports.heapUsed = exports.memoryUsagePercent = exports.queueJobFailures = exports.queueJobDuration = exports.queueJobs = exports.activeSessions = exports.authFailures = exports.authAttempts = exports.unhandledRejections = exports.uncaughtExceptions = exports.errorCounter = exports.circuitBreakerSuccesses = exports.circuitBreakerFailures = exports.circuitBreakerState = exports.complianceScore = exports.overdueAssessments = exports.assessmentCompletionTime = exports.incidentCount = exports.controlCount = exports.riskCount = exports.assessmentCount = exports.vendorCount = exports.cacheSize = exports.cacheOperationDuration = exports.cacheMisses = exports.cacheHits = exports.databaseErrors = exports.databaseConnectionPool = exports.databaseQueryDuration = exports.databaseQueryCounter = exports.activeConnections = exports.httpResponseSize = exports.httpRequestSize = exports.httpRequestDuration = exports.httpRequestCounter = exports.metricsRegistry = void 0;
const prom_client_1 = require("prom-client");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Comprehensive Monitoring and Metrics System
 */
// Create a custom registry
exports.metricsRegistry = new prom_client_1.Registry();
// Collect default Node.js metrics
(0, prom_client_1.collectDefaultMetrics)({
    register: exports.metricsRegistry,
    prefix: 'grc_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});
/**
 * HTTP Metrics
 */
exports.httpRequestCounter = new prom_client_1.Counter({
    name: 'grc_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'organization_id'],
    registers: [exports.metricsRegistry],
});
exports.httpRequestDuration = new prom_client_1.Histogram({
    name: 'grc_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [exports.metricsRegistry],
});
exports.httpRequestSize = new prom_client_1.Histogram({
    name: 'grc_http_request_size_bytes',
    help: 'HTTP request size in bytes',
    labelNames: ['method', 'route'],
    buckets: [100, 1000, 10000, 100000, 1000000],
    registers: [exports.metricsRegistry],
});
exports.httpResponseSize = new prom_client_1.Histogram({
    name: 'grc_http_response_size_bytes',
    help: 'HTTP response size in bytes',
    labelNames: ['method', 'route'],
    buckets: [100, 1000, 10000, 100000, 1000000],
    registers: [exports.metricsRegistry],
});
exports.activeConnections = new prom_client_1.Gauge({
    name: 'grc_active_connections',
    help: 'Number of active connections',
    registers: [exports.metricsRegistry],
});
/**
 * Database Metrics
 */
exports.databaseQueryCounter = new prom_client_1.Counter({
    name: 'grc_database_queries_total',
    help: 'Total number of database queries',
    labelNames: ['operation', 'model', 'success'],
    registers: [exports.metricsRegistry],
});
exports.databaseQueryDuration = new prom_client_1.Histogram({
    name: 'grc_database_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation', 'model'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
    registers: [exports.metricsRegistry],
});
exports.databaseConnectionPool = new prom_client_1.Gauge({
    name: 'grc_database_connection_pool_size',
    help: 'Database connection pool size',
    labelNames: ['database', 'state'],
    registers: [exports.metricsRegistry],
});
exports.databaseErrors = new prom_client_1.Counter({
    name: 'grc_database_errors_total',
    help: 'Total number of database errors',
    labelNames: ['error_code', 'model'],
    registers: [exports.metricsRegistry],
});
/**
 * Cache Metrics
 */
exports.cacheHits = new prom_client_1.Counter({
    name: 'grc_cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_key'],
    registers: [exports.metricsRegistry],
});
exports.cacheMisses = new prom_client_1.Counter({
    name: 'grc_cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_key'],
    registers: [exports.metricsRegistry],
});
exports.cacheOperationDuration = new prom_client_1.Histogram({
    name: 'grc_cache_operation_duration_seconds',
    help: 'Cache operation duration in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
    registers: [exports.metricsRegistry],
});
exports.cacheSize = new prom_client_1.Gauge({
    name: 'grc_cache_size_bytes',
    help: 'Cache size in bytes',
    registers: [exports.metricsRegistry],
});
/**
 * Business Metrics
 */
exports.vendorCount = new prom_client_1.Gauge({
    name: 'grc_vendors_total',
    help: 'Total number of vendors',
    labelNames: ['tier', 'status', 'organization_id'],
    registers: [exports.metricsRegistry],
});
exports.assessmentCount = new prom_client_1.Gauge({
    name: 'grc_assessments_total',
    help: 'Total number of assessments',
    labelNames: ['status', 'type', 'organization_id'],
    registers: [exports.metricsRegistry],
});
exports.riskCount = new prom_client_1.Gauge({
    name: 'grc_risks_total',
    help: 'Total number of risks',
    labelNames: ['level', 'category', 'status', 'organization_id'],
    registers: [exports.metricsRegistry],
});
exports.controlCount = new prom_client_1.Gauge({
    name: 'grc_controls_total',
    help: 'Total number of controls',
    labelNames: ['framework', 'status', 'organization_id'],
    registers: [exports.metricsRegistry],
});
exports.incidentCount = new prom_client_1.Counter({
    name: 'grc_incidents_total',
    help: 'Total number of incidents',
    labelNames: ['severity', 'status', 'organization_id'],
    registers: [exports.metricsRegistry],
});
exports.assessmentCompletionTime = new prom_client_1.Histogram({
    name: 'grc_assessment_completion_time_hours',
    help: 'Assessment completion time in hours',
    labelNames: ['type', 'organization_id'],
    buckets: [1, 6, 12, 24, 48, 72, 168],
    registers: [exports.metricsRegistry],
});
exports.overdueAssessments = new prom_client_1.Gauge({
    name: 'grc_overdue_assessments_total',
    help: 'Number of overdue assessments',
    labelNames: ['organization_id'],
    registers: [exports.metricsRegistry],
});
exports.complianceScore = new prom_client_1.Gauge({
    name: 'grc_compliance_score',
    help: 'Compliance score percentage',
    labelNames: ['framework', 'organization_id'],
    registers: [exports.metricsRegistry],
});
/**
 * Circuit Breaker Metrics
 */
exports.circuitBreakerState = new prom_client_1.Gauge({
    name: 'grc_circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['breaker_name'],
    registers: [exports.metricsRegistry],
});
exports.circuitBreakerFailures = new prom_client_1.Counter({
    name: 'grc_circuit_breaker_failures_total',
    help: 'Total number of circuit breaker failures',
    labelNames: ['breaker_name'],
    registers: [exports.metricsRegistry],
});
exports.circuitBreakerSuccesses = new prom_client_1.Counter({
    name: 'grc_circuit_breaker_successes_total',
    help: 'Total number of circuit breaker successes',
    labelNames: ['breaker_name'],
    registers: [exports.metricsRegistry],
});
/**
 * Error Metrics
 */
exports.errorCounter = new prom_client_1.Counter({
    name: 'grc_errors_total',
    help: 'Total number of errors',
    labelNames: ['error_type', 'error_code', 'route', 'organization_id'],
    registers: [exports.metricsRegistry],
});
exports.uncaughtExceptions = new prom_client_1.Counter({
    name: 'grc_uncaught_exceptions_total',
    help: 'Total number of uncaught exceptions',
    registers: [exports.metricsRegistry],
});
exports.unhandledRejections = new prom_client_1.Counter({
    name: 'grc_unhandled_rejections_total',
    help: 'Total number of unhandled promise rejections',
    registers: [exports.metricsRegistry],
});
/**
 * Authentication Metrics
 */
exports.authAttempts = new prom_client_1.Counter({
    name: 'grc_auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['method', 'success'],
    registers: [exports.metricsRegistry],
});
exports.authFailures = new prom_client_1.Counter({
    name: 'grc_auth_failures_total',
    help: 'Total number of authentication failures',
    labelNames: ['method', 'reason'],
    registers: [exports.metricsRegistry],
});
exports.activeSessions = new prom_client_1.Gauge({
    name: 'grc_active_sessions',
    help: 'Number of active user sessions',
    labelNames: ['organization_id'],
    registers: [exports.metricsRegistry],
});
/**
 * Queue Metrics
 */
exports.queueJobs = new prom_client_1.Gauge({
    name: 'grc_queue_jobs',
    help: 'Number of jobs in queue',
    labelNames: ['queue_name', 'state'],
    registers: [exports.metricsRegistry],
});
exports.queueJobDuration = new prom_client_1.Histogram({
    name: 'grc_queue_job_duration_seconds',
    help: 'Queue job processing duration in seconds',
    labelNames: ['queue_name', 'job_type'],
    buckets: [0.1, 1, 5, 10, 30, 60, 300],
    registers: [exports.metricsRegistry],
});
exports.queueJobFailures = new prom_client_1.Counter({
    name: 'grc_queue_job_failures_total',
    help: 'Total number of failed queue jobs',
    labelNames: ['queue_name', 'job_type'],
    registers: [exports.metricsRegistry],
});
/**
 * Memory Metrics
 */
exports.memoryUsagePercent = new prom_client_1.Gauge({
    name: 'grc_memory_usage_percent',
    help: 'Memory usage percentage',
    registers: [exports.metricsRegistry],
});
exports.heapUsed = new prom_client_1.Gauge({
    name: 'grc_heap_used_bytes',
    help: 'Heap memory used in bytes',
    registers: [exports.metricsRegistry],
});
/**
 * Monitoring Service
 */
class MonitoringService {
    constructor() {
        this.updateInterval = null;
        this.businessMetricsInterval = null;
    }
    /**
     * Start collecting metrics
     */
    start() {
        logger_1.default.info('Starting monitoring service...');
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
        logger_1.default.info('Monitoring service started');
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
        logger_1.default.info('Monitoring service stopped');
    }
    /**
     * Update system metrics
     */
    updateSystemMetrics() {
        try {
            const memUsage = process.memoryUsage();
            exports.heapUsed.set(memUsage.heapUsed);
            const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            exports.memoryUsagePercent.set(usagePercent);
        }
        catch (error) {
            logger_1.default.error('Error updating system metrics:', error);
        }
    }
    /**
     * Update business metrics
     */
    async updateBusinessMetrics() {
        try {
            // This would be implemented with actual database queries
            // For now, we'll skip to avoid database dependencies in this file
            logger_1.default.debug('Business metrics update scheduled');
        }
        catch (error) {
            logger_1.default.error('Error updating business metrics:', error);
        }
    }
    /**
     * Record HTTP request
     */
    recordHttpRequest(data) {
        exports.httpRequestCounter.inc({
            method: data.method,
            route: data.route,
            status_code: data.statusCode,
            organization_id: data.organizationId || 'unknown',
        });
        exports.httpRequestDuration.observe({
            method: data.method,
            route: data.route,
            status_code: data.statusCode,
        }, data.duration);
        if (data.requestSize) {
            exports.httpRequestSize.observe({ method: data.method, route: data.route }, data.requestSize);
        }
        if (data.responseSize) {
            exports.httpResponseSize.observe({ method: data.method, route: data.route }, data.responseSize);
        }
    }
    /**
     * Record database query
     */
    recordDatabaseQuery(data) {
        exports.databaseQueryCounter.inc({
            operation: data.operation,
            model: data.model,
            success: data.success ? 'true' : 'false',
        });
        exports.databaseQueryDuration.observe({
            operation: data.operation,
            model: data.model,
        }, data.duration);
        if (!data.success && data.errorCode) {
            exports.databaseErrors.inc({
                error_code: data.errorCode,
                model: data.model,
            });
        }
    }
    /**
     * Record cache operation
     */
    recordCacheOperation(data) {
        if (data.operation === 'get') {
            if (data.hit) {
                exports.cacheHits.inc({ cache_key: data.key || 'unknown' });
            }
            else {
                exports.cacheMisses.inc({ cache_key: data.key || 'unknown' });
            }
        }
        exports.cacheOperationDuration.observe({ operation: data.operation }, data.duration);
    }
    /**
     * Record error
     */
    recordError(data) {
        exports.errorCounter.inc({
            error_type: data.type,
            error_code: data.code,
            route: data.route || 'unknown',
            organization_id: data.organizationId || 'unknown',
        });
    }
    /**
     * Record circuit breaker state
     */
    recordCircuitBreakerState(name, state) {
        const stateValue = state === 'CLOSED' ? 0 : state === 'OPEN' ? 1 : 2;
        exports.circuitBreakerState.set({ breaker_name: name }, stateValue);
    }
    /**
     * Record circuit breaker failure
     */
    recordCircuitBreakerFailure(name) {
        exports.circuitBreakerFailures.inc({ breaker_name: name });
    }
    /**
     * Record circuit breaker success
     */
    recordCircuitBreakerSuccess(name) {
        exports.circuitBreakerSuccesses.inc({ breaker_name: name });
    }
    /**
     * Record authentication attempt
     */
    recordAuthAttempt(data) {
        exports.authAttempts.inc({
            method: data.method,
            success: data.success ? 'true' : 'false',
        });
        if (!data.success && data.reason) {
            exports.authFailures.inc({
                method: data.method,
                reason: data.reason,
            });
        }
    }
    /**
     * Get metrics as text (Prometheus format)
     */
    async getMetrics() {
        return await exports.metricsRegistry.metrics();
    }
    /**
     * Get metrics as JSON
     */
    async getMetricsJSON() {
        return await exports.metricsRegistry.getMetricsAsJSON();
    }
}
exports.MonitoringService = MonitoringService;
// Export singleton instance
exports.monitoringService = new MonitoringService();
//# sourceMappingURL=monitoring.js.map