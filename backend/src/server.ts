import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';

// Load environment variables
dotenv.config();

// Import Swagger and metrics
import { swaggerSpec } from './config/swagger';
import { metricsMiddleware, metricsEndpoint } from './config/metrics';
import { scheduleRecurringJobs, shutdownQueues } from './config/queues';
import { CacheService } from './services/cacheService';

// Import routes
import authRoutes from './routes/auth.routes';
import authEnhancedRoutes from './routes/auth.enhanced.routes';
import riskRoutes from './routes/risk.routes';
import complianceRoutes from './routes/compliance.routes';
import controlsRoutes from './routes/controls.routes';
import incidentRoutes from './routes/incident.routes';
import policyRoutes from './routes/policy.routes';
import documentRoutes from './routes/document.routes';
import auditRoutes from './routes/audit.routes';
import userRoutes from './routes/user.routes';
import notificationRoutes from './routes/notification.routes';
import taskRoutes from './routes/task.routes';
import workflowRoutes from './routes/workflow.routes';
import reportRoutes from './routes/report.routes';
import mobileRoutes from './routes/mobile.routes';
import vendorRoutes from './routes/vendor.routes';
import approvalRoutes from './routes/approval.routes';
import concentrationRoutes from './routes/concentration.routes';
import riskHistoryRoutes from './routes/risk-history.routes';
import riskAppetiteRoutes from './routes/risk-appetite.routes';
import monitoringTestRoutes from './routes/monitoring.test.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { standardTimeout } from './middleware/timeout';
import { requestId, requestLogger, performanceMonitor } from './middleware/logging';
import { sanitizeInput } from './middleware/sanitization';

// Import config
import { connectDatabase, prisma, mongoose, redisClient } from './config/database';
import logger from './config/logger';
import {
    registerDefaultHealthChecks,
    healthCheckHandler,
    readinessCheckHandler,
    livenessCheckHandler,
    gracefulShutdown,
} from './utils/healthCheck';
import { monitoringService } from './utils/monitoring';
import { errorTracker } from './utils/errorTracking';
import { performanceMiddleware, databasePerformanceMonitor } from './utils/performanceMonitoring';
import { alertManager } from './utils/alerting';
import { businessMetricsCollector } from './utils/businessMetrics';

const app: Application = express();
const httpServer = createServer(app);

// Check if running in dev mode
const DEV_MODE = process.env.DEV_MODE === 'true';

// CRITICAL: Basic health check BEFORE any middleware for Railway
// This must respond immediately for health checks during startup
app.get('/health/basic', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'deny'
    },
    noSniff: true,
    xssFilter: true
}));

// Compression middleware - compress all responses
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6, // Compression level (0-9)
    threshold: 1024 // Only compress responses > 1KB
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));

// Request tracking and logging
app.use(requestId());
app.use(performanceMiddleware());
app.use(requestLogger({ logBody: false, logResponse: false }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Input sanitization to prevent XSS and injection attacks
app.use(sanitizeInput);

// Request timeout (30s default)
app.use(standardTimeout);

// Metrics collection
app.use(metricsMiddleware);

// Rate limiting
app.use('/api/', rateLimiter);

// Static files (for uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Documentation (Swagger)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'GRC Platform API Docs',
}));

// Metrics endpoint for Prometheus
app.get('/metrics', async (req: Request, res: Response) => {
    try {
        res.set('Content-Type', 'text/plain');
        const metrics = await monitoringService.getMetrics();
        res.send(metrics);
    } catch (error) {
        logger.error('Error getting metrics:', error);
        res.status(500).send('Error retrieving metrics');
    }
});

// Metrics JSON endpoint
app.get('/metrics/json', async (req: Request, res: Response) => {
    try {
        const metrics = await monitoringService.getMetricsJSON();
        res.json(metrics);
    } catch (error) {
        logger.error('Error getting metrics JSON:', error);
        res.status(500).json({ error: 'Error retrieving metrics' });
    }
});

// Health check endpoints
app.get('/health', healthCheckHandler); // Comprehensive health check with all dependencies
app.get('/health/ready', readinessCheckHandler); // Kubernetes readiness probe
app.get('/health/live', livenessCheckHandler); // Kubernetes liveness probe

// API Routes
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/auth`, authEnhancedRoutes); // SSO and MFA routes
app.use(`${API_PREFIX}/risks`, riskRoutes);
app.use(`${API_PREFIX}/compliance`, complianceRoutes);
app.use(`${API_PREFIX}/controls`, controlsRoutes);
app.use(`${API_PREFIX}/incidents`, incidentRoutes);
app.use(`${API_PREFIX}/policies`, policyRoutes);
app.use(`${API_PREFIX}/documents`, documentRoutes);
app.use(`${API_PREFIX}/audit`, auditRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/tasks`, taskRoutes);
app.use(`${API_PREFIX}/workflows`, workflowRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/mobile`, mobileRoutes);
app.use(`${API_PREFIX}/vendors`, vendorRoutes);
app.use(`${API_PREFIX}/vendors/approvals`, approvalRoutes);
app.use(`${API_PREFIX}/vendors/concentration-risk`, concentrationRoutes);
app.use(`${API_PREFIX}/vendors/risk-history`, riskHistoryRoutes);
app.use(`${API_PREFIX}/risk-appetite`, riskAppetiteRoutes);
app.use(`${API_PREFIX}/monitoring`, monitoringTestRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
    });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = parseInt(process.env.PORT || '4000', 10);

async function startServer() {
    try {
        // Connect to databases only if not in DEV_MODE
        if (!DEV_MODE) {
            logger.info('Connecting to databases...');
            await connectDatabase();
            logger.info('✅ Database connections established');
            
            // Initialize cache service only if Redis is available
            if (process.env.REDIS_URL && redisClient.isReady) {
                const cacheService = new CacheService(redisClient);
                logger.info('✅ Cache service initialized');
            } else {
                logger.warn('⚠️  Redis not available, cache service disabled');
            }
            
            // Schedule recurring background jobs
            try {
                await scheduleRecurringJobs();
                logger.info('✅ Background jobs scheduled');
            } catch (jobError) {
                logger.warn('⚠️  Failed to schedule background jobs:', jobError);
            }
            
            // Register health checks
            registerDefaultHealthChecks();
            logger.info('✅ Health checks registered');
            
            // Start monitoring services
            monitoringService.start();
            logger.info('✅ Monitoring service started');
            
            // Start error tracking
            errorTracker.start();
            logger.info('✅ Error tracking started');
            
            // Start alert manager
            alertManager.start();
            logger.info('✅ Alert manager started');
            
            // Start business metrics collection
            businessMetricsCollector.start();
            logger.info('✅ Business metrics collector started');
            
            // Enable database performance monitoring
            databasePerformanceMonitor.monitorPrisma(prisma);
            logger.info('✅ Database performance monitoring enabled');
            
            // Setup graceful shutdown handlers
            gracefulShutdown.setupSignalHandlers();
            
            // Register cleanup handlers
            gracefulShutdown.onShutdown(async () => {
                logger.info('Closing HTTP server...');
                await new Promise<void>((resolve) => {
                    httpServer.close(() => resolve());
                });
                logger.info('HTTP server closed');
            });
            
            gracefulShutdown.onShutdown(async () => {
                logger.info('Shutting down job queues...');
                await shutdownQueues();
                logger.info('Job queues shutdown complete');
            });
            
            gracefulShutdown.onShutdown(async () => {
                logger.info('Stopping monitoring services...');
                monitoringService.stop();
                errorTracker.stop();
                alertManager.stop();
                businessMetricsCollector.stop();
                logger.info('Monitoring services stopped');
            });
            
            logger.info('✅ Graceful shutdown handlers configured');
        } else {
            logger.warn('⚠️  Running in DEV_MODE - databases disabled, using mock data');
        }

        httpServer.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
            logger.info(`🔧 Dev Mode: ${DEV_MODE ? 'ENABLED' : 'DISABLED'}`);
            logger.info(`🔗 API URL: http://0.0.0.0:${PORT}${API_PREFIX}`);
            logger.info(`💚 Health check: http://0.0.0.0:${PORT}/health/basic`);
            logger.info(`📚 API Docs: http://0.0.0.0:${PORT}/api-docs`);
            logger.info(`📊 Metrics: http://0.0.0.0:${PORT}/metrics`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        if (!DEV_MODE) {
            logger.error('💡 Tip: Set DEV_MODE=true in .env to run without databases');
        }
        process.exit(1);
    }
}

// Graceful shutdown is now handled by the GracefulShutdown utility
// No need for manual SIGTERM handler

// Only start server if not imported (e.g., for testing)
if (require.main === module) {
    startServer();
}

export { app };
export default app;
