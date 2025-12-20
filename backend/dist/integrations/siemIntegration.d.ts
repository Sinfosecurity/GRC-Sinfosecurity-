/**
 * SIEM Integration
 * Export security logs to SIEM systems (Splunk, QRadar, etc.)
 */
export type SIEMProvider = 'splunk' | 'qradar' | 'sentinel' | 'generic';
export interface SIEMConfig {
    provider: SIEMProvider;
    endpoint: string;
    apiKey?: string;
    token?: string;
}
export interface SecurityEvent {
    timestamp: Date;
    eventType: 'risk_created' | 'incident_detected' | 'compliance_violation' | 'access_attempt' | 'config_change';
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    source: string;
    user?: string;
    resourceType?: string;
    resourceId?: string;
    message: string;
    metadata?: Record<string, any>;
}
declare class SIEMIntegration {
    private config;
    constructor(config: SIEMConfig);
    /**
     * Send event to SIEM
     */
    sendEvent(event: SecurityEvent): Promise<boolean>;
    /**
     * Format event based on SIEM provider
     */
    private formatEventForProvider;
    /**
     * Log risk event
     */
    logRiskEvent(risk: any, action: string): Promise<boolean>;
    /**
     * Log incident
     */
    logIncident(incident: any): Promise<boolean>;
    /**
     * Log compliance violation
     */
    logComplianceViolation(framework: string, violation: any): Promise<boolean>;
    /**
     * Batch export logs
     */
    batchExportLogs(events: SecurityEvent[]): Promise<number>;
}
export default SIEMIntegration;
//# sourceMappingURL=siemIntegration.d.ts.map