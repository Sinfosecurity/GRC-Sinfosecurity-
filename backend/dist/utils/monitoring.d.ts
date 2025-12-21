import { Counter, Gauge, Histogram, Registry } from 'prom-client';
/**
 * Comprehensive Monitoring and Metrics System
 */
export declare const metricsRegistry: Registry<"text/plain; version=0.0.4; charset=utf-8">;
/**
 * HTTP Metrics
 */
export declare const httpRequestCounter: Counter<"route" | "method" | "status_code" | "organization_id">;
export declare const httpRequestDuration: Histogram<"route" | "method" | "status_code">;
export declare const httpRequestSize: Histogram<"route" | "method">;
export declare const httpResponseSize: Histogram<"route" | "method">;
export declare const activeConnections: Gauge<string>;
/**
 * Database Metrics
 */
export declare const databaseQueryCounter: Counter<"operation" | "model" | "success">;
export declare const databaseQueryDuration: Histogram<"operation" | "model">;
export declare const databaseConnectionPool: Gauge<"state" | "database">;
export declare const databaseErrors: Counter<"model" | "error_code">;
/**
 * Cache Metrics
 */
export declare const cacheHits: Counter<"cache_key">;
export declare const cacheMisses: Counter<"cache_key">;
export declare const cacheOperationDuration: Histogram<"operation">;
export declare const cacheSize: Gauge<string>;
/**
 * Business Metrics
 */
export declare const vendorCount: Gauge<"status" | "tier" | "organization_id">;
export declare const assessmentCount: Gauge<"status" | "type" | "organization_id">;
export declare const riskCount: Gauge<"status" | "level" | "category" | "organization_id">;
export declare const controlCount: Gauge<"status" | "organization_id" | "framework">;
export declare const incidentCount: Counter<"status" | "severity" | "organization_id">;
export declare const assessmentCompletionTime: Histogram<"type" | "organization_id">;
export declare const overdueAssessments: Gauge<"organization_id">;
export declare const complianceScore: Gauge<"organization_id" | "framework">;
/**
 * Circuit Breaker Metrics
 */
export declare const circuitBreakerState: Gauge<"breaker_name">;
export declare const circuitBreakerFailures: Counter<"breaker_name">;
export declare const circuitBreakerSuccesses: Counter<"breaker_name">;
/**
 * Error Metrics
 */
export declare const errorCounter: Counter<"route" | "organization_id" | "error_code" | "error_type">;
export declare const uncaughtExceptions: Counter<string>;
export declare const unhandledRejections: Counter<string>;
/**
 * Authentication Metrics
 */
export declare const authAttempts: Counter<"method" | "success">;
export declare const authFailures: Counter<"method" | "reason">;
export declare const activeSessions: Gauge<"organization_id">;
/**
 * Queue Metrics
 */
export declare const queueJobs: Gauge<"state" | "queue_name">;
export declare const queueJobDuration: Histogram<"queue_name" | "job_type">;
export declare const queueJobFailures: Counter<"queue_name" | "job_type">;
/**
 * Memory Metrics
 */
export declare const memoryUsagePercent: Gauge<string>;
export declare const heapUsed: Gauge<string>;
/**
 * Monitoring Service
 */
export declare class MonitoringService {
    private updateInterval;
    private businessMetricsInterval;
    /**
     * Start collecting metrics
     */
    start(): void;
    /**
     * Stop collecting metrics
     */
    stop(): void;
    /**
     * Update system metrics
     */
    private updateSystemMetrics;
    /**
     * Update business metrics
     */
    private updateBusinessMetrics;
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
    }): void;
    /**
     * Record database query
     */
    recordDatabaseQuery(data: {
        operation: string;
        model: string;
        duration: number;
        success: boolean;
        errorCode?: string;
    }): void;
    /**
     * Record cache operation
     */
    recordCacheOperation(data: {
        operation: 'get' | 'set' | 'delete';
        hit: boolean;
        duration: number;
        key?: string;
    }): void;
    /**
     * Record error
     */
    recordError(data: {
        type: string;
        code: string;
        route?: string;
        organizationId?: string;
    }): void;
    /**
     * Record circuit breaker state
     */
    recordCircuitBreakerState(name: string, state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void;
    /**
     * Record circuit breaker failure
     */
    recordCircuitBreakerFailure(name: string): void;
    /**
     * Record circuit breaker success
     */
    recordCircuitBreakerSuccess(name: string): void;
    /**
     * Record authentication attempt
     */
    recordAuthAttempt(data: {
        method: string;
        success: boolean;
        reason?: string;
    }): void;
    /**
     * Get metrics as text (Prometheus format)
     */
    getMetrics(): Promise<string>;
    /**
     * Get metrics as JSON
     */
    getMetricsJSON(): Promise<any[]>;
}
export declare const monitoringService: MonitoringService;
//# sourceMappingURL=monitoring.d.ts.map