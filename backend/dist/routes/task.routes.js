"use strict";
/**
 * Task Management API Routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const taskService_1 = __importDefault(require("../services/taskService"));
const auth_1 = require("../middleware/auth");
const userService_1 = require("../services/userService");
const router = (0, express_1.Router)();
/**
 * GET /api/tasks
 * Get all tasks with optional filters
 */
router.get('/', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.VIEW_RISK), (req, res) => {
    try {
        const { status, assignedTo, priority, type, overdue } = req.query;
        const tasks = taskService_1.default.getAllTasks({
            status: status,
            assignedTo: assignedTo,
            priority: priority,
            type: type,
            overdue: overdue === 'true',
        });
        res.json({
            success: true,
            count: tasks.length,
            data: tasks,
        });
    }
    catch (error) {
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
router.get('/my', auth_1.authenticate, (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
            });
        }
        const tasks = taskService_1.default.getUserTasks(userId);
        res.json({
            success: true,
            count: tasks.length,
            data: tasks,
        });
    }
    catch (error) {
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
router.get('/stats', auth_1.authenticate, (req, res) => {
    try {
        const stats = taskService_1.default.getTaskStats();
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
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
router.get('/:id', auth_1.authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const task = taskService_1.default.getTaskById(id);
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
    }
    catch (error) {
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
router.post('/', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.CREATE_RISK), (req, res) => {
    try {
        const userId = req.user?.id;
        const taskData = {
            ...req.body,
            assignedBy: userId,
            assignedAt: new Date(),
        };
        const task = taskService_1.default.createTask(taskData);
        res.status(201).json({
            success: true,
            data: task,
            message: 'Task created successfully',
        });
    }
    catch (error) {
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
router.put('/:id', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.EDIT_RISK), (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const task = taskService_1.default.updateTask(id, updates);
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
    }
    catch (error) {
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
router.put('/:id/assign', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.EDIT_RISK), (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const assignedBy = req.user?.id;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required',
            });
        }
        const task = taskService_1.default.assignTask(id, userId, assignedBy);
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
    }
    catch (error) {
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
router.put('/:id/complete', auth_1.authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const completedBy = req.user?.id;
        if (!completedBy) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
            });
        }
        const task = taskService_1.default.completeTask(id, completedBy, notes);
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
    }
    catch (error) {
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
router.delete('/:id', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.DELETE_RISK), (req, res) => {
    try {
        const { id } = req.params;
        const success = taskService_1.default.deleteTask(id);
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
    }
    catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete task',
        });
    }
});
exports.default = router;
//# sourceMappingURL=task.routes.js.map