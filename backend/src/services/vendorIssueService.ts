/**
 * Vendor Issue & Remediation Service
 * Corrective Action Plans (CAPs) and issue lifecycle management
 */

import { IssuePriority, IssueSeverity, IssueSource, Prisma, VendorIssue, VendorIssueStatus, VendorIssueType } from '@prisma/client';
import { prisma } from '../config/database';
import logger from '../config/logger';
import { notifyUser } from './notificationDeliveryService';
import {
    customerAppUrl,
    findingAssignedEmail,
    findingClosedEmail,
    remediationRequestedEmail,
} from './transactionalEmail';
import { omitForeignParent, requireAssessmentForOrganization, requireVendorForOrganization } from '../security/tenantOwnership';
import { ApiError } from '../middleware/errorHandler';
import { assertIndependentReviewer } from '../security/separationOfDuties';

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
    assessmentId?: string;
    questionId?: string;
    engagementId?: string;
    controlId?: string;
    recommendedSeverity?: IssueSeverity;
    reviewState?: import('@prisma/client').IssueReviewState;
    responsibility?: string;
    sourceSnapshot?: Prisma.InputJsonValue;
}

class VendorIssueService {
    /**
     * Create vendor issue
     */
    async createIssue(data: CreateVendorIssueInput): Promise<VendorIssue> {
        await requireVendorForOrganization(data.organizationId, data.vendorId);
        if (data.assessmentId) {
            await requireAssessmentForOrganization(data.organizationId, data.assessmentId, data.vendorId);
        }
        const createData: Prisma.VendorIssueUncheckedCreateInput = {
            vendorId: data.vendorId,
            organizationId: data.organizationId,
            title: data.title,
            description: data.description,
            issueType: this.toIssueType(data.issueType),
            severity: data.severity,
            priority: this.toIssuePriority(data.priority),
            source: this.toIssueSource(data.source),
            identifiedBy: data.identifiedBy,
            category: data.category,
            riskRating: data.riskRating,
            impactDescription: data.impactDescription,
            assignedTo: data.assignedTo,
            targetRemediationDate: data.targetRemediationDate,
            assessmentId: data.assessmentId,
            questionId: data.questionId,
            engagementId: data.engagementId,
            controlId: data.controlId,
            recommendedSeverity: data.recommendedSeverity,
            reviewState: data.reviewState,
            responsibility: data.responsibility,
            sourceSnapshot: data.sourceSnapshot,
            status: VendorIssueStatus.OPEN,
            identifiedDate: new Date(),
        };

        const issue = await prisma.vendorIssue.create({
            data: createData,
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

        logger.info(`Created issue: ${issue.title} for ${issue.vendor.name}`);
        const { recordAudit } = await import('./auditEventService');
        await recordAudit({
            organizationId: issue.organizationId,
            actorUserId: data.identifiedBy,
            action: 'finding.created',
            resourceType: 'VendorIssue',
            resourceId: issue.id,
            result: 'success',
            metadata: { source: issue.source, responsibility: issue.responsibility },
        });
        const { ensureFindingGraph } = await import('../findings/findingWorkspaceService');
        await ensureFindingGraph({
            organizationId: issue.organizationId,
            actorUserId: data.identifiedBy,
            issueId: issue.id,
            title: issue.title,
            vendorId: issue.vendorId,
            vendorName: issue.vendor.name,
            assessmentId: issue.assessmentId,
        }).catch(() => undefined);
        const { emitSupremeAutomationEvent } = await import('./supremeAutomationBus');
        await emitSupremeAutomationEvent({
            organizationId: issue.organizationId,
            event: 'finding.confirmed',
            sourceModel: 'VendorIssue',
            sourceId: issue.id,
            actorUserId: data.identifiedBy,
        });
        return issue;
    }

    private toIssueType(value: string): VendorIssueType {
        return (Object.values(VendorIssueType) as string[]).includes(value)
            ? (value as VendorIssueType)
            : VendorIssueType.OTHER;
    }

    private toIssuePriority(value: string): IssuePriority {
        return (Object.values(IssuePriority) as string[]).includes(value)
            ? (value as IssuePriority)
            : IssuePriority.MEDIUM;
    }

    private toIssueSource(value: string): IssueSource {
        return (Object.values(IssueSource) as string[]).includes(value)
            ? (value as IssueSource)
            : IssueSource.OTHER;
    }

    /**
     * Get issue by ID
     */
    async getIssueById(issueId: string, organizationId: string) {
        const issue = await prisma.vendorIssue.findFirst({
            where: {
                id: issueId,
                organizationId,
            },
            include: {
                vendor: true,
            },
        });
        if (!issue) return issue;
        return {
            ...issue,
            vendor: omitForeignParent(organizationId, issue.vendor),
        };
    }

    /**
     * List issues for vendor
     */
    async listVendorIssues(
        vendorId: string,
        organizationId: string,
        status?: VendorIssueStatus
    ) {
        await requireVendorForOrganization(organizationId, vendorId);
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

    async listOrganizationIssues(organizationId: string, filters?: { status?: VendorIssueStatus; severity?: IssueSeverity; vendorId?: string; engagementId?: string; sourceKind?: string; owner?: string; overdue?: boolean; responsibility?: string; reviewState?: string }) {
        if (filters?.vendorId) {
            await requireVendorForOrganization(organizationId, filters.vendorId);
        }
        const { listFindingSummaries } = await import('../findings/findingWorkspaceService');
        return listFindingSummaries(organizationId, filters);
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
        const updated = await prisma.vendorIssue.updateMany({
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
        const issue = await this.getIssueById(issueId, organizationId);
        if (issue) {
            const { recordAudit } = await import('./auditEventService');
            await recordAudit({
                organizationId,
                actorUserId: issue.assignedTo || issue.identifiedBy,
                action: 'finding.plan_recorded',
                resourceType: 'VendorIssue',
                resourceId: issue.id,
                result: 'success',
            });
            const mail = remediationRequestedEmail({
                title: issue.title,
                vendorName: issue.vendor?.name,
                ctaUrl: customerAppUrl('/findings'),
            });
            await notifyUser({
                organizationId,
                userId: issue.assignedTo || issue.identifiedBy,
                eventType: 'remediation.requested',
                title: mail.subject,
                body: mail.text,
                emailBody: mail.text,
                emailHtml: mail.html,
                fromName: mail.fromName,
                resourceType: 'VendorIssue',
                resourceId: issue.id,
            });
        }
        return updated;
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

        logger.info(`✅ Remediation submitted for issue: ${issueId}`);
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
            logger.info(`✅ Issue resolved: ${issueId}`);
        } else {
            logger.info(`⚠️ Remediation rejected for issue: ${issueId}`);
        }

        const record = await this.getIssueById(issueId, organizationId);
        if (record) {
            const { recordAudit } = await import('./auditEventService');
            await recordAudit({
                organizationId,
                actorUserId: validatedBy,
                action: approved ? 'finding.verified' : 'finding.verification_returned',
                resourceType: 'VendorIssue',
                resourceId: record.id,
                result: 'success',
            });
            const mail = remediationRequestedEmail({
                title: record.title,
                vendorName: record.vendor?.name,
                ctaUrl: customerAppUrl('/findings'),
            });
            await notifyUser({
                organizationId,
                userId: record.assignedTo || record.identifiedBy,
                eventType: 'remediation.validation_requested',
                title: approved ? `Review required: Remediation submitted for ${record.title}` : `Action required: Further remediation work for ${record.title}`,
                body: approved
                    ? `${record.title} remediation evidence was submitted and requires review. The finding is not closed until validation is complete.`
                    : `${record.title} was returned for further work. The finding remains open.`,
                emailBody: mail.text,
                emailHtml: mail.html,
                fromName: mail.fromName,
                resourceType: 'VendorIssue',
                resourceId: record.id,
            });
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
        const { assertFindingMayClose } = await import('./phaseCGovernance');
        const { stored } = await assertFindingMayClose({
            organizationId,
            findingId: issueId,
            evidenceId: closureEvidence,
        });
        const closed = await prisma.vendorIssue.updateMany({
            where: {
                id: issueId,
                organizationId,
            },
            data: {
                status: VendorIssueStatus.CLOSED,
                closedBy,
                closedAt: new Date(),
                closureNotes,
                closureEvidence: stored.id,
                updatedAt: new Date(),
            },
        });
        const record = await this.getIssueById(issueId, organizationId);
        if (record) {
            const mail = findingClosedEmail({
                title: record.title,
                vendorName: record.vendor?.name,
                ctaUrl: customerAppUrl('/findings'),
            });
            await notifyUser({
                organizationId,
                userId: record.assignedTo || record.identifiedBy || closedBy,
                eventType: 'finding.closed',
                title: mail.subject,
                body: mail.text,
                emailBody: mail.text,
                emailHtml: mail.html,
                fromName: mail.fromName,
                resourceType: 'VendorIssue',
                resourceId: record.id,
            });
        }
        return closed;
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
        const existing = await this.getIssueById(issueId, organizationId);
        if (!existing) {
            throw new ApiError(404, 'Finding not found.');
        }
        if (existing.engagementId) {
            throw new ApiError(409, 'Risk acceptance is Wave 5. This Engagement finding cannot be accepted in Wave 4.');
        }
        if (!existing.acceptanceRequestedBy) {
            throw new ApiError(409, 'Risk acceptance must be prepared before it can be approved.');
        }
        assertIndependentReviewer(existing.acceptanceRequestedBy, acceptedBy);
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
        logger.info(`🚨 Issue escalated: ${issueId} - ${escalationReason}`);
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
        logger.info(`Auto-assigning ${severity} issue: ${issueId}`);
    }

    /**
     * Notify stakeholders about new issue
     */
    private async notifyIssueStakeholders(issue: VendorIssue & { vendor?: { name?: string } }) {
        const mail = findingAssignedEmail({
            title: issue.title,
            vendorName: issue.vendor?.name,
            severity: issue.severity,
            ctaUrl: customerAppUrl('/findings'),
        });
        await notifyUser({
            organizationId: issue.organizationId,
            userId: issue.assignedTo || issue.identifiedBy,
            eventType: 'finding.assigned',
            title: mail.subject,
            body: mail.text,
            emailBody: mail.text,
            emailHtml: mail.html,
            fromName: mail.fromName,
            resourceType: 'VendorIssue',
            resourceId: issue.id,
        });
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
