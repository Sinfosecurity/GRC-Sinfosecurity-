/**
 * Vendor Issue & Remediation Service
 * Corrective Action Plans (CAPs) and issue lifecycle management
 */

import { VendorIssue, VendorIssueStatus, IssueSeverity } from '@prisma/client';
import { prisma } from '../config/database';

export interface CreateVendorIssueInput {
    vendorId: string;
    organizationId: string;
    title: string;
    description: string;
    issueType: string;
    severity: IssueSeverity;
    priority: string;
    source: string;
    identifiedBy: string;
    category: string;
    riskRating?: string;
    impactDescription?: string;
    assignedTo?: string;
    targetRemediationDate?: Date;
}

class VendorIssueService {
    /**
     * Create vendor issue
     */
    async createIssue(data: CreateVendorIssueInput): Promise<VendorIssue> {
        const issue = await prisma.vendorIssue.create({
            data: {
                ...data,
                status: VendorIssueStatus.OPEN,
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

        console.log(`✅ Created issue: ${issue.title} for ${issue.vendor.name}`);
        return issue;
    }

    /**
     * Get issue by ID
     */
    async getIssueById(issueId: string, organizationId: string) {
        return await prisma.vendorIssue.findFirst({
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
    async listVendorIssues(
        vendorId: string,
        organizationId: string,
        status?: VendorIssueStatus
    ) {
        return await prisma.vendorIssue.findMany({
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
    async updateCorrectiveActionPlan(
        issueId: string,
        organizationId: string,
        correctiveActionPlan: string,
        targetRemediationDate: Date
    ) {
        return await prisma.vendorIssue.updateMany({
            where: {
                id: issueId,
                organizationId,
            },
            data: {
                correctiveActionPlan,
                targetRemediationDate,
                status: VendorIssueStatus.IN_PROGRESS,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Submit remediation evidence
     */
    async submitRemediation(
        issueId: string,
        organizationId: string,
        evidenceUrl: string,
        notes: string
    ) {
        const issue = await prisma.vendorIssue.updateMany({
            where: {
                id: issueId,
                organizationId,
            },
            data: {
                evidenceUrl,
                actualRemediationDate: new Date(),
                status: VendorIssueStatus.PENDING_VALIDATION,
                updatedAt: new Date(),
            },
        });

        console.log(`✅ Remediation submitted for issue: ${issueId}`);
        return issue;
    }

    /**
     * Validate remediation
     */
    async validateRemediation(
        issueId: string,
        organizationId: string,
        validatedBy: string,
        validationNotes: string,
        approved: boolean
    ) {
        const status = approved ? VendorIssueStatus.RESOLVED : VendorIssueStatus.IN_PROGRESS;

        const issue = await prisma.vendorIssue.updateMany({
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
            console.log(`✅ Issue resolved: ${issueId}`);
        } else {
            console.log(`⚠️ Remediation rejected for issue: ${issueId}`);
        }

        return issue;
    }

    /**
     * Close issue
     */
    async closeIssue(
        issueId: string,
        organizationId: string,
        closedBy: string,
        closureNotes: string,
        closureEvidence?: string
    ) {
        return await prisma.vendorIssue.updateMany({
            where: {
                id: issueId,
                organizationId,
            },
            data: {
                status: VendorIssueStatus.CLOSED,
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
    async acceptRisk(
        issueId: string,
        organizationId: string,
        acceptedBy: string,
        acceptanceRationale: string
    ) {
        return await prisma.vendorIssue.updateMany({
            where: {
                id: issueId,
                organizationId,
            },
            data: {
                status: VendorIssueStatus.RISK_ACCEPTED,
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
    async escalateIssue(
        issueId: string,
        organizationId: string,
        escalatedBy: string,
        escalationReason: string
    ) {
        const issue = await prisma.vendorIssue.updateMany({
            where: {
                id: issueId,
                organizationId,
            },
            data: {
                status: VendorIssueStatus.ESCALATED,
                priority: 'URGENT',
                updatedAt: new Date(),
            },
        });

        // Send escalation notification
        console.log(`🚨 Issue escalated: ${issueId} - ${escalationReason}`);
        return issue;
    }

    /**
     * Get overdue issues
     */
    async getOverdueIssues(organizationId: string) {
        return await prisma.vendorIssue.findMany({
            where: {
                organizationId,
                status: { in: [VendorIssueStatus.OPEN, VendorIssueStatus.IN_PROGRESS] },
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
    async getIssueStatistics(organizationId: string) {
        const [
            totalIssues,
            openIssues,
            criticalIssues,
            overdueIssues,
            resolvedThisMonth,
            issuesByType,
            issuesBySeverity,
        ] = await Promise.all([
            prisma.vendorIssue.count({ where: { organizationId } }),
            prisma.vendorIssue.count({
                where: {
                    organizationId,
                    status: { in: [VendorIssueStatus.OPEN, VendorIssueStatus.IN_PROGRESS] },
                },
            }),
            prisma.vendorIssue.count({
                where: { organizationId, severity: IssueSeverity.CRITICAL },
            }),
            prisma.vendorIssue.count({
                where: {
                    organizationId,
                    status: { in: [VendorIssueStatus.OPEN, VendorIssueStatus.IN_PROGRESS] },
                    targetRemediationDate: { lt: new Date() },
                },
            }),
            prisma.vendorIssue.count({
                where: {
                    organizationId,
                    status: VendorIssueStatus.RESOLVED,
                    closedAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
            prisma.vendorIssue.groupBy({
                by: ['issueType'],
                where: {
                    organizationId,
                    status: { in: [VendorIssueStatus.OPEN, VendorIssueStatus.IN_PROGRESS] },
                },
                _count: true,
            }),
            prisma.vendorIssue.groupBy({
                by: ['severity'],
                where: {
                    organizationId,
                    status: { in: [VendorIssueStatus.OPEN, VendorIssueStatus.IN_PROGRESS] },
                },
                _count: true,
            }),
        ]);

        // Calculate average remediation time
        const resolvedIssues = await prisma.vendorIssue.findMany({
            where: {
                organizationId,
                status: VendorIssueStatus.RESOLVED,
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
                const days = Math.floor(
                    (issue.actualRemediationDate!.getTime() - issue.identifiedDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                );
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
    private async autoAssignIssue(issueId: string, severity: IssueSeverity) {
        // In production, this would query users with appropriate roles
        // For now, just log
        console.log(`Auto-assigning ${severity} issue: ${issueId}`);
    }

    /**
     * Notify stakeholders about new issue
     */
    private async notifyIssueStakeholders(issue: VendorIssue) {
        // In production, send emails/Slack notifications
        console.log(`Notifying stakeholders about issue: ${issue.title}`);
    }

    /**
     * Get issue trends
     */
    async getIssueTrends(organizationId: string, months: number = 6) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const issues = await prisma.vendorIssue.findMany({
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
        const trends: any = {};
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

        return Object.values(trends).sort((a: any, b: any) => a.month.localeCompare(b.month));
    }
}

export default new VendorIssueService();
