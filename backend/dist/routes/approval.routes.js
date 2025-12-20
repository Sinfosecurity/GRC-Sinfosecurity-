"use strict";
/**
 * Vendor Approval Workflow API Routes
 * Enterprise approval management endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const approval_validators_1 = require("../validators/approval.validators");
const vendorApprovalWorkflow_1 = __importDefault(require("../services/vendorApprovalWorkflow"));
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(auth_1.authenticate);
/**
 * @swagger
 * /api/v1/vendors/approvals/workflows:
 *   post:
 *     summary: Create a new approval workflow
 *     description: Initiate a multi-level approval workflow for vendor onboarding, changes, or risk acceptance
 *     tags: [Vendor Approvals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vendorId
 *               - workflowType
 *               - approvalChain
 *             properties:
 *               vendorId:
 *                 type: string
 *                 format: uuid
 *               workflowType:
 *                 type: string
 *                 enum: [ONBOARDING, CONTRACT_RENEWAL, TIER_CHANGE, REASSESSMENT_APPROVAL, RISK_ACCEPTANCE, TERMINATION]
 *               businessJustification:
 *                 type: string
 *               riskAssessmentSummary:
 *                 type: string
 *               approvalChain:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     approverRole:
 *                       type: string
 *                     approverUserId:
 *                       type: string
 *                     approverName:
 *                       type: string
 *     responses:
 *       201:
 *         description: Workflow created successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Vendor not found
 */
router.post('/workflows', (0, validation_1.validateBody)(approval_validators_1.CreateWorkflowSchema), async (req, res) => {
    try {
        const workflow = await vendorApprovalWorkflow_1.default.createWorkflow({
            ...req.body,
            organizationId: req.user.organizationId,
            initiatedBy: req.user.id,
        });
        res.status(201).json({
            success: true,
            data: workflow,
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
 * /api/v1/vendors/approvals/workflows/{workflowId}:
 *   get:
 *     summary: Get workflow details
 *     description: Retrieve workflow with all approval steps
 *     tags: [Vendor Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workflow details
 *       404:
 *         description: Workflow not found
 */
router.get('/workflows/:workflowId', (0, validation_1.validateUUID)('workflowId'), async (req, res) => {
    try {
        const workflow = await vendorApprovalWorkflow_1.default.getWorkflowById(req.params.workflowId, req.user.organizationId);
        res.json({
            success: true,
            data: workflow,
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
 * /api/v1/vendors/approvals/workflows/{workflowId}/steps/{stepOrder}/approve:
 *   post:
 *     summary: Submit approval decision
 *     description: Approve, reject, or escalate a workflow step
 *     tags: [Vendor Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: stepOrder
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, CONDITIONALLY_APPROVED, ESCALATED, DEFERRED]
 *               comments:
 *                 type: string
 *               conditions:
 *                 type: array
 *                 items:
 *                   type: string
 *               digitalSignature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Decision recorded successfully
 *       400:
 *         description: Invalid decision or step already decided
 *       404:
 *         description: Workflow or step not found
 */
router.post('/workflows/:workflowId/steps/:stepOrder/approve', (0, validation_1.validateUUID)('workflowId'), async (req, res) => {
    try {
        const workflow = await vendorApprovalWorkflow_1.default.submitApprovalDecision({
            workflowId: req.params.workflowId,
            stepOrder: parseInt(req.params.stepOrder),
            decision: req.body.decision,
            decidedBy: req.user.id,
            comments: req.body.comments,
            conditions: req.body.conditions,
            digitalSignature: req.body.digitalSignature,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        res.json({
            success: true,
            data: workflow,
            message: `Approval decision recorded: ${req.body.decision}`,
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
 * /api/v1/vendors/approvals/vendors/{vendorId}/workflows:
 *   get:
 *     summary: List workflows for a vendor
 *     description: Get all approval workflows for a specific vendor
 *     tags: [Vendor Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of workflows
 */
router.get('/vendors/:vendorId/workflows', (0, validation_1.validateUUID)('vendorId'), async (req, res) => {
    try {
        const workflows = await vendorApprovalWorkflow_1.default.listVendorWorkflows(req.params.vendorId, req.user.organizationId);
        res.json({
            success: true,
            data: workflows,
            count: workflows.length,
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
 * /api/v1/vendors/approvals/pending:
 *   get:
 *     summary: Get pending approvals for current user
 *     description: Retrieve all workflows awaiting approval by the authenticated user
 *     tags: [Vendor Approvals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending approvals
 */
router.get('/pending', async (req, res) => {
    try {
        const pendingApprovals = await vendorApprovalWorkflow_1.default.listPendingApprovals(req.user.id, req.user.organizationId);
        res.json({
            success: true,
            data: pendingApprovals,
            count: pendingApprovals.length,
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
 * /api/v1/vendors/approvals/workflows/{workflowId}/cancel:
 *   post:
 *     summary: Cancel a workflow
 *     description: Cancel a pending or in-progress workflow
 *     tags: [Vendor Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowId
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Workflow cancelled
 *       400:
 *         description: Cannot cancel completed workflow
 *       404:
 *         description: Workflow not found
 */
router.post('/workflows/:workflowId/cancel', (0, validation_1.validateUUID)('workflowId'), (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER'), async (req, res) => {
    try {
        const workflow = await vendorApprovalWorkflow_1.default.cancelWorkflow(req.params.workflowId, req.user.organizationId, req.user.id, req.body.reason);
        res.json({
            success: true,
            data: workflow,
            message: 'Workflow cancelled successfully',
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
 * /api/v1/vendors/approvals/statistics:
 *   get:
 *     summary: Get workflow statistics
 *     description: Retrieve approval workflow statistics for the organization
 *     tags: [Vendor Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Workflow statistics
 */
router.get('/statistics', (0, auth_1.authorize)('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER'), async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const statistics = await vendorApprovalWorkflow_1.default.getWorkflowStatistics(req.user.organizationId, startDate, endDate);
        res.json({
            success: true,
            data: statistics,
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
//# sourceMappingURL=approval.routes.js.map