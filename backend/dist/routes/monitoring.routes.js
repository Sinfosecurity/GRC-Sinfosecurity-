"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const continuousMonitoringService_1 = __importDefault(require("../services/continuousMonitoringService"));
const auth_1 = require("../middleware/auth");
const errorTracking_1 = require("../utils/errorTracking");
const performanceMonitoring_1 = require("../utils/performanceMonitoring");
const alerting_1 = require("../utils/alerting");
const businessMetrics_1 = require("../utils/businessMetrics");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
/**
 * GET /api/monitoring/dashboard
 * Get comprehensive monitoring dashboard data
 */
router.get('/dashboard', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [performanceReport, errorStats, alertStats, businessMetrics,] = await Promise.all([
        performanceMonitoring_1.performanceReporter.generateReport(),
        errorTracking_1.errorTracker.getStatistics(),
        alerting_1.alertManager.getStatistics(),
        businessMetrics_1.businessMetricsCollector.getMetricsSummary(),
    ]);
    res.json({
        performance: performanceReport,
        errors: errorStats,
        alerts: alertStats,
        business: businessMetrics,
        timestamp: new Date().toISOString(),
    });
}));
/**
 * GET /api/monitoring/performance
 * Get performance metrics
 */
router.get('/performance', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const report = await performanceMonitoring_1.performanceReporter.generateReport();
    res.json(report);
}));
/**
 * GET /api/monitoring/errors
 * Get error statistics
 */
router.get('/errors', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const stats = errorTracking_1.errorTracker.getStatistics();
    res.json(stats);
}));
/**
 * GET /api/monitoring/alerts
 * Get active alerts
 */
router.get('/alerts', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const activeAlerts = alerting_1.alertManager.getActiveAlerts();
    res.json({
        alerts: activeAlerts,
        count: activeAlerts.length,
    });
}));
/**
 * POST /api/monitoring/alerts/:alertId/resolve
 * Resolve an alert
 */
router.post('/alerts/:alertId/resolve', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { alertId } = req.params;
    alerting_1.alertManager.resolveAlert(alertId);
    res.json({
        message: 'Alert resolved successfully',
        alertId,
    });
}));
/**
 * GET /api/monitoring/business
 * Get business metrics summary
 */
router.get('/business', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const summary = await businessMetrics_1.businessMetricsCollector.getMetricsSummary();
    res.json(summary);
}));
/**
 * GET /api/monitoring/status
 * Get overall monitoring system status
 */
router.get('/status', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const alertStats = alerting_1.alertManager.getStatistics();
    const errorStats = errorTracking_1.errorTracker.getStatistics();
    const status = {
        monitoring: {
            enabled: true,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
        },
        alerts: {
            active: alertStats.activeAlerts,
            total: alertStats.totalAlerts,
            critical: alertStats.bySeverity.critical,
        },
        errors: {
            last24Hours: errorStats.totalErrors,
            buffer: errorStats.bufferSize,
        },
        services: {
            errorTracking: true,
            performanceMonitoring: true,
            businessMetrics: true,
            alertManager: true,
        },
        timestamp: new Date().toISOString(),
    };
    res.json(status);
}));
/**
 * GET /api/monitoring/checks
 * Get all monitoring checks (legacy endpoint)
 */
router.get('/checks', (req, res) => {
    try {
        const checks = continuousMonitoringService_1.default.getMonitoringChecks();
        res.json({
            success: true,
            count: checks.length,
            data: checks
        });
    }
    catch (error) {
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
router.post('/run', async (req, res) => {
    try {
        const results = await continuousMonitoringService_1.default.runAllChecks();
        res.json({
            success: true,
            message: 'Monitoring checks completed',
            count: results.length,
            data: results
        });
    }
    catch (error) {
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
router.get('/results', (req, res) => {
    try {
        const filters = {
            checkId: req.query.checkId,
            status: req.query.status,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        };
        const results = continuousMonitoringService_1.default.getResults(filters);
        res.json({
            success: true,
            count: results.length,
            data: results
        });
    }
    catch (error) {
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
router.get('/health', (req, res) => {
    try {
        const health = continuousMonitoringService_1.default.getComplianceHealth();
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
    }
    catch (error) {
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
router.get('/findings', (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const findings = continuousMonitoringService_1.default.getRecentFindings(limit);
        res.json({
            success: true,
            count: findings.length,
            data: findings
        });
    }
    catch (error) {
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
router.put('/checks/:id/toggle', (req, res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'enabled field is required and must be boolean'
            });
        }
        const check = continuousMonitoringService_1.default.toggleCheck(id, enabled);
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
    }
    catch (error) {
        console.error('Error toggling monitoring check:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle monitoring check'
        });
    }
});
exports.default = router;
//# sourceMappingURL=monitoring.routes.js.map