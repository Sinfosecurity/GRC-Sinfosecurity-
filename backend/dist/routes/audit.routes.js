"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auditService_1 = require("../services/auditService");
const router = express_1.default.Router();
/**
 * GET /api/audit/logs
 * Get audit logs with optional filters
 */
router.get('/logs', (req, res) => {
    try {
        const filters = {
            userId: req.query.userId,
            action: req.query.action,
            resourceType: req.query.resourceType,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        };
        const logs = auditService_1.AuditService.getLogs(filters);
        res.json({
            success: true,
            count: logs.length,
            data: logs
        });
    }
    catch (error) {
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
router.get('/recent', (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const logs = auditService_1.AuditService.getRecentActivity(limit);
        res.json({
            success: true,
            count: logs.length,
            data: logs
        });
    }
    catch (error) {
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
router.get('/resource/:type/:id', (req, res) => {
    try {
        const { type, id } = req.params;
        const logs = auditService_1.AuditService.getResourceHistory(type, id);
        res.json({
            success: true,
            count: logs.length,
            data: logs
        });
    }
    catch (error) {
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
router.get('/stats', (req, res) => {
    try {
        const stats = auditService_1.AuditService.getStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error fetching audit stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit statistics'
        });
    }
});
exports.default = router;
//# sourceMappingURL=audit.routes.js.map