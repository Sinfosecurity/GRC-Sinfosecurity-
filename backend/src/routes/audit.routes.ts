import express, { Request, Response } from 'express';
import { AuditService } from '../services/auditService';

const router = express.Router();

/**
 * GET /api/audit/logs
 * Get audit logs with optional filters
 */
router.get('/logs', (req: Request, res: Response) => {
    try {
        const filters = {
            userId: req.query.userId as string | undefined,
            action: req.query.action as string | undefined,
            resourceType: req.query.resourceType as string | undefined,
            limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        };

        const logs = AuditService.getLogs(filters);

        res.json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit logs'
        });
    }
});

/**
 * GET /api/audit/recent
 * Get recent activity
 */
router.get('/recent', (req: Request, res: Response) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const logs = AuditService.getRecentActivity(limit);

        res.json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recent activity'
        });
    }
});

/**
 * GET /api/audit/resource/:type/:id
 * Get history for a specific resource
 */
router.get('/resource/:type/:id', (req: Request, res: Response) => {
    try {
        const { type, id } = req.params;
        const logs = AuditService.getResourceHistory(type, id);

        res.json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        console.error('Error fetching resource history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch resource history'
        });
    }
});

/**
 * GET /api/audit/stats
 * Get audit statistics
 */
router.get('/stats', (req: Request, res: Response) => {
    try {
        const stats = AuditService.getStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching audit stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit statistics'
        });
    }
});

export default router;
