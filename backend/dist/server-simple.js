"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
// Health check
app.get('/health', (req, res) => {
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
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
    });
});
// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Mock Backend running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API URL: http://localhost:${PORT}${API_PREFIX}`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
    console.log(`⚠️  Running in DEMO MODE (no database required)`);
});
exports.default = app;
//# sourceMappingURL=server-simple.js.map