/**
 * Error Tracking and Reporting System
 *
 * Integrates with error tracking services like Sentry, Rollbar, or custom solution
 */
export interface ErrorContext {
    userId?: string;
    organizationId?: string;
    requestId?: string;
    route?: string;
    method?: string;
    ip?: string;
    userAgent?: string;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
}
export interface ErrorReport {
    error: Error;
    context: ErrorContext;
    timestamp: Date;
    severity: 'fatal' | 'error' | 'warning' | 'info';
    fingerprint?: string[];
}
/**
 * Error Tracking Service
 */
export declare class ErrorTracker {
    private errorBuffer;
    private maxBufferSize;
    private flushInterval;
    constructor();
    /**
     * Initialize Sentry integration
     */
    private initializeSentry;
    /**
     * Start error tracking service
     */
    start(): void;
    /**
     * Stop error tracking service
     */
    stop(): void;
    /**
     * Register global error handlers
     */
    private registerGlobalHandlers;
    /**
     * Capture an error
     */
    captureError(error: Error, context?: ErrorContext, severity?: 'fatal' | 'error' | 'warning' | 'info'): ErrorReport;
    /**
     * Capture a message
     */
    captureMessage(message: string, context?: ErrorContext, severity?: 'fatal' | 'error' | 'warning' | 'info'): ErrorReport;
    /**
     * Generate error fingerprint for grouping
     */
    private generateFingerprint;
    /**
     * Normalize error message for grouping
     */
    private normalizeErrorMessage;
    /**
     * Log error to Winston
     */
    private logError;
    /**
     * Send error to Sentry
     */
    private sendToSentry;
    /**
     * Flush error buffer
     */
    private flushErrorBuffer;
    /**
     * Get error statistics
     */
    getStatistics(): {
        totalErrors: number;
        errorsByType: Record<string, number>;
        errorsBySeverity: Record<string, number>;
        bufferSize: number;
    };
}
export declare const errorTracker: ErrorTracker;
/**
 * Convenience function to capture errors
 */
export declare function captureError(error: Error, context?: ErrorContext, severity?: 'fatal' | 'error' | 'warning' | 'info'): ErrorReport;
/**
 * Convenience function to capture messages
 */
export declare function captureMessage(message: string, context?: ErrorContext, severity?: 'fatal' | 'error' | 'warning' | 'info'): ErrorReport;
//# sourceMappingURL=errorTracking.d.ts.map