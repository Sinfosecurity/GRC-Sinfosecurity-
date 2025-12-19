import express, { Request, Response } from 'express';
import continuousMonitoringService from '../services/continuousMonitoringService';

const router = express.Router();

/**
 * GET /api/monitoring/checks
 * Get all monitoring checks
 */
router.get('/checks', (req: Request, res: Response) => {
    try {
        const checks = continuousMonitoringService.getMonitoringChecks();
        
        res.json({
            success: true,
            count: checks.length,
            data: checks
        });
    } catch (error) {
        console.error('Error fetching monitoring checks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch monitoring checks'
        });
    }
});

/**
 * POST /api/monitoring/run
 * Manually trigger monitoring checks
 */
router.post('/run', async (req: Request, res: Response) => {
    try {
        const results = await continuousMonitoringService.runAllChecks();
        
        res.json({
            success: true,
            message: 'Monitoring checks completed',
            count: results.length,
            data: results
        });
    } catch (error) {
        console.error('Error running monitoring checks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run monitoring checks'
        });
    }
});

/**
 * GET /api/monitoring/results
 * Get monitoring results with optional filters
 */
router.get('/results', (req: Request, res: Response) => {
    try {
        const filters = {
            checkId: req.query.checkId as string | undefined,
            status: req.query.status as string | undefined,
            limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        };

        const results = continuousMonitoringService.getResults(filters);
        
        res.json({
            success: true,
            count: results.length,
            data: results
        });
    } catch (error) {
        console.error('Error fetching monitoring results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch monitoring results'
        });
    }
});

/**
 * GET /api/monitoring/health
 * Get compliance health score
 */
router.get('/health', (req: Request, res: Response) => {
    try {
        const health = continuousMonitoringService.getComplianceHealth();
        
        if (!health) {
            return res.json({
                success: true,
                message: 'No health data available yet. Run monitoring checks first.',
                data: null
            });
        }
        
        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        console.error('Error fetching compliance health:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch compliance health'
        });
    }
});

/**
 * GET /api/monitoring/findings
 * Get recent findings
 */
router.get('/findings', (req: Request, res: Response) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
        const findings = continuousMonitoringService.getRecentFindings(limit);
        
        res.json({
            success: true,
            count: findings.length,
            data: findings
        });
    } catch (error) {
        console.error('Error fetching findings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch findings'
        });
    }
});

/**
 * PUT /api/monitoring/checks/:id/toggle
 * Enable/disable a monitoring check
 */
router.put('/checks/:id/toggle', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;
        
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'enabled field is required and must be boolean'
            });
        }
        
        const check = continuousMonitoringService.toggleCheck(id, enabled);
        
        if (!check) {
            return res.status(404).json({
                success: false,
                error: 'Monitoring check not found'
            });
        }
        
        res.json({
            success: true,
            message: `Check ${enabled ? 'enabled' : 'disabled'} successfully`,
            data: check
        });
    } catch (error) {
        console.error('Error toggling monitoring check:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle monitoring check'
        });
    }
});

export default router;





