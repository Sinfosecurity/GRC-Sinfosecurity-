/**
 * Notification Service
 * Orchestrates all notifications and alerts across the GRC platform
 */

import emailService from './emailService';
import { AuditService } from './auditService';

export interface NotificationPreferences {
    userId: string;
    email: string;
    enabled: boolean;
    highRiskIncidents: boolean;
    complianceDeadlines: boolean;
    assessmentOverdue: boolean;
    controlFailures: boolean;
    emailFrequency: 'immediate' | 'daily' | 'weekly';
}

export interface NotificationEvent {
    type: 'HIGH_RISK_INCIDENT' | 'COMPLIANCE_DEADLINE' | 'ASSESSMENT_OVERDUE' | 'CONTROL_FAILURE';
    severity: 'critical' | 'high' | 'medium' | 'low';
    data: any;
    recipients?: string[];
}

// In-memory storage for user preferences (will be moved to database later)
const userPreferences = new Map<string, NotificationPreferences>();

// Default notification preferences
const defaultPreferences: Omit<NotificationPreferences, 'userId' | 'email'> = {
    enabled: true,
    highRiskIncidents: true,
    complianceDeadlines: true,
    assessmentOverdue: true,
    controlFailures: true,
    emailFrequency: 'immediate',
};

class NotificationService {
    /**
     * Initialize notification preferences for a user
     */
    initializePreferences(userId: string, email: string): NotificationPreferences {
        const preferences: NotificationPreferences = {
            userId,
            email,
            ...defaultPreferences,
        };

        userPreferences.set(userId, preferences);
        return preferences;
    }

    /**
     * Get user notification preferences
     */
    getPreferences(userId: string): NotificationPreferences | undefined {
        return userPreferences.get(userId);
    }

    /**
     * Update user notification preferences
     */
    updatePreferences(
        userId: string,
        updates: Partial<NotificationPreferences>
    ): NotificationPreferences {
        const current = userPreferences.get(userId) || {
            userId,
            email: '',
            ...defaultPreferences,
        };

        const updated = { ...current, ...updates };
        userPreferences.set(userId, updated);

        // Log preference changes
        AuditService.log({
            userId,
            userName: 'User',
            action: 'update_notification_preferences',
            resourceType: 'NotificationPreferences',
            resourceId: userId,
            changes: updates,
            status: 'success',
            details: 'Updated notification preferences',
        });

        return updated;
    }

    /**
     * Send a notification event
     */
    async notify(event: NotificationEvent): Promise<void> {
        logger.info(`\n🔔 Processing notification: ${event.type} (${event.severity})`);

        // Determine recipients
        const recipients = event.recipients || this.getDefaultRecipients(event.type);

        if (recipients.length === 0) {
            logger.info('⚠️ No recipients configured for this notification type');
            return;
        }

        // Filter recipients based on their preferences
        const eligibleRecipients = this.filterByPreferences(recipients, event.type);

        if (eligibleRecipients.length === 0) {
            logger.info('⚠️ All recipients have disabled this notification type');
            return;
        }

        // Send notifications based on event type
        switch (event.type) {
            case 'HIGH_RISK_INCIDENT':
                await this.notifyHighRiskIncident(eligibleRecipients, event.data);
                break;
            case 'COMPLIANCE_DEADLINE':
                await this.notifyComplianceDeadline(eligibleRecipients, event.data);
                break;
            case 'ASSESSMENT_OVERDUE':
                await this.notifyAssessmentOverdue(eligibleRecipients, event.data);
                break;
            case 'CONTROL_FAILURE':
                await this.notifyControlFailure(eligibleRecipients, event.data);
                break;
        }

        // Log notification
        AuditService.log({
            userId: 'system',
            userName: 'System',
            action: 'send_notification',
            resourceType: 'Notification',
            resourceId: event.type,
            status: 'success',
            details: `Sent ${event.type} notification to ${eligibleRecipients.length} recipients`,
        });
    }

    /**
     * Notify about high-risk incidents
     */
    private async notifyHighRiskIncident(recipients: string[], data: any): Promise<void> {
        await emailService.sendHighRiskIncident(recipients, {
            incidentId: data.id,
            title: data.title,
            severity: data.severity,
            reportedBy: data.reportedBy || 'Unknown',
            timestamp: data.timestamp || new Date(),
            description: data.description || 'No description provided',
            link: `${this.getBaseUrl()}/incident-management?id=${data.id}`,
        });
    }

    /**
     * Notify about upcoming compliance deadlines
     */
    private async notifyComplianceDeadline(recipients: string[], data: any): Promise<void> {
        const deadline = new Date(data.deadline);
        const now = new Date();
        const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        await emailService.sendComplianceDeadline(recipients, {
            framework: data.framework,
            requirement: data.requirement,
            deadline: data.deadline,
            daysRemaining,
            status: data.status || 'In Progress',
            link: `${this.getBaseUrl()}/compliance-management`,
        });
    }

    /**
     * Notify about overdue assessments
     */
    private async notifyAssessmentOverdue(recipients: string[], data: any): Promise<void> {
        const dueDate = new Date(data.dueDate);
        const now = new Date();
        const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        await emailService.sendAssessmentOverdue(recipients, {
            assessmentType: data.type || 'Risk Assessment',
            assessmentName: data.name,
            dueDate: data.dueDate,
            daysOverdue,
            assignedTo: data.assignedTo || 'Unassigned',
            link: `${this.getBaseUrl()}/risk-management`,
        });
    }

    /**
     * Notify about control failures
     */
    private async notifyControlFailure(recipients: string[], data: any): Promise<void> {
        await emailService.sendControlFailure(recipients, {
            controlId: data.id,
            controlName: data.name,
            category: data.category || 'General',
            detectedAt: data.detectedAt || new Date(),
            impact: data.impact || 'High',
            link: `${this.getBaseUrl()}/controls-management?id=${data.id}`,
        });
    }

    /**
     * Filter recipients based on their notification preferences
     */
    private filterByPreferences(recipients: string[], eventType: string): string[] {
        return recipients.filter(email => {
            // Find user preferences by email
            let userPrefs: NotificationPreferences | undefined;

            for (const [_, prefs] of userPreferences) {
                if (prefs.email === email) {
                    userPrefs = prefs;
                    break;
                }
            }

            // If no preferences found, use defaults (send notification)
            if (!userPrefs) {
                return true;
            }

            // Check if notifications are enabled
            if (!userPrefs.enabled) {
                return false;
            }

            // Check event-specific preferences
            switch (eventType) {
                case 'HIGH_RISK_INCIDENT':
                    return userPrefs.highRiskIncidents;
                case 'COMPLIANCE_DEADLINE':
                    return userPrefs.complianceDeadlines;
                case 'ASSESSMENT_OVERDUE':
                    return userPrefs.assessmentOverdue;
                case 'CONTROL_FAILURE':
                    return userPrefs.controlFailures;
                default:
                    return true;
            }
        });
    }

    /**
     * Get default recipients for a notification type
     * In production, this would pull from user roles/permissions
     */
    private getDefaultRecipients(eventType: string): string[] {
        // For now, return demo recipients
        // In production, query from database based on roles
        const defaultEmails = process.env.DEFAULT_NOTIFICATION_EMAILS?.split(',') || [];

        return defaultEmails;
    }

    /**
     * Get base URL for links in emails
     */
    private getBaseUrl(): string {
        return process.env.FRONTEND_URL || 'https://grc-sinfosecurity-frontend.vercel.app';
    }

    /**
     * Check for upcoming deadlines and send alerts
     * This should be called by a scheduled job (cron)
     */
    async checkComplianceDeadlines(): Promise<void> {
        logger.info('🔍 Checking compliance deadlines...');

        // Mock data - in production, query from database
        const upcomingDeadlines = [
            {
                framework: 'SOC 2',
                requirement: 'Annual Security Assessment',
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                status: 'In Progress',
            },
        ];

        for (const deadline of upcomingDeadlines) {
            const daysUntil = Math.ceil(
                (deadline.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            // Send alerts at 30, 14, 7, 3, and 1 days before deadline
            if ([30, 14, 7, 3, 1].includes(daysUntil)) {
                await this.notify({
                    type: 'COMPLIANCE_DEADLINE',
                    severity: daysUntil <= 3 ? 'critical' : daysUntil <= 7 ? 'high' : 'medium',
                    data: deadline,
                });
            }
        }
    }

    /**
     * Check for overdue assessments and send alerts
     * This should be called by a scheduled job (cron)
     */
    async checkOverdueAssessments(): Promise<void> {
        logger.info('🔍 Checking overdue assessments...');

        // Mock data - in production, query from database
        const overdueAssessments: any[] = [];

        for (const assessment of overdueAssessments) {
            await this.notify({
                type: 'ASSESSMENT_OVERDUE',
                severity: 'high',
                data: assessment,
            });
        }
    }
}

// Export singleton instance
export default new NotificationService();
