import {
    EngagementOffboardingStatus,
    EngagementStatus,
    GovernanceNodeType,
    GovernanceRelationshipType,
    OffboardingAudience,
    OffboardingExceptionStatus,
    OffboardingObligationCategory,
    OffboardingObligationStatus,
    Prisma,
    ReassessmentConflictDisposition,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { hasPermission, participantExperience, PERMISSIONS } from '../security/rbac';
import { engagementPrimaryAction } from '../tprm/engagementWorkspace';
import { recordAudit } from './auditEventService';
import { createRelationship, ensureNode } from './governanceGraphService';
import { notifyUser, type NotificationEvent } from './notificationDeliveryService';
import type { Actor } from './intakeEngagementService';

const OPEN = new Set<EngagementOffboardingStatus>([
    EngagementOffboardingStatus.DRAFT,
    EngagementOffboardingStatus.PLANNED,
    EngagementOffboardingStatus.IN_PROGRESS,
    EngagementOffboardingStatus.BLOCKED,
    EngagementOffboardingStatus.READY_FOR_CLOSURE,
]);

export const OBLIGATION_CATALOG = [
    { category: OffboardingObligationCategory.BUSINESS_TRANSITION, title: 'Business transition / replacement service', audience: OffboardingAudience.REQUESTER },
    { category: OffboardingObligationCategory.ACCESS_REVOCATION, title: 'Access revocation', audience: OffboardingAudience.INTERNAL },
    { category: OffboardingObligationCategory.INTEGRATION_CLOSURE, title: 'Integration / feed closure', audience: OffboardingAudience.INTERNAL },
    { category: OffboardingObligationCategory.CREDENTIAL_REVOCATION, title: 'Credential / API key revocation', audience: OffboardingAudience.INTERNAL },
    { category: OffboardingObligationCategory.DATA_RETURN, title: 'Data return', audience: OffboardingAudience.VENDOR },
    { category: OffboardingObligationCategory.DATA_DELETION, title: 'Data deletion confirmation', audience: OffboardingAudience.VENDOR },
    { category: OffboardingObligationCategory.DATA_RETENTION, title: 'Data retention confirmation', audience: OffboardingAudience.INTERNAL },
    { category: OffboardingObligationCategory.SUBPROCESSOR_CLOSURE, title: 'Subprocessor closure', audience: OffboardingAudience.VENDOR },
    { category: OffboardingObligationCategory.ASSET_RETURN, title: 'Asset return', audience: OffboardingAudience.VENDOR },
    { category: OffboardingObligationCategory.CONTRACT_NOTICE, title: 'Contract termination notice', audience: OffboardingAudience.INTERNAL },
    { category: OffboardingObligationCategory.FINAL_PAYMENT, title: 'Invoice / final payment confirmation', audience: OffboardingAudience.INTERNAL },
    { category: OffboardingObligationCategory.EVIDENCE_COLLECTION, title: 'Evidence of completion', audience: OffboardingAudience.INTERNAL },
    { category: OffboardingObligationCategory.LEGAL_RETENTION, title: 'Legal / regulatory retention', audience: OffboardingAudience.INTERNAL },
    { category: OffboardingObligationCategory.BUSINESS_CONTINUITY, title: 'Business continuity handoff', audience: OffboardingAudience.REQUESTER },
    { category: OffboardingObligationCategory.KNOWLEDGE_TRANSFER, title: 'Knowledge transfer', audience: OffboardingAudience.REQUESTER },
];

function assertPractitioner(actor: Actor) {
    if (participantExperience(actor.role) === 'requester') {
        throw new ApiError(403, 'Requesters cannot open internal Engagement offboarding.');
    }
    if (participantExperience(actor.role) === 'vendor' || String(actor.role || '').toUpperCase() === 'VENDOR') {
        throw new ApiError(403, 'Vendor sessions cannot open internal Engagement offboarding.');
    }
}

function canRead(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['offboarding.read']) || hasPermission(actor.role, PERMISSIONS['intake.read']);
}

function canManage(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['offboarding.manage']);
}

function canComplete(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['offboarding.complete']);
}

function canException(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['offboarding.exception']) || canComplete(actor);
}

async function audit(organizationId: string, actorId: string, action: string, resourceType: string, resourceId: string, metadata: Record<string, unknown> = {}) {
    await recordAudit({ organizationId, actorUserId: actorId, action, resourceType, resourceId, result: 'success', metadata });
}

async function notify(organizationId: string, userId: string | null | undefined, eventType: NotificationEvent, title: string, body: string, resourceId: string) {
    if (!userId) return;
    await notifyUser({ organizationId, userId, eventType, title, body, resourceType: 'EngagementOffboardingCase', resourceId });
}

export function evaluateGate(caseRow: {
    obligations: Array<{ id?: string; applicable: boolean; mandatory: boolean; status: OffboardingObligationStatus; title: string; storedObjectId?: string | null; audience: OffboardingAudience; vendorConfirmation?: string | null; internalVerification?: string | null; category: OffboardingObligationCategory }>;
    exceptions: Array<{ status: OffboardingExceptionStatus; obligationId?: string | null }>;
    openReassessment?: boolean;
}) {
    const blockers: string[] = [];
    if (caseRow.openReassessment) {
        blockers.push('Cannot complete offboarding while an open reassessment has no disposition.');
    }
    for (const row of caseRow.obligations) {
        if (!row.applicable || row.status === OffboardingObligationStatus.NOT_REQUIRED) continue;
        const excepted = caseRow.exceptions.some((item) => item.status === OffboardingExceptionStatus.APPROVED && item.obligationId === row.id);
        if (row.mandatory && row.status !== OffboardingObligationStatus.COMPLETED && !excepted) {
            if (row.category === OffboardingObligationCategory.DATA_DELETION || row.category === OffboardingObligationCategory.DATA_RETURN) {
                blockers.push(`Cannot close Engagement because ${row.title.toLowerCase()} is still outstanding.`);
            } else if (row.category === OffboardingObligationCategory.ACCESS_REVOCATION) {
                blockers.push('Access revocation is not verified.');
            } else if (row.category === OffboardingObligationCategory.INTEGRATION_CLOSURE) {
                blockers.push('Integration closure is not recorded.');
            } else if (row.category === OffboardingObligationCategory.CONTRACT_NOTICE) {
                blockers.push('Contract termination notice is not recorded.');
            } else if (row.category === OffboardingObligationCategory.BUSINESS_TRANSITION) {
                blockers.push('Business transition is incomplete.');
            } else {
                blockers.push(`${row.title} is still outstanding.`);
            }
        }
        if (row.mandatory && row.status === OffboardingObligationStatus.COMPLETED && !row.storedObjectId && !row.internalVerification && !row.vendorConfirmation && !excepted) {
            blockers.push(`Required evidence is missing for ${row.title}.`);
        }
        if (row.status === OffboardingObligationStatus.BLOCKED) {
            blockers.push(`${row.title} is blocked.`);
        }
    }
    return {
        ready: blockers.length === 0,
        blockers,
        status: blockers.length ? EngagementOffboardingStatus.BLOCKED : EngagementOffboardingStatus.READY_FOR_CLOSURE,
    };
}

function nextAction(status: EngagementOffboardingStatus, gateReady: boolean, vendorPending: boolean, blocked: boolean) {
    if (status === 'COMPLETED') return 'Engagement offboarded — history is inspectable';
    if (status === 'CANCELLED') return 'Offboarding cancelled — Engagement remains active';
    if (gateReady || status === 'READY_FOR_CLOSURE') return 'Review closure';
    if (blocked || status === 'BLOCKED') return 'Resolve blocker';
    if (vendorPending) return 'Await vendor response';
    if (status === 'IN_PROGRESS' || status === 'PLANNED') return 'Complete obligations';
    return 'Start offboarding';
}

async function thirdPartyAggregate(organizationId: string, vendorId: string, engagementId: string) {
    const siblings = await prisma.engagement.findMany({
        where: { organizationId, vendorId },
        select: { id: true, publicId: true, serviceName: true, status: true },
    });
    const remainingLive = siblings.filter((row) => row.id !== engagementId && row.status !== EngagementStatus.OFFBOARDED);
    return {
        remainingActive: remainingLive,
        vendorMayBecomeInactive: remainingLive.length === 0,
        honesty: remainingLive.length
            ? `Third Party remains in use because ${remainingLive.map((row) => row.serviceName).join(', ')} ${remainingLive.length === 1 ? 'is' : 'are'} still live.`
            : 'No other live Engagement remains. Third Party aggregate is not changed automatically. Review vendor lifecycle separately.',
    };
}

export async function getOffboardingWorkspace(organizationId: string, actor: Actor, engagementId: string) {
    if (participantExperience(actor.role) === 'requester') {
        const engagement = await prisma.engagement.findFirst({
            where: { organizationId, id: engagementId },
            select: { id: true, publicId: true, serviceName: true, status: true, requesterUserId: true },
        });
        if (!engagement) throw new ApiError(404, 'Engagement not found.');
        const cycle = await prisma.engagementOffboardingCase.findFirst({
            where: { organizationId, engagementId, status: { in: [...OPEN] } },
            include: { obligations: { where: { audience: OffboardingAudience.REQUESTER } } },
        });
        return {
            experience: 'requester',
            engagement: { id: engagement.id, publicId: engagement.publicId, serviceName: engagement.serviceName, status: engagement.status === 'OFFBOARDED' ? 'Service ended' : 'In transition' },
            tasks: cycle?.obligations || [],
            honesty: 'You can confirm assigned business-transition tasks only. Internal termination reasoning is not shown.',
        };
    }
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You do not have permission to read Engagement offboarding.');
    const engagement = await prisma.engagement.findFirst({
        where: { organizationId, id: engagementId },
        include: {
            vendor: { select: { id: true, name: true, publicId: true, status: true } },
            residualAssessments: { where: { status: 'CONFIRMED' }, orderBy: { createdAt: 'asc' }, take: 1 },
            reassessments: { select: { id: true, status: true, decision: true, cycleNumber: true }, orderBy: { cycleNumber: 'asc' } },
            findings: { select: { id: true, title: true, status: true, severity: true } },
            monitoringProfile: { select: { id: true, status: true } },
        },
    });
    if (!engagement) throw new ApiError(404, 'Engagement not found.');
    const [cases, recommendations, openReassessment] = await Promise.all([
        prisma.engagementOffboardingCase.findMany({
            where: { organizationId, engagementId },
            include: { obligations: { orderBy: { createdAt: 'asc' } }, exceptions: true, dispositions: { orderBy: { versionNumber: 'asc' } } },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.reassessmentRecommendation.findMany({ where: { organizationId, engagementId }, orderBy: { createdAt: 'desc' } }),
        prisma.engagementReassessment.findFirst({
            where: { organizationId, engagementId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            select: { id: true, publicId: true, status: true },
        }),
    ]);
    const active = cases.find((row) => OPEN.has(row.status)) || null;
    const current = active || [...cases].reverse().find((row) => row.status === EngagementOffboardingStatus.COMPLETED) || cases[cases.length - 1] || null;
    const gate = active
        ? evaluateGate({ ...active, openReassessment: Boolean(openReassessment) && !active.reassessmentConflictDisposition })
        : { ready: Boolean(current?.status === EngagementOffboardingStatus.COMPLETED), blockers: [], status: current?.status || EngagementOffboardingStatus.DRAFT };
    const vendorPending = Boolean(active?.obligations.some((row) => row.audience === 'VENDOR' && row.applicable && row.status !== 'COMPLETED' && row.status !== 'NOT_REQUIRED'));
    const aggregate = await thirdPartyAggregate(organizationId, engagement.vendorId, engagementId);
    const historical = engagement.residualAssessments[0] || null;
    const terminationRecommended = engagement.reassessments.some((row) => row.decision === 'TERMINATION_RECOMMENDED')
        || recommendations.some((row) => String(row.recommendedScope || '').toUpperCase().includes('TERMINAT'));
    const primary = engagementPrimaryAction(engagement.status, {
        terminationRecommended,
        openOffboarding: Boolean(active),
        offboardingStatus: current?.status,
        offboardingGateReady: gate.ready,
        vendorOffboardingPending: vendorPending,
        offboardingBlocked: gate.blockers.length > 0,
    });
    return {
        engagement: {
            id: engagement.id,
            publicId: engagement.publicId,
            serviceName: engagement.serviceName,
            status: engagement.status,
            thirdParty: engagement.vendor,
        },
        catalog: OBLIGATION_CATALOG,
        recommendations,
        cases,
        active,
        current,
        obligations: current?.obligations || [],
        exceptions: current?.exceptions || [],
        dispositions: current?.dispositions || [],
        gate,
        openReassessment,
        historicalResidual: historical,
        reassessmentHistory: engagement.reassessments,
        findings: engagement.findings,
        monitoring: engagement.monitoringProfile,
        thirdPartyAggregate: aggregate,
        siblings: aggregate.remainingActive,
        nextAction: active ? nextAction(active.status, gate.ready, vendorPending, gate.blockers.length > 0) : primary.label,
        primaryAction: { label: active ? nextAction(active.status, gate.ready, vendorPending, gate.blockers.length > 0) : primary.label, href: `/engagements/${engagement.id}/offboarding`, owner: 'Assigned TPRM analyst' },
        legacyVendorOffboarding: 'Vendor-level offboarding remains readable and is not authoritative for this Engagement.',
        honesty: 'Offboarding belongs to this Engagement. Closing it does not close sibling Engagements. Access revocation and data deletion are tracked, not automatically performed. Retention is Not configured unless a recorded policy exists. Historical residual is not rewritten.',
    };
}

export async function createOffboarding(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only an authorized TPRM analyst can start Engagement offboarding.');
    const engagement = await prisma.engagement.findFirst({
        where: { organizationId, id: engagementId },
        include: { vendor: { select: { id: true, name: true } } },
    });
    if (!engagement) throw new ApiError(404, 'Engagement not found.');
    if (engagement.status === EngagementStatus.OFFBOARDED) {
        throw new ApiError(409, 'This Engagement is already offboarded. Create a new Engagement against the same Third Party if the service is needed again. History cannot be overwritten.');
    }
    if (engagement.status !== EngagementStatus.ACTIVE && engagement.status !== EngagementStatus.OFFBOARDING) {
        throw new ApiError(409, 'Offboarding can start only from an Active Engagement.');
    }
    const existing = await prisma.engagementOffboardingCase.findFirst({ where: { organizationId, engagementId, status: { in: [...OPEN] } } });
    if (existing) throw new ApiError(409, 'This Engagement already has an active offboarding case. Complete or cancel it before starting another.');
    const openReassessment = await prisma.engagementReassessment.findFirst({
        where: { organizationId, engagementId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    });
    const disposition = body.reassessmentDisposition as ReassessmentConflictDisposition | undefined;
    if (openReassessment && !disposition) {
        throw new ApiError(409, 'Cannot complete offboarding while an open reassessment has no disposition. Complete it, cancel it with a rationale, or supersede it due to termination.');
    }
    if (openReassessment && disposition === ReassessmentConflictDisposition.CANCEL_REASSESSMENT) {
        if (!body.reassessmentRationale) throw new ApiError(400, 'Record why the open reassessment is being cancelled.');
        await prisma.engagementReassessment.update({
            where: { id: openReassessment.id },
            data: { status: 'CANCELLED', decisionRationale: body.reassessmentRationale },
        });
    }
    if (openReassessment && disposition === ReassessmentConflictDisposition.SUPERSEDE_FOR_TERMINATION) {
        await prisma.engagementReassessment.update({
            where: { id: openReassessment.id },
            data: { status: 'CANCELLED', decision: 'TERMINATION_RECOMMENDED', decisionRationale: body.reassessmentRationale || 'Superseded because termination was authorized.' },
        });
    }
    if (openReassessment && disposition === ReassessmentConflictDisposition.COMPLETE_REASSESSMENT) {
        throw new ApiError(409, 'Finish the open reassessment before starting offboarding, or choose cancel or supersede.');
    }
    if (!body.reason) throw new ApiError(400, 'Record why this Engagement relationship is ending.');
    const count = await prisma.engagementOffboardingCase.count({ where: { organizationId } });
    const publicId = `OFF-${new Date().getUTCFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const recommendation = body.recommendationId
        ? await prisma.reassessmentRecommendation.findFirst({ where: { id: body.recommendationId, organizationId, engagementId } })
        : await prisma.reassessmentRecommendation.findFirst({ where: { organizationId, engagementId }, orderBy: { createdAt: 'desc' } });
    const created = await prisma.engagementOffboardingCase.create({
        data: {
            organizationId,
            vendorId: engagement.vendorId,
            engagementId,
            publicId,
            status: EngagementOffboardingStatus.PLANNED,
            reason: body.reason,
            sourceRecommendationId: recommendation?.id || body.recommendationId || null,
            decisionOwnerUserId: actor.id,
            decidedAt: new Date(),
            effectiveTerminationDate: body.effectiveTerminationDate ? new Date(body.effectiveTerminationDate) : null,
            urgency: body.urgency || 'NORMAL',
            businessOwnerUserId: body.businessOwnerUserId || engagement.requesterUserId,
            riskOwnerUserId: body.riskOwnerUserId || engagement.assignedAnalystUserId,
            contractOwnerUserId: body.contractOwnerUserId || null,
            notes: body.notes || null,
            reassessmentConflictDisposition: disposition || null,
            reassessmentConflictRationale: body.reassessmentRationale || null,
            startedByUserId: actor.id,
            history: [{ at: new Date().toISOString(), by: actor.id, to: 'PLANNED', version: 1 }],
        },
    });
    const engagementNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.ENGAGEMENT, sourceModel: 'Engagement', sourceId: engagement.id, displayLabel: `${engagement.publicId} ${engagement.serviceName}`, actorUserId: actor.id });
    const caseNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.OFFBOARDING, sourceModel: 'EngagementOffboardingCase', sourceId: created.id, displayLabel: `Offboarding ${engagement.publicId}`, actorUserId: actor.id });
    await createRelationship({ organizationId, fromNodeId: engagementNode.node.id, toNodeId: caseNode.node.id, relationshipType: GovernanceRelationshipType.HAS_OFFBOARDING, createdBy: actor.id });
    await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.OFFBOARDING } });
    await audit(organizationId, actor.id, 'offboarding.created', 'EngagementOffboardingCase', created.id, { engagementId, reason: body.reason });
    await notify(organizationId, engagement.assignedAnalystUserId, 'offboarding.created', 'Offboarding case assigned', `${created.publicId} is open for ${engagement.serviceName}.`, created.id);
    return getOffboardingWorkspace(organizationId, actor, engagementId);
}

export async function startOffboarding(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'You do not have permission to start offboarding.');
    const cycle = await requireOpen(organizationId, engagementId, body.caseId);
    await prisma.engagementOffboardingCase.update({
        where: { id: cycle.id },
        data: { status: EngagementOffboardingStatus.IN_PROGRESS, version: cycle.version + 1 },
    });
    await prisma.engagement.update({ where: { id: engagementId }, data: { status: EngagementStatus.OFFBOARDING } });
    await audit(organizationId, actor.id, 'offboarding.started', 'EngagementOffboardingCase', cycle.id, {});
    return getOffboardingWorkspace(organizationId, actor, engagementId);
}

async function requireOpen(organizationId: string, engagementId: string, caseId?: string) {
    const cycle = await prisma.engagementOffboardingCase.findFirst({
        where: { organizationId, engagementId, id: caseId || undefined, status: { in: [...OPEN] } },
        include: { obligations: true, exceptions: true },
        orderBy: { startedAt: 'desc' },
    });
    if (!cycle) throw new ApiError(404, 'No active offboarding case was found for this Engagement.');
    return cycle;
}

export async function addObligation(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'You do not have permission to add offboarding obligations.');
    const cycle = await requireOpen(organizationId, engagementId, body.caseId);
    if (!body.category || !Object.values(OffboardingObligationCategory).includes(body.category)) {
        throw new ApiError(400, 'Choose an obligation category. Not every category is required on every Engagement.');
    }
    const catalog = OBLIGATION_CATALOG.find((row) => row.category === body.category);
    const created = await prisma.engagementOffboardingObligation.create({
        data: {
            organizationId,
            caseId: cycle.id,
            category: body.category,
            title: body.title || catalog?.title || body.category,
            applicable: body.applicable !== false,
            mandatory: Boolean(body.mandatory),
            audience: body.audience || catalog?.audience || OffboardingAudience.INTERNAL,
            ownerUserId: body.ownerUserId || null,
            dueAt: body.dueAt ? new Date(body.dueAt) : null,
            status: body.applicable === false ? OffboardingObligationStatus.NOT_REQUIRED : OffboardingObligationStatus.PENDING,
            systemName: body.systemName || null,
            accessType: body.accessType || null,
            integrationType: body.integrationType || null,
            dataCategory: body.dataCategory || null,
            dataLocation: body.dataLocation || null,
            dataDisposition: body.dataDisposition || null,
            retentionReason: body.retentionReason || null,
            retentionPeriod: body.retentionPeriod || null,
            retentionSource: body.retentionSource || null,
            noticeRequired: body.noticeRequired ?? null,
            rationale: body.rationale || null,
        },
    });
    await audit(organizationId, actor.id, 'offboarding.obligation.created', 'EngagementOffboardingObligation', created.id, { category: body.category, mandatory: Boolean(body.mandatory) });
    if (created.audience === OffboardingAudience.VENDOR) {
        await audit(organizationId, actor.id, 'offboarding.vendor_task.sent', 'EngagementOffboardingObligation', created.id, { invitationOnly: true });
    }
    if (created.audience === OffboardingAudience.REQUESTER) {
        const engagement = await prisma.engagement.findUnique({ where: { id: engagementId }, select: { requesterUserId: true, serviceName: true } });
        await notify(organizationId, engagement?.requesterUserId, 'offboarding.business_task.sent', 'Business transition needed', `Please confirm the business transition for ${engagement?.serviceName}.`, cycle.id);
        await audit(organizationId, actor.id, 'offboarding.business_task.sent', 'EngagementOffboardingObligation', created.id, {});
    }
    return getOffboardingWorkspace(organizationId, actor, engagementId);
}

export async function updateObligation(organizationId: string, actor: Actor, engagementId: string, obligationId: string, body: any) {
    const isRequester = participantExperience(actor.role) === 'requester';
    if (!isRequester) {
        assertPractitioner(actor);
        if (!canManage(actor)) throw new ApiError(403, 'You do not have permission to update offboarding obligations.');
    }
    const cycle = await requireOpen(organizationId, engagementId, body.caseId);
    const item = cycle.obligations.find((row) => row.id === obligationId);
    if (!item) throw new ApiError(404, 'That offboarding obligation was not found on this case.');
    if (isRequester && item.audience !== OffboardingAudience.REQUESTER) {
        throw new ApiError(403, 'You can only complete assigned business-transition tasks.');
    }
    if (body.status === OffboardingObligationStatus.COMPLETED && !body.internalVerification && !body.vendorConfirmation && !body.storedObjectId && !item.storedObjectId) {
        throw new ApiError(409, `Cannot mark ${item.title} complete without verification or evidence. An exception does not mark the task complete.`);
    }
    const nextStatus = body.status && Object.values(OffboardingObligationStatus).includes(body.status) ? body.status : item.status;
    await prisma.engagementOffboardingObligation.update({
        where: { id: item.id },
        data: {
            status: nextStatus,
            applicable: body.applicable ?? item.applicable,
            mandatory: body.mandatory ?? item.mandatory,
            dueAt: body.dueAt ? new Date(body.dueAt) : item.dueAt,
            systemName: body.systemName ?? item.systemName,
            accessType: body.accessType ?? item.accessType,
            integrationType: body.integrationType ?? item.integrationType,
            dataCategory: body.dataCategory ?? item.dataCategory,
            dataLocation: body.dataLocation ?? item.dataLocation,
            dataDisposition: body.dataDisposition ?? item.dataDisposition,
            retentionReason: body.retentionReason ?? item.retentionReason,
            retentionPeriod: body.retentionPeriod ?? item.retentionPeriod,
            retentionSource: body.retentionSource ?? item.retentionSource,
            noticeRequired: body.noticeRequired ?? item.noticeRequired,
            noticeSentAt: body.noticeSentAt ? new Date(body.noticeSentAt) : item.noticeSentAt,
            vendorConfirmation: body.vendorConfirmation ?? item.vendorConfirmation,
            internalVerification: body.internalVerification ?? item.internalVerification,
            storedObjectId: body.storedObjectId ?? item.storedObjectId,
            rationale: body.rationale ?? item.rationale,
            completedByUserId: nextStatus === OffboardingObligationStatus.COMPLETED ? actor.id : item.completedByUserId,
            completedAt: nextStatus === OffboardingObligationStatus.COMPLETED ? new Date() : item.completedAt,
        },
    });
    await audit(organizationId, actor.id, 'offboarding.obligation.updated', 'EngagementOffboardingObligation', item.id, { status: nextStatus });
    if (body.vendorConfirmation) {
        await notify(organizationId, cycle.riskOwnerUserId, 'offboarding.vendor_response', 'Vendor confirmation recorded', `${item.title} has a vendor confirmation. This is not automatic access revocation or data erasure.`, cycle.id);
    }
    return isRequester
        ? { honesty: 'Thank you. The TPRM analyst will use this business confirmation. Residual risk was not changed.', wave8: true }
        : getOffboardingWorkspace(organizationId, actor, engagementId);
}

export async function linkEvidence(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'You do not have permission to link offboarding evidence.');
    const cycle = await requireOpen(organizationId, engagementId, body.caseId);
    if (!body.obligationId || !body.storedObjectId) throw new ApiError(400, 'Link Shared Evidence to a specific obligation.');
    const stored = await prisma.storedObject.findFirst({ where: { id: body.storedObjectId, organizationId }, select: { id: true } });
    if (!stored) throw new ApiError(404, 'That evidence object was not found in this tenant.');
    await prisma.evidenceLink.create({
        data: {
            organizationId,
            storedObjectId: stored.id,
            engagementId,
            vendorId: cycle.vendorId,
            questionId: `offboarding-obligation:${body.obligationId}`,
            createdBy: actor.id,
        },
    });
    await prisma.engagementOffboardingObligation.update({
        where: { id: body.obligationId },
        data: { storedObjectId: stored.id },
    });
    await audit(organizationId, actor.id, 'offboarding.evidence.linked', 'EngagementOffboardingObligation', body.obligationId, { storedObjectId: stored.id, sharedEvidence: true });
    return getOffboardingWorkspace(organizationId, actor, engagementId);
}

export async function createException(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canException(actor)) throw new ApiError(403, 'You do not have permission to record an offboarding exception.');
    const cycle = await requireOpen(organizationId, engagementId, body.caseId);
    if (!body.reason) throw new ApiError(400, 'Record why this obligation cannot be completed. An exception does not mark the task complete.');
    const created = await prisma.engagementOffboardingException.create({
        data: {
            organizationId,
            caseId: cycle.id,
            obligationId: body.obligationId || null,
            reason: body.reason,
            ownerUserId: actor.id,
            approverUserId: canComplete(actor) ? actor.id : null,
            expiryAt: body.expiryAt ? new Date(body.expiryAt) : null,
            evidenceNote: body.evidenceNote || null,
            status: canComplete(actor) ? OffboardingExceptionStatus.APPROVED : OffboardingExceptionStatus.OPEN,
        },
    });
    await audit(organizationId, actor.id, 'offboarding.exception.created', 'EngagementOffboardingException', created.id, { obligationId: body.obligationId || null });
    return getOffboardingWorkspace(organizationId, actor, engagementId);
}

export async function evaluateClosureGate(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You do not have permission to evaluate the offboarding closure gate.');
    const cycle = await requireOpen(organizationId, engagementId, body.caseId);
    const openReassessment = await prisma.engagementReassessment.findFirst({
        where: { organizationId, engagementId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        select: { id: true },
    });
    const gate = evaluateGate({ ...cycle, openReassessment: Boolean(openReassessment) && !cycle.reassessmentConflictDisposition });
    await prisma.engagementOffboardingCase.update({
        where: { id: cycle.id },
        data: { status: gate.status, version: cycle.version + 1 },
    });
    await audit(organizationId, actor.id, 'offboarding.closure_gate.evaluated', 'EngagementOffboardingCase', cycle.id, { ready: gate.ready, blockers: gate.blockers });
    const engagement = await prisma.engagement.findFirst({ where: { organizationId, id: engagementId }, select: { assignedAnalystUserId: true, serviceName: true } });
    if (gate.ready) {
        await notify(organizationId, engagement?.assignedAnalystUserId, 'offboarding.closure_ready', 'Offboarding ready for closure', `${engagement?.serviceName || 'Engagement'} is ready for authorized closure.`, cycle.id);
    } else {
        await notify(organizationId, engagement?.assignedAnalystUserId, 'offboarding.blocker', 'Offboarding closure blocked', gate.blockers[0] || 'Mandatory obligations remain incomplete.', cycle.id);
    }
    return { ...(await getOffboardingWorkspace(organizationId, actor, engagementId)), gate };
}

export async function completeOffboarding(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canComplete(actor)) throw new ApiError(403, 'You do not have permission to approve final closure.');
    const cycle = await requireOpen(organizationId, engagementId, body.caseId);
    if (cycle.startedByUserId === actor.id) {
        throw new ApiError(403, 'You do not have permission to approve final closure.');
    }
    const openReassessment = await prisma.engagementReassessment.findFirst({
        where: { organizationId, engagementId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        select: { id: true },
    });
    const gate = evaluateGate({ ...cycle, openReassessment: Boolean(openReassessment) && !cycle.reassessmentConflictDisposition });
    if (!gate.ready) {
        throw new ApiError(409, gate.blockers[0] || 'Cannot close Engagement because mandatory offboarding obligations remain incomplete.');
    }
    const engagement = await prisma.engagement.findFirst({
        where: { organizationId, id: engagementId },
        include: {
            vendor: { select: { id: true, name: true, publicId: true, status: true } },
            residualAssessments: { where: { status: 'CONFIRMED' }, orderBy: { createdAt: 'asc' }, take: 1 },
            monitoringProfile: true,
        },
    });
    if (!engagement) throw new ApiError(404, 'Engagement not found.');
    const aggregate = await thirdPartyAggregate(organizationId, engagement.vendorId, engagementId);
    const snapshot = {
        thirdParty: engagement.vendor,
        engagement: { id: engagement.id, publicId: engagement.publicId, serviceName: engagement.serviceName },
        terminationReason: cycle.reason,
        effectiveDate: cycle.effectiveTerminationDate,
        offboardingCase: cycle.publicId,
        obligationsCompleted: cycle.obligations.filter((row) => row.status === 'COMPLETED').map((row) => row.title),
        exceptions: cycle.exceptions.map((row) => ({ id: row.id, reason: row.reason, status: row.status })),
        remainingRetainedRecords: 'IRA, residual, treatment, acceptance, Decision Briefs, monitoring, reassessment, Findings, and control-effectiveness history remain inspectable.',
        dataDisposition: cycle.obligations.filter((row) => ['DATA_RETURN', 'DATA_DELETION', 'DATA_RETENTION'].includes(row.category)).map((row) => ({ title: row.title, status: row.status, confirmation: row.vendorConfirmation || row.internalVerification })),
        accessDisposition: cycle.obligations.filter((row) => row.category === 'ACCESS_REVOCATION' || row.category === 'INTEGRATION_CLOSURE').map((row) => ({ title: row.title, status: row.status, honesty: row.automationHonesty })),
        contractNotice: cycle.obligations.find((row) => row.category === 'CONTRACT_NOTICE') || null,
        finalOwner: actor.id,
        closureApprover: actor.id,
        closedAt: new Date().toISOString(),
        historicalResidual: engagement.residualAssessments[0] ? { residualBand: engagement.residualAssessments[0].residualBand, residualScore: engagement.residualAssessments[0].residualScore } : null,
        thirdPartyAggregate: aggregate,
        findingDisposition: cycle.findingDisposition,
        monitoringRetired: Boolean(engagement.monitoringProfile),
    };
    const version = await prisma.engagementFinalDisposition.count({ where: { caseId: cycle.id } });
    const disposition = await prisma.engagementFinalDisposition.create({
        data: {
            organizationId,
            caseId: cycle.id,
            engagementId,
            vendorId: engagement.vendorId,
            versionNumber: version + 1,
            snapshot: snapshot as Prisma.InputJsonValue,
            createdBy: actor.id,
        },
    });
    await prisma.engagementOffboardingCase.update({
        where: { id: cycle.id },
        data: { status: EngagementOffboardingStatus.COMPLETED, completedAt: new Date(), completedByUserId: actor.id },
    });
    await prisma.engagement.update({ where: { id: engagementId }, data: { status: EngagementStatus.OFFBOARDED } });
    if (engagement.monitoringProfile) {
        await prisma.engagementMonitoringProfile.update({
            where: { id: engagement.monitoringProfile.id },
            data: { status: 'RETIRED', lastReviewedAt: new Date() },
        });
        await audit(organizationId, actor.id, 'monitoring.retired', 'EngagementMonitoringProfile', engagement.monitoringProfile.id, { reason: 'Engagement offboarded. Monitoring history is retained.' });
    }
    const caseNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.OFFBOARDING, sourceModel: 'EngagementOffboardingCase', sourceId: cycle.id, displayLabel: `Offboarding ${engagement.publicId}`, actorUserId: actor.id });
    const dispositionNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.DECISION, sourceModel: 'EngagementFinalDisposition', sourceId: disposition.id, displayLabel: `Final disposition ${engagement.publicId}`, actorUserId: actor.id });
    await createRelationship({ organizationId, fromNodeId: caseNode.node.id, toNodeId: dispositionNode.node.id, relationshipType: GovernanceRelationshipType.PRODUCED, createdBy: actor.id });
    await audit(organizationId, actor.id, 'offboarding.completed', 'EngagementOffboardingCase', cycle.id, { dispositionId: disposition.id, historicalResidual: snapshot.historicalResidual });
    await audit(organizationId, actor.id, 'engagement.closed', 'Engagement', engagementId, { status: 'OFFBOARDED', vendorUnchanged: !aggregate.vendorMayBecomeInactive });
    await notify(organizationId, actor.id, 'offboarding.completed', 'Engagement offboarded', `${engagement.serviceName} is offboarded. Historical records remain inspectable.`, cycle.id);
    return getOffboardingWorkspace(organizationId, actor, engagementId);
}

export async function cancelOffboarding(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'You do not have permission to cancel offboarding.');
    const cycle = await requireOpen(organizationId, engagementId, body.caseId);
    if (!body.reason) throw new ApiError(400, 'Record why this offboarding case is being cancelled.');
    await prisma.engagementOffboardingCase.update({
        where: { id: cycle.id },
        data: { status: EngagementOffboardingStatus.CANCELLED, cancelledAt: new Date(), cancelledByUserId: actor.id, cancelRationale: body.reason },
    });
    await prisma.engagement.update({ where: { id: engagementId }, data: { status: EngagementStatus.ACTIVE } });
    await audit(organizationId, actor.id, 'offboarding.cancelled', 'EngagementOffboardingCase', cycle.id, { reason: body.reason });
    return getOffboardingWorkspace(organizationId, actor, engagementId);
}

export async function listOffboardingRegister(organizationId: string, actor: Actor, query: any = {}) {
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You do not have permission to read the offboarding register.');
    const rows = await prisma.engagementOffboardingCase.findMany({
        where: {
            organizationId,
            status: query.status || undefined,
        },
        include: {
            engagement: { select: { publicId: true, serviceName: true, status: true, vendor: { select: { name: true, publicId: true } } } },
            obligations: { select: { status: true, dueAt: true, mandatory: true, applicable: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    return {
        items: rows.map((row) => {
            const overdue = row.obligations.filter((item) => item.dueAt && item.dueAt.getTime() < Date.now() && item.status !== 'COMPLETED' && item.status !== 'NOT_REQUIRED');
            const openMandatory = row.obligations.filter((item) => item.applicable && item.mandatory && item.status !== 'COMPLETED' && item.status !== 'NOT_REQUIRED');
            return {
                id: row.id,
                publicId: row.publicId,
                thirdParty: row.engagement.vendor.name,
                engagementId: row.engagementId,
                engagement: row.engagement.publicId,
                serviceName: row.engagement.serviceName,
                reason: row.reason,
                status: row.status,
                owner: row.riskOwnerUserId,
                effectiveDate: row.effectiveTerminationDate,
                ageDays: Math.floor((Date.now() - row.startedAt.getTime()) / (24 * 60 * 60 * 1000)),
                overdueObligations: overdue.length,
                closureBlockers: openMandatory.map((item) => item.title),
                closureReady: row.status === 'READY_FOR_CLOSURE',
            };
        }),
        honesty: 'No completion metrics are invented. Due dates show Not set when no policy date exists.',
    };
}

export async function listRequesterOffboardingActions(organizationId: string, actor: Actor) {
    if (participantExperience(actor.role) !== 'requester') return [];
    const rows = await prisma.engagementOffboardingObligation.findMany({
        where: {
            organizationId,
            audience: OffboardingAudience.REQUESTER,
            status: { in: [OffboardingObligationStatus.PENDING, OffboardingObligationStatus.IN_PROGRESS] },
            case: { status: { in: [...OPEN] }, engagement: { requesterUserId: actor.id } },
        },
        include: { case: { include: { engagement: { select: { id: true, publicId: true, serviceName: true, vendor: { select: { name: true } } } } } } },
    });
    return rows.map((row) => ({
        id: row.id,
        type: 'OFFBOARDING_BUSINESS_TASK',
        title: row.title,
        engagementId: row.case.engagement.id,
        engagementPublicId: row.case.engagement.publicId,
        thirdPartyName: row.case.engagement.vendor.name,
        serviceName: row.case.engagement.serviceName,
        honesty: 'Confirm the assigned business transition only. Internal termination reasoning is not shown.',
    }));
}

export async function offboardingExtras(organizationId: string, engagementId: string) {
    const active = await prisma.engagementOffboardingCase.findFirst({
        where: { organizationId, engagementId, status: { in: [...OPEN] } },
        include: { obligations: true, exceptions: true },
    });
    const last = await prisma.engagementReassessment.findFirst({
        where: { organizationId, engagementId, decision: 'TERMINATION_RECOMMENDED' },
        orderBy: { completedAt: 'desc' },
    });
    const gate = active ? evaluateGate({ ...active, openReassessment: false }) : null;
    return {
        openOffboarding: Boolean(active),
        offboardingStatus: active?.status || null,
        offboardingGateReady: Boolean(gate?.ready),
        vendorOffboardingPending: Boolean(active?.obligations.some((row) => row.audience === 'VENDOR' && row.status !== 'COMPLETED' && row.status !== 'NOT_REQUIRED')),
        offboardingBlocked: Boolean(gate && gate.blockers.length),
        terminationRecommended: Boolean(last),
    };
}
