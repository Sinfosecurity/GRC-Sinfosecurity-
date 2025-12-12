import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import riskRoutes from './routes/risk.routes';
import complianceRoutes from './routes/compliance.routes';
import controlsRoutes from './routes/controls.routes';
import incidentRoutes from './routes/incident.routes';
import policyRoutes from './routes/policy.routes';
import documentRoutes from './routes/document.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Import config
import { connectDatabase } from './config/database';
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Rate limiting
app.use('/api/', rateLimiter);

// Static files (for uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        devMode: DEV_MODE,
    });
});

// API Routes
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/risks`, riskRoutes);
app.use(`${API_PREFIX}/compliance`, complianceRoutes);
app.use(`${API_PREFIX}/controls`, controlsRoutes);
app.use(`${API_PREFIX}/incidents`, incidentRoutes);
app.use(`${API_PREFIX}/policies`, policyRoutes);
app.use(`${API_PREFIX}/documents`, documentRoutes);

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
const PORT = process.env.PORT || 4000;

async function startServer() {
    try {
        // Connect to databases only if not in DEV_MODE
        if (!DEV_MODE) {
            logger.info('Connecting to databases...');
            await connectDatabase();
            logger.info('✅ Database connections established');
        } else {
            logger.warn('⚠️  Running in DEV_MODE - databases disabled, using mock data');
        }

        httpServer.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
            logger.info(`🔧 Dev Mode: ${DEV_MODE ? 'ENABLED' : 'DISABLED'}`);
            logger.info(`🔗 API URL: http://localhost:${PORT}${API_PREFIX}`);
            logger.info(`💚 Health check: http://localhost:${PORT}/health`);
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
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

startServer();

export default app;
