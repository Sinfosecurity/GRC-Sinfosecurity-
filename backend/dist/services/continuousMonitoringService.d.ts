export interface MonitoringCheck {
    id: string;
    name: string;
    category: 'compliance' | 'control' | 'risk' | 'security';
    description: string;
    frequency: 'hourly' | 'daily' | 'weekly';
    enabled: boolean;
    lastCheck?: Date;
    lastStatus?: 'pass' | 'fail' | 'warning';
    threshold?: any;
}
export interface MonitoringResult {
    checkId: string;
    timestamp: Date;
    status: 'pass' | 'fail' | 'warning';
    score: number;
    details: string;
    findings: MonitoringFinding[];
    recommendations: string[];
}
export interface MonitoringFinding {
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    affectedResources: string[];
    remediation: string;
}
export interface ComplianceHealthScore {
    overall: number;
    byFramework: Record<string, number>;
    byCategory: Record<string, number>;
    trend: 'improving' | 'declining' | 'stable';
    lastUpdated: Date;
}
export interface ControlMonitoringStatus {
    controlId: string;
    controlName: string;
    status: 'operational' | 'degraded' | 'failed';
    effectiveness: number;
    lastTested: Date;
    testResults: string[];
    issues: string[];
}
declare class ContinuousMonitoringService {
    private monitoringChecks;
    private monitoringResults;
    private complianceHealth;
    private controlStatuses;
    constructor();
    /**
     * Initialize default monitoring checks
     */
    private initializeChecks;
    /**
     * Run all enabled monitoring checks
     */
    runAllChecks(): Promise<MonitoringResult[]>;
    /**
     * Run a specific monitoring check
     */
    private runCheck;
    /**
     * Check for compliance drift
     */
    private checkComplianceDrift;
    /**
     * Check control effectiveness
     */
    private checkControlEffectiveness;
    /**
     * Check risk thresholds
     */
    private checkRiskThresholds;
    /**
     * Check security posture
     */
    private checkSecurityPosture;
    /**
     * Check policy compliance
     */
    private checkPolicyCompliance;
    /**
     * Check access control
     */
    private checkAccessControl;
    /**
     * Default check implementation
     */
    private defaultCheck;
    /**
     * Update overall compliance health score
     */
    private updateComplianceHealth;
    /**
     * Process alerts for failed checks
     */
    private processAlerts;
    /**
     * Get monitoring checks
     */
    getMonitoringChecks(): MonitoringCheck[];
    /**
     * Get monitoring results with filters
     */
    getResults(filters?: {
        checkId?: string;
        status?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): MonitoringResult[];
    /**
     * Get compliance health score
     */
    getComplianceHealth(): ComplianceHealthScore | null;
    /**
     * Get recent findings
     */
    getRecentFindings(limit?: number): MonitoringFinding[];
    /**
     * Toggle monitoring check
     */
    toggleCheck(checkId: string, enabled: boolean): MonitoringCheck | null;
}
declare const _default: ContinuousMonitoringService;
export default _default;
//# sourceMappingURL=continuousMonitoringService.d.ts.map