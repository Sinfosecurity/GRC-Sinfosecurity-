import {
    EngagementReassessmentKind,
    EngagementReassessmentStatus,
    EngagementStatus,
    GovernanceNodeType,
    GovernanceRelationshipType,
    Prisma,
    ReassessmentDecisionType,
    ReassessmentItemDisposition,
    ReassessmentItemKind,
    ReassessmentRecommendationStatus,
    ReassessmentTriggerType,
    ReassessmentVendorRefreshStatus,
    ScanStatus,
    VendorIssueStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { hasPermission, participantExperience, PERMISSIONS } from '../security/rbac';
import { IRA_QUESTIONS } from '../tprm/iraCatalog';
import { scoreIra } from '../tprm/iraScoring';
import { engagementPrimaryAction } from '../tprm/engagementWorkspace';
import { recordAudit } from './auditEventService';
import { calculateResidual, confirmResidual } from './engagementRiskService';
import { createRelationship, ensureNode } from './governanceGraphService';
import { notifyUser, type NotificationEvent } from './notificationDeliveryService';
import type { Actor } from './intakeEngagementService';

const OPEN = new Set<EngagementReassessmentStatus>([
    EngagementReassessmentStatus.INITIATED,
    EngagementReassessmentStatus.SCOPED,
    EngagementReassessmentStatus.REQUESTER_DELTA,
    EngagementReassessmentStatus.IRA_REFRESH,
    EngagementReassessmentStatus.TIER_REVIEW,
    EngagementReassessmentStatus.DELTA_DUE_DILIGENCE,
    EngagementReassessmentStatus.VENDOR_REFRESH,
    EngagementReassessmentStatus.EVIDENCE_REVIEW,
    EngagementReassessmentStatus.SPECIALIST_REVIEW,
    EngagementReassessmentStatus.FINDING_REVIEW,
    EngagementReassessmentStatus.CONTROL_REVIEW,
    EngagementReassessmentStatus.RESIDUAL_REVIEW,
    EngagementReassessmentStatus.DECISION,
]);

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function assertPractitioner(actor: Actor) {
    if (participantExperience(actor.role) === 'requester') {
        throw new ApiError(403, 'Requesters cannot open internal Engagement reassessment.');
    }
    if (participantExperience(actor.role) === 'vendor' || String(actor.role || '').toUpperCase() === 'VENDOR') {
        throw new ApiError(403, 'Vendor sessions cannot open internal Engagement reassessment.');
    }
}

function canRead(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['reassessment.read']) || hasPermission(actor.role, PERMISSIONS['intake.read']);
}

function canInitiate(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['reassessment.initiate']) || hasPermission(actor.role, PERMISSIONS['reassessment.manage']);
}

function canManage(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['reassessment.manage']);
}

async function audit(organizationId: string, actorId: string, action: string, resourceType: string, resourceId: string, metadata: Record<string, unknown> = {}) {
    await recordAudit({ organizationId, actorUserId: actorId, action, resourceType, resourceId, result: 'success', metadata });
}

async function notify(organizationId: string, userId: string | null | undefined, eventType: NotificationEvent, title: string, body: string, resourceId: string) {
    if (!userId) return;
    await notifyUser({ organizationId, userId, eventType, title, body, resourceType: 'EngagementReassessment', resourceId });
}

async function loadEngagement(organizationId: string, engagementId: string) {
    const engagement = await prisma.engagement.findFirst({
        where: { organizationId, id: engagementId },
        include: {
            vendor: { select: { id: true, name: true, publicId: true } },
            ira: { include: { submissions: { orderBy: { submittedAt: 'asc' } } } },
            dueDiligencePlan: true,
            findings: { select: { id: true, title: true, status: true, severity: true, category: true } },
            controlEffectiveness: true,
            residualAssessments: { orderBy: { createdAt: 'asc' } },
            riskAcceptances: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
    });
    if (!engagement) throw new ApiError(404, 'Engagement not found.');
    return engagement;
}

function answerMap(raw: unknown): Record<string, string> {
    if (!raw || typeof raw !== 'object') return {};
    const source = raw as Record<string, unknown>;
    if (Array.isArray(source)) {
        return Object.fromEntries(source.map((row: any) => [String(row.questionKey || row.key), String(row.response || row.value || '')]));
    }
    return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, String(value ?? '')]));
}

function nextAction(status: EngagementReassessmentStatus) {
    if (status === 'COMPLETED') return 'Return to monitoring';
    if (status === 'CANCELLED') return 'No action required';
    if (status === 'DECISION') return 'Record reassessment decision';
    if (status === 'RESIDUAL_REVIEW') return 'Calculate new residual assessment';
    if (status === 'CONTROL_REVIEW') return 'Review control effectiveness';
    if (status === 'FINDING_REVIEW') return 'Review Findings';
    if (status === 'SPECIALIST_REVIEW') return 'Complete specialist review';
    if (status === 'VENDOR_REFRESH') return 'Request vendor delta refresh';
    if (status === 'EVIDENCE_REVIEW') return 'Review evidence freshness';
    if (status === 'DELTA_DUE_DILIGENCE') return 'Confirm delta due-diligence plan';
    if (status === 'TIER_REVIEW') return 'Complete Tier Review';
    if (status === 'IRA_REFRESH') return 'Refresh required IRA answers';
    if (status === 'REQUESTER_DELTA') return 'Request business-context update';
    return 'Confirm reassessment scope';
}

export async function getReassessmentWorkspace(organizationId: string, actor: Actor, engagementId: string) {
    if (participantExperience(actor.role) === 'requester') {
        const engagement = await prisma.engagement.findFirst({
            where: { organizationId, id: engagementId },
            select: { id: true, publicId: true, serviceName: true, requesterUserId: true, status: true },
        });
        if (!engagement) throw new ApiError(404, 'Engagement not found.');
        const cycle = await prisma.engagementReassessment.findFirst({
            where: { organizationId, engagementId, status: { in: [...OPEN] } },
            include: { items: { where: { kind: ReassessmentItemKind.BUSINESS_CONTEXT } } },
        });
        return {
            experience: 'requester',
            engagement: { id: engagement.id, publicId: engagement.publicId, serviceName: engagement.serviceName, status: engagement.status },
            cycle: cycle ? {
                id: cycle.id,
                publicId: cycle.publicId,
                status: cycle.status,
                items: cycle.items,
                requesterDelta: cycle.requesterDelta,
            } : null,
            honesty: 'You can provide business-context updates only. Internal reassessment reasoning is not shown.',
        };
    }
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You do not have permission to read Engagement reassessment.');
    const engagement = await loadEngagement(organizationId, engagementId);
    const [cycles, recommendations, siblings] = await Promise.all([
        prisma.engagementReassessment.findMany({
            where: { organizationId, engagementId },
            include: { items: { orderBy: { createdAt: 'asc' } } },
            orderBy: { cycleNumber: 'asc' },
        }),
        prisma.reassessmentRecommendation.findMany({ where: { organizationId, engagementId }, orderBy: { createdAt: 'desc' } }),
        prisma.engagement.findMany({
            where: { organizationId, vendorId: engagement.vendorId, id: { not: engagementId } },
            select: { id: true, publicId: true, serviceName: true, status: true },
        }),
    ]);
    const active = cycles.find((row) => OPEN.has(row.status)) || null;
    const historical = engagement.residualAssessments.filter((row) => row.status === 'CONFIRMED');
    const cycle1 = historical[0] || null;
    const currentResidual = historical[historical.length - 1] || null;
    const comparison = active?.currentResidualId || currentResidual?.id !== cycle1?.id
        ? {
            previous: cycle1 ? { id: cycle1.id, residualBand: cycle1.residualBand, residualScore: cycle1.residualScore, cycle: 1 } : null,
            current: currentResidual && currentResidual.id !== cycle1?.id
                ? { id: currentResidual.id, residualBand: currentResidual.residualBand, residualScore: currentResidual.residualScore, cycle: active?.cycleNumber || 2 }
                : null,
        }
        : { previous: cycle1 ? { id: cycle1.id, residualBand: cycle1.residualBand, residualScore: cycle1.residualScore, cycle: 1 } : null, current: null };
    const primary = engagementPrimaryAction(engagement.status, {
        openReassessment: Boolean(active),
        reassessmentRecommended: recommendations.some((row) => row.status === ReassessmentRecommendationStatus.RECOMMENDED),
    });
    return {
        engagement: {
            id: engagement.id,
            publicId: engagement.publicId,
            serviceName: engagement.serviceName,
            status: engagement.status,
            thirdParty: engagement.vendor,
            confirmedTier: engagement.ira?.confirmedTier || null,
        },
        recommendations,
        cycles,
        active,
        items: active?.items || [],
        historicalResidual: cycle1,
        currentResidual,
        comparison,
        acceptance: engagement.riskAcceptances[0] || null,
        acceptanceAppliesToNewResidual: false,
        siblings,
        nextAction: active ? nextAction(active.status) : primary.label,
        primaryAction: { label: active ? nextAction(active.status) : primary.label, href: `/engagements/${engagement.id}/reassessment`, owner: 'Assigned TPRM analyst' },
        wave8Started: false,
        honesty: 'Reassessment is a new versioned cycle. Historical residual remains inspectable. Old acceptance does not automatically apply to a new residual. Termination is a Wave 8 recommendation only.',
    };
}

function classifyIra(answers: Record<string, string>, kind: EngagementReassessmentKind, targeted: boolean) {
    return IRA_QUESTIONS.map((question) => {
        const previous = answers[question.key] || '';
        const refresh = kind === EngagementReassessmentKind.FULL || (targeted && ['a1', 'a2', 'a3', 'a4', 'a5'].includes(question.key));
        return {
            kind: ReassessmentItemKind.IRA_QUESTION,
            sourceKey: question.key,
            title: question.question,
            previousValue: previous || 'Not recorded',
            disposition: refresh ? ReassessmentItemDisposition.REFRESH : ReassessmentItemDisposition.REUSE,
            rationale: refresh
                ? 'This inherent-risk fact may have changed and requires a Version 3 refresh. The original answer remains in cycle history.'
                : 'This inherent-risk fact is reused. It is not resent as a blank questionnaire.',
            required: refresh,
        };
    });
}

export async function startReassessment(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canInitiate(actor)) throw new ApiError(403, 'Only an authorized TPRM analyst can start a reassessment.');
    const engagement = await loadEngagement(organizationId, engagementId);
    if (engagement.status !== EngagementStatus.ACTIVE) {
        throw new ApiError(409, 'Reassessment can start only on an Active Engagement. The Engagement stays Active during the cycle.');
    }
    const existing = await prisma.engagementReassessment.findFirst({ where: { organizationId, engagementId, status: { in: [...OPEN] } } });
    if (existing) throw new ApiError(409, 'This Engagement already has an active reassessment cycle. Complete or cancel it before starting another.');
    const kind = body.kind === 'FULL' ? EngagementReassessmentKind.FULL : EngagementReassessmentKind.TARGETED;
    const triggerType = (body.triggerType || ReassessmentTriggerType.MATERIAL_SECURITY_INCIDENT) as ReassessmentTriggerType;
    if (!Object.values(ReassessmentTriggerType).includes(triggerType)) throw new ApiError(400, 'Choose a supported reassessment trigger.');
    const recommendation = body.recommendationId
        ? await prisma.reassessmentRecommendation.findFirst({ where: { id: body.recommendationId, organizationId, engagementId } })
        : await prisma.reassessmentRecommendation.findFirst({ where: { organizationId, engagementId, status: ReassessmentRecommendationStatus.RECOMMENDED }, orderBy: { createdAt: 'desc' } });
    const priorResidual = engagement.residualAssessments.find((row) => row.status === 'CONFIRMED') || null;
    const answers = answerMap(engagement.ira?.currentAnswers);
    const completed = await prisma.engagementReassessment.count({ where: { organizationId, engagementId, status: EngagementReassessmentStatus.COMPLETED } });
    const cycleNumber = completed + 2;
    const count = await prisma.engagementReassessment.count({ where: { organizationId } });
    const publicId = `RAS-${new Date().getUTCFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const iraItems = classifyIra(answers, kind, kind === EngagementReassessmentKind.TARGETED);
    const evidenceLinks = await prisma.evidenceLink.findMany({
        where: { organizationId, engagementId },
        include: { storedObject: { select: { id: true, filename: true, uploadedAt: true, scanStatus: true } } },
        take: 50,
    });
    const staleCutoff = Date.now() - YEAR_MS;
    const evidenceItems = evidenceLinks.map((link) => {
        const uploaded = link.storedObject.uploadedAt.getTime();
        const stale = uploaded < staleCutoff || link.storedObject.scanStatus !== ScanStatus.CLEAN;
        return {
            kind: ReassessmentItemKind.EVIDENCE,
            sourceKey: link.storedObjectId,
            title: link.storedObject.filename || 'Evidence',
            previousValue: `${link.storedObject.scanStatus} · ${link.storedObject.uploadedAt.toISOString().slice(0, 10)}`,
            disposition: stale ? ReassessmentItemDisposition.REFRESH : ReassessmentItemDisposition.REUSE,
            rationale: stale
                ? 'This evidence is stale or not clean and must be refreshed. Shared Evidence is reused; no second file store is created.'
                : 'This evidence remains valid and is reused.',
            required: stale,
        };
    });
    const controlItems = engagement.controlEffectiveness.map((row) => {
        const weak = row.rating === 'PARTIALLY_EFFECTIVE' || row.rating === 'INEFFECTIVE';
        return {
            kind: ReassessmentItemKind.CONTROL,
            sourceKey: row.controlId,
            title: row.controlTitle,
            previousValue: row.rating,
            disposition: weak || kind === EngagementReassessmentKind.FULL ? ReassessmentItemDisposition.REFRESH : ReassessmentItemDisposition.REUSE,
            rationale: weak
                ? 'This control was not fully effective and requires human review. The prior rating remains in history until a reviewer records a new judgment.'
                : kind === EngagementReassessmentKind.FULL
                    ? 'Full reassessment includes a control-effectiveness review. The prior rating is not silently overwritten.'
                    : 'This control remains Effective and is reused unless a Finding later requires review.',
            required: weak || kind === EngagementReassessmentKind.FULL,
        };
    });
    const findingItems = engagement.findings.map((row) => ({
        kind: ReassessmentItemKind.FINDING,
        sourceKey: row.id,
        title: row.title,
        previousValue: `${row.status} · ${row.severity}`,
        disposition: row.status === VendorIssueStatus.CLOSED ? ReassessmentItemDisposition.REUSE : ReassessmentItemDisposition.REFRESH,
        rationale: row.status === VendorIssueStatus.CLOSED
            ? 'Closed Finding is reused for history. A signal is not a Finding.'
            : 'Open Finding requires review. Question answers do not become Findings.',
        required: row.status !== VendorIssueStatus.CLOSED,
    }));
    const packs = Array.isArray(engagement.dueDiligencePlan?.includedPackKeys)
        ? (engagement.dueDiligencePlan?.includedPackKeys as string[])
        : ['cybersecurity', 'privacy'].filter(Boolean);
    const ddqItems = packs.map((pack) => ({
        kind: ReassessmentItemKind.DUE_DILIGENCE_QUESTION,
        sourceKey: pack,
        title: `Due-diligence pack: ${pack}`,
        previousValue: 'Confirmed plan',
        disposition: kind === EngagementReassessmentKind.FULL || triggerType === ReassessmentTriggerType.MATERIAL_DATA_SCOPE_CHANGE
            ? ReassessmentItemDisposition.REFRESH
            : ReassessmentItemDisposition.REUSE,
        rationale: kind === EngagementReassessmentKind.FULL
            ? 'Full reassessment refreshes this pack. The vendor is not automatically sent the entire original questionnaire.'
            : 'This pack is reused unless the reviewer marks it for refresh.',
        required: kind === EngagementReassessmentKind.FULL,
    }));
    const insurance = /insur|reinsur|claim|delegat/i.test(engagement.serviceName);
    const specialistItems = [
        { sourceKey: 'CYBERSECURITY', title: 'Cybersecurity specialist review' },
        ...(insurance ? [{ sourceKey: 'INSURANCE', title: 'Insurance-context specialist review' }] : []),
    ].map((row) => ({
        kind: ReassessmentItemKind.SPECIALIST_DOMAIN,
        sourceKey: row.sourceKey,
        title: row.title,
        previousValue: 'Completed in cycle 1',
        disposition: kind === EngagementReassessmentKind.FULL ? ReassessmentItemDisposition.REFRESH : ReassessmentItemDisposition.REUSE,
        rationale: 'Specialist authority remains human. Insurance context may influence recommendations; no new regulatory pack is created.',
        required: kind === EngagementReassessmentKind.FULL,
    }));
    const contextItem = {
        kind: ReassessmentItemKind.BUSINESS_CONTEXT,
        sourceKey: 'service-context',
        title: 'Requester business-context delta',
        previousValue: engagement.businessPurpose,
        disposition: ReassessmentItemDisposition.REFRESH,
        rationale: 'The requester may confirm what changed in service, data scope, or criticality. Internal residual reasoning is not shown.',
        required: true,
    };
    const vendorRefresh = [...ddqItems, ...evidenceItems].some((row) => row.disposition === ReassessmentItemDisposition.REFRESH);
    const cycle = await prisma.engagementReassessment.create({
        data: {
            organizationId,
            vendorId: engagement.vendorId,
            engagementId,
            publicId,
            cycleNumber,
            kind,
            triggerType,
            recommendationId: recommendation?.id || body.recommendationId || null,
            status: EngagementReassessmentStatus.SCOPED,
            scopeNote: body.scopeNote || recommendation?.recommendedScope || (kind === 'FULL' ? 'Full reassessment of material facts' : 'Targeted delta reassessment'),
            whyReassessing: body.reason || recommendation?.reason || 'Authorized reassessment of an Active Engagement.',
            priorIraSnapshot: {
                scoringVersion: engagement.ira?.scoringVersion || '3',
                confirmedTier: engagement.ira?.confirmedTier,
                recommendedTier: engagement.ira?.recommendedTier,
                recommendedScore: engagement.ira?.recommendedScore,
                answers,
                submissionIds: (engagement.ira?.submissions || []).map((row) => row.id),
            } as Prisma.InputJsonValue,
            priorResidualId: priorResidual?.id || null,
            priorAcceptanceId: engagement.riskAcceptances[0]?.id || null,
            vendorRefreshStatus: vendorRefresh ? ReassessmentVendorRefreshStatus.REQUIRED : ReassessmentVendorRefreshStatus.NOT_REQUIRED,
            startedByUserId: actor.id,
            history: [{ at: new Date().toISOString(), by: actor.id, to: 'SCOPED', version: 1 }],
            items: { create: [contextItem, ...iraItems, ...ddqItems, ...evidenceItems, ...controlItems, ...findingItems, ...specialistItems].map((item) => ({ organizationId, ...item })) },
        },
        include: { items: true },
    });
    if (recommendation) {
        await prisma.reassessmentRecommendation.update({
            where: { id: recommendation.id },
            data: { status: ReassessmentRecommendationStatus.SUBMITTED, wave7Started: true },
        });
    }
    await graphCycle(organizationId, actor.id, engagement, cycle.id, priorResidual?.id);
    await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.ACTIVE } });
    await audit(organizationId, actor.id, 'reassessment.started', 'EngagementReassessment', cycle.id, { engagementId, kind, cycleNumber, priorResidualId: priorResidual?.id, wave8Started: false });
    await notify(organizationId, engagement.assignedAnalystUserId, 'reassessment.started', 'Reassessment started', `${cycle.publicId} is open. ${engagement.serviceName} remains Active.`, cycle.id);
    if (engagement.requesterUserId) {
        await notify(organizationId, engagement.requesterUserId, 'reassessment.requester_delta', 'Business context requested', `Please confirm whether the ${engagement.serviceName} service or data scope changed.`, cycle.id);
    }
    return getReassessmentWorkspace(organizationId, actor, engagementId);
}

async function graphCycle(organizationId: string, actorId: string, engagement: { id: string; publicId: string; serviceName: string }, cycleId: string, priorResidualId?: string | null) {
    const engagementNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.ENGAGEMENT, sourceModel: 'Engagement', sourceId: engagement.id, displayLabel: `${engagement.publicId} ${engagement.serviceName}`, actorUserId: actorId });
    const cycleNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.REASSESSMENT, sourceModel: 'EngagementReassessment', sourceId: cycleId, displayLabel: `Reassessment ${engagement.publicId}`, actorUserId: actorId });
    await createRelationship({ organizationId, fromNodeId: engagementNode.node.id, toNodeId: cycleNode.node.id, relationshipType: GovernanceRelationshipType.ASSESSED_BY, createdBy: actorId });
    if (priorResidualId) {
        const residualNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.RISK, sourceModel: 'EngagementResidualRiskAssessment', sourceId: priorResidualId, displayLabel: `Historical residual ${engagement.publicId}`, actorUserId: actorId });
        await createRelationship({ organizationId, fromNodeId: cycleNode.node.id, toNodeId: residualNode.node.id, relationshipType: GovernanceRelationshipType.SUPERSEDES, createdBy: actorId });
    }
}

async function requireActive(organizationId: string, engagementId: string, cycleId?: string) {
    const cycle = await prisma.engagementReassessment.findFirst({
        where: { organizationId, engagementId, id: cycleId || undefined, status: { in: [...OPEN] } },
        include: { items: true },
        orderBy: { startedAt: 'desc' },
    });
    if (!cycle) throw new ApiError(404, 'No active reassessment cycle was found for this Engagement.');
    return cycle;
}

export async function updateScope(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canManage(actor) && !canInitiate(actor)) throw new ApiError(403, 'You do not have permission to change reassessment scope.');
    const cycle = await requireActive(organizationId, engagementId, body.cycleId);
    const kind = body.kind === 'FULL' ? EngagementReassessmentKind.FULL : body.kind === 'TARGETED' ? EngagementReassessmentKind.TARGETED : cycle.kind;
    await prisma.engagementReassessment.update({
        where: { id: cycle.id },
        data: {
            kind,
            scopeNote: body.scopeNote || cycle.scopeNote,
            status: EngagementReassessmentStatus.SCOPED,
            version: cycle.version + 1,
        },
    });
    await audit(organizationId, actor.id, 'reassessment.scoped', 'EngagementReassessment', cycle.id, { kind });
    return getReassessmentWorkspace(organizationId, actor, engagementId);
}

export async function recordRequesterDelta(organizationId: string, actor: Actor, engagementId: string, body: any) {
    const isRequester = participantExperience(actor.role) === 'requester';
    if (!isRequester) assertPractitioner(actor);
    if (!body.summary) throw new ApiError(400, 'Record what changed in the business context, or confirm that nothing material changed.');
    const cycle = await requireActive(organizationId, engagementId, body.cycleId);
    await prisma.engagementReassessment.update({
        where: { id: cycle.id },
        data: {
            requesterDelta: { summary: body.summary, dataScopeChanged: Boolean(body.dataScopeChanged), serviceChanged: Boolean(body.serviceChanged), recordedBy: actor.id, at: new Date().toISOString() },
            status: EngagementReassessmentStatus.IRA_REFRESH,
        },
    });
    await prisma.engagementReassessmentItem.updateMany({
        where: { reassessmentId: cycle.id, kind: ReassessmentItemKind.BUSINESS_CONTEXT },
        data: { currentValue: body.summary, reviewedByUserId: actor.id, reviewedAt: new Date() },
    });
    await audit(organizationId, actor.id, 'reassessment.requester_delta', 'EngagementReassessment', cycle.id, { summary: body.summary });
    return isRequester
        ? { honesty: 'Thank you. The TPRM analyst will use this business update. Residual risk was not changed.', wave8Started: false }
        : getReassessmentWorkspace(organizationId, actor, engagementId);
}

export async function refreshIra(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canInitiate(actor)) throw new ApiError(403, 'You do not have permission to refresh inherent-risk answers.');
    const cycle = await requireActive(organizationId, engagementId, body.cycleId);
    const engagement = await loadEngagement(organizationId, engagementId);
    if (!engagement.ira) throw new ApiError(409, 'This Engagement has no inherent-risk record to refresh.');
    const previous = answerMap(engagement.ira.currentAnswers);
    const incoming = answerMap(body.answers);
    const merged = { ...previous, ...incoming };
    const rating = scoreIra(Object.entries(merged).map(([questionKey, response]) => ({ questionKey, response })), {});
    if (rating.methodologyGap) throw new ApiError(409, rating.explanation || 'Version 3 inherent-risk scoring cannot be completed from these answers.');
    const submission = await prisma.engagementIraSubmission.create({
        data: {
            organizationId,
            iraId: engagement.ira.id,
            kind: `REASSESSMENT_CYCLE_${cycle.cycleNumber}`,
            answers: merged as Prisma.InputJsonValue,
            calculationSnapshot: rating as Prisma.InputJsonValue,
            submittedBy: actor.id,
        },
    });
    await prisma.engagementIra.update({
        where: { id: engagement.ira.id },
        data: {
            previousCalculationSnapshot: engagement.ira.calculationSnapshot ?? Prisma.JsonNull,
            currentAnswers: merged as Prisma.InputJsonValue,
            recommendedTier: rating.recommendedTier,
            recommendedScore: rating.percent,
            explanation: rating.explanation,
            calculationSnapshot: rating as Prisma.InputJsonValue,
            scoringVersion: '3',
        },
    });
    await prisma.engagementReassessment.update({
        where: { id: cycle.id },
        data: {
            currentIraSnapshot: { scoringVersion: '3', recommendedTier: rating.recommendedTier, recommendedScore: rating.percent, answers: merged, submissionId: submission.id } as Prisma.InputJsonValue,
            status: EngagementReassessmentStatus.TIER_REVIEW,
        },
    });
    for (const question of IRA_QUESTIONS) {
        if (incoming[question.key] != null) {
            await prisma.engagementReassessmentItem.updateMany({
                where: { reassessmentId: cycle.id, kind: ReassessmentItemKind.IRA_QUESTION, sourceKey: question.key },
                data: { currentValue: incoming[question.key], reviewedByUserId: actor.id, reviewedAt: new Date() },
            });
        }
    }
    await audit(organizationId, actor.id, 'reassessment.ira_refreshed', 'EngagementIraSubmission', submission.id, { cycleId: cycle.id, scoringVersion: '3' });
    return getReassessmentWorkspace(organizationId, actor, engagementId);
}

export async function confirmTierReview(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canManage(actor) && !canInitiate(actor)) throw new ApiError(403, 'You do not have permission to complete Tier Review.');
    const cycle = await requireActive(organizationId, engagementId, body.cycleId);
    const engagement = await loadEngagement(organizationId, engagementId);
    if (!engagement.ira) throw new ApiError(409, 'Confirm inherent risk before Tier Review.');
    const confirmedTier = body.confirmedTier || engagement.ira.recommendedTier || engagement.ira.confirmedTier;
    if (!confirmedTier) throw new ApiError(400, 'Record the confirmed inherent tier. No new scoring mathematics were invented.');
    await prisma.engagementIra.update({
        where: { id: engagement.ira.id },
        data: {
            confirmedTier,
            confirmedAt: new Date(),
            confirmedBy: actor.id,
            overrideReason: body.reason || engagement.ira.overrideReason,
            status: 'CONFIRMED',
        },
    });
    await prisma.engagementReassessment.update({ where: { id: cycle.id }, data: { status: EngagementReassessmentStatus.DELTA_DUE_DILIGENCE } });
    await audit(organizationId, actor.id, 'reassessment.tier_reviewed', 'EngagementReassessment', cycle.id, { confirmedTier });
    return getReassessmentWorkspace(organizationId, actor, engagementId);
}

export async function confirmDeltaPlan(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canInitiate(actor)) throw new ApiError(403, 'You do not have permission to confirm the delta due-diligence plan.');
    const cycle = await requireActive(organizationId, engagementId, body.cycleId);
    const vendorNeeded = cycle.items.some((row) => row.kind === ReassessmentItemKind.DUE_DILIGENCE_QUESTION && (row.disposition === 'REFRESH' || row.disposition === 'NEW'));
    await prisma.engagementReassessment.update({
        where: { id: cycle.id },
        data: {
            status: vendorNeeded ? EngagementReassessmentStatus.VENDOR_REFRESH : EngagementReassessmentStatus.EVIDENCE_REVIEW,
            vendorRefreshStatus: vendorNeeded ? ReassessmentVendorRefreshStatus.REQUIRED : ReassessmentVendorRefreshStatus.NOT_REQUIRED,
        },
    });
    await audit(organizationId, actor.id, 'reassessment.delta_plan_confirmed', 'EngagementReassessment', cycle.id, { vendorNeeded });
    return getReassessmentWorkspace(organizationId, actor, engagementId);
}

export async function requestVendorRefresh(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canInitiate(actor)) throw new ApiError(403, 'You do not have permission to request a vendor refresh.');
    const cycle = await requireActive(organizationId, engagementId, body.cycleId);
    await prisma.engagementReassessment.update({
        where: { id: cycle.id },
        data: { vendorRefreshStatus: ReassessmentVendorRefreshStatus.REQUESTED, status: EngagementReassessmentStatus.EVIDENCE_REVIEW },
    });
    await audit(organizationId, actor.id, 'reassessment.vendor_refresh_requested', 'EngagementReassessment', cycle.id, { invitationOnly: true });
    return getReassessmentWorkspace(organizationId, actor, engagementId);
}

export async function reviewItem(organizationId: string, actor: Actor, engagementId: string, itemId: string, body: any) {
    assertPractitioner(actor);
    if (!canInitiate(actor)) throw new ApiError(403, 'You do not have permission to review reassessment items.');
    const cycle = await requireActive(organizationId, engagementId, body.cycleId);
    const item = cycle.items.find((row) => row.id === itemId);
    if (!item) throw new ApiError(404, 'That reassessment item was not found on this cycle.');
    if (body.disposition && !Object.values(ReassessmentItemDisposition).includes(body.disposition)) {
        throw new ApiError(400, 'Use REUSE, REFRESH, NEW, or NOT REQUIRED.');
    }
    await prisma.engagementReassessmentItem.update({
        where: { id: item.id },
        data: {
            disposition: body.disposition || item.disposition,
            currentValue: body.currentValue ?? item.currentValue,
            rationale: body.rationale || item.rationale,
            reviewedByUserId: actor.id,
            reviewedAt: new Date(),
        },
    });
    if (item.kind === ReassessmentItemKind.CONTROL && body.currentValue && body.rationale) {
        await prisma.engagementControlEffectiveness.updateMany({
            where: { organizationId, engagementId, controlId: item.sourceKey },
            data: { rating: body.currentValue, rationale: body.rationale, reviewedBy: actor.id, reviewedAt: new Date() },
        });
    }
    await audit(organizationId, actor.id, 'reassessment.item_reviewed', 'EngagementReassessmentItem', item.id, { disposition: body.disposition || item.disposition });
    return getReassessmentWorkspace(organizationId, actor, engagementId);
}

export async function advanceStage(organizationId: string, actor: Actor, engagementId: string, status: EngagementReassessmentStatus, cycleId?: string) {
    assertPractitioner(actor);
    if (!canInitiate(actor)) throw new ApiError(403, 'You do not have permission to advance this reassessment.');
    const cycle = await requireActive(organizationId, engagementId, cycleId);
    await prisma.engagementReassessment.update({ where: { id: cycle.id }, data: { status } });
    await audit(organizationId, actor.id, 'reassessment.advanced', 'EngagementReassessment', cycle.id, { status });
    return getReassessmentWorkspace(organizationId, actor, engagementId);
}

export async function calculateCycleResidual(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canManage(actor) && !hasPermission(actor.role, PERMISSIONS['risk.score'])) {
        throw new ApiError(403, 'Only a TPRM reviewer can calculate a new residual assessment.');
    }
    const cycle = await requireActive(organizationId, engagementId, body.cycleId);
    const historical = await prisma.engagementResidualRiskAssessment.findMany({
        where: { organizationId, engagementId, status: 'CONFIRMED' },
        orderBy: { createdAt: 'asc' },
    });
    const prior = historical[0];
    const calculated = await calculateResidual(organizationId, actor, engagementId, 'reassessment.calculate');
    const latest = await prisma.engagementResidualRiskAssessment.findFirst({
        where: { organizationId, engagementId },
        orderBy: { createdAt: 'desc' },
    });
    if (latest) {
        await prisma.engagementResidualRiskAssessment.update({ where: { id: latest.id }, data: { reassessmentId: cycle.id } });
    }
    const confirmed = await confirmResidual(organizationId, actor, engagementId, body.note || 'Cycle 2 residual confirmed. Cycle 1 remains inspectable.');
    const newest = await prisma.engagementResidualRiskAssessment.findFirst({
        where: { organizationId, engagementId, status: 'CONFIRMED' },
        orderBy: { createdAt: 'desc' },
    });
    if (newest && newest.id !== prior?.id) {
        await prisma.engagementResidualRiskAssessment.update({ where: { id: newest.id }, data: { reassessmentId: cycle.id } });
    }
    await prisma.engagementReassessment.update({
        where: { id: cycle.id },
        data: { currentResidualId: newest?.id || latest?.id, status: EngagementReassessmentStatus.DECISION },
    });
    await prisma.engagement.update({ where: { id: engagementId }, data: { status: EngagementStatus.ACTIVE } });
    const engagement = await prisma.engagement.findUnique({ where: { id: engagementId }, select: { status: true } });
    await audit(organizationId, actor.id, 'reassessment.residual_calculated', 'EngagementReassessment', cycle.id, {
        priorResidualId: prior?.id,
        priorScore: prior?.residualScore,
        newResidualId: newest?.id,
        newScore: newest?.residualScore,
        historicalUnchanged: prior?.residualScore,
        engagementStatus: engagement?.status,
    });
    return {
        ...(await getReassessmentWorkspace(organizationId, actor, engagementId)),
        calculated,
        confirmed,
        historicalUnchanged: prior ? { id: prior.id, residualBand: prior.residualBand, residualScore: prior.residualScore } : null,
    };
}

export async function decideReassessment(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only an authorized risk owner can record the reassessment decision.');
    const cycle = await requireActive(organizationId, engagementId, body.cycleId);
    if (!body.decision || !Object.values(ReassessmentDecisionType).includes(body.decision)) {
        throw new ApiError(400, 'Choose Continue monitoring, Further treatment required, or Termination recommended.');
    }
    if (!body.rationale) throw new ApiError(400, 'Record why this reassessment decision is being made.');
    if (body.startWave8) {
        throw new ApiError(409, 'Wave 8 has not started and cannot start from this cycle. Termination recommended is recorded only.');
    }
    await prisma.engagementReassessment.update({
        where: { id: cycle.id },
        data: {
            decision: body.decision,
            decisionRationale: body.rationale,
            wave8Started: false,
            status: EngagementReassessmentStatus.DECISION,
        },
    });
    await audit(organizationId, actor.id, 'reassessment.decided', 'EngagementReassessment', cycle.id, { decision: body.decision, wave8Started: false });
    return getReassessmentWorkspace(organizationId, actor, engagementId);
}

export async function returnToMonitoring(organizationId: string, actor: Actor, engagementId: string, body: any) {
    assertPractitioner(actor);
    if (!canManage(actor) && !canInitiate(actor)) throw new ApiError(403, 'You do not have permission to close this reassessment.');
    const cycle = await requireActive(organizationId, engagementId, body.cycleId);
    if (!cycle.decision) throw new ApiError(409, 'Record a reassessment decision before returning to monitoring.');
    await prisma.engagementReassessment.update({
        where: { id: cycle.id },
        data: { status: EngagementReassessmentStatus.COMPLETED, completedAt: new Date(), completedByUserId: actor.id, wave8Started: false },
    });
    await prisma.engagement.update({ where: { id: engagementId }, data: { status: EngagementStatus.ACTIVE } });
    await prisma.engagementMonitoringProfile.updateMany({
        where: { engagementId },
        data: { lastReviewedAt: new Date(), nextReviewAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
    });
    await audit(organizationId, actor.id, 'reassessment.returned_to_monitoring', 'EngagementReassessment', cycle.id, { decision: cycle.decision, wave8Started: false });
    await notify(organizationId, actor.id, 'reassessment.completed', 'Reassessment completed', 'The Engagement returned to monitoring. Wave 8 has not started.', cycle.id);
    return getReassessmentWorkspace(organizationId, actor, engagementId);
}

export async function reassessmentExtras(organizationId: string, engagementId: string) {
    const active = await prisma.engagementReassessment.findFirst({
        where: { organizationId, engagementId, status: { in: [...OPEN] } },
        select: { id: true, status: true, decision: true },
    });
    return {
        openReassessment: Boolean(active),
        reassessmentStatus: active?.status || null,
        reassessmentDecision: active?.decision || null,
    };
}
