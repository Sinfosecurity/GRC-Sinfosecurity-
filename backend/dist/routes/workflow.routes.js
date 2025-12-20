"use strict";
/**
 * Workflow Management API Routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const workflowEngine_1 = __importDefault(require("../services/workflowEngine"));
const auth_1 = require("../middleware/auth");
const userService_1 = require("../services/userService");
const router = (0, express_1.Router)();
/**
 * GET /api/workflows
 * Get all workflows
 */
router.get('/', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.VIEW_RISK), (req, res) => {
    try {
        const workflows = workflowEngine_1.default.getAllWorkflows();
        res.json({
            success: true,
            count: workflows.length,
            data: workflows,
        });
    }
    catch (error) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch workflows',
        });
    }
});
/**
 * GET /api/workflows/:id
 * Get workflow by ID
 */
router.get('/:id', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.VIEW_RISK), (req, res) => {
    try {
        const { id } = req.params;
        const workflow = workflowEngine_1.default.getWorkflowById(id);
        if (!workflow) {
            return res.status(404).json({
                success: false,
                error: 'Workflow not found',
            });
        }
        res.json({
            success: true,
            data: workflow,
        });
    }
    catch (error) {
        console.error('Error fetching workflow:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch workflow',
        });
    }
});
/**
 * POST /api/workflows
 * Create new workflow
 */
router.post('/', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.CREATE_RISK), (req, res) => {
    try {
        const userId = req.user?.id;
        const workflowData = {
            ...req.body,
            createdBy: userId,
        };
        const workflow = workflowEngine_1.default.createWorkflow(workflowData);
        res.status(201).json({
            success: true,
            data: workflow,
            message: 'Workflow created successfully',
        });
    }
    catch (error) {
        console.error('Error creating workflow:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create workflow',
        });
    }
});
/**
 * PUT /api/workflows/:id
 * Update workflow
 */
router.put('/:id', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.EDIT_RISK), (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const workflow = workflowEngine_1.default.updateWorkflow(id, updates);
        if (!workflow) {
            return res.status(404).json({
                success: false,
                error: 'Workflow not found',
            });
        }
        res.json({
            success: true,
            data: workflow,
            message: 'Workflow updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating workflow:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update workflow',
        });
    }
});
/**
 * DELETE /api/workflows/:id
 * Delete workflow
 */
router.delete('/:id', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.DELETE_RISK), (req, res) => {
    try {
        const { id } = req.params;
        const success = workflowEngine_1.default.deleteWorkflow(id);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Workflow not found',
            });
        }
        res.json({
            success: true,
            message: 'Workflow deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting workflow:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete workflow',
        });
    }
});
/**
 * POST /api/workflows/:id/execute
 * Execute workflow manually
 */
router.post('/:id/execute', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.CREATE_RISK), async (req, res) => {
    try {
        const { id } = req.params;
        const context = req.body;
        const execution = await workflowEngine_1.default.executeWorkflow(id, context);
        res.json({
            success: true,
            data: execution,
            message: 'Workflow executed successfully',
        });
    }
    catch (error) {
        console.error('Error executing workflow:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to execute workflow',
        });
    }
});
/**
 * GET /api/workflows/:id/history
 * Get workflow execution history
 */
router.get('/:id/history', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.VIEW_RISK), (req, res) => {
    try {
        const { id } = req.params;
        const history = workflowEngine_1.default.getExecutionHistory(id);
        res.json({
            success: true,
            count: history.length,
            data: history,
        });
    }
    catch (error) {
        console.error('Error fetching execution history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch execution history',
        });
    }
});
/**
 * GET /api/workflows/executions/all
 * Get all workflow executions
 */
router.get('/executions/all', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.VIEW_RISK), (req, res) => {
    try {
        const executions = workflowEngine_1.default.getAllExecutions();
        res.json({
            success: true,
            count: executions.length,
            data: executions,
        });
    }
    catch (error) {
        console.error('Error fetching executions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch executions',
        });
    }
});
exports.default = router;
//# sourceMappingURL=workflow.routes.js.map