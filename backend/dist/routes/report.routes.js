"use strict";
/**
 * Report Management API Routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportGenerator_1 = __importDefault(require("../services/reportGenerator"));
const auth_1 = require("../middleware/auth");
const userService_1 = require("../services/userService");
const router = (0, express_1.Router)();
/**
 * GET /api/reports/templates
 * Get all report templates
 */
router.get('/templates', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.VIEW_REPORTS), (req, res) => {
    try {
        const templates = reportGenerator_1.default.getAllTemplates();
        res.json({
            success: true,
            count: templates.length,
            data: templates,
        });
    }
    catch (error) {
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
router.post('/generate', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.CREATE_REPORTS), async (req, res) => {
    try {
        const { templateId, format = 'pdf' } = req.body;
        const generatedBy = req.user?.id;
        if (!templateId) {
            return res.status(400).json({
                success: false,
                error: 'Template ID is required',
            });
        }
        const report = await reportGenerator_1.default.generateReport(templateId, format, generatedBy);
        res.json({
            success: true,
            data: report,
            message: 'Report generated successfully',
        });
    }
    catch (error) {
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
router.get('/', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.VIEW_REPORTS), (req, res) => {
    try {
        const reports = reportGenerator_1.default.getAllReports();
        res.json({
            success: true,
            count: reports.length,
            data: reports,
        });
    }
    catch (error) {
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
router.post('/schedule', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.CREATE_REPORTS), (req, res) => {
    try {
        const scheduleData = {
            ...req.body,
            createdBy: req.user?.id,
        };
        const schedule = reportGenerator_1.default.scheduleReport(scheduleData);
        res.status(201).json({
            success: true,
            data: schedule,
            message: 'Report scheduled successfully',
        });
    }
    catch (error) {
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
router.get('/schedules', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.VIEW_REPORTS), (req, res) => {
    try {
        const schedules = reportGenerator_1.default.getAllSchedules();
        res.json({
            success: true,
            count: schedules.length,
            data: schedules,
        });
    }
    catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch report schedules',
        });
    }
});
exports.default = router;
//# sourceMappingURL=report.routes.js.map