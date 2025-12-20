"use strict";
/**
 * API v1 - Reports Endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportGenerator_1 = __importDefault(require("../../services/reportGenerator"));
const router = (0, express_1.Router)();
/**
 * GET /api/v1/reports/templates
 * List all report templates
 */
router.get('/templates', (req, res) => {
    try {
        const templates = reportGenerator_1.default.getAllTemplates();
        res.json({
            success: true,
            count: templates.length,
            data: templates,
        });
    }
    catch (error) {
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
router.post('/generate', async (req, res) => {
    try {
        const { templateId, format = 'pdf' } = req.body;
        if (!templateId) {
            return res.status(400).json({
                success: false,
                error: 'Template ID is required',
            });
        }
        const report = await reportGenerator_1.default.generateReport(templateId, format, 'api');
        res.json({
            success: true,
            data: report,
            message: 'Report generated successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate report',
        });
    }
});
exports.default = router;
//# sourceMappingURL=reports.js.map