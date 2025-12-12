/**
 * API v1 - Tasks Endpoints
 */

import { Router, Request, Response } from 'express';
import taskService from '../../services/taskService';

const router = Router();

/**
 * GET /api/v1/tasks
 * List all tasks
 */
router.get('/', (req: Request, res: Response) => {
    try {
        const { status, priority, assignedTo } = req.query;

        const tasks = taskService.getAllTasks({
            status: status as any,
            priority: priority as any,
            assignedTo: assignedTo as string,
        });

        res.json({
            success: true,
            count: tasks.length,
            data: tasks,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tasks',
        });
    }
});

/**
 * GET /api/v1/tasks/:id
 * Get task by ID
 */
router.get('/:id', (req: Request, res: Response) => {
    try {
        const task = taskService.getTaskById(req.params.id);

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
        res.status(500).json({
            success: false,
            error: 'Failed to fetch task',
        });
    }
});

/**
 * POST /api/v1/tasks
 * Create new task
 */
router.post('/', (req: Request, res: Response) => {
    try {
        const task = taskService.createTask(req.body);

        res.status(201).json({
            success: true,
            data: task,
            message: 'Task created successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create task',
        });
    }
});

export default router;
