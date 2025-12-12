/**
 * Report Management API Routes
 */

import { Router, Request, Response } from 'express';
import reportGenerator from '../services/reportGenerator';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '../services/userService';

const router = Router();

/**
 * GET /api/reports/templates
 * Get all report templates
 */
router.get('/templates', authenticate, requirePermission(Permission.VIEW_REPORTS), (req: Request, res: Response) => {
    try {
        const templates = reportGenerator.getAllTemplates();

        res.json({
            success: true,
            count: templates.length,
            data: templates,
        });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch report templates',
        });
    }
});

/**
 * POST /api/reports/generate
 * Generate a report from template
 */
router.post('/generate', authenticate, requirePermission(Permission.CREATE_REPORTS), async (req: Request, res: Response) => {
    try {
        const { templateId, format = 'pdf' } = req.body;
        const generatedBy = (req as any).user?.id;

        if (!templateId) {
            return res.status(400).json({
                success: false,
                error: 'Template ID is required',
            });
        }

        const report = await reportGenerator.generateReport(templateId, format, generatedBy);

        res.json({
            success: true,
            data: report,
            message: 'Report generated successfully',
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate report',
        });
    }
});

/**
 * GET /api/reports
 * Get all generated reports
 */
router.get('/', authenticate, requirePermission(Permission.VIEW_REPORTS), (req: Request, res: Response) => {
    try {
        const reports = reportGenerator.getAllReports();

        res.json({
            success: true,
            count: reports.length,
            data: reports,
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reports',
        });
    }
});

/**
 * POST /api/reports/schedule
 * Schedule recurring report
 */
router.post('/schedule', authenticate, requirePermission(Permission.CREATE_REPORTS), (req: Request, res: Response) => {
    try {
        const scheduleData = {
            ...req.body,
            createdBy: (req as any).user?.id,
        };

        const schedule = reportGenerator.scheduleReport(scheduleData);

        res.status(201).json({
            success: true,
            data: schedule,
            message: 'Report scheduled successfully',
        });
    } catch (error) {
        console.error('Error scheduling report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to schedule report',
        });
    }
});

/**
 * GET /api/reports/schedules
 * Get all report schedules
 */
router.get('/schedules', authenticate, requirePermission(Permission.VIEW_REPORTS), (req: Request, res: Response) => {
    try {
        const schedules = reportGenerator.getAllSchedules();

        res.json({
            success: true,
            count: schedules.length,
            data: schedules,
        });
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch report schedules',
        });
    }
});

export default router;
