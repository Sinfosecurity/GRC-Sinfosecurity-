/**
 * API v1 Routes
 * Public REST API for external integrations
 */

import { Router } from 'express';
import riskRoutes from './risks';
import complianceRoutes from './compliance';
import taskRoutes from './tasks';
import reportRoutes from './reports';

const router = Router();

// Mount API routes
router.use('/risks', riskRoutes);
router.use('/compliance', complianceRoutes);
router.use('/tasks', taskRoutes);
router.use('/reports', reportRoutes);

// API Info endpoint
router.get('/', (req, res) => {
    res.json({
        version: 'v1',
        name: 'GRC Platform API',
        description: 'Public REST API for GRC Platform integrations',
        endpoints: {
            risks: '/api/v1/risks',
            compliance: '/api/v1/compliance',
            tasks: '/api/v1/tasks',
            reports: '/api/v1/reports',
        },
        documentation: '/api/docs',
    });
});

export default router;
