"use strict";
/**
 * Log Aggregation and Analysis System
 *
 * Provides structured logging with aggregation capabilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAggregationConfig = exports.logAggregator = exports.StructuredLogger = exports.LogAggregator = void 0;
exports.initializeLogAggregation = initializeLogAggregation;
const logger_1 = __importDefault(require("../config/logger"));
const errorTracking_1 = require("./errorTracking");
/**
 * Log Aggregator
 */
class LogAggregator {
    constructor() {
        this.logBuffer = [];
        this.maxBufferSize = 1000;
        this.flushInterval = null;
        this.isRunning = false;
    }
    /**
     * Start log aggregation
     */
    start() {
        if (this.isRunning) {
            logger_1.default.warn('Log aggregator already running');
            return;
        }
        logger_1.default.info('Starting log aggregator...');
        this.isRunning = true;
        // Flush logs every 60 seconds
        this.flushInterval = setInterval(() => {
            this.flushLogs();
        }, 60000);
        logger_1.default.info('Log aggregator started');
    }
    /**
     * Stop log aggregation
     */
    stop() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        this.flushLogs(); // Final flush
        this.isRunning = false;
        logger_1.default.info('Log aggregator stopped');
    }
    /**
     * Add log entry to buffer
     */
    addLog(entry) {
        this.logBuffer.push(entry);
        // Flush if buffer is full
        if (this.logBuffer.length >= this.maxBufferSize) {
            this.flushLogs();
        }
    }
    /**
     * Flush logs to storage/external service
     */
    flushLogs() {
        if (this.logBuffer.length === 0)
            return;
        const logsToFlush = [...this.logBuffer];
        this.logBuffer = [];
        logger_1.default.info(`Flushing ${logsToFlush.length} logs`);
        // In production, send to:
        // - Elasticsearch/ELK Stack
        // - Datadog Logs
        // - CloudWatch Logs
        // - Splunk
        // - Loki (Grafana)
        // For now, just log the count
        const errorCount = logsToFlush.filter(l => l.level === 'error').length;
        const warnCount = logsToFlush.filter(l => l.level === 'warn').length;
        logger_1.default.debug('Log flush summary', {
            total: logsToFlush.length,
            errors: errorCount,
            warnings: warnCount,
        });
    }
    /**
     * Query logs
     */
    async queryLogs(params) {
        // In production, query from storage
        // For now, return from buffer
        let results = [...this.logBuffer];
        // Apply filters
        if (params.level) {
            results = results.filter(log => log.level === params.level);
        }
        if (params.startTime) {
            results = results.filter(log => log.timestamp >= params.startTime);
        }
        if (params.endTime) {
            results = results.filter(log => log.timestamp <= params.endTime);
        }
        if (params.userId) {
            results = results.filter(log => log.userId === params.userId);
        }
        if (params.organizationId) {
            results = results.filter(log => log.organizationId === params.organizationId);
        }
        if (params.source) {
            results = results.filter(log => log.source === params.source);
        }
        if (params.search) {
            const searchLower = params.search.toLowerCase();
            results = results.filter(log => log.message.toLowerCase().includes(searchLower));
        }
        // Apply limit
        if (params.limit) {
            results = results.slice(0, params.limit);
        }
        return results;
    }
    /**
     * Get log statistics
     */
    getStatistics() {
        const now = Date.now();
        const last24Hours = now - 24 * 60 * 60 * 1000;
        const recentLogs = this.logBuffer.filter(log => log.timestamp.getTime() > last24Hours);
        const byLevel = recentLogs.reduce((acc, log) => {
            acc[log.level] = (acc[log.level] || 0) + 1;
            return acc;
        }, {});
        const bySource = recentLogs.reduce((acc, log) => {
            const source = log.source || 'unknown';
            acc[source] = (acc[source] || 0) + 1;
            return acc;
        }, {});
        return {
            totalLogs: recentLogs.length,
            bufferSize: this.logBuffer.length,
            byLevel,
            bySource,
            last24Hours: recentLogs.length,
        };
    }
}
exports.LogAggregator = LogAggregator;
/**
 * Structured Logger Wrapper
 */
class StructuredLogger {
    /**
     * Log with context
     */
    static log(level, message, context) {
        const entry = {
            level,
            message,
            timestamp: new Date(),
            context,
        };
        // Use Winston logger
        logger_1.default[level](message, context);
        // Add to aggregator if running
        if (exports.logAggregator) {
            exports.logAggregator.addLog(entry);
        }
    }
    /**
     * Log error with context
     */
    static error(message, error, context) {
        const enrichedContext = {
            ...context,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : undefined,
        };
        this.log('error', message, enrichedContext);
        // Also capture in error tracker
        if (error) {
            (0, errorTracking_1.captureError)(error, context);
        }
    }
    /**
     * Log warning
     */
    static warn(message, context) {
        this.log('warn', message, context);
    }
    /**
     * Log info
     */
    static info(message, context) {
        this.log('info', message, context);
    }
    /**
     * Log debug
     */
    static debug(message, context) {
        this.log('debug', message, context);
    }
    /**
     * Log audit event
     */
    static audit(action, context) {
        this.log('info', `AUDIT: ${action}`, {
            ...context,
            audit: true,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Log security event
     */
    static security(event, context) {
        this.log('warn', `SECURITY: ${event}`, {
            ...context,
            security: true,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Log performance metric
     */
    static performance(operation, duration, context) {
        this.log('info', `PERFORMANCE: ${operation}`, {
            ...context,
            performance: true,
            duration,
            timestamp: new Date().toISOString(),
        });
    }
}
exports.StructuredLogger = StructuredLogger;
// Export singleton
exports.logAggregator = new LogAggregator();
/**
 * Log aggregation configuration for external services
 */
exports.logAggregationConfig = {
    // ELK Stack configuration
    elasticsearch: {
        enabled: !!process.env.ELASTICSEARCH_URL,
        url: process.env.ELASTICSEARCH_URL,
        index: 'grc-logs',
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
    },
    // Datadog Logs configuration
    datadog: {
        enabled: !!process.env.DATADOG_API_KEY,
        apiKey: process.env.DATADOG_API_KEY,
        service: 'grc-platform',
        hostname: process.env.HOSTNAME || 'unknown',
        source: 'nodejs',
    },
    // CloudWatch Logs configuration
    cloudwatch: {
        enabled: !!process.env.AWS_CLOUDWATCH_LOG_GROUP,
        logGroupName: process.env.AWS_CLOUDWATCH_LOG_GROUP,
        logStreamName: process.env.AWS_CLOUDWATCH_LOG_STREAM,
        region: process.env.AWS_REGION || 'us-east-1',
    },
    // Loki (Grafana) configuration
    loki: {
        enabled: !!process.env.LOKI_URL,
        url: process.env.LOKI_URL,
        labels: {
            app: 'grc-platform',
            env: process.env.NODE_ENV || 'development',
        },
    },
};
/**
 * Initialize log aggregation with external services
 */
function initializeLogAggregation() {
    logger_1.default.info('Initializing log aggregation...');
    if (exports.logAggregationConfig.elasticsearch.enabled) {
        logger_1.default.info('Elasticsearch logging enabled', {
            url: exports.logAggregationConfig.elasticsearch.url,
            index: exports.logAggregationConfig.elasticsearch.index,
        });
    }
    if (exports.logAggregationConfig.datadog.enabled) {
        logger_1.default.info('Datadog logging enabled', {
            service: exports.logAggregationConfig.datadog.service,
        });
    }
    if (exports.logAggregationConfig.cloudwatch.enabled) {
        logger_1.default.info('CloudWatch logging enabled', {
            logGroup: exports.logAggregationConfig.cloudwatch.logGroupName,
        });
    }
    if (exports.logAggregationConfig.loki.enabled) {
        logger_1.default.info('Loki logging enabled', {
            url: exports.logAggregationConfig.loki.url,
        });
    }
    // Start log aggregator
    exports.logAggregator.start();
    logger_1.default.info('Log aggregation initialized');
}
//# sourceMappingURL=logAggregation.js.map