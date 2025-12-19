import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
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

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { standardTimeout } from './middleware/timeout';
import { requestId, requestLogger, performanceMonitor } from './middleware/logging';

// Import config
import { connectDatabase, prisma, mongoose, redisClient } from './config/database';
import logger from './config/logger';

const app: Application = express();
const httpServer = createServer(app);

// Check if running in dev mode
const DEV_MODE = process.env.DEV_MODE === 'true';

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));

// Request tracking and logging
app.use(requestId());
app.use(performanceMonitor());
app.use(requestLogger({ logBody: false, logResponse: false }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

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
app.get('/metrics', metricsEndpoint);

// Health check with dependency checks
app.get('/health', async (req: Request, res: Response) => {
    const health: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        devMode: DEV_MODE,
        version: process.env.npm_package_version || '1.0.0',
        checks: {},
    };

    if (!DEV_MODE) {
        try {
            // Check PostgreSQL
            await prisma.$queryRaw`SELECT 1`;
            health.checks.database = { status: 'healthy', type: 'postgresql' };
        } catch (error: any) {
            health.checks.database = { status: 'unhealthy', error: error.message, type: 'postgresql' };
            health.status = 'degraded';
        }

        try {
            // Check MongoDB
            await mongoose.connection.db?.admin().ping();
            health.checks.mongodb = { status: 'healthy' };
        } catch (error: any) {
            health.checks.mongodb = { status: 'unhealthy', error: error.message };
            health.status = 'degraded';
        }

        try {
            // Check Redis
            await redisClient.ping();
            health.checks.redis = { status: 'healthy' };
        } catch (error: any) {
            health.checks.redis = { status: 'unhealthy', error: error.message };
            health.status = 'degraded';
        }
    } else {
        health.checks.note = 'Running in DEV_MODE - database checks skipped';
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    health.memory = {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});

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
            
            // Initialize cache service
            const cacheService = new CacheService(redisClient);
            logger.info('✅ Cache service initialized');
            
            // Schedule recurring background jobs
            await scheduleRecurringJobs();
            logger.info('✅ Background jobs scheduled');
        } else {
            logger.warn('⚠️  Running in DEV_MODE - databases disabled, using mock data');
        }

        httpServer.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
            logger.info(`🔧 Dev Mode: ${DEV_MODE ? 'ENABLED' : 'DISABLED'}`);
            logger.info(`🔗 API URL: http://localhost:${PORT}${API_PREFIX}`);
            logger.info(`💚 Health check: http://localhost:${PORT}/health`);
            logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
            logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        if (!DEV_MODE) {
            logger.error('💡 Tip: Set DEV_MODE=true in .env to run without databases');
        }
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    
    // Close job queues
    if (!DEV_MODE) {
        await shutdownQueues();
    }
    
    httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

// Only start server if not imported (e.g., for testing)
if (require.main === module) {
    startServer();
}

export { app };
export default app;
