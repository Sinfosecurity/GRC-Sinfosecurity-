"use strict";
/**
 * API v1 - Tasks Endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const taskService_1 = __importDefault(require("../../services/taskService"));
const router = (0, express_1.Router)();
/**
 * GET /api/v1/tasks
 * List all tasks
 */
router.get('/', (req, res) => {
    try {
        const { status, priority, assignedTo } = req.query;
        const tasks = taskService_1.default.getAllTasks({
            status: status,
            priority: priority,
            assignedTo: assignedTo,
        });
        res.json({
            success: true,
            count: tasks.length,
            data: tasks,
        });
    }
    catch (error) {
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
router.get('/:id', (req, res) => {
    try {
        const task = taskService_1.default.getTaskById(req.params.id);
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
router.post('/', (req, res) => {
    try {
        const task = taskService_1.default.createTask(req.body);
        res.status(201).json({
            success: true,
            data: task,
            message: 'Task created successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create task',
        });
    }
});
exports.default = router;
//# sourceMappingURL=tasks.js.map