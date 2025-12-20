/**
 * Log Aggregation and Analysis System
 * 
 * Provides structured logging with aggregation capabilities
 */

import logger from '../config/logger';
import { captureError } from './errorTracking';

export interface LogEntry {
    level: 'error' | 'warn' | 'info' | 'debug';
    message: string;
    timestamp: Date;
    context?: Record<string, any>;
    userId?: string;
    organizationId?: string;
    requestId?: string;
    source?: string;
}

/**
 * Log Aggregator
 */
export class LogAggregator {
    private logBuffer: LogEntry[] = [];
    private maxBufferSize = 1000;
    private flushInterval: NodeJS.Timeout | null = null;
    private isRunning = false;

    /**
     * Start log aggregation
     */
    start() {
        if (this.isRunning) {
            logger.warn('Log aggregator already running');
            return;
        }

        logger.info('Starting log aggregator...');
        this.isRunning = true;

        // Flush logs every 60 seconds
        this.flushInterval = setInterval(() => {
            this.flushLogs();
        }, 60000);

        logger.info('Log aggregator started');
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
        logger.info('Log aggregator stopped');
    }

    /**
     * Add log entry to buffer
     */
    addLog(entry: LogEntry) {
        this.logBuffer.push(entry);

        // Flush if buffer is full
        if (this.logBuffer.length >= this.maxBufferSize) {
            this.flushLogs();
        }
    }

    /**
     * Flush logs to storage/external service
     */
    private flushLogs() {
        if (this.logBuffer.length === 0) return;

        const logsToFlush = [...this.logBuffer];
        this.logBuffer = [];

        logger.info(`Flushing ${logsToFlush.length} logs`);

        // In production, send to:
        // - Elasticsearch/ELK Stack
        // - Datadog Logs
        // - CloudWatch Logs
        // - Splunk
        // - Loki (Grafana)

        // For now, just log the count
        const errorCount = logsToFlush.filter(l => l.level === 'error').length;
        const warnCount = logsToFlush.filter(l => l.level === 'warn').length;

        logger.debug('Log flush summary', {
            total: logsToFlush.length,
            errors: errorCount,
            warnings: warnCount,
        });
    }

    /**
     * Query logs
     */
    async queryLogs(params: {
        level?: LogEntry['level'];
        startTime?: Date;
        endTime?: Date;
        userId?: string;
        organizationId?: string;
        source?: string;
        search?: string;
        limit?: number;
    }): Promise<LogEntry[]> {
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
            results = results.filter(log => 
                log.message.toLowerCase().includes(searchLower)
            );
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

        const recentLogs = this.logBuffer.filter(
            log => log.timestamp.getTime() > last24Hours
        );

        const byLevel = recentLogs.reduce((acc, log) => {
            acc[log.level] = (acc[log.level] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const bySource = recentLogs.reduce((acc, log) => {
            const source = log.source || 'unknown';
            acc[source] = (acc[source] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalLogs: recentLogs.length,
            bufferSize: this.logBuffer.length,
            byLevel,
            bySource,
            last24Hours: recentLogs.length,
        };
    }
}

/**
 * Structured Logger Wrapper
 */
export class StructuredLogger {
    /**
     * Log with context
     */
    static log(
        level: 'error' | 'warn' | 'info' | 'debug',
        message: string,
        context?: Record<string, any>
    ) {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date(),
            context,
        };

        // Use Winston logger
        logger[level](message, context);

        // Add to aggregator if running
        if (logAggregator) {
            logAggregator.addLog(entry);
        }
    }

    /**
     * Log error with context
     */
    static error(message: string, error?: Error, context?: Record<string, any>) {
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
            captureError(error, context);
        }
    }

    /**
     * Log warning
     */
    static warn(message: string, context?: Record<string, any>) {
        this.log('warn', message, context);
    }

    /**
     * Log info
     */
    static info(message: string, context?: Record<string, any>) {
        this.log('info', message, context);
    }

    /**
     * Log debug
     */
    static debug(message: string, context?: Record<string, any>) {
        this.log('debug', message, context);
    }

    /**
     * Log audit event
     */
    static audit(action: string, context: Record<string, any>) {
        this.log('info', `AUDIT: ${action}`, {
            ...context,
            audit: true,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log security event
     */
    static security(event: string, context: Record<string, any>) {
        this.log('warn', `SECURITY: ${event}`, {
            ...context,
            security: true,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log performance metric
     */
    static performance(operation: string, duration: number, context?: Record<string, any>) {
        this.log('info', `PERFORMANCE: ${operation}`, {
            ...context,
            performance: true,
            duration,
            timestamp: new Date().toISOString(),
        });
    }
}

// Export singleton
export const logAggregator = new LogAggregator();

/**
 * Log aggregation configuration for external services
 */
export const logAggregationConfig = {
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
export function initializeLogAggregation() {
    logger.info('Initializing log aggregation...');

    if (logAggregationConfig.elasticsearch.enabled) {
        logger.info('Elasticsearch logging enabled', {
            url: logAggregationConfig.elasticsearch.url,
            index: logAggregationConfig.elasticsearch.index,
        });
    }

    if (logAggregationConfig.datadog.enabled) {
        logger.info('Datadog logging enabled', {
            service: logAggregationConfig.datadog.service,
        });
    }

    if (logAggregationConfig.cloudwatch.enabled) {
        logger.info('CloudWatch logging enabled', {
            logGroup: logAggregationConfig.cloudwatch.logGroupName,
        });
    }

    if (logAggregationConfig.loki.enabled) {
        logger.info('Loki logging enabled', {
            url: logAggregationConfig.loki.url,
        });
    }

    // Start log aggregator
    logAggregator.start();

    logger.info('Log aggregation initialized');
}
