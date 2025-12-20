"use strict";
/**
 * Vendor Issue & Remediation Service
 * Corrective Action Plans (CAPs) and issue lifecycle management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
class VendorIssueService {
    /**
     * Create vendor issue
     */
    async createIssue(data) {
        const issue = await database_1.prisma.vendorIssue.create({
            data: {
                ...data,
                status: client_1.VendorIssueStatus.OPEN,
                identifiedDate: new Date(),
            },
            include: {
                vendor: {
                    select: {
                        name: true,
                        tier: true,
                    },
                },
            },
        });
        // Auto-assign based on severity if not assigned
        if (!data.assignedTo) {
            await this.autoAssignIssue(issue.id, issue.severity);
        }
        // Create notification
        await this.notifyIssueStakeholders(issue);
        logger.info(`✅ Created issue: ${issue.title} for ${issue.vendor.name}`);
        return issue;
    }
    /**
     * Get issue by ID
     */
    async getIssueById(issueId, organizationId) {
        return await database_1.prisma.vendorIssue.findFirst({
            where: {
                id: issueId,
                organizationId,
            },
            include: {
                vendor: true,
            },
        });
    }
    /**
     * List issues for vendor
     */
    async listVendorIssues(vendorId, organizationId, status) {
        return await database_1.prisma.vendorIssue.findMany({
            where: {
                vendorId,
                organizationId,
                ...(status ? { status } : {}),
            },
            orderBy: [
                { severity: 'desc' },
                { identifiedDate: 'desc' },
            ],
        });
    }
    /**
     * Update Corrective Action Plan (CAP)
     */
    async updateCorrectiveActionPlan(issueId, organizationId, correctiveActionPlan, targetRemediationDate) {
        return await database_1.prisma.vendorIssue.updateMany({
            where: {
                id: issueId,
                organizationId,
            },
            data: {
                correctiveActionPlan,
                targetRemediationDate,
                status: client_1.VendorIssueStatus.IN_PROGRESS,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Submit remediation evidence
     */
    async submitRemediation(issueId, organizationId, evidenceUrl, notes) {
        const issue = await database_1.prisma.vendorIssue.updateMany({
            where: {
                id: issueId,
                organizationId,
            },
            data: {
                evidenceUrl,
                actualRemediationDate: new Date(),
                status: client_1.VendorIssueStatus.PENDING_VALIDATION,
                updatedAt: new Date(),
            },
        });
        logger.info(`✅ Remediation submitted for issue: ${issueId}`);
        return issue;
    }
    /**
     * Validate remediation
     */
    async validateRemediation(issueId, organizationId, validatedBy, validationNotes, approved) {
        const status = approved ? client_1.VendorIssueStatus.RESOLVED : client_1.VendorIssueStatus.IN_PROGRESS;
        const issue = await database_1.prisma.vendorIssue.updateMany({
            where: {
                id: issueId,
                organizationId,
            },
            data: {
                validatedBy,
                validatedAt: new Date(),
                validationNotes,
                status,
                updatedAt: new Date(),
            },
        });
        if (approved) {
            logger.info(`✅ Issue resolved: ${issueId}`);
        }
        else {
            logger.info(`⚠️ Remediation rejected for issue: ${issueId}`);
        }
        return issue;
    }
    /**
     * Close issue
     */
    async closeIssue(issueId, organizationId, closedBy, closureNotes, closureEvidence) {
        return await database_1.prisma.vendorIssue.updateMany({
            where: {
                id: issueId,
                organizationId,
            },
            data: {
                status: client_1.VendorIssueStatus.CLOSED,
                closedBy,
                closedAt: new Date(),
                closureNotes,
                closureEvidence,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Accept risk (close without remediation)
     */
    async acceptRisk(issueId, organizationId, acceptedBy, acceptanceRationale) {
        return await database_1.prisma.vendorIssue.updateMany({
            where: {
                id: issueId,
                organizationId,
            },
            data: {
                status: client_1.VendorIssueStatus.RISK_ACCEPTED,
                closedBy: acceptedBy,
                closedAt: new Date(),
                closureNotes: `Risk accepted: ${acceptanceRationale}`,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Escalate issue
     */
    async escalateIssue(issueId, organizationId, escalatedBy, escalationReason) {
        const issue = await database_1.prisma.vendorIssue.updateMany({
            where: {
                id: issueId,
                organizationId,
            },
            data: {
                status: client_1.VendorIssueStatus.ESCALATED,
                priority: 'URGENT',
                updatedAt: new Date(),
            },
        });
        // Send escalation notification
        logger.info(`🚨 Issue escalated: ${issueId} - ${escalationReason}`);
        return issue;
    }
    /**
     * Get overdue issues
     */
    async getOverdueIssues(organizationId) {
        return await database_1.prisma.vendorIssue.findMany({
            where: {
                organizationId,
                status: { in: [client_1.VendorIssueStatus.OPEN, client_1.VendorIssueStatus.IN_PROGRESS] },
                targetRemediationDate: { lt: new Date() },
            },
            include: {
                vendor: {
                    select: {
                        name: true,
                        tier: true,
                    },
                },
            },
            orderBy: [
                { severity: 'desc' },
                { targetRemediationDate: 'asc' },
            ],
        });
    }
    /**
     * Get issue statistics
     */
    async getIssueStatistics(organizationId) {
        const [totalIssues, openIssues, criticalIssues, overdueIssues, resolvedThisMonth, issuesByType, issuesBySeverity,] = await Promise.all([
            database_1.prisma.vendorIssue.count({ where: { organizationId } }),
            database_1.prisma.vendorIssue.count({
                where: {
                    organizationId,
                    status: { in: [client_1.VendorIssueStatus.OPEN, client_1.VendorIssueStatus.IN_PROGRESS] },
                },
            }),
            database_1.prisma.vendorIssue.count({
                where: { organizationId, severity: client_1.IssueSeverity.CRITICAL },
            }),
            database_1.prisma.vendorIssue.count({
                where: {
                    organizationId,
                    status: { in: [client_1.VendorIssueStatus.OPEN, client_1.VendorIssueStatus.IN_PROGRESS] },
                    targetRemediationDate: { lt: new Date() },
                },
            }),
            database_1.prisma.vendorIssue.count({
                where: {
                    organizationId,
                    status: client_1.VendorIssueStatus.RESOLVED,
                    closedAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
            database_1.prisma.vendorIssue.groupBy({
                by: ['issueType'],
                where: {
                    organizationId,
                    status: { in: [client_1.VendorIssueStatus.OPEN, client_1.VendorIssueStatus.IN_PROGRESS] },
                },
                _count: true,
            }),
            database_1.prisma.vendorIssue.groupBy({
                by: ['severity'],
                where: {
                    organizationId,
                    status: { in: [client_1.VendorIssueStatus.OPEN, client_1.VendorIssueStatus.IN_PROGRESS] },
                },
                _count: true,
            }),
        ]);
        // Calculate average remediation time
        const resolvedIssues = await database_1.prisma.vendorIssue.findMany({
            where: {
                organizationId,
                status: client_1.VendorIssueStatus.RESOLVED,
                identifiedDate: { not: null },
                actualRemediationDate: { not: null },
            },
            select: {
                identifiedDate: true,
                actualRemediationDate: true,
            },
        });
        const avgRemediationDays = resolvedIssues.length > 0
            ? resolvedIssues.reduce((sum, issue) => {
                const days = Math.floor((issue.actualRemediationDate.getTime() - issue.identifiedDate.getTime()) /
                    (1000 * 60 * 60 * 24));
                return sum + days;
            }, 0) / resolvedIssues.length
            : 0;
        return {
            summary: {
                totalIssues,
                openIssues,
                criticalIssues,
                overdueIssues,
                resolvedThisMonth,
                avgRemediationDays: Math.round(avgRemediationDays),
            },
            issuesByType: issuesByType.map(i => ({
                type: i.issueType,
                count: i._count,
            })),
            issuesBySeverity: issuesBySeverity.map(i => ({
                severity: i.severity,
                count: i._count,
            })),
        };
    }
    /**
     * Auto-assign issue based on severity
     */
    async autoAssignIssue(issueId, severity) {
        // In production, this would query users with appropriate roles
        // For now, just log
        logger.info(`Auto-assigning ${severity} issue: ${issueId}`);
    }
    /**
     * Notify stakeholders about new issue
     */
    async notifyIssueStakeholders(issue) {
        // In production, send emails/Slack notifications
        logger.info(`Notifying stakeholders about issue: ${issue.title}`);
    }
    /**
     * Get issue trends
     */
    async getIssueTrends(organizationId, months = 6) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        const issues = await database_1.prisma.vendorIssue.findMany({
            where: {
                organizationId,
                identifiedDate: { gte: startDate },
            },
            select: {
                identifiedDate: true,
                severity: true,
                status: true,
            },
        });
        // Group by month
        const trends = {};
        issues.forEach(issue => {
            const monthKey = `${issue.identifiedDate.getFullYear()}-${String(issue.identifiedDate.getMonth() + 1).padStart(2, '0')}`;
            if (!trends[monthKey]) {
                trends[monthKey] = {
                    month: monthKey,
                    total: 0,
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                };
            }
            trends[monthKey].total++;
            trends[monthKey][issue.severity.toLowerCase()]++;
        });
        return Object.values(trends).sort((a, b) => a.month.localeCompare(b.month));
    }
}
exports.default = new VendorIssueService();
//# sourceMappingURL=vendorIssueService.js.map