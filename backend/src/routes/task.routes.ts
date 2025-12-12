/**
 * Task Management API Routes
 */

import { Router, Request, Response } from 'express';
import taskService from '../services/taskService';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '../services/userService';

const router = Router();

/**
 * GET /api/tasks
 * Get all tasks with optional filters
 */
router.get('/', authenticate, requirePermission(Permission.VIEW_RISK), (req: Request, res: Response) => {
    try {
        const { status, assignedTo, priority, type, overdue } = req.query;

        const tasks = taskService.getAllTasks({
            status: status as any,
            assignedTo: assignedTo as string,
            priority: priority as any,
            type: type as any,
            overdue: overdue === 'true',
        });

        res.json({
            success: true,
            count: tasks.length,
            data: tasks,
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tasks',
        });
    }
});

/**
 * GET /api/tasks/my
 * Get tasks assigned to current user
 */
router.get('/my', authenticate, (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
            });
        }

        const tasks = taskService.getUserTasks(userId);

        res.json({
            success: true,
            count: tasks.length,
            data: tasks,
        });
    } catch (error) {
        console.error('Error fetching user tasks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user tasks',
        });
    }
});

/**
 * GET /api/tasks/stats
 * Get task statistics
 */
router.get('/stats', authenticate, (req: Request, res: Response) => {
    try {
        const stats = taskService.getTaskStats();

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Error fetching task stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch task statistics',
        });
    }
});

/**
 * GET /api/tasks/:id
 * Get task by ID
 */
router.get('/:id', authenticate, (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const task = taskService.getTaskById(id);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found',
            });
        }

        res.json({
            success: true,
            data: task,
        });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch task',
        });
    }
});

/**
 * POST /api/tasks
 * Create new task
 */
router.post('/', authenticate, requirePermission(Permission.CREATE_RISK), (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const taskData = {
            ...req.body,
            assignedBy: userId,
            assignedAt: new Date(),
        };

        const task = taskService.createTask(taskData);

        res.status(201).json({
            success: true,
            data: task,
            message: 'Task created successfully',
        });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create task',
        });
    }
});

/**
 * PUT /api/tasks/:id
 * Update task
 */
router.put('/:id', authenticate, requirePermission(Permission.EDIT_RISK), (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const task = taskService.updateTask(id, updates);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found',
            });
        }

        res.json({
            success: true,
            data: task,
            message: 'Task updated successfully',
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update task',
        });
    }
});

/**
 * PUT /api/tasks/:id/assign
 * Assign task to user
 */
router.put('/:id/assign', authenticate, requirePermission(Permission.EDIT_RISK), (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const assignedBy = (req as any).user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required',
            });
        }

        const task = taskService.assignTask(id, userId, assignedBy);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found',
            });
        }

        res.json({
            success: true,
            data: task,
            message: 'Task assigned successfully',
        });
    } catch (error) {
        console.error('Error assigning task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign task',
        });
    }
});

/**
 * PUT /api/tasks/:id/complete
 * Mark task as complete
 */
router.put('/:id/complete', authenticate, (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const completedBy = (req as any).user?.id;

        if (!completedBy) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
            });
        }

        const task = taskService.completeTask(id, completedBy, notes);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found',
            });
        }

        res.json({
            success: true,
            data: task,
            message: 'Task completed successfully',
        });
    } catch (error) {
        console.error('Error completing task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete task',
        });
    }
});

/**
 * DELETE /api/tasks/:id
 * Delete task
 */
router.delete('/:id', authenticate, requirePermission(Permission.DELETE_RISK), (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const success = taskService.deleteTask(id);

        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Task not found',
            });
        }

        res.json({
            success: true,
            message: 'Task deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete task',
        });
    }
});

export default router;
