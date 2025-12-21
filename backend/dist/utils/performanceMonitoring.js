"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceReporter = exports.PerformanceReporter = exports.cachePerformanceMonitor = exports.CachePerformanceMonitor = exports.databasePerformanceMonitor = exports.DatabasePerformanceMonitor = exports.performanceMonitor = exports.PerformanceMonitor = void 0;
exports.performanceMiddleware = performanceMiddleware;
const monitoring_1 = require("./monitoring");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Performance Monitor
 */
class PerformanceMonitor {
    constructor() {
        this.traces = new Map();
        this.maxTraces = 1000;
    }
    /**
     * Start tracing a request
     */
    startTrace(id, metadata) {
        const trace = {
            startTime: Date.now(),
            cpuUsage: process.cpuUsage(),
            memoryUsage: process.memoryUsage(),
            ...metadata,
        };
        this.traces.set(id, trace);
        // Cleanup old traces
        if (this.traces.size > this.maxTraces) {
            const firstKey = this.traces.keys().next().value;
            if (firstKey) {
                this.traces.delete(firstKey);
            }
        }
    }
    /**
     * End tracing a request
     */
    endTrace(id, statusCode) {
        const trace = this.traces.get(id);
        if (!trace) {
            return null;
        }
        const endTime = Date.now();
        const duration = endTime - trace.startTime;
        const cpuUsage = process.cpuUsage(trace.cpuUsage);
        const memoryUsage = process.memoryUsage();
        const finalTrace = {
            ...trace,
            endTime,
            duration,
            cpuUsage,
            memoryUsage,
            statusCode,
        };
        this.traces.delete(id);
        // Log slow requests (> 2 seconds)
        if (duration > 2000) {
            logger_1.default.warn('Slow request detected', {
                route: trace.route,
                method: trace.method,
                duration: `${duration}ms`,
                statusCode,
            });
        }
        return finalTrace;
    }
    /**
     * Get active traces count
     */
    getActiveTracesCount() {
        return this.traces.size;
    }
    /**
     * Clear all traces
     */
    clearTraces() {
        this.traces.clear();
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
// Export singleton
exports.performanceMonitor = new PerformanceMonitor();
/**
 * Performance monitoring middleware
 */
function performanceMiddleware() {
    return (req, res, next) => {
        const traceId = req.id || `${Date.now()}-${Math.random()}`;
        const startTime = Date.now();
        // Start performance trace
        exports.performanceMonitor.startTrace(traceId, {
            route: req.route?.path || req.path,
            method: req.method,
        });
        // Record request size
        const requestSize = req.get('content-length');
        if (requestSize && req.body && typeof req.body === 'object') {
            const size = parseInt(requestSize, 10);
            if (!isNaN(size)) {
                req.body._contentLength = size;
            }
        }
        // Capture response
        const originalSend = res.send;
        let responseSize = 0;
        res.send = function (data) {
            responseSize = Buffer.byteLength(JSON.stringify(data));
            res.send = originalSend;
            return originalSend.call(this, data);
        };
        // Record metrics on response finish
        res.on('finish', () => {
            const duration = (Date.now() - startTime) / 1000; // Convert to seconds
            // End performance trace
            exports.performanceMonitor.endTrace(traceId, res.statusCode);
            // Record HTTP metrics
            monitoring_1.monitoringService.recordHttpRequest({
                method: req.method,
                route: req.route?.path || req.path,
                statusCode: res.statusCode,
                duration,
                requestSize: req.body._contentLength,
                responseSize,
                organizationId: req.user?.organizationId,
            });
            // Log performance data
            if (duration > 1) {
                logger_1.default.warn('Slow endpoint', {
                    method: req.method,
                    route: req.route?.path || req.path,
                    duration: `${(duration * 1000).toFixed(0)}ms`,
                    statusCode: res.statusCode,
                });
            }
        });
        next();
    };
}
/**
 * Database query performance monitor
 */
class DatabasePerformanceMonitor {
    constructor() {
        this.slowQueryThreshold = 100; // ms
    }
    /**
     * Wrap Prisma client to monitor queries
     */
    monitorPrisma(prisma) {
        // This would be implemented using Prisma middleware
        prisma.$use(async (params, next) => {
            const startTime = Date.now();
            try {
                const result = await next(params);
                const duration = (Date.now() - startTime) / 1000;
                // Record metrics
                monitoring_1.monitoringService.recordDatabaseQuery({
                    operation: params.action,
                    model: params.model || 'unknown',
                    duration,
                    success: true,
                });
                // Log slow queries
                if (duration * 1000 > this.slowQueryThreshold) {
                    logger_1.default.warn('Slow database query detected', {
                        model: params.model,
                        action: params.action,
                        duration: `${(duration * 1000).toFixed(0)}ms`,
                        args: params.args,
                    });
                }
                return result;
            }
            catch (error) {
                const duration = (Date.now() - startTime) / 1000;
                // Record error metrics
                monitoring_1.monitoringService.recordDatabaseQuery({
                    operation: params.action,
                    model: params.model || 'unknown',
                    duration,
                    success: false,
                    errorCode: error.code,
                });
                throw error;
            }
        });
        logger_1.default.info('Prisma performance monitoring enabled');
    }
    /**
     * Set slow query threshold
     */
    setSlowQueryThreshold(ms) {
        this.slowQueryThreshold = ms;
        logger_1.default.info(`Slow query threshold set to ${ms}ms`);
    }
}
exports.DatabasePerformanceMonitor = DatabasePerformanceMonitor;
exports.databasePerformanceMonitor = new DatabasePerformanceMonitor();
/**
 * Cache performance monitor
 */
class CachePerformanceMonitor {
    /**
     * Wrap cache operations to monitor performance
     */
    wrapCacheOperation(operation, key, fn) {
        const startTime = Date.now();
        return fn()
            .then((result) => {
            const duration = (Date.now() - startTime) / 1000;
            const hit = operation === 'get' && result !== null && result !== undefined;
            monitoring_1.monitoringService.recordCacheOperation({
                operation,
                hit,
                duration,
                key,
            });
            return result;
        })
            .catch((error) => {
            const duration = (Date.now() - startTime) / 1000;
            monitoring_1.monitoringService.recordCacheOperation({
                operation,
                hit: false,
                duration,
                key,
            });
            throw error;
        });
    }
    /**
     * Calculate cache hit rate
     */
    async getCacheHitRate() {
        try {
            const metrics = await monitoring_1.monitoringService.getMetricsJSON();
            const hitsMetric = metrics.find((m) => m.name === 'grc_cache_hits_total');
            const missesMetric = metrics.find((m) => m.name === 'grc_cache_misses_total');
            if (!hitsMetric || !missesMetric) {
                return 0;
            }
            const hits = hitsMetric.values.reduce((sum, v) => sum + v.value, 0);
            const misses = missesMetric.values.reduce((sum, v) => sum + v.value, 0);
            const total = hits + misses;
            if (total === 0)
                return 0;
            return (hits / total) * 100;
        }
        catch (error) {
            logger_1.default.error('Error calculating cache hit rate:', error);
            return 0;
        }
    }
}
exports.CachePerformanceMonitor = CachePerformanceMonitor;
exports.cachePerformanceMonitor = new CachePerformanceMonitor();
/**
 * Performance report generator
 */
class PerformanceReporter {
    /**
     * Generate performance report
     */
    async generateReport() {
        try {
            const metrics = await monitoring_1.monitoringService.getMetricsJSON();
            // Extract key metrics
            const report = {
                timestamp: new Date().toISOString(),
                http: this.extractHttpMetrics(metrics),
                database: this.extractDatabaseMetrics(metrics),
                cache: this.extractCacheMetrics(metrics),
                memory: this.extractMemoryMetrics(metrics),
                errors: this.extractErrorMetrics(metrics),
            };
            return report;
        }
        catch (error) {
            logger_1.default.error('Error generating performance report:', error);
            return null;
        }
    }
    extractHttpMetrics(metrics) {
        const requestsMetric = metrics.find((m) => m.name === 'grc_http_requests_total');
        const durationMetric = metrics.find((m) => m.name === 'grc_http_request_duration_seconds');
        return {
            totalRequests: requestsMetric?.values.reduce((sum, v) => sum + v.value, 0) || 0,
            avgDuration: this.calculateAverage(durationMetric),
        };
    }
    extractDatabaseMetrics(metrics) {
        const queriesMetric = metrics.find((m) => m.name === 'grc_database_queries_total');
        const durationMetric = metrics.find((m) => m.name === 'grc_database_query_duration_seconds');
        return {
            totalQueries: queriesMetric?.values.reduce((sum, v) => sum + v.value, 0) || 0,
            avgDuration: this.calculateAverage(durationMetric),
        };
    }
    extractCacheMetrics(metrics) {
        const hitsMetric = metrics.find((m) => m.name === 'grc_cache_hits_total');
        const missesMetric = metrics.find((m) => m.name === 'grc_cache_misses_total');
        const hits = hitsMetric?.values.reduce((sum, v) => sum + v.value, 0) || 0;
        const misses = missesMetric?.values.reduce((sum, v) => sum + v.value, 0) || 0;
        const total = hits + misses;
        return {
            hits,
            misses,
            hitRate: total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : '0%',
        };
    }
    extractMemoryMetrics(metrics) {
        const heapUsedMetric = metrics.find((m) => m.name === 'grc_heap_used_bytes');
        const memoryPercentMetric = metrics.find((m) => m.name === 'grc_memory_usage_percent');
        return {
            heapUsed: heapUsedMetric?.values[0]?.value || 0,
            usagePercent: memoryPercentMetric?.values[0]?.value || 0,
        };
    }
    extractErrorMetrics(metrics) {
        const errorsMetric = metrics.find((m) => m.name === 'grc_errors_total');
        return {
            totalErrors: errorsMetric?.values.reduce((sum, v) => sum + v.value, 0) || 0,
        };
    }
    calculateAverage(metric) {
        if (!metric || !metric.values || metric.values.length === 0) {
            return 0;
        }
        const sum = metric.values.reduce((acc, v) => acc + (v.value || 0), 0);
        return sum / metric.values.length;
    }
}
exports.PerformanceReporter = PerformanceReporter;
exports.performanceReporter = new PerformanceReporter();
//# sourceMappingURL=performanceMonitoring.js.map