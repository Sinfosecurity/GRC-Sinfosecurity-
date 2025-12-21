"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gracefulShutdown = exports.GracefulShutdown = exports.healthChecker = exports.HealthChecker = void 0;
exports.registerDefaultHealthChecks = registerDefaultHealthChecks;
exports.healthCheckHandler = healthCheckHandler;
exports.readinessCheckHandler = readinessCheckHandler;
exports.livenessCheckHandler = livenessCheckHandler;
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../config/logger"));
const resilience_1 = require("./resilience");
class HealthChecker {
    constructor() {
        this.checks = new Map();
    }
    /**
     * Register a health check
     */
    registerCheck(name, check) {
        this.checks.set(name, check);
    }
    /**
     * Execute all health checks
     */
    async executeChecks() {
        const results = {};
        let overallStatus = 'healthy';
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
                }
                else if (result.status === 'degraded' && overallStatus === 'healthy') {
                    overallStatus = 'degraded';
                }
            }
            catch (error) {
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
    timeout(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), ms);
        });
    }
}
exports.HealthChecker = HealthChecker;
// Create health checker instance
exports.healthChecker = new HealthChecker();
/**
 * Register default health checks
 */
function registerDefaultHealthChecks() {
    // PostgreSQL check
    exports.healthChecker.registerCheck('postgres', async () => {
        try {
            await database_1.prisma.$queryRaw `SELECT 1`;
            return { status: 'up', message: 'PostgreSQL connection healthy' };
        }
        catch (error) {
            return {
                status: 'down',
                message: 'PostgreSQL connection failed',
                details: { error: error.message },
            };
        }
    });
    // Redis check
    exports.healthChecker.registerCheck('redis', async () => {
        try {
            if (!database_1.redisClient.isOpen) {
                return { status: 'down', message: 'Redis not connected' };
            }
            await database_1.redisClient.ping();
            return { status: 'up', message: 'Redis connection healthy' };
        }
        catch (error) {
            return {
                status: 'down',
                message: 'Redis connection failed',
                details: { error: error.message },
            };
        }
    });
    // MongoDB check
    exports.healthChecker.registerCheck('mongodb', async () => {
        try {
            if (database_1.mongoose.connection.readyState !== 1) {
                return { status: 'down', message: 'MongoDB not connected' };
            }
            if (database_1.mongoose.connection.db) {
                await database_1.mongoose.connection.db.admin().ping();
            }
            else {
                return { status: 'down', message: 'MongoDB database not available' };
            }
            return { status: 'up', message: 'MongoDB connection healthy' };
        }
        catch (error) {
            return {
                status: 'down',
                message: 'MongoDB connection failed',
                details: { error: error.message },
            };
        }
    });
    // Memory check
    exports.healthChecker.registerCheck('memory', async () => {
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
    exports.healthChecker.registerCheck('circuitBreakers', async () => {
        const stats = resilience_1.circuitBreakerManager.getAllStats();
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
    logger_1.default.info('Default health checks registered');
}
/**
 * Health check endpoint handler
 */
async function healthCheckHandler(req, res) {
    const result = await exports.healthChecker.executeChecks();
    // Set appropriate status code
    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(result);
}
/**
 * Readiness check (can accept traffic)
 */
async function readinessCheckHandler(req, res) {
    try {
        // Check critical dependencies
        await database_1.prisma.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
        });
    }
}
/**
 * Liveness check (process is alive)
 */
async function livenessCheckHandler(req, res) {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
}
/**
 * Graceful Shutdown Manager
 */
class GracefulShutdown {
    constructor() {
        this.isShuttingDown = false;
        this.connections = new Set();
        this.cleanupHandlers = [];
    }
    /**
     * Register cleanup handler
     */
    onShutdown(handler) {
        this.cleanupHandlers.push(handler);
    }
    /**
     * Track connection
     */
    trackConnection(connection) {
        this.connections.add(connection);
    }
    /**
     * Untrack connection
     */
    untrackConnection(connection) {
        this.connections.delete(connection);
    }
    /**
     * Check if shutting down
     */
    isShutdown() {
        return this.isShuttingDown;
    }
    /**
     * Initiate graceful shutdown
     */
    async shutdown(signal) {
        if (this.isShuttingDown) {
            logger_1.default.warn('Shutdown already in progress');
            return;
        }
        this.isShuttingDown = true;
        logger_1.default.info(`Graceful shutdown initiated (signal: ${signal})`);
        // Close active connections
        logger_1.default.info(`Closing ${this.connections.size} active connections`);
        this.connections.forEach((conn) => {
            try {
                if (conn.destroy)
                    conn.destroy();
                else if (conn.close)
                    conn.close();
            }
            catch (error) {
                logger_1.default.error('Error closing connection:', error);
            }
        });
        // Run cleanup handlers
        logger_1.default.info(`Running ${this.cleanupHandlers.length} cleanup handlers`);
        for (const handler of this.cleanupHandlers) {
            try {
                await Promise.race([
                    handler(),
                    this.timeout(10000), // 10 second timeout per handler
                ]);
            }
            catch (error) {
                logger_1.default.error('Cleanup handler failed:', error);
            }
        }
        // Close database connections
        try {
            await database_1.prisma.$disconnect();
            logger_1.default.info('PostgreSQL disconnected');
        }
        catch (error) {
            logger_1.default.error('Error disconnecting PostgreSQL:', error);
        }
        try {
            await database_1.mongoose.disconnect();
            logger_1.default.info('MongoDB disconnected');
        }
        catch (error) {
            logger_1.default.error('Error disconnecting MongoDB:', error);
        }
        try {
            await database_1.redisClient.quit();
            logger_1.default.info('Redis disconnected');
        }
        catch (error) {
            logger_1.default.error('Error disconnecting Redis:', error);
        }
        logger_1.default.info('Graceful shutdown completed');
        process.exit(0);
    }
    /**
     * Setup signal handlers
     */
    setupSignalHandlers() {
        // Handle SIGTERM (Docker, Kubernetes)
        process.on('SIGTERM', () => {
            logger_1.default.info('SIGTERM received');
            this.shutdown('SIGTERM');
        });
        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            logger_1.default.info('SIGINT received');
            this.shutdown('SIGINT');
        });
        // Handle SIGUSR2 (nodemon)
        process.on('SIGUSR2', () => {
            logger_1.default.info('SIGUSR2 received');
            this.shutdown('SIGUSR2');
        });
    }
    /**
     * Timeout helper
     */
    timeout(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), ms);
        });
    }
}
exports.GracefulShutdown = GracefulShutdown;
// Export singleton
exports.gracefulShutdown = new GracefulShutdown();
//# sourceMappingURL=healthCheck.js.map