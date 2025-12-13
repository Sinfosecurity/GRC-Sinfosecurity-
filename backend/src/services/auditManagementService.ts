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

// In-memory storage
const auditPlans = new Map<string, AuditPlan>();
const auditFindings = new Map<string, AuditFinding>();
const auditSchedules = new Map<string, AuditSchedule>();

// Initialize with demo data
auditPlans.set('audit_1', {
    id: 'audit_1',
    title: 'Q4 2024 ISO 27001 Compliance Audit',
    type: 'compliance',
    scope: 'Information Security Management System',
    framework: 'ISO 27001',
    plannedStartDate: new Date('2024-12-15'),
    plannedEndDate: new Date('2024-12-22'),
    status: 'planned',
    auditors: ['John Smith', 'Sarah Johnson'],
    departments: ['IT', 'Security', 'Compliance'],
    controlsToTest: ['AC-1', 'AC-2', 'IA-1', 'IA-2', 'SC-1'],
    createdAt: new Date('2024-11-01'),
    createdBy: 'admin@sinfosecurity.com',
});

auditFindings.set('finding_1', {
    id: 'finding_1',
    auditId: 'audit_1',
    severity: 'high',
    title: 'Insufficient Access Control Documentation',
    description: 'Access control procedures are not fully documented according to ISO 27001 A.9.2.1 requirements',
    controlId: 'AC-1',
    requirement: 'ISO 27001:2013 A.9.2.1',
    status: 'open',
    assignedTo: 'compliance@sinfosecurity.com',
    dueDate: new Date('2025-01-15'),
    identifiedAt: new Date('2024-12-01'),
});

class AuditManagementService {
    /**
     * Create new audit plan
     */
    createAuditPlan(data: Omit<AuditPlan, 'id' | 'createdAt'>): AuditPlan {
        const audit: AuditPlan = {
            id: `audit_${Date.now()}`,
            ...data,
            createdAt: new Date(),
        };

        auditPlans.set(audit.id, audit);
        console.log(`📋 Audit plan created: ${audit.title}`);

        return audit;
    }

    /**
     * Get all audit plans
     */
    getAuditPlans(filters?: {
        status?: AuditPlan['status'];
        type?: AuditPlan['type'];
        framework?: string;
    }): AuditPlan[] {
        let plans = Array.from(auditPlans.values());

        if (filters?.status) {
            plans = plans.filter(p => p.status === filters.status);
        }
        if (filters?.type) {
            plans = plans.filter(p => p.type === filters.type);
        }
        if (filters?.framework) {
            plans = plans.filter(p => p.framework === filters.framework);
        }

        return plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * Get audit plan by ID
     */
    getAuditPlan(auditId: string): AuditPlan | undefined {
        return auditPlans.get(auditId);
    }

    /**
     * Update audit status
     */
    updateAuditStatus(auditId: string, status: AuditPlan['status']): boolean {
        const audit = auditPlans.get(auditId);
        if (audit) {
            audit.status = status;
            return true;
        }
        return false;
    }

    /**
     * Create audit finding
     */
    createFinding(data: Omit<AuditFinding, 'id' | 'identifiedAt'>): AuditFinding {
        const finding: AuditFinding = {
            id: `finding_${Date.now()}`,
            ...data,
            identifiedAt: new Date(),
        };

        auditFindings.set(finding.id, finding);
        console.log(`🔍 Audit finding created: ${finding.title}`);

        return finding;
    }

    /**
     * Get all findings for an audit
     */
    getAuditFindings(auditId: string): AuditFinding[] {
        return Array.from(auditFindings.values())
            .filter(f => f.auditId === auditId)
            .sort((a, b) => {
                const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                return severityOrder[a.severity] - severityOrder[b.severity];
            });
    }

    /**
     * Get all open findings
     */
    getOpenFindings(): AuditFinding[] {
        return Array.from(auditFindings.values())
            .filter(f => f.status === 'open' || f.status === 'in_remediation')
            .sort((a, b) => b.identifiedAt.getTime() - a.identifiedAt.getTime());
    }

    /**
     * Update finding status
     */
    updateFindingStatus(findingId: string, status: AuditFinding['status']): boolean {
        const finding = auditFindings.get(findingId);
        if (finding) {
            finding.status = status;
            if (status === 'resolved') {
                finding.resolvedAt = new Date();
            }
            return true;
        }
        return false;
    }

    /**
     * Assign finding to user
     */
    assignFinding(findingId: string, userId: string): boolean {
        const finding = auditFindings.get(findingId);
        if (finding) {
            finding.assignedTo = userId;
            finding.status = 'in_remediation';
            return true;
        }
        return false;
    }

    /**
     * Create audit schedule
     */
    createSchedule(schedule: Omit<AuditSchedule, 'id'>): AuditSchedule {
        const newSchedule: AuditSchedule = {
            id: `schedule_${Date.now()}`,
            ...schedule,
        };

        auditSchedules.set(newSchedule.id, newSchedule);
        return newSchedule;
    }

    /**
     * Get upcoming audits
     */
    getUpcomingAudits(): AuditPlan[] {
        const now = new Date();
        return Array.from(auditPlans.values())
            .filter(p => p.plannedStartDate >= now && p.status === 'planned')
            .sort((a, b) => a.plannedStartDate.getTime() - b.plannedStartDate.getTime());
    }

    /**
     * Get audit statistics
     */
    getAuditStats() {
        const allPlans = Array.from(auditPlans.values());
        const allFindings = Array.from(auditFindings.values());

        return {
            totalAudits: allPlans.length,
            activeAudits: allPlans.filter(p => p.status === 'in_progress').length,
            plannedAudits: allPlans.filter(p => p.status === 'planned').length,
            completedAudits: allPlans.filter(p => p.status === 'completed').length,
            totalFindings: allFindings.length,
            openFindings: allFindings.filter(f => f.status === 'open').length,
            criticalFindings: allFindings.filter(f => f.severity === 'critical' && f.status !== 'resolved').length,
            findingsByStatus: {
                open: allFindings.filter(f => f.status === 'open').length,
                in_remediation: allFindings.filter(f => f.status === 'in_remediation').length,
                resolved: allFindings.filter(f => f.status === 'resolved').length,
                accepted_risk: allFindings.filter(f => f.status === 'accepted_risk').length,
            },
        };
    }

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
    } | null {
        const audit = auditPlans.get(auditId);
        if (!audit) return null;

        const findings = this.getAuditFindings(auditId);

        const bySeverity = {
            critical: findings.filter(f => f.severity === 'critical').length,
            high: findings.filter(f => f.severity === 'high').length,
            medium: findings.filter(f => f.severity === 'medium').length,
            low: findings.filter(f => f.severity === 'low').length,
        };

        const byStatus = {
            open: findings.filter(f => f.status === 'open').length,
            in_remediation: findings.filter(f => f.status === 'in_remediation').length,
            resolved: findings.filter(f => f.status === 'resolved').length,
            accepted_risk: findings.filter(f => f.status === 'accepted_risk').length,
        };

        // Calculate compliance score based on findings
        const totalControls = audit.controlsToTest.length;
        const failedControls = new Set(findings.map(f => f.controlId)).size;
        const complianceScore = Math.round(((totalControls - failedControls) / totalControls) * 100);

        return {
            auditPlan: audit,
            findings,
            summary: {
                totalFindings: findings.length,
                bySeverity,
                byStatus,
                complianceScore,
            },
        };
    }
}

export default new AuditManagementService();
