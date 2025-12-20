"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackAuthAttempt = exports.trackCacheRequest = exports.timeDatabaseQuery = exports.metricsEndpoint = exports.metricsMiddleware = exports.apiErrors = exports.authenticationAttempts = exports.riskScore = exports.vendorAssessmentStatus = exports.cacheHitRate = exports.databaseQueryTotal = exports.databaseQueryDuration = exports.activeConnections = exports.httpRequestTotal = exports.httpRequestDuration = exports.register = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
// Create a Registry
exports.register = new prom_client_1.default.Registry();
// Add default metrics (CPU, memory, etc.)
prom_client_1.default.collectDefaultMetrics({ register: exports.register });
// Custom metrics
exports.httpRequestDuration = new prom_client_1.default.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [exports.register],
});
exports.httpRequestTotal = new prom_client_1.default.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [exports.register],
});
exports.activeConnections = new prom_client_1.default.Gauge({
    name: 'active_connections',
    help: 'Number of active connections',
    registers: [exports.register],
});
exports.databaseQueryDuration = new prom_client_1.default.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'model'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [exports.register],
});
exports.databaseQueryTotal = new prom_client_1.default.Counter({
    name: 'database_queries_total',
    help: 'Total number of database queries',
    labelNames: ['operation', 'model', 'status'],
    registers: [exports.register],
});
exports.cacheHitRate = new prom_client_1.default.Counter({
    name: 'cache_requests_total',
    help: 'Total number of cache requests',
    labelNames: ['result'], // 'hit' or 'miss'
    registers: [exports.register],
});
exports.vendorAssessmentStatus = new prom_client_1.default.Gauge({
    name: 'vendor_assessments_by_status',
    help: 'Number of vendor assessments by status',
    labelNames: ['status'],
    registers: [exports.register],
});
exports.riskScore = new prom_client_1.default.Gauge({
    name: 'risk_score_average',
    help: 'Average risk score by type',
    labelNames: ['type'], // 'inherent', 'residual'
    registers: [exports.register],
});
exports.authenticationAttempts = new prom_client_1.default.Counter({
    name: 'authentication_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['result'], // 'success' or 'failure'
    registers: [exports.register],
});
exports.apiErrors = new prom_client_1.default.Counter({
    name: 'api_errors_total',
    help: 'Total number of API errors',
    labelNames: ['type', 'endpoint'],
    registers: [exports.register],
});
/**
 * Middleware to track HTTP metrics
 */
const metricsMiddleware = (req, res, next) => {
    // Increment active connections
    exports.activeConnections.inc();
    const start = Date.now();
    // Track when response finishes
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000; // Convert to seconds
        const route = req.route?.path || req.path;
        const statusCode = res.statusCode.toString();
        // Record metrics
        exports.httpRequestDuration.observe({ method: req.method, route, status_code: statusCode }, duration);
        exports.httpRequestTotal.inc({
            method: req.method,
            route,
            status_code: statusCode,
        });
        // Track errors
        if (res.statusCode >= 400) {
            const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
            exports.apiErrors.inc({
                type: errorType,
                endpoint: route,
            });
        }
        // Decrement active connections
        exports.activeConnections.dec();
    });
    next();
};
exports.metricsMiddleware = metricsMiddleware;
/**
 * Endpoint to expose metrics
 */
const metricsEndpoint = async (req, res) => {
    try {
        res.set('Content-Type', exports.register.contentType);
        const metrics = await exports.register.metrics();
        res.end(metrics);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: 'Error collecting metrics',
                code: 'METRICS_ERROR',
            },
        });
    }
};
exports.metricsEndpoint = metricsEndpoint;
/**
 * Helper function to time database queries
 */
const timeDatabaseQuery = async (operation, model, queryFn) => {
    const start = Date.now();
    let status = 'success';
    try {
        const result = await queryFn();
        return result;
    }
    catch (error) {
        status = 'error';
        throw error;
    }
    finally {
        const duration = (Date.now() - start) / 1000;
        exports.databaseQueryDuration.observe({ operation, model }, duration);
        exports.databaseQueryTotal.inc({
            operation,
            model,
            status,
        });
    }
};
exports.timeDatabaseQuery = timeDatabaseQuery;
/**
 * Helper to track cache hits/misses
 */
const trackCacheRequest = (hit) => {
    exports.cacheHitRate.inc({ result: hit ? 'hit' : 'miss' });
};
exports.trackCacheRequest = trackCacheRequest;
/**
 * Helper to track authentication attempts
 */
const trackAuthAttempt = (success) => {
    exports.authenticationAttempts.inc({ result: success ? 'success' : 'failure' });
};
exports.trackAuthAttempt = trackAuthAttempt;
//# sourceMappingURL=metrics.js.map