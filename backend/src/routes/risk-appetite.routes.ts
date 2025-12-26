/**
 * Risk Appetite API Routes
 * Enterprise risk appetite framework endpoints for SOC 2 / ISO 27001 compliance
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateUUID } from '../middleware/validation';
import { CreateRiskAppetiteSchema, UpdateRiskAppetiteSchema, ResolveBreachSchema } from '../validators/risk-appetite.validators';
import riskAppetiteService from '../services/riskAppetite';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

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
router.post('/', 
    authorize('ADMIN', 'RISK_MANAGER', 'EXECUTIVE', 'BOARD_MEMBER'),
    validateBody(CreateRiskAppetiteSchema),
    async (req: any, res) => {
        try {
            const riskAppetite = await riskAppetiteService.createRiskAppetite({
                ...req.body,
                organizationId: req.user.organizationId,
                approvalDate: new Date(req.body.approvalDate),
            });

            res.status(201).json({
                success: true,
                data: riskAppetite,
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

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
router.get('/',
    authorize('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'EXECUTIVE', 'AUDITOR'),
    async (req: any, res) => {
        try {
            const appetites = await riskAppetiteService.listRiskAppetites(
                req.user.organizationId
            );

            res.json({
                success: true,
                data: appetites,
                count: appetites.length,
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

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
router.put('/:id',
    validateUUID('id'),
    authorize('ADMIN', 'RISK_MANAGER', 'EXECUTIVE'),
    async (req: any, res) => {
        try {
            const riskAppetite = await riskAppetiteService.updateRiskAppetite(
                req.params.id,
                req.user.organizationId,
                req.body
            );

            res.json({
                success: true,
                data: riskAppetite,
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

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
router.post('/:id/monitor',
    validateUUID('id'),
    authorize('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER'),
    async (req: any, res) => {
        try {
            const result = await riskAppetiteService.monitorRiskAppetite(
                req.params.id,
                req.user.organizationId
            );

            res.json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

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
router.post('/monitor-all',
    authorize('ADMIN', 'RISK_MANAGER'),
    async (req: any, res) => {
        try {
            const results = await riskAppetiteService.monitorAllRiskAppetites(
                req.user.organizationId
            );

            res.json({
                success: true,
                data: results,
                message: `Monitored ${results.length} risk appetites`,
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

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
router.get('/breaches',
    authorize('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'EXECUTIVE', 'AUDITOR'),
    async (req: any, res) => {
        try {
            const breaches = await riskAppetiteService.listBreaches(
                req.user.organizationId,
                req.query.status as string
            );

            res.json({
                success: true,
                data: breaches,
                count: breaches.length,
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

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
router.post('/breaches/:breachId/resolve',
    validateUUID('breachId'),
    authorize('ADMIN', 'RISK_MANAGER', 'EXECUTIVE'),
    validateBody(ResolveBreachSchema),
    async (req: any, res) => {
        try {
            const breach = await riskAppetiteService.resolveBreach(
                req.params.breachId,
                req.body.mitigationPlan,
                req.body.mitigationOwner,
                req.body.resolutionNotes
            );

            res.json({
                success: true,
                data: breach,
                message: 'Breach resolved successfully',
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

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
router.get('/dashboard',
    authorize('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'EXECUTIVE', 'BOARD_MEMBER'),
    async (req: any, res) => {
        try {
            const dashboard = await riskAppetiteService.getDashboard(
                req.user.organizationId
            );

            res.json({
                success: true,
                data: dashboard,
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

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
router.get('/review-required',
    authorize('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER'),
    async (req: any, res) => {
        try {
            const appetites = await riskAppetiteService.getAppetitesRequiringReview(
                req.user.organizationId
            );

            res.json({
                success: true,
                data: appetites,
                count: appetites.length,
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

export default router;
