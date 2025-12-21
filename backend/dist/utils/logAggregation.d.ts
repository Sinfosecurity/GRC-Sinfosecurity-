/**
 * Log Aggregation and Analysis System
 *
 * Provides structured logging with aggregation capabilities
 */
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
export declare class LogAggregator {
    private logBuffer;
    private maxBufferSize;
    private flushInterval;
    private isRunning;
    /**
     * Start log aggregation
     */
    start(): void;
    /**
     * Stop log aggregation
     */
    stop(): void;
    /**
     * Add log entry to buffer
     */
    addLog(entry: LogEntry): void;
    /**
     * Flush logs to storage/external service
     */
    private flushLogs;
    /**
     * Query logs
     */
    queryLogs(params: {
        level?: LogEntry['level'];
        startTime?: Date;
        endTime?: Date;
        userId?: string;
        organizationId?: string;
        source?: string;
        search?: string;
        limit?: number;
    }): Promise<LogEntry[]>;
    /**
     * Get log statistics
     */
    getStatistics(): {
        totalLogs: number;
        bufferSize: number;
        byLevel: Record<string, number>;
        bySource: Record<string, number>;
        last24Hours: number;
    };
}
/**
 * Structured Logger Wrapper
 */
export declare class StructuredLogger {
    /**
     * Log with context
     */
    static log(level: 'error' | 'warn' | 'info' | 'debug', message: string, context?: Record<string, any>): void;
    /**
     * Log error with context
     */
    static error(message: string, error?: Error, context?: Record<string, any>): void;
    /**
     * Log warning
     */
    static warn(message: string, context?: Record<string, any>): void;
    /**
     * Log info
     */
    static info(message: string, context?: Record<string, any>): void;
    /**
     * Log debug
     */
    static debug(message: string, context?: Record<string, any>): void;
    /**
     * Log audit event
     */
    static audit(action: string, context: Record<string, any>): void;
    /**
     * Log security event
     */
    static security(event: string, context: Record<string, any>): void;
    /**
     * Log performance metric
     */
    static performance(operation: string, duration: number, context?: Record<string, any>): void;
}
export declare const logAggregator: LogAggregator;
/**
 * Log aggregation configuration for external services
 */
export declare const logAggregationConfig: {
    elasticsearch: {
        enabled: boolean;
        url: string | undefined;
        index: string;
        username: string | undefined;
        password: string | undefined;
    };
    datadog: {
        enabled: boolean;
        apiKey: string | undefined;
        service: string;
        hostname: string;
        source: string;
    };
    cloudwatch: {
        enabled: boolean;
        logGroupName: string | undefined;
        logStreamName: string | undefined;
        region: string;
    };
    loki: {
        enabled: boolean;
        url: string | undefined;
        labels: {
            app: string;
            env: string;
        };
    };
};
/**
 * Initialize log aggregation with external services
 */
export declare function initializeLogAggregation(): void;
//# sourceMappingURL=logAggregation.d.ts.map