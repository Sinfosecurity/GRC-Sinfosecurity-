"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../config/logger"));
// In-memory storage
const auditPlans = new Map();
const auditFindings = new Map();
const auditSchedules = new Map();
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
    createAuditPlan(data) {
        const audit = {
            id: `audit_${Date.now()}`,
            ...data,
            createdAt: new Date(),
        };
        auditPlans.set(audit.id, audit);
        logger_1.default.info(`📋 Audit plan created: ${audit.title}`);
        return audit;
    }
    /**
     * Get all audit plans
     */
    getAuditPlans(filters) {
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
    getAuditPlan(auditId) {
        return auditPlans.get(auditId);
    }
    /**
     * Update audit status
     */
    updateAuditStatus(auditId, status) {
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
    createFinding(data) {
        const finding = {
            id: `finding_${Date.now()}`,
            ...data,
            identifiedAt: new Date(),
        };
        auditFindings.set(finding.id, finding);
        logger_1.default.info(`🔍 Audit finding created: ${finding.title}`);
        return finding;
    }
    /**
     * Get all findings for an audit
     */
    getAuditFindings(auditId) {
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
    getOpenFindings() {
        return Array.from(auditFindings.values())
            .filter(f => f.status === 'open' || f.status === 'in_remediation')
            .sort((a, b) => b.identifiedAt.getTime() - a.identifiedAt.getTime());
    }
    /**
     * Update finding status
     */
    updateFindingStatus(findingId, status) {
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
    assignFinding(findingId, userId) {
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
    createSchedule(schedule) {
        const newSchedule = {
            id: `schedule_${Date.now()}`,
            ...schedule,
        };
        auditSchedules.set(newSchedule.id, newSchedule);
        return newSchedule;
    }
    /**
     * Get upcoming audits
     */
    getUpcomingAudits() {
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
    generateAuditReport(auditId) {
        const audit = auditPlans.get(auditId);
        if (!audit)
            return null;
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
exports.default = new AuditManagementService();
//# sourceMappingURL=auditManagementService.js.map