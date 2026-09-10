/**
 * QUARANTINED prototype entrypoint.
 * Production and CI start `src/server.ts` / `dist/server.js` only.
 * This file must never be used as a process entrypoint.
 */
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Backend running without database (demo mode)',
    });
});

// Mock API Routes
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

// Auth routes
app.post(`${API_PREFIX}/auth/login`, (req, res) => {
    res.json({
        success: true,
        data: {
            token: 'demo-token-123',
            user: {
                id: '1',
                email: 'demo@sinfosecurity.com',
                firstName: 'Demo',
                lastName: 'User',
                role: 'ADMIN'
            }
        }
    });
});

// Risks
app.get(`${API_PREFIX}/risks`, (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: '1',
                title: 'Unauthorized Data Access',
                category: 'CYBERSECURITY',
                likelihood: 4,
                impact: 5,
                riskScore: 20,
                status: 'IDENTIFIED'
            },
            {
                id: '2',
                title: 'Data Breach Risk',
                category: 'DATA_PRIVACY',
                likelihood: 3,
                impact: 5,
                riskScore: 15,
                status: 'MITIGATED'
            }
        ]
    });
});

// Compliance
app.get(`${API_PREFIX}/compliance`, (req, res) => {
    res.json({
        success: true,
        data: [
            { name: 'GDPR', score: 87, type: 'GDPR' },
            { name: 'HIPAA', score: 78, type: 'HIPAA' },
            { name: 'CCPA', score: 92, type: 'CCPA' }
        ]
    });
});

// Controls
app.get(`${API_PREFIX}/controls`, (req, res) => {
    res.json({ success: true, data: [] });
});

// Incidents
app.get(`${API_PREFIX}/incidents`, (req, res) => {
    res.json({ success: true, data: [] });
});

// Policies
app.get(`${API_PREFIX}/policies`, (req, res) => {
    res.json({ success: true, data: [] });
});

// Documents
app.get(`${API_PREFIX}/documents`, (req, res) => {
    res.json({ success: true, data: [] });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
    });
});

// Quarantined: never bind a port. Production uses src/server.ts.
if (require.main === module) {
    throw new Error('server-simple.ts is quarantined and must not be started');
}

export default app;
