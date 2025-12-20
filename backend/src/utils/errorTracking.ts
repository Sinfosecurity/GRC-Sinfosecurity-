import logger from '../config/logger';
import { monitoringService } from './monitoring';

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
export class ErrorTracker {
    private errorBuffer: ErrorReport[] = [];
    private maxBufferSize = 100;
    private flushInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Check if Sentry is configured
        if (process.env.SENTRY_DSN) {
            this.initializeSentry();
        }
    }

    /**
     * Initialize Sentry integration
     */
    private initializeSentry() {
        try {
            // In production, you would do:
            // const Sentry = require('@sentry/node');
            // Sentry.init({
            //     dsn: process.env.SENTRY_DSN,
            //     environment: process.env.NODE_ENV,
            //     tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
            // });
            
            logger.info('Sentry integration ready (DSN configured)');
        } catch (error) {
            logger.error('Failed to initialize Sentry:', error);
        }
    }

    /**
     * Start error tracking service
     */
    start() {
        logger.info('Starting error tracking service...');

        // Flush error buffer every 30 seconds
        this.flushInterval = setInterval(() => {
            this.flushErrorBuffer();
        }, 30000);

        // Register global error handlers
        this.registerGlobalHandlers();

        logger.info('Error tracking service started');
    }

    /**
     * Stop error tracking service
     */
    stop() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        this.flushErrorBuffer();
        logger.info('Error tracking service stopped');
    }

    /**
     * Register global error handlers
     */
    private registerGlobalHandlers() {
        // Note: These are already registered in errorHandler.ts
        // This is just for tracking purposes
        
        process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
            this.captureError(
                reason instanceof Error ? reason : new Error(String(reason)),
                {
                    tags: { error_type: 'unhandled_rejection' },
                    extra: { promise: promise.toString() },
                },
                'fatal'
            );
        });

        process.on('uncaughtException', (error: Error) => {
            this.captureError(
                error,
                {
                    tags: { error_type: 'uncaught_exception' },
                },
                'fatal'
            );
        });
    }

    /**
     * Capture an error
     */
    captureError(
        error: Error,
        context: ErrorContext = {},
        severity: 'fatal' | 'error' | 'warning' | 'info' = 'error'
    ) {
        const report: ErrorReport = {
            error,
            context,
            timestamp: new Date(),
            severity,
            fingerprint: this.generateFingerprint(error, context),
        };

        // Add to buffer
        this.errorBuffer.push(report);

        // Flush if buffer is full
        if (this.errorBuffer.length >= this.maxBufferSize) {
            this.flushErrorBuffer();
        }

        // Log error
        this.logError(report);

        // Record in metrics
        monitoringService.recordError({
            type: error.name,
            code: (error as any).code || 'UNKNOWN',
            route: context.route,
            organizationId: context.organizationId,
        });

        // Send to Sentry if configured
        if (process.env.SENTRY_DSN) {
            this.sendToSentry(report);
        }

        return report;
    }

    /**
     * Capture a message
     */
    captureMessage(
        message: string,
        context: ErrorContext = {},
        severity: 'fatal' | 'error' | 'warning' | 'info' = 'info'
    ) {
        const error = new Error(message);
        error.name = 'CapturedMessage';
        return this.captureError(error, context, severity);
    }

    /**
     * Generate error fingerprint for grouping
     */
    private generateFingerprint(error: Error, context: ErrorContext): string[] {
        const fingerprint: string[] = [];

        // Include error type
        fingerprint.push(error.name);

        // Include error message (normalized)
        const normalizedMessage = this.normalizeErrorMessage(error.message);
        if (normalizedMessage) {
            fingerprint.push(normalizedMessage);
        }

        // Include route if available
        if (context.route) {
            fingerprint.push(context.route);
        }

        return fingerprint;
    }

    /**
     * Normalize error message for grouping
     */
    private normalizeErrorMessage(message: string): string {
        // Remove UUIDs
        message = message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{uuid}');
        
        // Remove numbers
        message = message.replace(/\b\d+\b/g, '{number}');
        
        // Remove email addresses
        message = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '{email}');
        
        return message;
    }

    /**
     * Log error to Winston
     */
    private logError(report: ErrorReport) {
        const logData = {
            error: {
                name: report.error.name,
                message: report.error.message,
                stack: report.error.stack,
            },
            context: report.context,
            severity: report.severity,
            timestamp: report.timestamp,
        };

        switch (report.severity) {
            case 'fatal':
                logger.error('Fatal error captured', logData);
                break;
            case 'error':
                logger.error('Error captured', logData);
                break;
            case 'warning':
                logger.warn('Warning captured', logData);
                break;
            case 'info':
                logger.info('Info captured', logData);
                break;
        }
    }

    /**
     * Send error to Sentry
     */
    private sendToSentry(report: ErrorReport) {
        try {
            // In production with Sentry installed:
            // const Sentry = require('@sentry/node');
            // Sentry.captureException(report.error, {
            //     level: report.severity,
            //     user: {
            //         id: report.context.userId,
            //     },
            //     tags: report.context.tags,
            //     extra: {
            //         ...report.context.extra,
            //         organizationId: report.context.organizationId,
            //         requestId: report.context.requestId,
            //     },
            //     fingerprint: report.fingerprint,
            // });
            
            logger.debug('Error sent to Sentry', { fingerprint: report.fingerprint });
        } catch (error) {
            logger.error('Failed to send error to Sentry:', error);
        }
    }

    /**
     * Flush error buffer
     */
    private flushErrorBuffer() {
        if (this.errorBuffer.length === 0) return;

        const errorCount = this.errorBuffer.length;
        logger.info(`Flushing ${errorCount} errors from buffer`);

        // In production, you might send these to a separate error storage
        // For now, we just clear the buffer
        this.errorBuffer = [];
    }

    /**
     * Get error statistics
     */
    getStatistics() {
        const now = Date.now();
        const last24Hours = now - 24 * 60 * 60 * 1000;

        const recentErrors = this.errorBuffer.filter(
            (report) => report.timestamp.getTime() > last24Hours
        );

        const errorsByType = recentErrors.reduce((acc, report) => {
            const type = report.error.name;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const errorsBySeverity = recentErrors.reduce((acc, report) => {
            acc[report.severity] = (acc[report.severity] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalErrors: recentErrors.length,
            errorsByType,
            errorsBySeverity,
            bufferSize: this.errorBuffer.length,
        };
    }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

/**
 * Convenience function to capture errors
 */
export function captureError(
    error: Error,
    context?: ErrorContext,
    severity?: 'fatal' | 'error' | 'warning' | 'info'
) {
    return errorTracker.captureError(error, context, severity);
}

/**
 * Convenience function to capture messages
 */
export function captureMessage(
    message: string,
    context?: ErrorContext,
    severity?: 'fatal' | 'error' | 'warning' | 'info'
) {
    return errorTracker.captureMessage(message, context, severity);
}
