import { Request, Response } from 'express';
import { prisma, redisClient, mongoose } from '../config/database';
import logger from '../config/logger';
import { circuitBreakerManager } from './resilience';

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

export class HealthChecker {
    private checks: Map<
        string,
        () => Promise<{ status: 'up' | 'down' | 'degraded'; message?: string; details?: any }>
    > = new Map();

    /**
     * Register a health check
     */
    registerCheck(
        name: string,
        check: () => Promise<{ status: 'up' | 'down' | 'degraded'; message?: string; details?: any }>
    ): void {
        this.checks.set(name, check);
    }

    /**
     * Execute all health checks
     */
    async executeChecks(): Promise<HealthCheckResult> {
        const results: HealthCheckResult['checks'] = {};
        let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

        // Execute all checks in parallel
        const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
            const startTime = Date.now();
            try {
                const result = await Promise.race([
                    checkFn(),
                    this.timeout(5000), // 5 second timeout
                ]);

                const responseTime = Date.now() - startTime;

                results[name] = {
                    ...result,
                    responseTime,
                };

                // Update overall status
                if (result.status === 'down') {
                    overallStatus = 'unhealthy';
                } else if (result.status === 'degraded' && overallStatus === 'healthy') {
                    overallStatus = 'degraded';
                }
            } catch (error: any) {
                results[name] = {
                    status: 'down',
                    message: error.message || 'Check timeout or failed',
                    responseTime: Date.now() - startTime,
                };
                overallStatus = 'unhealthy';
            }
        });

        await Promise.all(checkPromises);

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            checks: results,
        };
    }

    /**
     * Timeout helper
     */
    private timeout(ms: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), ms);
        });
    }
}

// Create health checker instance
export const healthChecker = new HealthChecker();

/**
 * Register default health checks
 */
export function registerDefaultHealthChecks() {
    // PostgreSQL check
    healthChecker.registerCheck('postgres', async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return { status: 'up', message: 'PostgreSQL connection healthy' };
        } catch (error: any) {
            return {
                status: 'down',
                message: 'PostgreSQL connection failed',
                details: { error: error.message },
            };
        }
    });

    // Redis check
    healthChecker.registerCheck('redis', async () => {
        try {
            if (!redisClient.isOpen) {
                return { status: 'down', message: 'Redis not connected' };
            }
            await redisClient.ping();
            return { status: 'up', message: 'Redis connection healthy' };
        } catch (error: any) {
            return {
                status: 'down',
                message: 'Redis connection failed',
                details: { error: error.message },
            };
        }
    });

    // MongoDB check
    healthChecker.registerCheck('mongodb', async () => {
        try {
            if (mongoose.connection.readyState !== 1) {
                return { status: 'down', message: 'MongoDB not connected' };
            }
            if (mongoose.connection.db) {
                await mongoose.connection.db.admin().ping();
            } else {
                return { status: 'down', message: 'MongoDB database not available' };
            }
            return { status: 'up', message: 'MongoDB connection healthy' };
        } catch (error: any) {
            return {
                status: 'down',
                message: 'MongoDB connection failed',
                details: { error: error.message },
            };
        }
    });

    // Memory check
    healthChecker.registerCheck('memory', async () => {
        const used = process.memoryUsage();
        const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
        const usage = (heapUsedMB / heapTotalMB) * 100;

        if (usage > 90) {
            return {
                status: 'degraded',
                message: 'High memory usage',
                details: { heapUsedMB, heapTotalMB, usagePercent: usage.toFixed(2) },
            };
        }

        return {
            status: 'up',
            message: 'Memory usage normal',
            details: { heapUsedMB, heapTotalMB, usagePercent: usage.toFixed(2) },
        };
    });

    // Circuit breaker check
    healthChecker.registerCheck('circuitBreakers', async () => {
        const stats = circuitBreakerManager.getAllStats();
        const openBreakers = stats.filter((s) => s.state === 'OPEN');

        if (openBreakers.length > 0) {
            return {
                status: 'degraded',
                message: `${openBreakers.length} circuit breaker(s) open`,
                details: { openBreakers: openBreakers.map((b) => b.name) },
            };
        }

        return {
            status: 'up',
            message: 'All circuit breakers operational',
            details: { totalBreakers: stats.length },
        };
    });

    logger.info('Default health checks registered');
}

/**
 * Health check endpoint handler
 */
export async function healthCheckHandler(req: Request, res: Response) {
    const result = await healthChecker.executeChecks();

    // Set appropriate status code
    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(result);
}

/**
 * Readiness check (can accept traffic)
 */
export async function readinessCheckHandler(req: Request, res: Response) {
    try {
        // Check critical dependencies
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Liveness check (process is alive)
 */
export async function livenessCheckHandler(req: Request, res: Response) {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
}

/**
 * Graceful Shutdown Manager
 */
export class GracefulShutdown {
    private isShuttingDown = false;
    private connections: Set<any> = new Set();
    private cleanupHandlers: Array<() => Promise<void>> = [];

    /**
     * Register cleanup handler
     */
    onShutdown(handler: () => Promise<void>): void {
        this.cleanupHandlers.push(handler);
    }

    /**
     * Track connection
     */
    trackConnection(connection: any): void {
        this.connections.add(connection);
    }

    /**
     * Untrack connection
     */
    untrackConnection(connection: any): void {
        this.connections.delete(connection);
    }

    /**
     * Check if shutting down
     */
    isShutdown(): boolean {
        return this.isShuttingDown;
    }

    /**
     * Initiate graceful shutdown
     */
    async shutdown(signal: string): Promise<void> {
        if (this.isShuttingDown) {
            logger.warn('Shutdown already in progress');
            return;
        }

        this.isShuttingDown = true;
        logger.info(`Graceful shutdown initiated (signal: ${signal})`);

        // Close active connections
        logger.info(`Closing ${this.connections.size} active connections`);
        this.connections.forEach((conn) => {
            try {
                if (conn.destroy) conn.destroy();
                else if (conn.close) conn.close();
            } catch (error) {
                logger.error('Error closing connection:', error);
            }
        });

        // Run cleanup handlers
        logger.info(`Running ${this.cleanupHandlers.length} cleanup handlers`);
        for (const handler of this.cleanupHandlers) {
            try {
                await Promise.race([
                    handler(),
                    this.timeout(10000), // 10 second timeout per handler
                ]);
            } catch (error: any) {
                logger.error('Cleanup handler failed:', error);
            }
        }

        // Close database connections
        try {
            await prisma.$disconnect();
            logger.info('PostgreSQL disconnected');
        } catch (error) {
            logger.error('Error disconnecting PostgreSQL:', error);
        }

        try {
            await mongoose.disconnect();
            logger.info('MongoDB disconnected');
        } catch (error) {
            logger.error('Error disconnecting MongoDB:', error);
        }

        try {
            await redisClient.quit();
            logger.info('Redis disconnected');
        } catch (error) {
            logger.error('Error disconnecting Redis:', error);
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
    }

    /**
     * Setup signal handlers
     */
    setupSignalHandlers(): void {
        // Handle SIGTERM (Docker, Kubernetes)
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received');
            this.shutdown('SIGTERM');
        });

        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            logger.info('SIGINT received');
            this.shutdown('SIGINT');
        });

        // Handle SIGUSR2 (nodemon)
        process.on('SIGUSR2', () => {
            logger.info('SIGUSR2 received');
            this.shutdown('SIGUSR2');
        });
    }

    /**
     * Timeout helper
     */
    private timeout(ms: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), ms);
        });
    }
}

// Export singleton
export const gracefulShutdown = new GracefulShutdown();
