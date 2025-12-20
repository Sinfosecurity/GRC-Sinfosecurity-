"use strict";
/**
 * Vendor Risk History API Routes
 * Automated risk tracking and trending endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const vendorRiskHistory_1 = __importDefault(require("../services/vendorRiskHistory"));
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(auth_1.authenticate);
/**
 * @swagger
 * /api/v1/vendors/{vendorId}/risk-history:
 *   get:
 *     summary: Get risk history for a vendor
 *     description: Retrieve historical risk scores and trend analysis for a specific vendor
 *     tags: [Vendor Risk History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Risk history data with trend analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     history:
 *                       type: array
 *                     trend:
 *                       type: object
 *                       properties:
 *                         direction:
 *                           type: string
 *                           enum: [INCREASING, DECREASING, STABLE, VOLATILE]
 *                         changePercent:
 *                           type: number
 *                         volatility:
 *                           type: string
 *                           enum: [LOW, MODERATE, HIGH]
 *                         recentPeak:
 *                           type: number
 *                         recentLow:
 *                           type: number
 *       404:
 *         description: Vendor not found
 */
router.get('/:vendorId', (0, validation_1.validateUUID)('vendorId'), async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const riskTrend = await vendorRiskHistory_1.default.getVendorRiskTrend(req.params.vendorId, req.user.organizationId, 12);
        res.json({
            success: true,
            data: riskTrend,
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * @swagger
 * /api/v1/vendors/{vendorId}/risk-history/snapshot:
 *   post:
 *     summary: Record a manual risk snapshot
 *     description: Manually record a risk score snapshot (automated snapshots are captured on assessment completion)
 *     tags: [Vendor Risk History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for manual snapshot
 *     responses:
 *       201:
 *         description: Snapshot recorded
 *       404:
 *         description: Vendor not found
 */
router.post('/:vendorId/snapshot', (0, validation_1.validateUUID)('vendorId'), (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER'), async (req, res) => {
    try {
        const snapshot = await vendorRiskHistory_1.default.recordRiskSnapshot(req.params.vendorId, req.user.organizationId, req.body.reason || 'Manual snapshot');
        res.status(201).json({
            success: true,
            data: snapshot,
            message: 'Risk snapshot recorded successfully',
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * @swagger
 * /api/v1/vendors/risk-trends:
 *   get:
 *     summary: Get risk trends for all vendors
 *     description: Retrieve risk trends for all vendors in the organization with filtering
 *     tags: [Vendor Risk History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: trendDirection
 *         schema:
 *           type: string
 *           enum: [INCREASING, DECREASING, STABLE, VOLATILE]
 *       - in: query
 *         name: minRiskScore
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *       - in: query
 *         name: volatility
 *         schema:
 *           type: string
 *           enum: [LOW, MODERATE, HIGH]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Risk trends for all vendors
 */
router.get('/trends', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'EXECUTIVE'), async (req, res) => {
    try {
        const months = req.query.months ? parseInt(req.query.months) : 6;
        const result = await vendorRiskHistory_1.default.getAllVendorTrends(req.user.organizationId, months);
        // Apply filters
        let filteredTrends = result.trends;
        if (req.query.trendDirection) {
            filteredTrends = filteredTrends.filter(t => t.trend.direction === req.query.trendDirection);
        }
        if (req.query.minRiskScore) {
            const minScore = parseFloat(req.query.minRiskScore);
            filteredTrends = filteredTrends.filter((t) => t.currentRiskScore >= minScore);
        }
        if (req.query.volatility) {
            filteredTrends = filteredTrends.filter(t => t.trend.volatility === req.query.volatility);
        }
        res.json({
            success: true,
            data: filteredTrends,
            count: filteredTrends.length,
            totalCount: result.trends.length,
            summary: result.summary,
            period: result.period,
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * @swagger
 * /api/v1/vendors/risk-trends/increasing:
 *   get:
 *     summary: Get vendors with increasing risk
 *     description: Identify vendors with upward risk trends for proactive intervention
 *     tags: [Vendor Risk History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendors with increasing risk
 */
router.get('/trends/increasing', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER'), async (req, res) => {
    try {
        const result = await vendorRiskHistory_1.default.getAllVendorTrends(req.user.organizationId);
        const increasingRiskVendors = result.trends.filter((t) => t.trend.direction === 'INCREASING').sort((a, b) => b.trend.changePercent - a.trend.changePercent);
        res.json({
            success: true,
            data: increasingRiskVendors,
            count: increasingRiskVendors.length,
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * @swagger
 * /api/v1/vendors/risk-trends/volatile:
 *   get:
 *     summary: Get vendors with volatile risk scores
 *     description: Identify vendors with high volatility for closer monitoring
 *     tags: [Vendor Risk History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendors with volatile risk
 */
router.get('/trends/volatile', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER'), async (req, res) => {
    try {
        const result = await vendorRiskHistory_1.default.getAllVendorTrends(req.user.organizationId);
        const volatileVendors = result.trends.filter((t) => t.trend.volatility === 'HIGH');
        res.json({
            success: true,
            data: volatileVendors,
            count: volatileVendors.length,
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * @swagger
 * /api/v1/vendors/risk-trends/export:
 *   get:
 *     summary: Export risk trend report
 *     description: Export comprehensive risk trend analysis for all vendors
 *     tags: [Vendor Risk History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, excel]
 *           default: json
 *     responses:
 *       200:
 *         description: Risk trend report
 */
router.get('/trends/export', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'EXECUTIVE'), async (req, res) => {
    try {
        const result = await vendorRiskHistory_1.default.getAllVendorTrends(req.user.organizationId);
        const format = req.query.format || 'json';
        if (format === 'json') {
            res.json({
                success: true,
                data: result,
                exportDate: new Date().toISOString(),
            });
        }
        else if (format === 'csv') {
            // Generate CSV
            const csv = [
                'Vendor ID,Vendor Name,Current Score,Trend Direction,Change %,Volatility',
                ...result.trends.map((t) => `${t.vendorId},${t.vendorName},${t.currentRiskScore},${t.trend.direction},${t.trend.changePercent},${t.trend.volatility}`)
            ].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="risk-trends-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csv);
        }
        else {
            res.status(400).json({
                success: false,
                error: 'Unsupported export format',
            });
        }
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=risk-history.routes.js.map