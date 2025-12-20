"use strict";
/**
 * Notification API Routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationService_1 = __importDefault(require("../services/notificationService"));
const router = (0, express_1.Router)();
/**
 * GET /api/notifications/preferences/:userId
 * Get user notification preferences
 */
router.get('/preferences/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const preferences = notificationService_1.default.getPreferences(userId);
        if (!preferences) {
            return res.status(404).json({
                success: false,
                error: 'Preferences not found for this user',
            });
        }
        res.json({
            success: true,
            data: preferences,
        });
    }
    catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notification preferences',
        });
    }
});
/**
 * POST /api/notifications/preferences/:userId
 * Update user notification preferences
 */
router.post('/preferences/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;
        const preferences = notificationService_1.default.updatePreferences(userId, updates);
        res.json({
            success: true,
            data: preferences,
            message: 'Notification preferences updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update notification preferences',
        });
    }
});
/**
 * POST /api/notifications/preferences
 * Initialize notification preferences for a new user
 */
router.post('/preferences', (req, res) => {
    try {
        const { userId, email } = req.body;
        if (!userId || !email) {
            return res.status(400).json({
                success: false,
                error: 'userId and email are required',
            });
        }
        const preferences = notificationService_1.default.initializePreferences(userId, email);
        res.json({
            success: true,
            data: preferences,
            message: 'Notification preferences initialized',
        });
    }
    catch (error) {
        console.error('Error initializing preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initialize notification preferences',
        });
    }
});
/**
 * POST /api/notifications/send
 * Send a notification (admin/system use)
 */
router.post('/send', async (req, res) => {
    try {
        const { type, severity, data, recipients } = req.body;
        if (!type || !data) {
            return res.status(400).json({
                success: false,
                error: 'type and data are required',
            });
        }
        await notificationService_1.default.notify({
            type,
            severity: severity || 'medium',
            data,
            recipients,
        });
        res.json({
            success: true,
            message: 'Notification sent successfully',
        });
    }
    catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send notification',
        });
    }
});
/**
 * POST /api/notifications/test
 * Send a test notification
 */
router.post('/test', async (req, res) => {
    try {
        const { email, type } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'email is required',
            });
        }
        const testData = {
            HIGH_RISK_INCIDENT: {
                id: 'TEST-001',
                title: 'Test High-Risk Incident',
                severity: 'Critical',
                reportedBy: 'Test User',
                timestamp: new Date(),
                description: 'This is a test incident notification',
            },
            COMPLIANCE_DEADLINE: {
                framework: 'SOC 2',
                requirement: 'Test Compliance Requirement',
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'In Progress',
            },
            ASSESSMENT_OVERDUE: {
                type: 'Risk Assessment',
                name: 'Test Assessment',
                dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                assignedTo: 'Test User',
            },
            CONTROL_FAILURE: {
                id: 'CTRL-001',
                name: 'Test Control',
                category: 'Access Control',
                detectedAt: new Date(),
                impact: 'High',
            },
        };
        const notificationType = type || 'HIGH_RISK_INCIDENT';
        await notificationService_1.default.notify({
            type: notificationType,
            severity: 'medium',
            data: testData[notificationType],
            recipients: [email],
        });
        res.json({
            success: true,
            message: `Test notification sent to ${email}`,
        });
    }
    catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send test notification',
        });
    }
});
exports.default = router;
//# sourceMappingURL=notification.routes.js.map