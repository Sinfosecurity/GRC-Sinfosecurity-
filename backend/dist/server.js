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
// Import middleware
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const timeout_1 = require("./middleware/timeout");
const logging_1 = require("./middleware/logging");
const sanitization_1 = require("./middleware/sanitization");
// Import config
const database_1 = require("./config/database");
const logger_1 = __importDefault(require("./config/logger"));
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
// Check if running in dev mode
const DEV_MODE = process.env.DEV_MODE === 'true';
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
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
// Request tracking and logging
app.use((0, logging_1.requestId)());
app.use((0, logging_1.performanceMonitor)());
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
app.get('/metrics', metrics_1.metricsEndpoint);
// Health check with dependency checks
app.get('/health', async (req, res) => {
    const health = {
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
            await database_1.prisma.$queryRaw `SELECT 1`;
            health.checks.database = { status: 'healthy', type: 'postgresql' };
        }
        catch (error) {
            health.checks.database = { status: 'unhealthy', error: error.message, type: 'postgresql' };
            health.status = 'degraded';
        }
        try {
            // Check MongoDB
            await database_1.mongoose.connection.db?.admin().ping();
            health.checks.mongodb = { status: 'healthy' };
        }
        catch (error) {
            health.checks.mongodb = { status: 'unhealthy', error: error.message };
            health.status = 'degraded';
        }
        try {
            // Check Redis
            await database_1.redisClient.ping();
            health.checks.redis = { status: 'healthy' };
        }
        catch (error) {
            health.checks.redis = { status: 'unhealthy', error: error.message };
            health.status = 'degraded';
        }
    }
    else {
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
        // Connect to databases only if not in DEV_MODE
        if (!DEV_MODE) {
            logger_1.default.info('Connecting to databases...');
            await (0, database_1.connectDatabase)();
            logger_1.default.info('✅ Database connections established');
            // Initialize cache service
            const cacheService = new cacheService_1.CacheService(database_1.redisClient);
            logger_1.default.info('✅ Cache service initialized');
            // Schedule recurring background jobs
            await (0, queues_1.scheduleRecurringJobs)();
            logger_1.default.info('✅ Background jobs scheduled');
        }
        else {
            logger_1.default.warn('⚠️  Running in DEV_MODE - databases disabled, using mock data');
        }
        httpServer.listen(PORT, () => {
            logger_1.default.info(`🚀 Server running on port ${PORT}`);
            logger_1.default.info(`📊 Environment: ${process.env.NODE_ENV}`);
            logger_1.default.info(`🔧 Dev Mode: ${DEV_MODE ? 'ENABLED' : 'DISABLED'}`);
            logger_1.default.info(`🔗 API URL: http://localhost:${PORT}${API_PREFIX}`);
            logger_1.default.info(`💚 Health check: http://localhost:${PORT}/health`);
            logger_1.default.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
            logger_1.default.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        if (!DEV_MODE) {
            logger_1.default.error('💡 Tip: Set DEV_MODE=true in .env to run without databases');
        }
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.default.info('SIGTERM signal received: closing HTTP server');
    // Close job queues
    if (!DEV_MODE) {
        await (0, queues_1.shutdownQueues)();
    }
    httpServer.close(() => {
        logger_1.default.info('HTTP server closed');
        process.exit(0);
    });
});
// Only start server if not imported (e.g., for testing)
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=server.js.map