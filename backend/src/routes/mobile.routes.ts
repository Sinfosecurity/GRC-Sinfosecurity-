/**
 * Mobile API Routes
 * REST endpoints for iOS/Android mobile apps
 */

import { Router, Request, Response } from 'express';
import mobileService from '../services/mobileService';

const router = Router();

/**
 * POST /api/mobile/register
 * Register mobile device
 */
router.post('/register', (req: Request, res: Response) => {
    try {
        const { userId, platform, pushToken } = req.body;

        if (!userId || !platform) {
            return res.status(400).json({
                success: false,
                error: 'userId and platform are required',
            });
        }

        const device = mobileService.registerDevice(userId, platform, pushToken);

        res.json({
            success: true,
            data: device,
            message: 'Device registered successfully',
        });
    } catch (error) {
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
router.post('/push', async (req: Request, res: Response) => {
    try {
        const { deviceId, title, body, data } = req.body;

        if (!deviceId || !title || !body) {
            return res.status(400).json({
                success: false,
                error: 'deviceId, title, and body are required',
            });
        }

        const sent = await mobileService.sendPushNotification(deviceId, title, body, data);

        res.json({
            success: sent,
            message: sent ? 'Push notification sent' : 'Failed to send notification',
        });
    } catch (error) {
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
router.post('/notify-user', async (req: Request, res: Response) => {
    try {
        const { userId, title, body, data } = req.body;

        const sentCount = await mobileService.notifyUser(userId, title, body, data);

        res.json({
            success: true,
            sentCount,
            message: `Notification sent to ${sentCount} device(s)`,
        });
    } catch (error) {
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
router.get('/workflows/:userId', (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const workflows = mobileService.getMobileWorkflows(userId);

        res.json({
            success: true,
            data: workflows,
        });
    } catch (error) {
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
router.get('/dashboard/:userId', (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const dashboard = mobileService.getMobileDashboard(userId);

        res.json({
            success: true,
            data: dashboard,
        });
    } catch (error) {
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
router.post('/workflows/:workflowId/submit', (req: Request, res: Response) => {
    try {
        const { workflowId } = req.params;
        const formData = req.body;

        const success = mobileService.submitWorkflow(workflowId, formData);

        res.json({
            success,
            message: success ? 'Workflow submitted successfully' : 'Failed to submit workflow',
        });
    } catch (error) {
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
router.get('/stats', (req: Request, res: Response) => {
    try {
        const stats = mobileService.getDeviceStats();

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stats',
        });
    }
});

export default router;
