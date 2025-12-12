/**
 * API v1 - Reports Endpoints
 */

import { Router, Request, Response } from 'express';
import reportGenerator from '../../services/reportGenerator';

const router = Router();

/**
 * GET /api/v1/reports/templates
 * List all report templates
 */
router.get('/templates', (req: Request, res: Response) => {
    try {
        const templates = reportGenerator.getAllTemplates();

        res.json({
            success: true,
            count: templates.length,
            data: templates,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch templates',
        });
    }
});

/**
 * POST /api/v1/reports/generate
 * Generate a report
 */
router.post('/generate', async (req: Request, res: Response) => {
    try {
        const { templateId, format = 'pdf' } = req.body;

        if (!templateId) {
            return res.status(400).json({
                success: false,
                error: 'Template ID is required',
            });
        }

        const report = await reportGenerator.generateReport(templateId, format, 'api');

        res.json({
            success: true,
            data: report,
            message: 'Report generated successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate report',
        });
    }
});

export default router;
