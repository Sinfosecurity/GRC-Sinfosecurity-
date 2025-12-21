import { Request, Response, NextFunction } from 'express';
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
export declare class PerformanceMonitor {
    private traces;
    private maxTraces;
    /**
     * Start tracing a request
     */
    startTrace(id: string, metadata?: {
        route?: string;
        method?: string;
    }): void;
    /**
     * End tracing a request
     */
    endTrace(id: string, statusCode?: number): PerformanceMetrics | null;
    /**
     * Get active traces count
     */
    getActiveTracesCount(): number;
    /**
     * Clear all traces
     */
    clearTraces(): void;
}
export declare const performanceMonitor: PerformanceMonitor;
/**
 * Performance monitoring middleware
 */
export declare function performanceMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Database query performance monitor
 */
export declare class DatabasePerformanceMonitor {
    private slowQueryThreshold;
    /**
     * Wrap Prisma client to monitor queries
     */
    monitorPrisma(prisma: any): void;
    /**
     * Set slow query threshold
     */
    setSlowQueryThreshold(ms: number): void;
}
export declare const databasePerformanceMonitor: DatabasePerformanceMonitor;
/**
 * Cache performance monitor
 */
export declare class CachePerformanceMonitor {
    /**
     * Wrap cache operations to monitor performance
     */
    wrapCacheOperation<T>(operation: 'get' | 'set' | 'delete', key: string, fn: () => Promise<T>): Promise<T>;
    /**
     * Calculate cache hit rate
     */
    getCacheHitRate(): Promise<number>;
}
export declare const cachePerformanceMonitor: CachePerformanceMonitor;
/**
 * Performance report generator
 */
export declare class PerformanceReporter {
    /**
     * Generate performance report
     */
    generateReport(): Promise<any>;
    private extractHttpMetrics;
    private extractDatabaseMetrics;
    private extractCacheMetrics;
    private extractMemoryMetrics;
    private extractErrorMetrics;
    private calculateAverage;
}
export declare const performanceReporter: PerformanceReporter;
//# sourceMappingURL=performanceMonitoring.d.ts.map