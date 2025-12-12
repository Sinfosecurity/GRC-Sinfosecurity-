/**
 * Workflow Management API Routes
 */

import { Router, Request, Response } from 'express';
import workflowEngine from '../services/workflowEngine';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '../services/userService';

const router = Router();

/**
 * GET /api/workflows
 * Get all workflows
 */
router.get('/', authenticate, requirePermission(Permission.VIEW_RISK), (req: Request, res: Response) => {
    try {
        const workflows = workflowEngine.getAllWorkflows();

        res.json({
            success: true,
            count: workflows.length,
            data: workflows,
        });
    } catch (error) {
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
router.get('/:id', authenticate, requirePermission(Permission.VIEW_RISK), (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const workflow = workflowEngine.getWorkflowById(id);

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
    } catch (error) {
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
router.post('/', authenticate, requirePermission(Permission.CREATE_RISK), (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const workflowData = {
            ...req.body,
            createdBy: userId,
        };

        const workflow = workflowEngine.createWorkflow(workflowData);

        res.status(201).json({
            success: true,
            data: workflow,
            message: 'Workflow created successfully',
        });
    } catch (error) {
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
router.put('/:id', authenticate, requirePermission(Permission.EDIT_RISK), (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const workflow = workflowEngine.updateWorkflow(id, updates);

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
    } catch (error) {
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
router.delete('/:id', authenticate, requirePermission(Permission.DELETE_RISK), (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const success = workflowEngine.deleteWorkflow(id);

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
    } catch (error) {
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
router.post('/:id/execute', authenticate, requirePermission(Permission.CREATE_RISK), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const context = req.body;

        const execution = await workflowEngine.executeWorkflow(id, context);

        res.json({
            success: true,
            data: execution,
            message: 'Workflow executed successfully',
        });
    } catch (error) {
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
router.get('/:id/history', authenticate, requirePermission(Permission.VIEW_RISK), (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const history = workflowEngine.getExecutionHistory(id);

        res.json({
            success: true,
            count: history.length,
            data: history,
        });
    } catch (error) {
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
router.get('/executions/all', authenticate, requirePermission(Permission.VIEW_RISK), (req: Request, res: Response) => {
    try {
        const executions = workflowEngine.getAllExecutions();

        res.json({
            success: true,
            count: executions.length,
            data: executions,
        });
    } catch (error) {
        console.error('Error fetching executions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch executions',
        });
    }
});

export default router;
