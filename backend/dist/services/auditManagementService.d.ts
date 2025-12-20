/**
 * Audit Management Service
 * Full audit lifecycle management: planning, scheduling, execution, findings tracking
 */
export interface AuditPlan {
    id: string;
    title: string;
    type: 'internal' | 'external' | 'compliance' | 'security';
    scope: string;
    framework: string;
    plannedStartDate: Date;
    plannedEndDate: Date;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    auditors: string[];
    departments: string[];
    controlsToTest: string[];
    createdAt: Date;
    createdBy: string;
}
export interface AuditFinding {
    id: string;
    auditId: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    controlId: string;
    requirement: string;
    evidenceUrl?: string;
    status: 'open' | 'in_remediation' | 'resolved' | 'accepted_risk';
    assignedTo?: string;
    dueDate?: Date;
    identifiedAt: Date;
    resolvedAt?: Date;
}
export interface AuditSchedule {
    id: string;
    auditType: string;
    frequency: 'quarterly' | 'semi-annual' | 'annual';
    nextScheduledDate: Date;
    responsible: string;
    enabled: boolean;
}
declare class AuditManagementService {
    /**
     * Create new audit plan
     */
    createAuditPlan(data: Omit<AuditPlan, 'id' | 'createdAt'>): AuditPlan;
    /**
     * Get all audit plans
     */
    getAuditPlans(filters?: {
        status?: AuditPlan['status'];
        type?: AuditPlan['type'];
        framework?: string;
    }): AuditPlan[];
    /**
     * Get audit plan by ID
     */
    getAuditPlan(auditId: string): AuditPlan | undefined;
    /**
     * Update audit status
     */
    updateAuditStatus(auditId: string, status: AuditPlan['status']): boolean;
    /**
     * Create audit finding
     */
    createFinding(data: Omit<AuditFinding, 'id' | 'identifiedAt'>): AuditFinding;
    /**
     * Get all findings for an audit
     */
    getAuditFindings(auditId: string): AuditFinding[];
    /**
     * Get all open findings
     */
    getOpenFindings(): AuditFinding[];
    /**
     * Update finding status
     */
    updateFindingStatus(findingId: string, status: AuditFinding['status']): boolean;
    /**
     * Assign finding to user
     */
    assignFinding(findingId: string, userId: string): boolean;
    /**
     * Create audit schedule
     */
    createSchedule(schedule: Omit<AuditSchedule, 'id'>): AuditSchedule;
    /**
     * Get upcoming audits
     */
    getUpcomingAudits(): AuditPlan[];
    /**
     * Get audit statistics
     */
    getAuditStats(): {
        totalAudits: number;
        activeAudits: number;
        plannedAudits: number;
        completedAudits: number;
        totalFindings: number;
        openFindings: number;
        criticalFindings: number;
        findingsByStatus: {
            open: number;
            in_remediation: number;
            resolved: number;
            accepted_risk: number;
        };
    };
    /**
     * Generate audit report
     */
    generateAuditReport(auditId: string): {
        auditPlan: AuditPlan;
        findings: AuditFinding[];
        summary: {
            totalFindings: number;
            bySeverity: Record<string, number>;
            byStatus: Record<string, number>;
            complianceScore: number;
        };
    } | null;
}
declare const _default: AuditManagementService;
export default _default;
//# sourceMappingURL=auditManagementService.d.ts.map