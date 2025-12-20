/**
 * Regulatory Change Management Service
 * Track regulatory changes, automated framework updates, compliance horizon scanning
 */
export interface RegulatoryChange {
    id: string;
    regulation: string;
    changeType: 'new_regulation' | 'amendment' | 'guidance' | 'enforcement';
    title: string;
    description: string;
    effectiveDate: Date;
    jurisdiction: string;
    impact: 'critical' | 'high' | 'medium' | 'low';
    affectedFrameworks: string[];
    status: 'monitoring' | 'assessing' | 'implementing' | 'completed';
    source: string;
    url?: string;
    publishedAt: Date;
}
export interface FrameworkUpdate {
    id: string;
    framework: string;
    version: string;
    updateType: 'major' | 'minor' | 'patch';
    changes: string[];
    releaseDate: Date;
    complianceDeadline?: Date;
    affectedControls: string[];
    status: 'available' | 'reviewing' | 'implementing' | 'completed';
}
export interface ComplianceAlert {
    id: string;
    type: 'regulatory_change' | 'framework_update' | 'deadline_approaching';
    title: string;
    description: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    actionRequired: boolean;
    deadline?: Date;
    createdAt: Date;
}
declare class RegulatoryChangeService {
    private scanInterval;
    /**
     * Start automated regulatory scanning
     */
    startRegulatoryScan(): void;
    /**
     * Stop regulatory scanning
     */
    stopRegulatoryScan(): void;
    /**
     * Perform regulatory scan
     */
    private performRegulatoryScan;
    /**
     * Create regulatory change entry
     */
    createRegulatoryChange(data: Omit<RegulatoryChange, 'id' | 'status'>): RegulatoryChange;
    /**
     * Get all regulatory changes
     */
    getRegulatoryChanges(filters?: {
        status?: RegulatoryChange['status'];
        regulation?: string;
        impact?: RegulatoryChange['impact'];
    }): RegulatoryChange[];
    /**
     * Update regulatory change status
     */
    updateChangeStatus(changeId: string, status: RegulatoryChange['status']): boolean;
    /**
     * Create framework update
     */
    createFrameworkUpdate(data: Omit<FrameworkUpdate, 'id'>): FrameworkUpdate;
    /**
     * Get framework updates
     */
    getFrameworkUpdates(framework?: string): FrameworkUpdate[];
    /**
     * Create compliance alert
     */
    private createComplianceAlert;
    /**
     * Get compliance alerts
     */
    getComplianceAlerts(filters?: {
        type?: ComplianceAlert['type'];
        priority?: ComplianceAlert['priority'];
        actionRequired?: boolean;
    }): ComplianceAlert[];
    /**
     * Get compliance horizon (upcoming changes)
     */
    getComplianceHorizon(days?: number): {
        upcomingChanges: RegulatoryChange[];
        upcomingDeadlines: FrameworkUpdate[];
        totalImpact: number;
    };
    /**
     * Get regulatory change statistics
     */
    getStats(): {
        totalChanges: number;
        activeChanges: number;
        criticalChanges: number;
        totalUpdates: number;
        pendingUpdates: number;
        upcomingIn30Days: number;
    };
}
declare const _default: RegulatoryChangeService;
export default _default;
//# sourceMappingURL=regulatoryChangeService.d.ts.map