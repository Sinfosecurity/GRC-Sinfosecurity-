"use strict";
/**
 * Mobile API Routes
 * REST endpoints for iOS/Android mobile apps
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mobileService_1 = __importDefault(require("../services/mobileService"));
const router = (0, express_1.Router)();
/**
 * POST /api/mobile/register
 * Register mobile device
 */
router.post('/register', (req, res) => {
    try {
        const { userId, platform, pushToken } = req.body;
        if (!userId || !platform) {
            return res.status(400).json({
                success: false,
                error: 'userId and platform are required',
            });
        }
        const device = mobileService_1.default.registerDevice(userId, platform, pushToken);
        res.json({
            success: true,
            data: device,
            message: 'Device registered successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to register device',
        });
    }
});
/**
 * POST /api/mobile/push
 * Send push notification
 */
router.post('/push', async (req, res) => {
    try {
        const { deviceId, title, body, data } = req.body;
        if (!deviceId || !title || !body) {
            return res.status(400).json({
                success: false,
                error: 'deviceId, title, and body are required',
            });
        }
        const sent = await mobileService_1.default.sendPushNotification(deviceId, title, body, data);
        res.json({
            success: sent,
            message: sent ? 'Push notification sent' : 'Failed to send notification',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to send push notification',
        });
    }
});
/**
 * POST /api/mobile/notify-user
 * Send push to all user devices
 */
router.post('/notify-user', async (req, res) => {
    try {
        const { userId, title, body, data } = req.body;
        const sentCount = await mobileService_1.default.notifyUser(userId, title, body, data);
        res.json({
            success: true,
            sentCount,
            message: `Notification sent to ${sentCount} device(s)`,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to send notifications',
        });
    }
});
/**
 * GET /api/mobile/workflows/:userId
 * Get mobile-optimized workflows
 */
router.get('/workflows/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const workflows = mobileService_1.default.getMobileWorkflows(userId);
        res.json({
            success: true,
            data: workflows,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch workflows',
        });
    }
});
/**
 * GET /api/mobile/dashboard/:userId
 * Get mobile dashboard data
 */
router.get('/dashboard/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const dashboard = mobileService_1.default.getMobileDashboard(userId);
        res.json({
            success: true,
            data: dashboard,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard',
        });
    }
});
/**
 * POST /api/mobile/workflows/:workflowId/submit
 * Submit mobile workflow
 */
router.post('/workflows/:workflowId/submit', (req, res) => {
    try {
        const { workflowId } = req.params;
        const formData = req.body;
        const success = mobileService_1.default.submitWorkflow(workflowId, formData);
        res.json({
            success,
            message: success ? 'Workflow submitted successfully' : 'Failed to submit workflow',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to submit workflow',
        });
    }
});
/**
 * GET /api/mobile/stats
 * Get mobile device statistics
 */
router.get('/stats', (req, res) => {
    try {
        const stats = mobileService_1.default.getDeviceStats();
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stats',
        });
    }
});
exports.default = router;
//# sourceMappingURL=mobile.routes.js.map