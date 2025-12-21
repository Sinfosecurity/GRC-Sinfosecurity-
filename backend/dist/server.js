"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
// Load environment variables
dotenv_1.default.config();
// Import Swagger and metrics
const swagger_1 = require("./config/swagger");
const metrics_1 = require("./config/metrics");
const queues_1 = require("./config/queues");
const cacheService_1 = require("./services/cacheService");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const auth_enhanced_routes_1 = __importDefault(require("./routes/auth.enhanced.routes"));
const risk_routes_1 = __importDefault(require("./routes/risk.routes"));
const compliance_routes_1 = __importDefault(require("./routes/compliance.routes"));
const controls_routes_1 = __importDefault(require("./routes/controls.routes"));
const incident_routes_1 = __importDefault(require("./routes/incident.routes"));
const policy_routes_1 = __importDefault(require("./routes/policy.routes"));
const document_routes_1 = __importDefault(require("./routes/document.routes"));
const audit_routes_1 = __importDefault(require("./routes/audit.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const workflow_routes_1 = __importDefault(require("./routes/workflow.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const mobile_routes_1 = __importDefault(require("./routes/mobile.routes"));
const vendor_routes_1 = __importDefault(require("./routes/vendor.routes"));
const approval_routes_1 = __importDefault(require("./routes/approval.routes"));
const concentration_routes_1 = __importDefault(require("./routes/concentration.routes"));
const risk_history_routes_1 = __importDefault(require("./routes/risk-history.routes"));
const risk_appetite_routes_1 = __importDefault(require("./routes/risk-appetite.routes"));
const monitoring_test_routes_1 = __importDefault(require("./routes/monitoring.test.routes"));
// Import middleware
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const timeout_1 = require("./middleware/timeout");
const logging_1 = require("./middleware/logging");
const sanitization_1 = require("./middleware/sanitization");
// Import config
const database_1 = require("./config/database");
const logger_1 = __importDefault(require("./config/logger"));
const healthCheck_1 = require("./utils/healthCheck");
const monitoring_1 = require("./utils/monitoring");
const errorTracking_1 = require("./utils/errorTracking");
const performanceMonitoring_1 = require("./utils/performanceMonitoring");
const alerting_1 = require("./utils/alerting");
const businessMetrics_1 = require("./utils/businessMetrics");
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
// Check if running in dev mode
const DEV_MODE = process.env.DEV_MODE === 'true';
// CRITICAL: Basic health check BEFORE any middleware for Railway
// This must respond immediately for health checks during startup
app.get('/health/basic', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Middleware
app.use((0, helmet_1.default)({
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
app.use((0, compression_1.default)({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
    level: 6, // Compression level (0-9)
    threshold: 1024 // Only compress responses > 1KB
}));
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
// Request tracking and logging
app.use((0, logging_1.requestId)());
app.use((0, performanceMonitoring_1.performanceMiddleware)());
app.use((0, logging_1.requestLogger)({ logBody: false, logResponse: false }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)('combined', { stream: { write: (message) => logger_1.default.info(message.trim()) } }));
// Input sanitization to prevent XSS and injection attacks
app.use(sanitization_1.sanitizeInput);
// Request timeout (30s default)
app.use(timeout_1.standardTimeout);
// Metrics collection
app.use(metrics_1.metricsMiddleware);
// Rate limiting
app.use('/api/', rateLimiter_1.rateLimiter);
// Static files (for uploads)
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// API Documentation (Swagger)
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'GRC Platform API Docs',
}));
// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', 'text/plain');
        const metrics = await monitoring_1.monitoringService.getMetrics();
        res.send(metrics);
    }
    catch (error) {
        logger_1.default.error('Error getting metrics:', error);
        res.status(500).send('Error retrieving metrics');
    }
});
// Metrics JSON endpoint
app.get('/metrics/json', async (req, res) => {
    try {
        const metrics = await monitoring_1.monitoringService.getMetricsJSON();
        res.json(metrics);
    }
    catch (error) {
        logger_1.default.error('Error getting metrics JSON:', error);
        res.status(500).json({ error: 'Error retrieving metrics' });
    }
});
// Health check endpoints
app.get('/health', healthCheck_1.healthCheckHandler); // Comprehensive health check with all dependencies
app.get('/health/ready', healthCheck_1.readinessCheckHandler); // Kubernetes readiness probe
app.get('/health/live', healthCheck_1.livenessCheckHandler); // Kubernetes liveness probe
// API Routes
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;
app.use(`${API_PREFIX}/auth`, auth_routes_1.default);
app.use(`${API_PREFIX}/auth`, auth_enhanced_routes_1.default); // SSO and MFA routes
app.use(`${API_PREFIX}/risks`, risk_routes_1.default);
app.use(`${API_PREFIX}/compliance`, compliance_routes_1.default);
app.use(`${API_PREFIX}/controls`, controls_routes_1.default);
app.use(`${API_PREFIX}/incidents`, incident_routes_1.default);
app.use(`${API_PREFIX}/policies`, policy_routes_1.default);
app.use(`${API_PREFIX}/documents`, document_routes_1.default);
app.use(`${API_PREFIX}/audit`, audit_routes_1.default);
app.use(`${API_PREFIX}/users`, user_routes_1.default);
app.use(`${API_PREFIX}/notifications`, notification_routes_1.default);
app.use(`${API_PREFIX}/tasks`, task_routes_1.default);
app.use(`${API_PREFIX}/workflows`, workflow_routes_1.default);
app.use(`${API_PREFIX}/reports`, report_routes_1.default);
app.use(`${API_PREFIX}/mobile`, mobile_routes_1.default);
app.use(`${API_PREFIX}/vendors`, vendor_routes_1.default);
app.use(`${API_PREFIX}/vendors/approvals`, approval_routes_1.default);
app.use(`${API_PREFIX}/vendors/concentration-risk`, concentration_routes_1.default);
app.use(`${API_PREFIX}/vendors/risk-history`, risk_history_routes_1.default);
app.use(`${API_PREFIX}/risk-appetite`, risk_appetite_routes_1.default);
app.use(`${API_PREFIX}/monitoring`, monitoring_test_routes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
    });
});
// Error handler
app.use(errorHandler_1.errorHandler);
// Start server
const PORT = parseInt(process.env.PORT || '4000', 10);
async function startServer() {
    try {
        // Start server FIRST for Railway health checks
        httpServer.listen(PORT, '0.0.0.0', () => {
            logger_1.default.info(`🚀 Server running on port ${PORT}`);
            logger_1.default.info(`📊 Environment: ${process.env.NODE_ENV}`);
            logger_1.default.info(`🔧 Dev Mode: ${DEV_MODE ? 'ENABLED' : 'DISABLED'}`);
            logger_1.default.info(`🔗 API URL: http://0.0.0.0:${PORT}${API_PREFIX}`);
            logger_1.default.info(`💚 Health check: http://0.0.0.0:${PORT}/health/basic`);
            logger_1.default.info(`📚 API Docs: http://0.0.0.0:${PORT}/api-docs`);
            logger_1.default.info(`📊 Metrics: http://0.0.0.0:${PORT}/metrics`);
        });
        // Connect to databases AFTER server is listening
        if (!DEV_MODE) {
            logger_1.default.info('Connecting to databases...');
            await (0, database_1.connectDatabase)();
            logger_1.default.info('✅ Database connections established');
            // Initialize optional services (non-blocking)
            setImmediate(async () => {
                try {
                    // Initialize cache service only if Redis is available
                    if (process.env.REDIS_URL && database_1.redisClient.isReady) {
                        const cacheService = new cacheService_1.CacheService(database_1.redisClient);
                        logger_1.default.info('✅ Cache service initialized');
                    }
                    else {
                        logger_1.default.warn('⚠️  Redis not available, cache service disabled');
                    }
                    // Schedule recurring background jobs
                    try {
                        await (0, queues_1.scheduleRecurringJobs)();
                        logger_1.default.info('✅ Background jobs scheduled');
                    }
                    catch (jobError) {
                        logger_1.default.warn('⚠️  Failed to schedule background jobs:', jobError);
                    }
                    // Register health checks
                    (0, healthCheck_1.registerDefaultHealthChecks)();
                    logger_1.default.info('✅ Health checks registered');
                    // Start monitoring services
                    monitoring_1.monitoringService.start();
                    logger_1.default.info('✅ Monitoring service started');
                    // Start error tracking
                    errorTracking_1.errorTracker.start();
                    logger_1.default.info('✅ Error tracking started');
                    // Start alert manager
                    alerting_1.alertManager.start();
                    logger_1.default.info('✅ Alert manager started');
                    // Start business metrics collection
                    businessMetrics_1.businessMetricsCollector.start();
                    logger_1.default.info('✅ Business metrics collector started');
                    // Enable database performance monitoring
                    performanceMonitoring_1.databasePerformanceMonitor.monitorPrisma(database_1.prisma);
                    logger_1.default.info('✅ Database performance monitoring enabled');
                }
                catch (error) {
                    logger_1.default.error('⚠️  Error initializing optional services:', error);
                    // Don't crash - these are non-critical
                }
            });
            // Setup graceful shutdown handlers
            healthCheck_1.gracefulShutdown.setupSignalHandlers();
            // Register cleanup handlers
            healthCheck_1.gracefulShutdown.onShutdown(async () => {
                logger_1.default.info('Closing HTTP server...');
                await new Promise((resolve) => {
                    httpServer.close(() => resolve());
                });
                logger_1.default.info('HTTP server closed');
            });
            healthCheck_1.gracefulShutdown.onShutdown(async () => {
                logger_1.default.info('Shutting down job queues...');
                await (0, queues_1.shutdownQueues)();
                logger_1.default.info('Job queues shutdown complete');
            });
            healthCheck_1.gracefulShutdown.onShutdown(async () => {
                logger_1.default.info('Stopping monitoring services...');
                monitoring_1.monitoringService.stop();
                errorTracking_1.errorTracker.stop();
                alerting_1.alertManager.stop();
                businessMetrics_1.businessMetricsCollector.stop();
                logger_1.default.info('Monitoring services stopped');
            });
            logger_1.default.info('✅ Graceful shutdown handlers configured');
        }
        else {
            logger_1.default.warn('⚠️  Running in DEV_MODE - databases disabled, using mock data');
            // Start server in DEV_MODE
            httpServer.listen(PORT, '0.0.0.0', () => {
                logger_1.default.info(`🚀 Server running on port ${PORT} (DEV MODE)`);
                logger_1.default.info(`💚 Health check: http://0.0.0.0:${PORT}/health/basic`);
            });
        }
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        if (!DEV_MODE) {
            logger_1.default.error('💡 Tip: Set DEV_MODE=true in .env to run without databases');
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
exports.default = app;
//# sourceMappingURL=server.js.map