import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { notifyUser } from './notificationDeliveryService';
import {
    AUTOMATION_RULE_VERSION,
    ActionDef,
    ConditionDef,
    HumanBoundary,
    TriggerDef,
    actionRetryable,
    catalog,
    isProhibitedAction,
    templateByKey,
} from './supremeAutomationCatalog';
import {
    AutomationFacts,
    calendarDay,
    daysUntil,
    evaluateConditions,
    idempotencyKey,
    validateDefinition,
} from './supremeAutomationEngine';

type DefinitionInput = {
    name?: string;
    description?: string;
    domain?: string;
    ownerUserId?: string | null;
    timezone?: string;
    templateKey?: string;
    trigger?: TriggerDef;
    conditions?: ConditionDef[];
    actions?: ActionDef[];
    humanBoundary?: HumanBoundary;
};

function honesty() {
    return 'Supreme Intelligence tells you what matters. Supreme Automation coordinates what happens next. Humans remain accountable for material decisions.';
}

async function nextPublicId(organizationId: string, kind: 'AUT' | 'RUN' | 'WRK') {
    const row = await prisma.automationCounter.upsert({
        where: { organizationId_kind: { organizationId, kind } },
        create: { organizationId, kind, next: 1 },
        update: { next: { increment: 1 } },
    });
    return `${kind}-${String(row.next).padStart(5, '0')}`;
}

function sourceHref(model: string, id: string, publicId?: string | null) {
    if (model === 'VendorIssue') return '/findings';
    if (model === 'OrganizationControlTest' || model === 'OrganizationControl') return '/control-center';
    if (model === 'EnterpriseRisk') return publicId ? `/risks/${publicId}` : '/risks/register';
    if (model === 'EnterpriseRiskDecision') return '/risks/register';
    if (model === 'EvidenceGovernanceLink') return '/documents';
    if (model === 'IntelligenceItem') return publicId ? `/intelligence/${publicId}` : '/intelligence';
    if (model === 'VendorAssessment') return '/assessments';
    if (model === 'Vendor') return '/vendor-management';
    if (model === 'PrivacyRightsRequest') return '/privacy-ops/rights';
    if (model === 'AiApproval' || model === 'AiSystem' || model === 'InsuranceAiContext') return '/ai-governance';
    if (model === 'InsuranceLicense') return '/insurance/licenses';
    if (model === 'ComplianceGap') return '/compliance/gaps';
    return '/automation';
}

async function loadFacts(input: { organizationId: string; sourceModel: string; sourceId: string; now?: Date }): Promise<AutomationFacts> {
    const now = input.now || new Date();
    if (input.sourceModel === 'VendorIssue') {
        const row = await prisma.vendorIssue.findFirst({
            where: { id: input.sourceId, organizationId: input.organizationId },
            include: { vendor: { select: { tier: true, name: true } } },
        });
        if (!row) return {};
        return {
            'vendor.tier': row.vendor?.tier || null,
            'finding.severity': row.severity,
            'owner.exists': Boolean(row.assignedTo),
            'due.exceeded': Boolean(row.targetRemediationDate && row.targetRemediationDate.getTime() < now.getTime() && row.status !== 'CLOSED'),
            ownerUserId: row.assignedTo,
            ownerLabel: row.assignedTo ? 'Finding owner' : 'Unassigned',
            sourceHref: sourceHref('VendorIssue', row.id),
            sourcePublicId: null,
            title: row.title,
        };
    }
    if (input.sourceModel === 'OrganizationControlTest') {
        const row = await prisma.organizationControlTest.findFirst({
            where: { id: input.sourceId, organizationId: input.organizationId },
            include: { control: { select: { title: true, ownerUserId: true, controlKey: true } } },
        });
        if (!row) return {};
        return {
            'control.test.result': row.result,
            'owner.exists': Boolean(row.control.ownerUserId),
            ownerUserId: row.control.ownerUserId,
            ownerLabel: 'Control owner',
            sourceHref: sourceHref('OrganizationControlTest', row.id),
            title: `${row.control.controlKey} ${row.result}`,
        };
    }
    if (input.sourceModel === 'EnterpriseRisk') {
        const row = await prisma.enterpriseRisk.findFirst({ where: { id: input.sourceId, organizationId: input.organizationId } });
        if (!row) return {};
        return {
            'risk.outside_appetite': row.appetiteStatus === 'OUTSIDE_APPETITE',
            'owner.exists': Boolean(row.ownerUserId),
            ownerUserId: row.ownerUserId,
            ownerLabel: 'Risk owner',
            sourceHref: sourceHref('EnterpriseRisk', row.id, row.publicId),
            sourcePublicId: row.publicId,
            title: row.title,
        };
    }
    if (input.sourceModel === 'EnterpriseRiskDecision') {
        const row = await prisma.enterpriseRiskDecision.findFirst({
            where: { id: input.sourceId, organizationId: input.organizationId },
            include: { risk: { select: { publicId: true, title: true, ownerUserId: true, appetiteStatus: true } } },
        });
        if (!row) return {};
        return {
            'risk.outside_appetite': row.risk.appetiteStatus === 'OUTSIDE_APPETITE',
            'owner.exists': Boolean(row.risk.ownerUserId),
            'due.exceeded': Boolean(row.expiresAt && row.expiresAt.getTime() <= now.getTime()),
            ownerUserId: row.risk.ownerUserId,
            ownerLabel: 'Risk owner',
            sourceHref: sourceHref('EnterpriseRisk', row.riskId, row.risk.publicId),
            sourcePublicId: row.risk.publicId,
            title: row.risk.title,
        };
    }
    if (input.sourceModel === 'EvidenceGovernanceLink') {
        const row = await prisma.evidenceGovernanceLink.findFirst({ where: { id: input.sourceId, organizationId: input.organizationId } });
        if (!row) return {};
        return {
            'evidence.expires_within_days': daysUntil(row.expiresAt, now),
            'due.exceeded': Boolean(row.expiresAt && row.expiresAt.getTime() < now.getTime()),
            ownerUserId: row.reviewedBy || null,
            ownerLabel: 'Evidence reviewer',
            sourceHref: sourceHref('EvidenceGovernanceLink', row.id),
            title: 'Evidence link',
        };
    }
    if (input.sourceModel === 'IntelligenceItem') {
        const row = await prisma.intelligenceItem.findFirst({ where: { id: input.sourceId, organizationId: input.organizationId } });
        if (!row) return {};
        return {
            'intelligence.priority': row.priority,
            'intelligence.current': row.current,
            'owner.exists': Boolean(row.ownerUserId || row.ownerLabel),
            ownerUserId: row.ownerUserId,
            ownerLabel: row.ownerLabel || 'Reviewer',
            sourceHref: sourceHref('IntelligenceItem', row.id, row.publicId),
            sourcePublicId: row.publicId,
            title: row.title,
        };
    }
    if (input.sourceModel === 'ComplianceGap') {
        const row = await prisma.complianceGap.findFirst({ where: { id: input.sourceId, organizationId: input.organizationId } });
        if (!row) return {};
        return {
            'owner.exists': Boolean(row.ownerUserId),
            ownerUserId: row.ownerUserId,
            ownerLabel: 'Compliance owner',
            sourceHref: sourceHref('ComplianceGap', row.id, row.publicId),
            sourcePublicId: row.publicId,
            title: row.title,
        };
    }
    if (input.sourceModel === 'PrivacyRightsRequest') {
        const row = await prisma.privacyRightsRequest.findFirst({ where: { id: input.sourceId, organizationId: input.organizationId } });
        if (!row) return {};
        return {
            'owner.exists': Boolean(row.ownerUserId),
            'due.exceeded': Boolean(row.dueAt && row.dueAt.getTime() < now.getTime() && !['COMPLETED', 'DENIED', 'CLOSED'].includes(row.status)),
            ownerUserId: row.ownerUserId,
            ownerLabel: 'Privacy owner',
            sourceHref: sourceHref('PrivacyRightsRequest', row.id, row.publicId),
            sourcePublicId: row.publicId,
            title: row.publicId,
        };
    }
    if (input.sourceModel === 'AiSystem') {
        const row = await prisma.aiSystem.findFirst({ where: { id: input.sourceId, organizationId: input.organizationId } });
        if (!row) return {};
        return {
            'owner.exists': Boolean(row.businessOwner || row.riskOwner || row.technicalOwner),
            'due.exceeded': Boolean(row.reviewAt && row.reviewAt.getTime() < now.getTime()),
            ownerUserId: null,
            ownerLabel: row.riskOwner || row.businessOwner || 'AI owner',
            sourceHref: sourceHref('AiSystem', row.id, row.publicId),
            sourcePublicId: row.publicId,
            title: row.name,
        };
    }
    if (input.sourceModel === 'InsuranceLicense') {
        const row = await prisma.insuranceLicense.findFirst({ where: { id: input.sourceId, organizationId: input.organizationId } });
        if (!row) return {};
        return {
            'owner.exists': Boolean(row.ownerUserId),
            'due.exceeded': Boolean((row.expiryDate && row.expiryDate.getTime() <= now.getTime()) || (row.reviewDueAt && row.reviewDueAt.getTime() <= now.getTime())),
            ownerUserId: row.ownerUserId,
            ownerLabel: 'License record owner',
            sourceHref: sourceHref('InsuranceLicense', row.id, row.publicId),
            sourcePublicId: row.publicId,
            title: 'Recorded license expiry/review date is approaching — review required.',
        };
    }
    if (input.sourceModel === 'InsuranceAiContext') {
        const row = await prisma.insuranceAiContext.findFirst({
            where: { id: input.sourceId, organizationId: input.organizationId },
        });
        if (!row) return {};
        const system = await prisma.aiSystem.findFirst({ where: { id: row.aiSystemId, organizationId: input.organizationId } });
        return {
            'owner.exists': Boolean(system?.businessOwner || system?.riskOwner || system?.technicalOwner || row.nextReviewAt),
            'due.exceeded': Boolean(row.nextReviewAt && row.nextReviewAt.getTime() <= now.getTime()),
            ownerUserId: null,
            ownerLabel: system?.riskOwner || system?.businessOwner || 'Insurance model reviewer',
            sourceHref: sourceHref('InsuranceAiContext', row.id, system?.publicId),
            sourcePublicId: system?.publicId || row.aiSystemId,
            title: system?.name || 'Insurance AI / model context review is due.',
        };
    }
    if (input.sourceModel === 'AiApproval') {
        const row = await prisma.aiApproval.findFirst({
            where: { id: input.sourceId, organizationId: input.organizationId },
            include: { system: { select: { publicId: true, name: true, businessOwner: true, riskOwner: true, technicalOwner: true } } },
        });
        if (!row) return {};
        return {
            'owner.exists': Boolean(row.system.businessOwner || row.system.riskOwner || row.system.technicalOwner || row.decisionMaker),
            'due.exceeded': Boolean(row.reviewAt && row.reviewAt.getTime() < now.getTime()),
            ownerUserId: null,
            ownerLabel: row.system.riskOwner || row.system.businessOwner || 'AI owner',
            sourceHref: sourceHref('AiApproval', row.id, row.publicId),
            sourcePublicId: row.publicId,
            title: row.system.name,
        };
    }
    if (input.sourceModel === 'Vendor') {
        const row = await prisma.vendor.findFirst({ where: { id: input.sourceId, organizationId: input.organizationId } });
        if (!row) return {};
        return {
            'vendor.tier': row.tier,
            'owner.exists': Boolean(row.relationshipOwnerUserId || row.businessOwnerUserId),
            ownerUserId: row.relationshipOwnerUserId || row.businessOwnerUserId || null,
            ownerLabel: 'Vendor owner',
            sourceHref: sourceHref('Vendor', row.id),
            title: row.name,
        };
    }
    if (input.sourceModel === 'VendorAssessment') {
        const row = await prisma.vendorAssessment.findFirst({ where: { id: input.sourceId, organizationId: input.organizationId } });
        if (!row) return {};
        return {
            'owner.exists': Boolean(row.assignedTo),
            ownerUserId: row.assignedTo,
            ownerLabel: 'Assessment reviewer',
            sourceHref: sourceHref('VendorAssessment', row.id),
            title: 'Assessment',
        };
    }
    return {};
}

function workKindFor(action: ActionDef): 'REVIEW' | 'REMINDER' | 'EVIDENCE_REQUEST' | 'DECISION_REQUEST' | 'REASSESSMENT_REQUEST' {
    if (action.params?.workKind) return action.params.workKind;
    if (action.type === 'REQUEST_EVIDENCE') return 'EVIDENCE_REQUEST';
    if (action.type === 'REQUEST_REASSESSMENT') return 'REASSESSMENT_REQUEST';
    if (action.type === 'CREATE_DECISION_PACKAGE') return 'DECISION_REQUEST';
    if (action.type === 'CREATE_REMINDER' || action.type === 'ESCALATE_OVERDUE') return 'REMINDER';
    return 'REVIEW';
}

function presentAutomation(row: any, version?: any) {
    const current = version || row.versions?.find((item: any) => item.id === row.currentVersionId) || row.versions?.[0];
    const trigger = current?.trigger as TriggerDef | undefined;
    const conditions = (current?.conditions || []) as ConditionDef[];
    const actions = (current?.actions || []) as ActionDef[];
    const human = current?.humanBoundary as HumanBoundary | undefined;
    return {
        publicId: row.publicId,
        name: row.name,
        description: row.description,
        status: row.status,
        domain: row.domain,
        ownerUserId: row.ownerUserId,
        timezone: row.timezone,
        templateKey: row.templateKey,
        enabled: row.enabled && row.status === 'ACTIVE',
        version: current?.versionNumber || 0,
        versionId: current?.id || null,
        lastRunAt: row.lastRunAt,
        nextRunAt: row.nextRunAt,
        purpose: row.description,
        when: trigger?.event || null,
        conditions: conditions.map((item) => ({ field: item.field, op: item.op, value: item.value })),
        actions: actions.map((item) => ({ type: item.type, params: item.params || {} })),
        humanBoundary: human || { required: true, before: 'source_decision', label: 'A person must act on the source record.' },
        href: `/automation/${row.publicId}`,
        editHref: `/automation/${row.publicId}/edit`,
    };
}

function presentExecution(row: any) {
    const conditions = row.conditionsEvaluated as { matched?: boolean; results?: Array<{ field: string; matched: boolean; reason: string }> };
    const succeeded = row.actionsSucceeded as Array<{ type: string }>;
    const failed = row.actionsFailed as Array<{ type: string; error?: string }>;
    const attempted = row.actionsAttempted as Array<{ type: string }>;
    const didNot = (attempted || []).filter((item) => !(succeeded || []).some((ok) => ok.type === item.type) && !(failed || []).some((bad) => bad.type === item.type));
    return {
        publicId: row.publicId,
        automationPublicId: row.automation?.publicId,
        automationName: row.automation?.name,
        version: row.versionNumber,
        status: row.status,
        triggerEvent: row.triggerEvent,
        sourceModel: row.sourceModel,
        sourceId: row.sourceId,
        sourcePublicId: row.sourcePublicId,
        preview: row.preview,
        humanApprovalRequired: row.humanApprovalRequired,
        nextActorLabel: row.nextActorLabel,
        timezoneUsed: row.timezoneUsed,
        retryCount: row.retryCount,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        durationMs: row.durationMs,
        whatTriggered: row.triggerEvent,
        conditionsMatched: conditions?.matched === true,
        conditions: conditions?.results || [],
        whatSupremeDid: (succeeded || []).map((item) => item.type),
        whatSupremeDidNotDo: [
            ...didNot.map((item) => item.type),
            'Accept risk',
            'Approve vendor',
            'Close finding',
            'Declare compliance',
            'Approve AI',
            'Change residual risk',
            'Make a legal conclusion',
        ],
        whoNeedsToAct: row.nextActorLabel,
        whatFailed: (failed || []).map((item) => ({ type: item.type, error: item.error })),
        willRetry: (failed || []).some((item) => actionRetryable(item.type)),
        href: `/automation/runs/${row.publicId}`,
        workItems: (row.workItems || []).map((item: any) => ({
            publicId: item.publicId,
            title: item.title,
            kind: item.kind,
            status: item.status,
            dueAt: item.dueAt,
            sourceHref: item.sourceHref,
            humanRequired: item.humanRequired,
        })),
    };
}

async function performAction(input: {
    organizationId: string;
    automation: { id: string; publicId: string; name: string };
    execution: { id: string };
    action: ActionDef;
    facts: AutomationFacts;
    sourceModel: string;
    sourceId: string;
    event: string;
}) {
    if (isProhibitedAction(input.action.type)) {
        throw new ApiError(400, `${input.action.type} is not allowed.`);
    }
    const due = input.action.params?.dueInDays
        ? new Date(Date.now() + input.action.params.dueInDays * 86400000)
        : undefined;
    const createsWork = input.action.type !== 'NOTIFY_OWNER';
    let work = null;
    if (createsWork) {
        const existing = await prisma.automationWorkItem.findFirst({
            where: { organizationId: input.organizationId, executionId: input.execution.id, kind: workKindFor(input.action) },
        });
        if (existing) {
            work = existing;
        } else {
            work = await prisma.automationWorkItem.create({
                data: {
                    organizationId: input.organizationId,
                    publicId: await nextPublicId(input.organizationId, 'WRK'),
                    automationId: input.automation.id,
                    executionId: input.execution.id,
                    title: input.action.params?.title || `${input.automation.name}: ${input.facts.title || input.sourceModel}`,
                    body: `Triggered by ${input.event}. Automation ${input.automation.publicId} created this follow-up. A person must act on the source record. Supreme did not accept risk, approve a vendor, close a finding, or declare compliance.`,
                    sourceModel: input.sourceModel,
                    sourceId: input.sourceId,
                    sourceHref: input.facts.sourceHref || sourceHref(input.sourceModel, input.sourceId, input.facts.sourcePublicId),
                    ownerUserId: input.facts.ownerUserId || null,
                    dueAt: due,
                    kind: workKindFor(input.action),
                    humanRequired: true,
                },
            });
        }
    }
    if (input.action.type === 'NOTIFY_OWNER' || input.action.type === 'CREATE_REMINDER' || input.action.type === 'ESCALATE_OVERDUE' || input.action.type === 'CREATE_REVIEW_REQUEST') {
        const { automationWorkEmail, customerAppUrl } = await import('./transactionalEmail');
        const workMail = automationWorkEmail({
            title: input.facts.title || input.automation.name,
            why: `Supreme identified work that needs a person. ${input.facts.title || 'Open the source record'} requires attention.`,
            dueAt: due,
            ctaUrl: input.facts.sourceHref?.startsWith('http')
                ? input.facts.sourceHref
                : customerAppUrl(input.facts.sourceHref || '/automation'),
            source: input.sourceModel.replace(/([A-Z])/g, ' $1').trim(),
        });
        await notifyUser({
            organizationId: input.organizationId,
            userId: input.facts.ownerUserId,
            eventType: 'automation.action',
            title: workMail.subject,
            body: workMail.text,
            emailBody: workMail.text,
            emailHtml: workMail.html,
            fromName: workMail.fromName,
            resourceType: input.sourceModel,
            resourceId: input.sourceId,
        });
    }
    return { type: input.action.type, workItemPublicId: work?.publicId || null };
}

export const supremeAutomationService = {
    catalog,
    honesty,
    ruleVersion: AUTOMATION_RULE_VERSION,

    async workspace(organizationId: string) {
        const [automations, executions, work, org] = await Promise.all([
            prisma.automationDefinition.findMany({
                where: { organizationId, status: { not: 'ARCHIVED' } },
                include: { versions: { orderBy: { versionNumber: 'desc' } } },
                orderBy: { updatedAt: 'desc' },
            }),
            prisma.automationExecution.findMany({
                where: { organizationId, preview: false },
                include: { automation: { select: { publicId: true, name: true } }, workItems: true },
                orderBy: { createdAt: 'desc' },
                take: 40,
            }),
            prisma.automationWorkItem.findMany({
                where: { organizationId, status: 'OPEN' },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } }),
        ]);
        const failed = executions.filter((row) => ['FAILED', 'DEAD_LETTER', 'PARTIAL'].includes(row.status));
        const recommendations = [];
        const expiringAccept = await prisma.enterpriseRiskDecision.count({
            where: { organizationId, decision: 'ACCEPT', expiresAt: { lte: new Date(Date.now() + 14 * 86400000) } },
        });
        if (expiringAccept >= 2 && !automations.some((row) => row.templateKey === 'risk-acceptance-expiry' && row.status === 'ACTIVE')) {
            recommendations.push({
                templateKey: 'risk-acceptance-expiry',
                message: `You have ${expiringAccept} risk acceptances nearing expiry. Consider the Risk Acceptance Expiry template. Supreme will not enable it unless a person publishes it.`,
            });
        }
        return {
            honesty: honesty(),
            noAiAgents: 'Deterministic workflow automation. No AI agents are running.',
            timezone: org?.timezone || 'UTC',
            queue: await this.queueStatus(),
            active: automations.filter((row) => row.status === 'ACTIVE').map((row) => presentAutomation(row)),
            drafts: automations.filter((row) => row.status === 'DRAFT').map((row) => presentAutomation(row)),
            paused: automations.filter((row) => row.status === 'PAUSED').map((row) => presentAutomation(row)),
            needsAttention: [...failed.map(presentExecution), ...work.filter((item) => !item.ownerUserId).map((item) => ({
                publicId: item.publicId,
                status: 'NEEDS_OWNER',
                title: item.title,
                href: item.sourceHref,
            }))],
            recentRuns: executions.slice(0, 15).map(presentExecution),
            failedRuns: failed.map(presentExecution),
            templates: catalog().templates,
            recommendations,
            openWork: work.map((item) => ({
                publicId: item.publicId,
                title: item.title,
                kind: item.kind,
                dueAt: item.dueAt,
                sourceHref: item.sourceHref,
                humanRequired: item.humanRequired,
            })),
        };
    },

    async queueStatus() {
        const host = process.env.REDIS_HOST;
        const url = process.env.REDIS_URL;
        if (!host && !url && process.env.NODE_ENV !== 'production') {
            return { status: 'NOT_CONFIGURED', message: 'Scheduled checks are not configured. Event-driven runs still execute. Successful execution is not simulated.' };
        }
        try {
            const { redisClient } = await import('../config/database');
            if (!redisClient) {
                return { status: 'NOT_CONFIGURED', message: 'Scheduled checks are not connected. Event-driven runs still execute.' };
            }
            return { status: 'CONNECTED', message: 'Scheduled checks are connected. Delivery is at-least-once. Successful execution is not simulated.' };
        } catch {
            return { status: 'DEGRADED', message: 'Scheduled-check status could not be confirmed. Event-driven runs still execute.' };
        }
    },

    async list(organizationId: string) {
        const rows = await prisma.automationDefinition.findMany({
            where: { organizationId },
            include: { versions: { orderBy: { versionNumber: 'desc' } } },
            orderBy: { updatedAt: 'desc' },
        });
        return rows.map((row) => presentAutomation(row));
    },

    async get(organizationId: string, publicId: string) {
        const row = await prisma.automationDefinition.findFirst({
            where: { organizationId, publicId },
            include: { versions: { orderBy: { versionNumber: 'desc' } } },
        });
        if (!row) throw new ApiError(404, 'Automation not found');
        const executions = await prisma.automationExecution.findMany({
            where: { organizationId, automationId: row.id, preview: false },
            include: { automation: { select: { publicId: true, name: true } }, workItems: true },
            orderBy: { createdAt: 'desc' },
            take: 25,
        });
        const audit = await prisma.auditEvent.findMany({
            where: { organizationId, resourceType: 'AutomationDefinition', resourceId: row.id },
            orderBy: { timestamp: 'desc' },
            take: 20,
        });
        return {
            ...presentAutomation(row),
            versions: row.versions.map((version) => ({
                version: version.versionNumber,
                publishedAt: version.publishedAt,
                publishedByUserId: version.publishedByUserId,
            })),
            recentExecutions: executions.map(presentExecution),
            audit: audit.map((item) => ({ action: item.action, at: item.timestamp, result: item.result })),
        };
    },

    async create(organizationId: string, actorUserId: string, body: DefinitionInput) {
        const template = body.templateKey ? templateByKey(body.templateKey) : null;
        const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
        const trigger = body.trigger || template?.trigger;
        const conditions = body.conditions || template?.conditions || [];
        const actions = body.actions || template?.actions || [];
        const humanBoundary = body.humanBoundary || template?.humanBoundary || { required: true, before: 'source_decision', label: 'A person must act on the source record.' };
        const row = await prisma.automationDefinition.create({
            data: {
                organizationId,
                publicId: await nextPublicId(organizationId, 'AUT'),
                name: body.name || template?.name || 'Untitled automation',
                description: body.description || template?.description || 'Governed administrative workflow.',
                status: 'DRAFT',
                domain: (body.domain || template?.domain || 'CROSS_PLATFORM') as never,
                ownerUserId: body.ownerUserId || actorUserId,
                timezone: body.timezone || org?.timezone || 'UTC',
                templateKey: body.templateKey || template?.key || null,
                createdByUserId: actorUserId,
                versions: {
                    create: {
                        organizationId,
                        versionNumber: 1,
                        trigger: trigger || { type: 'EVENT', event: 'finding.overdue' },
                        conditions,
                        actions,
                        humanBoundary,
                    },
                },
            },
            include: { versions: true },
        });
        await prisma.automationDefinition.update({ where: { id: row.id }, data: { currentVersionId: row.versions[0].id } });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'automation.created',
            resourceType: 'AutomationDefinition',
            resourceId: row.id,
            result: 'success',
            metadata: { publicId: row.publicId, templateKey: row.templateKey },
        });
        return this.get(organizationId, row.publicId);
    },

    async saveDraft(organizationId: string, publicId: string, actorUserId: string, body: DefinitionInput) {
        const row = await prisma.automationDefinition.findFirst({
            where: { organizationId, publicId },
            include: { versions: { orderBy: { versionNumber: 'desc' } } },
        });
        if (!row) throw new ApiError(404, 'Automation not found');
        const latest = row.versions[0];
        const nextTrigger = body.trigger || (latest.trigger as TriggerDef);
        const nextConditions = body.conditions || (latest.conditions as ConditionDef[]);
        const nextActions = body.actions || (latest.actions as ActionDef[]);
        const nextHuman = body.humanBoundary || (latest.humanBoundary as HumanBoundary);
        if (row.status === 'ACTIVE') {
            const draft = await prisma.automationVersion.create({
                data: {
                    organizationId,
                    automationId: row.id,
                    versionNumber: latest.versionNumber + 1,
                    trigger: nextTrigger as never,
                    conditions: nextConditions as never,
                    actions: nextActions as never,
                    humanBoundary: nextHuman as never,
                },
            });
            await prisma.automationDefinition.update({
                where: { id: row.id },
                data: {
                    name: body.name || row.name,
                    description: body.description || row.description,
                    currentVersionId: draft.id,
                    status: 'DRAFT',
                    enabled: false,
                    ownerUserId: body.ownerUserId === undefined ? row.ownerUserId : body.ownerUserId,
                    timezone: body.timezone || row.timezone,
                },
            });
        } else if (!latest.publishedAt) {
            await prisma.automationVersion.update({
                where: { id: latest.id },
                data: {
                    trigger: nextTrigger as never,
                    conditions: nextConditions as never,
                    actions: nextActions as never,
                    humanBoundary: nextHuman as never,
                },
            });
            await prisma.automationDefinition.update({
                where: { id: row.id },
                data: {
                    name: body.name || row.name,
                    description: body.description || row.description,
                    ownerUserId: body.ownerUserId === undefined ? row.ownerUserId : body.ownerUserId,
                    timezone: body.timezone || row.timezone,
                },
            });
        } else {
            const draft = await prisma.automationVersion.create({
                data: {
                    organizationId,
                    automationId: row.id,
                    versionNumber: latest.versionNumber + 1,
                    trigger: nextTrigger as never,
                    conditions: nextConditions as never,
                    actions: nextActions as never,
                    humanBoundary: nextHuman as never,
                },
            });
            await prisma.automationDefinition.update({
                where: { id: row.id },
                data: { currentVersionId: draft.id, name: body.name || row.name, description: body.description || row.description },
            });
        }
        return this.get(organizationId, publicId);
    },

    async publish(organizationId: string, publicId: string, actorUserId: string) {
        const row = await prisma.automationDefinition.findFirst({
            where: { organizationId, publicId },
            include: { versions: { orderBy: { versionNumber: 'desc' } } },
        });
        if (!row) throw new ApiError(404, 'Automation not found');
        const current = row.versions.find((item) => item.id === row.currentVersionId) || row.versions[0];
        const errors = validateDefinition({
            trigger: current.trigger as TriggerDef,
            conditions: current.conditions as ConditionDef[],
            actions: current.actions as ActionDef[],
            humanBoundary: current.humanBoundary as HumanBoundary,
        });
        if (errors.length) throw new ApiError(400, errors[0]);
        await prisma.automationVersion.update({
            where: { id: current.id },
            data: { publishedAt: new Date(), publishedByUserId: actorUserId },
        });
        await prisma.automationDefinition.update({
            where: { id: row.id },
            data: { status: 'ACTIVE', enabled: true, publishedByUserId: actorUserId, effectiveAt: new Date() },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'automation.published',
            resourceType: 'AutomationDefinition',
            resourceId: row.id,
            result: 'success',
            metadata: { publicId, version: current.versionNumber },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'automation.enabled',
            resourceType: 'AutomationDefinition',
            resourceId: row.id,
            result: 'success',
            metadata: { publicId },
        });
        return this.get(organizationId, publicId);
    },

    async pause(organizationId: string, publicId: string, actorUserId: string) {
        const row = await prisma.automationDefinition.findFirst({ where: { organizationId, publicId } });
        if (!row) throw new ApiError(404, 'Automation not found');
        await prisma.automationDefinition.update({ where: { id: row.id }, data: { status: 'PAUSED', enabled: false } });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'automation.paused',
            resourceType: 'AutomationDefinition',
            resourceId: row.id,
            result: 'success',
            metadata: { publicId },
        });
        return this.get(organizationId, publicId);
    },

    async resume(organizationId: string, publicId: string, actorUserId: string) {
        return this.publish(organizationId, publicId, actorUserId);
    },

    async archive(organizationId: string, publicId: string, actorUserId: string) {
        const row = await prisma.automationDefinition.findFirst({ where: { organizationId, publicId } });
        if (!row) throw new ApiError(404, 'Automation not found');
        await prisma.automationDefinition.update({ where: { id: row.id }, data: { status: 'ARCHIVED', enabled: false } });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'automation.archived',
            resourceType: 'AutomationDefinition',
            resourceId: row.id,
            result: 'success',
            metadata: { publicId },
        });
        return this.get(organizationId, publicId);
    },

    async executions(organizationId: string, query: { status?: string; domain?: string; automation?: string; q?: string }) {
        const rows = await prisma.automationExecution.findMany({
            where: {
                organizationId,
                preview: false,
                ...(query.status ? { status: query.status as never } : {}),
                ...(query.automation ? { automation: { publicId: query.automation } } : {}),
            },
            include: { automation: { select: { publicId: true, name: true, domain: true } }, workItems: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return rows
            .filter((row) => !query.domain || row.automation.domain === query.domain)
            .map(presentExecution);
    },

    async workItem(organizationId: string, publicId: string) {
        const row = await prisma.automationWorkItem.findFirst({
            where: { organizationId, publicId },
            include: { execution: { select: { publicId: true } } },
        });
        if (!row) throw new ApiError(404, 'Work item not found');
        return {
            publicId: row.publicId,
            title: row.title,
            kind: row.kind,
            status: row.status,
            dueAt: row.dueAt,
            sourceHref: row.sourceHref,
            humanRequired: row.humanRequired,
            href: `/automation/runs/${row.execution.publicId}`,
        };
    },

    async execution(organizationId: string, publicId: string) {
        const row = await prisma.automationExecution.findFirst({
            where: { organizationId, publicId },
            include: { automation: { select: { publicId: true, name: true } }, workItems: true },
        });
        if (!row) throw new ApiError(404, 'Execution not found');
        return presentExecution(row);
    },

    async preview(organizationId: string, publicId: string, body: { sourceModel: string; sourceId: string; event?: string }) {
        const row = await prisma.automationDefinition.findFirst({
            where: { organizationId, publicId },
            include: { versions: true },
        });
        if (!row) throw new ApiError(404, 'Automation not found');
        const version = row.versions.find((item) => item.id === row.currentVersionId) || row.versions[0];
        const trigger = version.trigger as TriggerDef;
        const facts = await loadFacts({ organizationId, sourceModel: body.sourceModel, sourceId: body.sourceId });
        const evaluation = evaluateConditions(version.conditions as ConditionDef[], facts);
        const event = body.event || trigger.event;
        const wouldTrigger = event === trigger.event;
        return {
            label: 'PREVIEW — NO ACTIONS EXECUTED',
            preview: true,
            writes: false,
            wouldTrigger,
            conditionsMatched: evaluation.matched,
            conditions: evaluation.results,
            actionsThatWouldRun: wouldTrigger && evaluation.matched ? (version.actions as ActionDef[]).map((item) => item.type) : [],
            humanApprovalRequired: Boolean((version.humanBoundary as HumanBoundary)?.required),
            humanBoundary: version.humanBoundary,
            timezoneUsed: row.timezone,
            source: { model: body.sourceModel, id: body.sourceId, href: facts.sourceHref },
        };
    },

    async handleEvent(input: { organizationId: string; event: string; sourceModel: string; sourceId: string; sourcePublicId?: string | null; actorUserId?: string | null }) {
        const automations = await prisma.automationDefinition.findMany({
            where: { organizationId: input.organizationId, status: 'ACTIVE', enabled: true },
            include: { versions: true },
        });
        const results = [];
        for (const automation of automations) {
            const version = automation.versions.find((item) => item.id === automation.currentVersionId) || automation.versions[0];
            if (!version?.publishedAt) continue;
            const trigger = version.trigger as TriggerDef;
            if (trigger.event !== input.event) continue;
            results.push(await this.executeLive({
                organizationId: input.organizationId,
                automation,
                version,
                event: input.event,
                sourceModel: input.sourceModel,
                sourceId: input.sourceId,
                sourcePublicId: input.sourcePublicId,
                actorUserId: input.actorUserId,
            }));
        }
        return results;
    },

    async executeLive(input: {
        organizationId: string;
        automation: any;
        version: any;
        event: string;
        sourceModel: string;
        sourceId: string;
        sourcePublicId?: string | null;
        actorUserId?: string | null;
        force?: boolean;
    }) {
        const timezone = input.automation.timezone || 'UTC';
        const key = idempotencyKey({
            automationId: input.automation.id,
            versionId: input.version.id,
            event: input.event,
            sourceModel: input.sourceModel,
            sourceId: input.sourceId,
            bucket: calendarDay(new Date(), timezone),
        });
        const existing = await prisma.automationExecution.findFirst({
            where: { organizationId: input.organizationId, idempotencyKey: key },
            include: { automation: { select: { publicId: true, name: true } }, workItems: true },
        });
        if (existing && !input.force) {
            return { ...presentExecution(existing), duplicateSuppressed: true };
        }
        const facts = await loadFacts({ organizationId: input.organizationId, sourceModel: input.sourceModel, sourceId: input.sourceId });
        const evaluation = evaluateConditions(input.version.conditions as ConditionDef[], facts);
        const human = input.version.humanBoundary as HumanBoundary;
        const started = new Date();
        const publicId = await nextPublicId(input.organizationId, 'RUN');
        let execution;
        try {
            execution = await prisma.automationExecution.create({
                data: {
                    organizationId: input.organizationId,
                    publicId,
                    automationId: input.automation.id,
                    versionId: input.version.id,
                    versionNumber: input.version.versionNumber,
                    idempotencyKey: key,
                    correlationId: randomUUID(),
                    triggerEvent: input.event,
                    sourceModel: input.sourceModel,
                    sourceId: input.sourceId,
                    sourcePublicId: input.sourcePublicId || facts.sourcePublicId || null,
                    status: evaluation.matched ? 'RUNNING' : 'SKIPPED',
                    conditionsEvaluated: evaluation as never,
                    actionsAttempted: evaluation.matched ? input.version.actions : [],
                    actionsSucceeded: [],
                    actionsFailed: [],
                    humanApprovalRequired: Boolean(human?.required),
                    nextActorLabel: human?.label || facts.ownerLabel || 'A person on the source record',
                    timezoneUsed: timezone,
                    startedAt: started,
                },
            });
        } catch (error: any) {
            if (String(error?.code) === 'P2002') {
                const raced = await prisma.automationExecution.findFirst({
                    where: { organizationId: input.organizationId, idempotencyKey: key },
                    include: { automation: { select: { publicId: true, name: true } }, workItems: true },
                });
                if (raced) return { ...presentExecution(raced), duplicateSuppressed: true };
            }
            throw error;
        }
        await recordAudit({
            organizationId: input.organizationId,
            actorUserId: input.actorUserId || undefined,
            action: 'automation.triggered',
            resourceType: 'AutomationExecution',
            resourceId: execution.id,
            result: 'success',
            metadata: { publicId, event: input.event, automation: input.automation.publicId },
        });
        if (!evaluation.matched) {
            await prisma.automationExecution.update({
                where: { id: execution.id },
                data: { status: 'SKIPPED', completedAt: new Date(), durationMs: Date.now() - started.getTime() },
            });
            return this.execution(input.organizationId, publicId);
        }
        await recordAudit({
            organizationId: input.organizationId,
            actorUserId: input.actorUserId || undefined,
            action: 'automation.execution.started',
            resourceType: 'AutomationExecution',
            resourceId: execution.id,
            result: 'success',
            metadata: { publicId },
        });
        const succeeded: Array<{ type: string }> = [];
        const failed: Array<{ type: string; error: string }> = [];
        for (const action of input.version.actions as ActionDef[]) {
            try {
                await performAction({
                    organizationId: input.organizationId,
                    automation: input.automation,
                    execution,
                    action,
                    facts,
                    sourceModel: input.sourceModel,
                    sourceId: input.sourceId,
                    event: input.event,
                });
                succeeded.push({ type: action.type });
                await recordAudit({
                    organizationId: input.organizationId,
                    actorUserId: input.actorUserId || undefined,
                    action: 'automation.action.executed',
                    resourceType: 'AutomationExecution',
                    resourceId: execution.id,
                    result: 'success',
                    metadata: { type: action.type },
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                failed.push({ type: action.type, error: message });
                await recordAudit({
                    organizationId: input.organizationId,
                    actorUserId: input.actorUserId || undefined,
                    action: 'automation.action.failed',
                    resourceType: 'AutomationExecution',
                    resourceId: execution.id,
                    result: 'failure',
                    metadata: { type: action.type },
                });
            }
        }
        if (human?.required) {
            await recordAudit({
                organizationId: input.organizationId,
                actorUserId: input.actorUserId || undefined,
                action: 'automation.approval.requested',
                resourceType: 'AutomationExecution',
                resourceId: execution.id,
                result: 'success',
                metadata: { before: human.before },
            });
        }
        const status = failed.length === 0 ? 'SUCCEEDED' : succeeded.length ? 'PARTIAL' : failed.every((item) => !actionRetryable(item.type)) ? 'DEAD_LETTER' : 'FAILED';
        await prisma.automationExecution.update({
            where: { id: execution.id },
            data: {
                status,
                actionsSucceeded: succeeded as never,
                actionsFailed: failed as never,
                completedAt: new Date(),
                durationMs: Date.now() - started.getTime(),
                errorSummary: failed[0]?.error || null,
            },
        });
        await prisma.automationDefinition.update({
            where: { id: input.automation.id },
            data: { lastRunAt: new Date() },
        });
        return this.execution(input.organizationId, publicId);
    },

    async retry(organizationId: string, publicId: string, actorUserId: string) {
        const row = await prisma.automationExecution.findFirst({
            where: { organizationId, publicId },
            include: { automation: true, version: true, workItems: true },
        });
        if (!row) throw new ApiError(404, 'Execution not found');
        if (row.preview) throw new ApiError(400, 'Preview runs cannot be retried.');
        const failed = (row.actionsFailed as Array<{ type: string }>) || [];
        const retryable = failed.filter((item) => actionRetryable(item.type));
        if (!retryable.length) throw new ApiError(400, 'This run has no retryable actions. Creating duplicate governance records is not retried.');
        const facts = await loadFacts({ organizationId, sourceModel: row.sourceModel, sourceId: row.sourceId });
        const stillFailed: Array<{ type: string; error: string }> = [];
        const succeeded = [...((row.actionsSucceeded as Array<{ type: string }>) || [])];
        for (const action of retryable) {
            try {
                await performAction({
                    organizationId,
                    automation: row.automation,
                    execution: row,
                    action: { type: action.type },
                    facts,
                    sourceModel: row.sourceModel,
                    sourceId: row.sourceId,
                    event: row.triggerEvent,
                });
                succeeded.push({ type: action.type });
            } catch (error) {
                stillFailed.push({ type: action.type, error: error instanceof Error ? error.message : String(error) });
            }
        }
        await prisma.automationExecution.update({
            where: { id: row.id },
            data: {
                retryCount: { increment: 1 },
                actionsSucceeded: succeeded as never,
                actionsFailed: stillFailed as never,
                status: stillFailed.length ? 'FAILED' : 'SUCCEEDED',
            },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'automation.retried',
            resourceType: 'AutomationExecution',
            resourceId: row.id,
            result: stillFailed.length ? 'failure' : 'success',
            metadata: { publicId },
        });
        return this.execution(organizationId, publicId);
    },

    async scan(organizationId?: string, now = new Date()) {
        const orgs = organizationId
            ? [{ id: organizationId, timezone: 'UTC' }]
            : await prisma.organization.findMany({ select: { id: true, timezone: true } });
        const emitted = [];
        for (const org of orgs) {
            const timezone = org.timezone || 'UTC';
            const findings = await prisma.vendorIssue.findMany({
                where: {
                    organizationId: org.id,
                    status: { not: 'CLOSED' },
                    targetRemediationDate: { lt: now },
                },
                take: 100,
            });
            for (const row of findings) {
                emitted.push(await this.handleEvent({ organizationId: org.id, event: 'finding.overdue', sourceModel: 'VendorIssue', sourceId: row.id }));
            }
            const evidence = await prisma.evidenceGovernanceLink.findMany({
                where: { organizationId: org.id, expiresAt: { lte: new Date(now.getTime() + 30 * 86400000) } },
                take: 100,
            });
            for (const row of evidence) {
                const event = row.expiresAt && row.expiresAt.getTime() < now.getTime() ? 'evidence.expired' : 'evidence.expiring';
                emitted.push(await this.handleEvent({ organizationId: org.id, event, sourceModel: 'EvidenceGovernanceLink', sourceId: row.id }));
            }
            const acceptances = await prisma.enterpriseRiskDecision.findMany({
                where: { organizationId: org.id, decision: 'ACCEPT', expiresAt: { lte: new Date(now.getTime() + 14 * 86400000) } },
                take: 100,
            });
            for (const row of acceptances) {
                emitted.push(await this.handleEvent({ organizationId: org.id, event: 'risk.acceptance.expiring', sourceModel: 'EnterpriseRiskDecision', sourceId: row.id }));
            }
            const outside = await prisma.enterpriseRisk.findMany({
                where: { organizationId: org.id, appetiteStatus: 'OUTSIDE_APPETITE' },
                take: 100,
            });
            for (const row of outside) {
                emitted.push(await this.handleEvent({ organizationId: org.id, event: 'risk.outside_appetite', sourceModel: 'EnterpriseRisk', sourceId: row.id }));
            }
            const rights = await prisma.privacyRightsRequest.findMany({
                where: {
                    organizationId: org.id,
                    status: { notIn: ['COMPLETED', 'DENIED', 'CLOSED'] },
                    dueAt: { lte: new Date(now.getTime() + 7 * 86400000) },
                },
                take: 100,
            });
            for (const row of rights) {
                emitted.push(await this.handleEvent({ organizationId: org.id, event: 'privacy.deadline.approaching', sourceModel: 'PrivacyRightsRequest', sourceId: row.id }));
            }
            const aiSystems = await prisma.aiSystem.findMany({
                where: {
                    organizationId: org.id,
                    reviewAt: { lte: new Date(now.getTime() + 14 * 86400000) },
                },
                take: 100,
            });
            for (const row of aiSystems) {
                emitted.push(await this.handleEvent({ organizationId: org.id, event: 'ai.approval.due', sourceModel: 'AiSystem', sourceId: row.id }));
            }
            const aiApprovals = await prisma.aiApproval.findMany({
                where: {
                    organizationId: org.id,
                    reviewAt: { lte: new Date(now.getTime() + 14 * 86400000) },
                },
                take: 100,
            });
            for (const row of aiApprovals) {
                emitted.push(await this.handleEvent({ organizationId: org.id, event: 'ai.approval.due', sourceModel: 'AiApproval', sourceId: row.id }));
            }
            const licenseHorizon = new Date(now.getTime() + 90 * 86400000);
            const licenses = await prisma.insuranceLicense.findMany({
                where: {
                    organizationId: org.id,
                    OR: [
                        { expiryDate: { lte: licenseHorizon } },
                        { reviewDueAt: { lte: licenseHorizon } },
                    ],
                },
                take: 100,
            });
            for (const row of licenses) {
                emitted.push(await this.handleEvent({ organizationId: org.id, event: 'scheduled.review', sourceModel: 'InsuranceLicense', sourceId: row.id, sourcePublicId: row.publicId }));
            }
            const insuranceAiHorizon = new Date(now.getTime() + 14 * 86400000);
            const insuranceModels = await prisma.insuranceAiContext.findMany({
                where: { organizationId: org.id, nextReviewAt: { lte: insuranceAiHorizon } },
                take: 100,
            });
            for (const row of insuranceModels) {
                emitted.push(await this.handleEvent({ organizationId: org.id, event: 'ai.approval.due', sourceModel: 'InsuranceAiContext', sourceId: row.id }));
            }
            await prisma.automationDefinition.updateMany({
                where: { organizationId: org.id, status: 'ACTIVE' },
                data: { nextRunAt: new Date(now.getTime() + 60 * 60 * 1000) },
            });
            void timezone;
        }
        return { scanned: orgs.length, runs: emitted.flat().length };
    },

    async recommendations(organizationId: string) {
        const workspace = await this.workspace(organizationId);
        return workspace.recommendations;
    },
};
