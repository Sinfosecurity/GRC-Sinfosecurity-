import { Request, Response, NextFunction } from 'express';
import { monitoringService } from './monitoring';
import logger from '../config/logger';

/**
 * Performance Monitoring Middleware and Utilities
 */

export interface PerformanceMetrics {
    startTime: number;
    endTime?: number;
    duration?: number;
    cpuUsage?: NodeJS.CpuUsage;
    memoryUsage?: NodeJS.MemoryUsage;
    route?: string;
    method?: string;
    statusCode?: number;
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
    private traces: Map<string, PerformanceMetrics> = new Map();
    private maxTraces = 1000;

    /**
     * Start tracing a request
     */
    startTrace(id: string, metadata?: { route?: string; method?: string }): void {
        const trace: PerformanceMetrics = {
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
    endTrace(id: string, statusCode?: number): PerformanceMetrics | null {
        const trace = this.traces.get(id);
        if (!trace) {
            return null;
        }

        const endTime = Date.now();
        const duration = endTime - trace.startTime;
        const cpuUsage = process.cpuUsage(trace.cpuUsage);
        const memoryUsage = process.memoryUsage();

        const finalTrace: PerformanceMetrics = {
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
            logger.warn('Slow request detected', {
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
    getActiveTracesCount(): number {
        return this.traces.size;
    }

    /**
     * Clear all traces
     */
    clearTraces(): void {
        this.traces.clear();
    }
}

// Export singleton
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance monitoring middleware
 */
export function performanceMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        const traceId = (req as any).id || `${Date.now()}-${Math.random()}`;
        const startTime = Date.now();

        // Start performance trace
        performanceMonitor.startTrace(traceId, {
            route: req.route?.path || req.path,
            method: req.method,
        });

        // Record request size
        const requestSize = req.get('content-length');
        if (requestSize) {
            const size = parseInt(requestSize, 10);
            if (!isNaN(size)) {
                req.body._contentLength = size;
            }
        }

        // Capture response
        const originalSend = res.send;
        let responseSize = 0;

        res.send = function (data: any): Response {
            responseSize = Buffer.byteLength(JSON.stringify(data));
            res.send = originalSend;
            return originalSend.call(this, data);
        };

        // Record metrics on response finish
        res.on('finish', () => {
            const duration = (Date.now() - startTime) / 1000; // Convert to seconds

            // End performance trace
            performanceMonitor.endTrace(traceId, res.statusCode);

            // Record HTTP metrics
            monitoringService.recordHttpRequest({
                method: req.method,
                route: req.route?.path || req.path,
                statusCode: res.statusCode,
                duration,
                requestSize: req.body._contentLength,
                responseSize,
                organizationId: (req as any).user?.organizationId,
            });

            // Log performance data
            if (duration > 1) {
                logger.warn('Slow endpoint', {
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
export class DatabasePerformanceMonitor {
    private slowQueryThreshold = 100; // ms

    /**
     * Wrap Prisma client to monitor queries
     */
    monitorPrisma(prisma: any) {
        // This would be implemented using Prisma middleware
        prisma.$use(async (params: any, next: any) => {
            const startTime = Date.now();

            try {
                const result = await next(params);
                const duration = (Date.now() - startTime) / 1000;

                // Record metrics
                monitoringService.recordDatabaseQuery({
                    operation: params.action,
                    model: params.model || 'unknown',
                    duration,
                    success: true,
                });

                // Log slow queries
                if (duration * 1000 > this.slowQueryThreshold) {
                    logger.warn('Slow database query detected', {
                        model: params.model,
                        action: params.action,
                        duration: `${(duration * 1000).toFixed(0)}ms`,
                        args: params.args,
                    });
                }

                return result;
            } catch (error: any) {
                const duration = (Date.now() - startTime) / 1000;

                // Record error metrics
                monitoringService.recordDatabaseQuery({
                    operation: params.action,
                    model: params.model || 'unknown',
                    duration,
                    success: false,
                    errorCode: error.code,
                });

                throw error;
            }
        });

        logger.info('Prisma performance monitoring enabled');
    }

    /**
     * Set slow query threshold
     */
    setSlowQueryThreshold(ms: number) {
        this.slowQueryThreshold = ms;
        logger.info(`Slow query threshold set to ${ms}ms`);
    }
}

export const databasePerformanceMonitor = new DatabasePerformanceMonitor();

/**
 * Cache performance monitor
 */
export class CachePerformanceMonitor {
    /**
     * Wrap cache operations to monitor performance
     */
    wrapCacheOperation<T>(
        operation: 'get' | 'set' | 'delete',
        key: string,
        fn: () => Promise<T>
    ): Promise<T> {
        const startTime = Date.now();

        return fn()
            .then((result) => {
                const duration = (Date.now() - startTime) / 1000;
                const hit = operation === 'get' && result !== null && result !== undefined;

                monitoringService.recordCacheOperation({
                    operation,
                    hit,
                    duration,
                    key,
                });

                return result;
            })
            .catch((error) => {
                const duration = (Date.now() - startTime) / 1000;

                monitoringService.recordCacheOperation({
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
    async getCacheHitRate(): Promise<number> {
        try {
            const metrics = await monitoringService.getMetricsJSON();
            
            const hitsMetric = metrics.find((m) => m.name === 'grc_cache_hits_total');
            const missesMetric = metrics.find((m) => m.name === 'grc_cache_misses_total');

            if (!hitsMetric || !missesMetric) {
                return 0;
            }

            const hits = hitsMetric.values.reduce((sum: number, v: any) => sum + v.value, 0);
            const misses = missesMetric.values.reduce((sum: number, v: any) => sum + v.value, 0);

            const total = hits + misses;
            if (total === 0) return 0;

            return (hits / total) * 100;
        } catch (error) {
            logger.error('Error calculating cache hit rate:', error);
            return 0;
        }
    }
}

export const cachePerformanceMonitor = new CachePerformanceMonitor();

/**
 * Performance report generator
 */
export class PerformanceReporter {
    /**
     * Generate performance report
     */
    async generateReport(): Promise<any> {
        try {
            const metrics = await monitoringService.getMetricsJSON();

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
        } catch (error) {
            logger.error('Error generating performance report:', error);
            return null;
        }
    }

    private extractHttpMetrics(metrics: any[]): any {
        const requestsMetric = metrics.find((m) => m.name === 'grc_http_requests_total');
        const durationMetric = metrics.find((m) => m.name === 'grc_http_request_duration_seconds');

        return {
            totalRequests: requestsMetric?.values.reduce((sum: number, v: any) => sum + v.value, 0) || 0,
            avgDuration: this.calculateAverage(durationMetric),
        };
    }

    private extractDatabaseMetrics(metrics: any[]): any {
        const queriesMetric = metrics.find((m) => m.name === 'grc_database_queries_total');
        const durationMetric = metrics.find((m) => m.name === 'grc_database_query_duration_seconds');

        return {
            totalQueries: queriesMetric?.values.reduce((sum: number, v: any) => sum + v.value, 0) || 0,
            avgDuration: this.calculateAverage(durationMetric),
        };
    }

    private extractCacheMetrics(metrics: any[]): any {
        const hitsMetric = metrics.find((m) => m.name === 'grc_cache_hits_total');
        const missesMetric = metrics.find((m) => m.name === 'grc_cache_misses_total');

        const hits = hitsMetric?.values.reduce((sum: number, v: any) => sum + v.value, 0) || 0;
        const misses = missesMetric?.values.reduce((sum: number, v: any) => sum + v.value, 0) || 0;
        const total = hits + misses;

        return {
            hits,
            misses,
            hitRate: total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : '0%',
        };
    }

    private extractMemoryMetrics(metrics: any[]): any {
        const heapUsedMetric = metrics.find((m) => m.name === 'grc_heap_used_bytes');
        const memoryPercentMetric = metrics.find((m) => m.name === 'grc_memory_usage_percent');

        return {
            heapUsed: heapUsedMetric?.values[0]?.value || 0,
            usagePercent: memoryPercentMetric?.values[0]?.value || 0,
        };
    }

    private extractErrorMetrics(metrics: any[]): any {
        const errorsMetric = metrics.find((m) => m.name === 'grc_errors_total');

        return {
            totalErrors: errorsMetric?.values.reduce((sum: number, v: any) => sum + v.value, 0) || 0,
        };
    }

    private calculateAverage(metric: any): number {
        if (!metric || !metric.values || metric.values.length === 0) {
            return 0;
        }

        const sum = metric.values.reduce((acc: number, v: any) => acc + (v.value || 0), 0);
        return sum / metric.values.length;
    }
}

export const performanceReporter = new PerformanceReporter();
