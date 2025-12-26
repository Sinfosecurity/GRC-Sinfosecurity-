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
declare class MobileService {
    /**
     * Register mobile device
     */
    registerDevice(userId: string, platform: 'ios' | 'android', pushToken?: string): MobileDevice;
    /**
     * Send push notification
     */
    sendPushNotification(deviceId: string, title: string, body: string, data?: Record<string, any>): Promise<boolean>;
    /**
     * Send push to all user devices
     */
    notifyUser(userId: string, title: string, body: string, data?: Record<string, any>): Promise<number>;
    /**
     * Get mobile-optimized workflows for user
     */
    getMobileWorkflows(userId: string): MobileWorkflow[];
    /**
     * Get mobile dashboard stats
     */
    getMobileDashboard(userId: string): {
        pendingTasks: number;
        criticalAlerts: number;
        recentActivity: string[];
        upcomingDeadlines: number;
    };
    /**
     * Submit mobile workflow
     */
    submitWorkflow(workflowId: string, formData: Record<string, any>): boolean;
    /**
     * Get device statistics
     */
    getDeviceStats(): {
        totalDevices: number;
        iosDevices: number;
        androidDevices: number;
        activeToday: number;
    };
}
declare const _default: MobileService;
export default _default;
//# sourceMappingURL=mobileService.d.ts.map