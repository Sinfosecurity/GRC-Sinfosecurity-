"use strict";
/**
 * Risk Appetite API Routes
 * Enterprise risk appetite framework endpoints for SOC 2 / ISO 27001 compliance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const risk_appetite_validators_1 = require("../validators/risk-appetite.validators");
const riskAppetite_1 = __importDefault(require("../services/riskAppetite"));
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(auth_1.authenticate);
/**
 * @swagger
 * /api/v1/risk-appetite:
 *   post:
 *     summary: Create risk appetite threshold
 *     description: Define board-approved risk appetite for a risk category
 *     tags: [Risk Appetite]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - appetiteStatement
 *               - riskTolerance
 *               - earlyWarningThreshold
 *               - approvedBy
 *               - approvalDate
 *               - reviewFrequency
 *             properties:
 *               category:
 *                 type: string
 *                 example: "Third Party Risk"
 *               subcategory:
 *                 type: string
 *               appetiteStatement:
 *                 type: string
 *                 example: "The organization accepts moderate third-party risk from critical vendors with compensating controls"
 *               quantitativeThreshold:
 *                 type: number
 *               qualitativeThreshold:
 *                 type: string
 *               riskTolerance:
 *                 type: number
 *                 example: 75
 *               earlyWarningThreshold:
 *                 type: number
 *                 example: 65
 *               approvedBy:
 *                 type: string
 *               approvalDate:
 *                 type: string
 *                 format: date
 *               reviewFrequency:
 *                 type: integer
 *                 description: Review frequency in days
 *                 example: 90
 *               rationaleDocument:
 *                 type: string
 *               boardApprovalEvidence:
 *                 type: string
 *     responses:
 *       201:
 *         description: Risk appetite created
 *       400:
 *         description: Invalid input
 */
router.post('/', (0, auth_1.authorize)(['ADMIN', 'RISK_MANAGER', 'EXECUTIVE', 'BOARD_MEMBER']), (0, validation_1.validateBody)({
    category: { type: 'string', required: true },
    appetiteStatement: { type: 'string', required: true },
    riskTolerance: { type: 'number', required: true },
    earlyWarningThreshold: { type: 'number', required: true },
    approvedBy: { type: 'string', required: true },
    approvalDate: { type: 'string', required: true },
    reviewFrequency: { type: 'number', required: true },
}), async (req, res) => {
    try {
        const riskAppetite = await riskAppetite_1.default.createRiskAppetite({
            ...req.body,
            organizationId: req.user.organizationId,
            approvalDate: new Date(req.body.approvalDate),
        });
        res.status(201).json({
            success: true,
            data: riskAppetite,
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
 * /api/v1/risk-appetite:
 *   get:
 *     summary: List all risk appetites
 *     description: Get all risk appetite thresholds for the organization
 *     tags: [Risk Appetite]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of risk appetites
 */
router.get('/', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'EXECUTIVE', 'AUDITOR'), async (req, res) => {
    try {
        const appetites = await riskAppetite_1.default.listRiskAppetites(req.user.organizationId);
        res.json({
            success: true,
            data: appetites,
            count: appetites.length,
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
 * /api/v1/risk-appetite/{id}:
 *   put:
 *     summary: Update risk appetite
 *     description: Update risk appetite threshold (requires board approval for material changes)
 *     tags: [Risk Appetite]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               appetiteStatement:
 *                 type: string
 *               quantitativeThreshold:
 *                 type: number
 *               qualitativeThreshold:
 *                 type: string
 *               riskTolerance:
 *                 type: number
 *               earlyWarningThreshold:
 *                 type: number
 *               reviewFrequency:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Risk appetite updated
 */
router.put('/:id', (0, validation_1.validateUUID)('id'), (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'EXECUTIVE'), async (req, res) => {
    try {
        const riskAppetite = await riskAppetite_1.default.updateRiskAppetite(req.params.id, req.user.organizationId, req.body);
        res.json({
            success: true,
            data: riskAppetite,
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
 * /api/v1/risk-appetite/{id}/monitor:
 *   post:
 *     summary: Monitor risk appetite
 *     description: Calculate current risk level and check for breaches
 *     tags: [Risk Appetite]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Risk monitoring complete
 */
router.post('/:id/monitor', (0, validation_1.validateUUID)('id'), (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER'), async (req, res) => {
    try {
        const result = await riskAppetite_1.default.monitorRiskAppetite(req.params.id, req.user.organizationId);
        res.json({
            success: true,
            data: result,
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
 * /api/v1/risk-appetite/monitor-all:
 *   post:
 *     summary: Monitor all risk appetites
 *     description: Run monitoring check on all risk appetite thresholds
 *     tags: [Risk Appetite]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All risk appetites monitored
 */
router.post('/monitor-all', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER'), async (req, res) => {
    try {
        const results = await riskAppetite_1.default.monitorAllRiskAppetites(req.user.organizationId);
        res.json({
            success: true,
            data: results,
            message: `Monitored ${results.length} risk appetites`,
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
 * /api/v1/risk-appetite/breaches:
 *   get:
 *     summary: List risk appetite breaches
 *     description: Get all risk appetite breaches with optional status filter
 *     tags: [Risk Appetite]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, UNDER_REVIEW, MITIGATED, CLOSED]
 *     responses:
 *       200:
 *         description: List of breaches
 */
router.get('/breaches', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'EXECUTIVE', 'AUDITOR'), async (req, res) => {
    try {
        const breaches = await riskAppetite_1.default.listBreaches(req.user.organizationId, req.query.status);
        res.json({
            success: true,
            data: breaches,
            count: breaches.length,
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
 * /api/v1/risk-appetite/breaches/{breachId}/resolve:
 *   post:
 *     summary: Resolve a risk appetite breach
 *     description: Record mitigation plan and mark breach as resolved
 *     tags: [Risk Appetite]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: breachId
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
 *             required:
 *               - mitigationPlan
 *               - mitigationOwner
 *             properties:
 *               mitigationPlan:
 *                 type: string
 *               mitigationOwner:
 *                 type: string
 *               resolutionNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Breach resolved
 */
router.post('/breaches/:breachId/resolve', (0, validation_1.validateUUID)('breachId'), (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'EXECUTIVE'), (0, validation_1.validateBody)(risk_appetite_validators_1.ResolveBreachSchema), async (req, res) => {
    try {
        const breach = await riskAppetite_1.default.resolveBreach(req.params.breachId, req.body.mitigationPlan, req.body.mitigationOwner, req.body.resolutionNotes);
        res.json({
            success: true,
            data: breach,
            message: 'Breach resolved successfully',
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
 * /api/v1/risk-appetite/dashboard:
 *   get:
 *     summary: Get risk appetite dashboard
 *     description: Comprehensive dashboard with all appetites, breaches, and statistics
 *     tags: [Risk Appetite]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Risk appetite dashboard
 */
router.get('/dashboard', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'EXECUTIVE', 'BOARD_MEMBER'), async (req, res) => {
    try {
        const dashboard = await riskAppetite_1.default.getDashboard(req.user.organizationId);
        res.json({
            success: true,
            data: dashboard,
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
 * /api/v1/risk-appetite/review-required:
 *   get:
 *     summary: Get appetites requiring review
 *     description: List risk appetites that are due for periodic review
 *     tags: [Risk Appetite]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appetites requiring review
 */
router.get('/review-required', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER'), async (req, res) => {
    try {
        const appetites = await riskAppetite_1.default.getAppetitesRequiringReview(req.user.organizationId);
        res.json({
            success: true,
            data: appetites,
            count: appetites.length,
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
//# sourceMappingURL=risk-appetite.routes.js.map