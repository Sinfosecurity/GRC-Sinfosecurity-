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
declare class NotificationService {
    /**
     * Initialize notification preferences for a user
     */
    initializePreferences(userId: string, email: string): NotificationPreferences;
    /**
     * Get user notification preferences
     */
    getPreferences(userId: string): NotificationPreferences | undefined;
    /**
     * Update user notification preferences
     */
    updatePreferences(userId: string, updates: Partial<NotificationPreferences>): NotificationPreferences;
    /**
     * Send a notification event
     */
    notify(event: NotificationEvent): Promise<void>;
    /**
     * Notify about high-risk incidents
     */
    private notifyHighRiskIncident;
    /**
     * Notify about upcoming compliance deadlines
     */
    private notifyComplianceDeadline;
    /**
     * Notify about overdue assessments
     */
    private notifyAssessmentOverdue;
    /**
     * Notify about control failures
     */
    private notifyControlFailure;
    /**
     * Filter recipients based on their notification preferences
     */
    private filterByPreferences;
    /**
     * Get default recipients for a notification type
     * In production, this would pull from user roles/permissions
     */
    private getDefaultRecipients;
    /**
     * Get base URL for links in emails
     */
    private getBaseUrl;
    /**
     * Check for upcoming deadlines and send alerts
     * This should be called by a scheduled job (cron)
     */
    checkComplianceDeadlines(): Promise<void>;
    /**
     * Check for overdue assessments and send alerts
     * This should be called by a scheduled job (cron)
     */
    checkOverdueAssessments(): Promise<void>;
}
declare const _default: NotificationService;
export default _default;
//# sourceMappingURL=notificationService.d.ts.map