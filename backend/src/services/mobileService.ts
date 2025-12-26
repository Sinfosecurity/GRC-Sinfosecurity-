/**
 * Mobile Service
 * API endpoints and services optimized for mobile apps (iOS/Android)
 */
import logger from '../config/logger';

export interface MobileDevice {
    deviceId: string;
    userId: string;
    platform: 'ios' | 'android';
    pushToken?: string;
    appVersion: string;
    lastActive: Date;
}

export interface PushNotification {
    id: string;
    deviceId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    sentAt: Date;
    status: 'sent' | 'delivered' | 'failed';
}

export interface MobileWorkflow {
    id: string;
    title: string;
    type: 'assessment' | 'incident_report' | 'approval' | 'review';
    priority: 'low' | 'medium' | 'high' | 'critical';
    steps: MobileWorkflowStep[];
    status: 'pending' | 'in_progress' | 'completed';
}

export interface MobileWorkflowStep {
    id: string;
    title: string;
    type: 'form' | 'approval' | 'signature' | 'photo';
    required: boolean;
    completed: boolean;
}

// In-memory storage
const devices = new Map<string, MobileDevice>();
const notifications = new Map<string, PushNotification>();

class MobileService {
    /**
     * Register mobile device
     */
    registerDevice(userId: string, platform: 'ios' | 'android', pushToken?: string): MobileDevice {
        const deviceId = `device_${platform}_${Date.now()}`;

        const device: MobileDevice = {
            deviceId,
            userId,
            platform,
            pushToken,
            appVersion: '1.0.0',
            lastActive: new Date(),
        };

        devices.set(deviceId, device);
        logger.info(`📱 Registered ${platform} device for user ${userId}`);

        return device;
    }

    /**
     * Send push notification
     */
    async sendPushNotification(deviceId: string, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
        const device = devices.get(deviceId);

        if (!device || !device.pushToken) {
            logger.info(`❌ Cannot send push: device not found or no push token`);
            return false;
        }

        const notification: PushNotification = {
            id: `notif_${Date.now()}`,
            deviceId,
            title,
            body,
            data,
            sentAt: new Date(),
            status: 'sent',
        };

        notifications.set(notification.id, notification);

        logger.info(`📲 Push notification sent to ${device.platform} device`);
        logger.info(`   Title: ${title}`);
        logger.info(`   Body: ${body}`);

        // In production, use Firebase Cloud Messaging (Android) or APNs (iOS)
        // Example for FCM:
        // await admin.messaging().send({
        //   token: device.pushToken,
        //   notification: { title, body },
        //   data,
        // });

        return true;
    }

    /**
     * Send push to all user devices
     */
    async notifyUser(userId: string, title: string, body: string, data?: Record<string, any>): Promise<number> {
        const userDevices = Array.from(devices.values()).filter(d => d.userId === userId);

        let sent = 0;
        for (const device of userDevices) {
            const success = await this.sendPushNotification(device.deviceId, title, body, data);
            if (success) sent++;
        }

        return sent;
    }

    /**
     * Get mobile-optimized workflows for user
     */
    getMobileWorkflows(userId: string): MobileWorkflow[] {
        // Mock mobile workflows
        return [
            {
                id: 'mw_1',
                title: 'Quarterly Risk Assessment',
                type: 'assessment',
                priority: 'high',
                status: 'pending',
                steps: [
                    { id: 's1', title: 'Review risk categories', type: 'form', required: true, completed: false },
                    { id: 's2', title: 'Capture risk evidence', type: 'photo', required: false, completed: false },
                    { id: 's3', title: 'Submit for approval', type: 'approval', required: true, completed: false },
                ],
            },
            {
                id: 'mw_2',
                title: 'Security Incident Report',
                type: 'incident_report',
                priority: 'critical',
                status: 'in_progress',
                steps: [
                    { id: 's1', title: 'Incident details', type: 'form', required: true, completed: true },
                    { id: 's2', title: 'Photo evidence', type: 'photo', required: false, completed: false },
                    { id: 's3', title: 'Manager signature', type: 'signature', required: true, completed: false },
                ],
            },
            {
                id: 'mw_3',
                title: 'Policy Review',
                type: 'review',
                priority: 'medium',
                status: 'pending',
                steps: [
                    { id: 's1', title: 'Read updated policy', type: 'form', required: true, completed: false },
                    { id: 's2', title: 'Acknowledge changes', type: 'signature', required: true, completed: false },
                ],
            },
        ];
    }

    /**
     * Get mobile dashboard stats
     */
    getMobileDashboard(userId: string): {
        pendingTasks: number;
        criticalAlerts: number;
        recentActivity: string[];
        upcomingDeadlines: number;
    } {
        return {
            pendingTasks: 7,
            criticalAlerts: 3,
            recentActivity: [
                'New risk assessment assigned',
                'Incident INC-001 updated',
                'Compliance deadline in 3 days',
            ],
            upcomingDeadlines: 5,
        };
    }

    /**
     * Submit mobile workflow
     */
    submitWorkflow(workflowId: string, formData: Record<string, any>): boolean {
        logger.info(`📋 Mobile workflow ${workflowId} submitted`);
        logger.info('Form data:', formData);
        return true;
    }

    /**
     * Get device statistics
     */
    getDeviceStats(): {
        totalDevices: number;
        iosDevices: number;
        androidDevices: number;
        activeToday: number;
    } {
        const allDevices = Array.from(devices.values());
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return {
            totalDevices: allDevices.length,
            iosDevices: allDevices.filter(d => d.platform === 'ios').length,
            androidDevices: allDevices.filter(d => d.platform === 'android').length,
            activeToday: allDevices.filter(d => d.lastActive >= today).length,
        };
    }
}

export default new MobileService();
