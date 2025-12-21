import { Request, Response } from 'express';
/**
 * Comprehensive Health Check System
 */
export interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    checks: {
        [key: string]: {
            status: 'up' | 'down' | 'degraded';
            responseTime?: number;
            message?: string;
            details?: any;
        };
    };
}
export declare class HealthChecker {
    private checks;
    /**
     * Register a health check
     */
    registerCheck(name: string, check: () => Promise<{
        status: 'up' | 'down' | 'degraded';
        message?: string;
        details?: any;
    }>): void;
    /**
     * Execute all health checks
     */
    executeChecks(): Promise<HealthCheckResult>;
    /**
     * Timeout helper
     */
    private timeout;
}
export declare const healthChecker: HealthChecker;
/**
 * Register default health checks
 */
export declare function registerDefaultHealthChecks(): void;
/**
 * Health check endpoint handler
 */
export declare function healthCheckHandler(req: Request, res: Response): Promise<void>;
/**
 * Readiness check (can accept traffic)
 */
export declare function readinessCheckHandler(req: Request, res: Response): Promise<void>;
/**
 * Liveness check (process is alive)
 */
export declare function livenessCheckHandler(req: Request, res: Response): Promise<void>;
/**
 * Graceful Shutdown Manager
 */
export declare class GracefulShutdown {
    private isShuttingDown;
    private connections;
    private cleanupHandlers;
    /**
     * Register cleanup handler
     */
    onShutdown(handler: () => Promise<void>): void;
    /**
     * Track connection
     */
    trackConnection(connection: any): void;
    /**
     * Untrack connection
     */
    untrackConnection(connection: any): void;
    /**
     * Check if shutting down
     */
    isShutdown(): boolean;
    /**
     * Initiate graceful shutdown
     */
    shutdown(signal: string): Promise<void>;
    /**
     * Setup signal handlers
     */
    setupSignalHandlers(): void;
    /**
     * Timeout helper
     */
    private timeout;
}
export declare const gracefulShutdown: GracefulShutdown;
//# sourceMappingURL=healthCheck.d.ts.map