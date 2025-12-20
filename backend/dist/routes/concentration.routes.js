"use strict";
/**
 * Vendor Concentration Risk API Routes
 * OCC/FCA/EBA concentration risk analysis endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const vendorConcentrationRisk_1 = __importDefault(require("../services/vendorConcentrationRisk"));
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(auth_1.authenticate);
/**
 * @swagger
 * /api/v1/vendors/concentration-risk:
 *   get:
 *     summary: Get comprehensive concentration risk analysis
 *     description: Analyze vendor concentration across spend, category, geography, and criticality for regulatory compliance
 *     tags: [Concentration Risk]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Concentration risk analysis
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
 *                     spendConcentration:
 *                       type: object
 *                     categoryConcentration:
 *                       type: object
 *                     geographicConcentration:
 *                       type: object
 *                     singlePointsOfFailure:
 *                       type: array
 *                     regulatoryStatus:
 *                       type: string
 *                       enum: [PASS, WARNING, BREACH]
 *                     recommendations:
 *                       type: array
 */
router.get('/', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'EXECUTIVE'), async (req, res) => {
    try {
        const analysis = await vendorConcentrationRisk_1.default.analyzeConcentrationRisk(req.user.organizationId);
        res.json({
            success: true,
            data: analysis,
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
 * /api/v1/vendors/concentration-risk/spend:
 *   get:
 *     summary: Analyze spend concentration
 *     description: Get detailed spend concentration analysis with Herfindahl-Hirschman Index
 *     tags: [Concentration Risk]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Spend concentration metrics
 */
router.get('/spend', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'CFO'), async (req, res) => {
    try {
        const analysis = await vendorConcentrationRisk_1.default.analyzeConcentrationRisk(req.user.organizationId);
        const spendAnalysis = analysis.spendConcentration;
        res.json({
            success: true,
            data: spendAnalysis,
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
 * /api/v1/vendors/concentration-risk/geographic:
 *   get:
 *     summary: Analyze geographic concentration
 *     description: Analyze vendor concentration by country and region with geopolitical risk assessment
 *     tags: [Concentration Risk]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Geographic concentration analysis
 */
router.get('/geographic', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER'), async (req, res) => {
    try {
        const analysis = await vendorConcentrationRisk_1.default.analyzeConcentrationRisk(req.user.organizationId);
        const geoAnalysis = analysis.geographicConcentration;
        res.json({
            success: true,
            data: geoAnalysis,
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
 * /api/v1/vendors/concentration-risk/single-points-of-failure:
 *   get:
 *     summary: Identify single points of failure
 *     description: Find vendors that create concentration risk and single points of failure
 *     tags: [Concentration Risk]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Single point of failure vendors
 */
router.get('/single-points-of-failure', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'EXECUTIVE'), async (req, res) => {
    try {
        const analysis = await vendorConcentrationRisk_1.default.analyzeConcentrationRisk(req.user.organizationId);
        const spofs = analysis.singlePointsOfFailure;
        res.json({
            success: true,
            data: spofs,
            count: spofs.length,
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
 * /api/v1/vendors/concentration-risk/board-report:
 *   get:
 *     summary: Generate board-level concentration risk report
 *     description: Export comprehensive board report in PDF or Word format for OCC/FCA compliance
 *     tags: [Concentration Risk]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, docx, json]
 *           default: json
 *     responses:
 *       200:
 *         description: Board report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/board-report', (0, auth_1.authorize)('ADMIN', 'EXECUTIVE', 'BOARD_MEMBER'), async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const report = await vendorConcentrationRisk_1.default.exportBoardReport(req.user.organizationId);
        if (format === 'json') {
            res.json({
                success: true,
                data: report,
            });
        }
        else {
            // For PDF/DOCX, set appropriate headers
            const contentType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            const filename = `concentration-risk-report-${new Date().toISOString().split('T')[0]}.${format}`;
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(report);
        }
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
 * /api/v1/vendors/concentration-risk/refresh:
 *   post:
 *     summary: Refresh concentration risk analysis
 *     description: Force recalculation of concentration risk metrics
 *     tags: [Concentration Risk]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analysis refreshed
 */
router.post('/refresh', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER'), async (req, res) => {
    try {
        const analysis = await vendorConcentrationRisk_1.default.analyzeConcentrationRisk(req.user.organizationId);
        res.json({
            success: true,
            data: analysis,
            message: 'Concentration risk analysis refreshed successfully',
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=concentration.routes.js.map