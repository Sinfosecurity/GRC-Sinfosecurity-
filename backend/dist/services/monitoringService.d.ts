export interface MonitoringAlert {
    id: string;
    type: 'compliance_drift' | 'control_failure' | 'risk_increase' | 'deadline_approaching';
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    affectedResource: string;
    detectedAt: Date;
    status: 'active' | 'acknowledged' | 'resolved';
    assignedTo?: string;
}
export interface ComplianceStatus {
    framework: string;
    currentScore: number;
    previousScore: number;
    trend: 'improving' | 'stable' | 'declining';
    lastChecked: Date;
    controls: {
        total: number;
        passed: number;
        failed: number;
        inProgress: number;
    };
}
export interface MonitoringMetrics {
    timestamp: Date;
    complianceScores: Record<string, number>;
    activeAlerts: number;
    criticalAlerts: number;
    systemHealth: 'healthy' | 'degraded' | 'critical';
}
declare class MonitoringService {
    private monitoringInterval;
    /**
     * Start continuous monitoring (runs every 5 minutes)
     */
    startMonitoring(): void;
    /**
     * Stop continuous monitoring
     */
    stopMonitoring(): void;
    /**
     * Perform monitoring check
     */
    private performMonitoringCheck;
    /**
     * Check for compliance drift
     */
    private checkComplianceDrift;
    /**
     * Check for control failures
     */
    private checkControlFailures;
    /**
     * Check approaching deadlines
     */
    private checkDeadlines;
    /**
     * Check risk levels
     */
    private checkRiskLevels;
    /**
     * Create monitoring alert
     */
    private createAlert;
    /**
     * Get active alerts
     */
    getActiveAlerts(): MonitoringAlert[];
    /**
     * Get compliance status for all frameworks
     */
    getComplianceStatuses(): ComplianceStatus[];
    /**
     * Get monitoring metrics
     */
    getMetrics(): MonitoringMetrics;
    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId: string, userId: string): boolean;
    /**
     * Resolve alert
     */
    resolveAlert(alertId: string): boolean;
}
declare const _default: MonitoringService;
export default _default;
//# sourceMappingURL=monitoringService.d.ts.map