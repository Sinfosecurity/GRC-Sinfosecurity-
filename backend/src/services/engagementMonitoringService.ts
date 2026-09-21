import {
    EngagementMonitoringProfileStatus,
    EngagementStatus,
    GovernanceNodeType,
    GovernanceRelationshipType,
    IntelligenceDomain,
    IntelligencePolarity,
    IntelligencePriority,
    IssuePriority,
    IssueSeverity,
    IssueSource,
    MonitoringDomain,
    MonitoringImpactDecision,
    MonitoringPriority,
    MonitoringSignalStatus,
    MonitoringSourceType,
    MonitoringTriageOutcome,
    Prisma,
    ReassessmentRecommendationStatus,
    ReassessmentTriggerType,
    VendorIssueStatus,
    VendorIssueType,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { hasPermission, participantExperience, PERMISSIONS } from '../security/rbac';
import { recordAudit } from './auditEventService';
import { createRelationship, ensureNode } from './governanceGraphService';
import { notifyUser, type NotificationEvent } from './notificationDeliveryService';
import type { Actor } from './intakeEngagementService';
import { engagementPrimaryAction } from '../tprm/engagementWorkspace';

const OPEN_SIGNAL = new Set<MonitoringSignalStatus>([
    MonitoringSignalStatus.NEW,
    MonitoringSignalStatus.NEEDS_REVIEW,
    MonitoringSignalStatus.ASSIGNED,
    MonitoringSignalStatus.ESCALATED,
    MonitoringSignalStatus.WATCHING,
]);

const CONNECTED_SOURCES = new Set<MonitoringSourceType>([
    MonitoringSourceType.INTERNAL_REVIEW,
    MonitoringSourceType.MANUAL_OBSERVATION,
    MonitoringSourceType.SYSTEM_EVENT,
    MonitoringSourceType.VENDOR_NOTIFICATION,
]);

export function normalizeAttentionPriority(sourceSeverity?: string | null): { attentionPriority: MonitoringPriority; explanation: string } {
    const raw = String(sourceSeverity || '').trim().toUpperCase();
    if (['CRITICAL', 'CRIT', '5', 'SEVERE'].includes(raw)) {
        return { attentionPriority: MonitoringPriority.CRITICAL, explanation: `Source severity ${sourceSeverity} maps to Supreme attention CRITICAL. This is not residual risk.` };
    }
    if (['HIGH', '4', 'IMPORTANT'].includes(raw)) {
        return { attentionPriority: MonitoringPriority.HIGH, explanation: `Source severity ${sourceSeverity} maps to Supreme attention HIGH. This is not residual risk.` };
    }
    if (['MEDIUM', 'MODERATE', '3'].includes(raw)) {
        return { attentionPriority: MonitoringPriority.MEDIUM, explanation: `Source severity ${sourceSeverity} maps to Supreme attention MEDIUM. This is not residual risk.` };
    }
    if (['LOW', '1', '2', 'INFO', 'INFORMATIONAL'].includes(raw)) {
        return { attentionPriority: MonitoringPriority.LOW, explanation: `Source severity ${sourceSeverity} maps to Supreme attention LOW. This is not residual risk.` };
    }
    return { attentionPriority: MonitoringPriority.MEDIUM, explanation: sourceSeverity ? `Source severity ${sourceSeverity} has no exact map, so Supreme attention defaults to MEDIUM. This is not residual risk.` : 'No source severity was provided. Supreme attention defaults to MEDIUM. This is not residual risk.' };
}

export function buildDedupKey(input: { sourceType: string; sourceRecordRef?: string | null; vendorId: string; signalType: string; observedAt: Date }) {
    const day = input.observedAt.toISOString().slice(0, 10);
    return [input.sourceType, input.sourceRecordRef || 'none', input.vendorId, input.signalType, day].join('|');
}

function assertPractitioner(actor: Actor) {
    if (participantExperience(actor.role) === 'requester') {
        throw new ApiError(403, 'Requesters cannot open internal Engagement monitoring.');
    }
    if (participantExperience(actor.role) === 'vendor' || String(actor.role || '').toUpperCase() === 'VENDOR') {
        throw new ApiError(403, 'Vendor sessions cannot open internal Engagement monitoring.');
    }
}

function canRead(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['monitoring.read']) || hasPermission(actor.role, PERMISSIONS['intake.read']);
}

function canManage(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['monitoring.manage']);
}

function canTriage(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['monitoring.triage']) || canManage(actor);
}

function canEscalate(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['monitoring.escalate']) || canManage(actor);
}

async function audit(organizationId: string, actorId: string, action: string, resourceType: string, resourceId: string, metadata: Record<string, unknown> = {}) {
    await recordAudit({ organizationId, actorUserId: actorId, action, resourceType, resourceId, result: 'success', metadata });
}

async function nextSignalPublicId(organizationId: string) {
    const count = await prisma.engagementMonitoringSignal.count({ where: { organizationId } });
    return `SIG-${new Date().getUTCFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

export async function sourceHealth(organizationId: string) {
    const webhooks = await prisma.webhookEndpoint.count({ where: { organizationId } });
    return [
        { sourceType: 'MANUAL_OBSERVATION', label: 'Manual observations', status: 'AVAILABLE', honesty: 'Authorized analysts can record governed observations.' },
        { sourceType: 'INTERNAL_REVIEW', label: 'Internal review', status: 'AVAILABLE', honesty: 'Internal review notes are recorded by authorized GRC users.' },
        { sourceType: 'SYSTEM_EVENT', label: 'Internal Intelligence', status: 'AVAILABLE', honesty: 'Monitoring can contribute Intelligence attention items. Intelligence does not replace triage.' },
        { sourceType: 'VENDOR_NOTIFICATION', label: 'Vendor-reported event', status: 'AVAILABLE_INTERNAL', honesty: 'Internal model accepts vendor-origin observations. Vendor-plane reporting UI is deferred. Vendor cannot open the monitoring workspace.' },
        { sourceType: 'WEBHOOK', label: 'Signed webhooks', status: webhooks ? 'AVAILABLE' : 'NOT_CONFIGURED', honesty: webhooks ? 'Signed webhook endpoints exist for this organization.' : 'No signed webhook endpoint is configured.' },
        { sourceType: 'PROVIDER_OBSERVATION', label: 'Slack', status: 'NOT_CONFIGURED', honesty: 'Slack is not connected for Engagement monitoring.' },
        { sourceType: 'PROVIDER_OBSERVATION', label: 'Jira', status: 'NOT_CONFIGURED', honesty: 'Jira is not connected for Engagement monitoring.' },
        { sourceType: 'SECURITY_RATING', label: 'BitSight', status: 'NOT_CONFIGURED', honesty: 'Coming later. No live rating feed is connected.' },
        { sourceType: 'SECURITY_RATING', label: 'SecurityScorecard', status: 'NOT_CONFIGURED', honesty: 'Coming later. No live rating feed is connected.' },
    ];
}

async function loadEngagement(organizationId: string, engagementId: string) {
    const engagement = await prisma.engagement.findFirst({
        where: { organizationId, id: engagementId },
        include: { vendor: { select: { id: true, name: true, publicId: true } }, ira: { select: { confirmedTier: true } } },
    });
    if (!engagement) throw new ApiError(404, 'Engagement not found.');
    return engagement;
}

async function snapshotRisk(organizationId: string, engagementId: string) {
    const residual = await prisma.engagementResidualRiskAssessment.findFirst({
        where: { organizationId, engagementId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, residualBand: true, residualScore: true },
    });
    const controls = await prisma.engagementControlEffectiveness.findMany({
        where: { organizationId, engagementId },
        select: { id: true, rating: true, controlTitle: true },
    });
    const findings = await prisma.vendorIssue.findMany({
        where: { organizationId, engagementId, status: { not: VendorIssueStatus.CLOSED } },
        select: { id: true, status: true, severity: true, title: true },
    });
    return { residual, controls, findings, engagementStatus: (await prisma.engagement.findUnique({ where: { id: engagementId }, select: { status: true } }))?.status };
}

function primaryForActive(profileStatus?: string | null, signals: Array<{ status: MonitoringSignalStatus; attentionPriority: MonitoringPriority }> = [], recommended = false) {
    return engagementPrimaryAction(EngagementStatus.ACTIVE, {
        monitoringProfileStatus: profileStatus,
        openMonitoringSignals: signals.filter((row) => OPEN_SIGNAL.has(row.status)).length,
        highPrioritySignals: signals.filter((row) => OPEN_SIGNAL.has(row.status) && (row.attentionPriority === 'HIGH' || row.attentionPriority === 'CRITICAL')).length,
        reassessmentRecommended: recommended,
    });
}

export async function getMonitoringWorkspace(organizationId: string, actor: Actor, engagementId: string) {
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You do not have permission to read Engagement monitoring.');
    const engagement = await loadEngagement(organizationId, engagementId);
    const [profile, signals, recommendations, health, risk, siblings, legacy] = await Promise.all([
        prisma.engagementMonitoringProfile.findUnique({ where: { engagementId } }),
        prisma.engagementMonitoringSignal.findMany({
            where: { organizationId, OR: [{ originatingEngagementId: engagementId }, { impacts: { some: { engagementId } } }] },
            include: { impacts: true, reviews: { orderBy: { reviewedAt: 'desc' }, take: 5 }, escalations: { orderBy: { createdAt: 'desc' }, take: 5 } },
            orderBy: { receivedAt: 'desc' },
        }),
        prisma.reassessmentRecommendation.findMany({ where: { organizationId, engagementId }, orderBy: { createdAt: 'desc' } }),
        sourceHealth(organizationId),
        snapshotRisk(organizationId, engagementId),
        prisma.engagement.findMany({
            where: { organizationId, vendorId: engagement.vendorId, id: { not: engagementId } },
            select: { id: true, publicId: true, serviceName: true, status: true },
        }),
        prisma.vendorMonitoring.findMany({
            where: { organizationId, vendorId: engagement.vendorId },
            orderBy: { detectedAt: 'desc' },
            take: 10,
        }),
    ]);
    const primary = primaryForActive(profile?.status, signals, recommendations.some((row) => row.status !== ReassessmentRecommendationStatus.WITHDRAWN));
    return {
        engagement: {
            id: engagement.id,
            publicId: engagement.publicId,
            serviceName: engagement.serviceName,
            status: engagement.status,
            confirmedTier: engagement.ira?.confirmedTier || null,
            thirdParty: engagement.vendor,
        },
        profile,
        recommendedDomains: recommendDomains(engagement.serviceName, engagement.ira?.confirmedTier),
        sourceHealth: health,
        signals: signals.map(presentSignal),
        recommendations,
        residual: risk.residual,
        controls: risk.controls,
        findings: risk.findings,
        siblings,
        legacyVendorMonitoring: legacy.map((row) => ({
            id: row.id,
            source: row.source,
            riskIndicator: row.riskIndicator,
            riskLevel: row.riskLevel,
            detectedAt: row.detectedAt,
            honesty: 'Legacy vendor-level signal. Not Engagement-authoritative unless separately reviewed.',
        })),
        nextAction: primary.label,
        primaryAction: { label: primary.label, href: primary.href(engagement.id), owner: primary.owner },
        wave7Started: false,
        honesty: 'Supreme is not advertising 24/7 monitoring or live breach detection. Only configured sources are active.',
    };
}

function recommendDomains(serviceName: string, tier?: string | null) {
    const recommended: MonitoringDomain[] = [MonitoringDomain.CYBERSECURITY, MonitoringDomain.OPERATIONAL_RESILIENCE];
    if (/azure|host|cloud|infra/i.test(serviceName)) recommended.push(MonitoringDomain.BUSINESS_CONTINUITY);
    if (/365|collab|office|identity/i.test(serviceName)) recommended.push(MonitoringDomain.PRIVACY, MonitoringDomain.FOURTH_PARTY);
    if (tier === 'CRITICAL' || tier === 'HIGH') recommended.push(MonitoringDomain.REGULATORY_COMPLIANCE);
    if (/insur|reinsur|claim/i.test(serviceName)) recommended.push(MonitoringDomain.INSURANCE);
    return [...new Set(recommended)];
}

export async function upsertProfile(organizationId: string, actor: Actor, engagementId: string, body: any, activate = false) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only an authorized monitoring owner can configure this profile.');
    const engagement = await loadEngagement(organizationId, engagementId);
    if (engagement.status !== EngagementStatus.ACTIVE && activate) {
        throw new ApiError(409, 'A monitoring profile can be activated only on an Active Engagement.');
    }
    const domains = Array.isArray(body.enabledDomains) ? body.enabledDomains : [];
    const sources = Array.isArray(body.enabledSources) ? body.enabledSources : [];
    if (!body.whatMonitoring || !body.whyMonitoring) {
        throw new ApiError(400, 'Record what you are monitoring and why before saving the profile.');
    }
    const existing = await prisma.engagementMonitoringProfile.findUnique({ where: { engagementId } });
    const nextStatus = activate
        ? EngagementMonitoringProfileStatus.ACTIVE
        : body.status && Object.values(EngagementMonitoringProfileStatus).includes(body.status)
            ? body.status
            : existing?.status || EngagementMonitoringProfileStatus.DRAFT;
    const cadence = body.reviewCadenceDays ? Number(body.reviewCadenceDays) : existing?.reviewCadenceDays || 90;
    const nextReviewAt = nextStatus === EngagementMonitoringProfileStatus.ACTIVE
        ? new Date(Date.now() + cadence * 24 * 60 * 60 * 1000)
        : existing?.nextReviewAt || null;
    const history = [
        ...(((existing?.history as any[]) || [])),
        { at: new Date().toISOString(), by: actor.id, from: existing?.status || null, to: nextStatus, version: (existing?.version || 0) + 1 },
    ];
    const data = {
        organizationId,
        vendorId: engagement.vendorId,
        engagementId,
        status: nextStatus,
        ownerUserId: body.ownerUserId || actor.id,
        reviewCadenceDays: cadence,
        enabledDomains: domains,
        enabledSources: sources,
        materialityConfig: body.materialityConfig || existing?.materialityConfig || { factors: ['source severity', 'engagement criticality', 'open findings', 'control weakness'] },
        reassessmentTriggerConfig: body.reassessmentTriggerConfig || existing?.reassessmentTriggerConfig || { triggers: ['MATERIAL_SECURITY_INCIDENT', 'SCHEDULED_PERIODIC_REVIEW'] },
        whatMonitoring: body.whatMonitoring,
        whyMonitoring: body.whyMonitoring,
        effectiveAt: nextStatus === EngagementMonitoringProfileStatus.ACTIVE ? (existing?.effectiveAt || new Date()) : existing?.effectiveAt,
        lastReviewedAt: activate ? new Date() : existing?.lastReviewedAt,
        nextReviewAt,
        createdByUserId: existing?.createdByUserId || actor.id,
        updatedByUserId: actor.id,
        version: (existing?.version || 0) + 1,
        history,
    };
    const profile = existing
        ? await prisma.engagementMonitoringProfile.update({ where: { engagementId }, data })
        : await prisma.engagementMonitoringProfile.create({ data });
    await graphProfile(organizationId, actor.id, engagement, profile.id);
    await audit(organizationId, actor.id, existing ? 'monitoring.profile.updated' : 'monitoring.profile.created', 'EngagementMonitoringProfile', profile.id, { engagementId, status: profile.status });
    if (activate) await audit(organizationId, actor.id, 'monitoring.profile.activated', 'EngagementMonitoringProfile', profile.id, { engagementId });
    if (nextStatus === EngagementMonitoringProfileStatus.PAUSED && existing?.status !== EngagementMonitoringProfileStatus.PAUSED) {
        await audit(organizationId, actor.id, 'monitoring.profile.paused', 'EngagementMonitoringProfile', profile.id, { engagementId });
    }
    return getMonitoringWorkspace(organizationId, actor, engagementId);
}

async function graphProfile(organizationId: string, actorId: string, engagement: { id: string; publicId: string; serviceName: string }, profileId: string) {
    const engagementNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.ENGAGEMENT, sourceModel: 'Engagement', sourceId: engagement.id, displayLabel: `${engagement.publicId} ${engagement.serviceName}`, actorUserId: actorId });
    const profileNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.MONITORING_PROFILE, sourceModel: 'EngagementMonitoringProfile', sourceId: profileId, displayLabel: `Monitoring profile ${engagement.publicId}`, actorUserId: actorId });
    await createRelationship({ organizationId, fromNodeId: engagementNode.node.id, toNodeId: profileNode.node.id, relationshipType: GovernanceRelationshipType.MONITORED_BY, createdBy: actorId });
}

export async function createManualSignal(organizationId: string, actor: Actor, body: any) {
    assertPractitioner(actor);
    if (!canTriage(actor) && !canManage(actor)) throw new ApiError(403, 'You do not have permission to record a monitoring observation.');
    if (!body.summary || !body.vendorId || !body.domain || !body.sourceType) {
        throw new ApiError(400, 'A monitoring observation needs a source, domain, summary, and Third Party.');
    }
    const sourceType = body.sourceType as MonitoringSourceType;
    if (!Object.values(MonitoringSourceType).includes(sourceType)) {
        throw new ApiError(400, 'Choose a supported monitoring source.');
    }
    if (!CONNECTED_SOURCES.has(sourceType) && sourceType !== MonitoringSourceType.PROVIDER_OBSERVATION && sourceType !== MonitoringSourceType.WEBHOOK) {
        throw new ApiError(409, `${sourceType.replace(/_/g, ' ')} is not configured. Record a manual or internal observation instead.`);
    }
    return ingestSignal(organizationId, actor, {
        vendorId: body.vendorId,
        originatingEngagementId: body.engagementId || body.originatingEngagementId || null,
        sourceType,
        sourceProvider: body.sourceProvider || (sourceType === 'MANUAL_OBSERVATION' ? 'Manual observation' : sourceType),
        sourceRecordRef: body.sourceRecordRef || body.evidenceRef || null,
        signalType: body.signalType || 'MANUAL_OBSERVATION',
        domain: body.domain,
        observedAt: body.observedAt ? new Date(body.observedAt) : new Date(),
        title: body.title || body.summary.slice(0, 120),
        summary: body.summary,
        sourceMetadata: { rationale: body.rationale || body.summary, evidenceRef: body.evidenceRef || null, recordedBy: actor.id },
        sourceSeverity: body.sourceSeverity || body.priority || null,
        confidence: body.confidence || 'Human recorded',
        relatedEvidenceRef: body.evidenceRef || null,
        thirdPartyLevel: Boolean(body.thirdPartyLevel) || !body.engagementId,
    });
}

export async function ingestProviderObservation(organizationId: string, actor: Actor, body: any) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only an authorized monitoring owner can ingest a provider observation.');
    const observation = body.observationId
        ? await prisma.providerObservation.findFirst({ where: { id: body.observationId, organizationId } })
        : null;
    if (body.observationId && !observation) throw new ApiError(404, 'That provider observation was not found in this organization.');
    return ingestSignal(organizationId, actor, {
        vendorId: body.vendorId || observation?.vendorId,
        originatingEngagementId: body.engagementId || null,
        sourceType: MonitoringSourceType.PROVIDER_OBSERVATION,
        sourceProvider: observation?.provider || body.sourceProvider || 'Provider observation',
        sourceRecordRef: observation?.id || body.sourceRecordRef,
        signalType: body.signalType || 'PROVIDER_OBSERVATION',
        domain: body.domain || MonitoringDomain.CYBERSECURITY,
        observedAt: observation?.observedAt || new Date(),
        title: body.title || observation?.summary || 'Provider observation',
        summary: body.summary || observation?.summary || 'Provider observation received.',
        sourceMetadata: { observationId: observation?.id || null, payload: observation?.payload || body.payload || null },
        sourceSeverity: body.sourceSeverity || (observation?.score != null && observation.score >= 80 ? 'HIGH' : 'MEDIUM'),
        confidence: 'Provider observation',
        thirdPartyLevel: !body.engagementId,
    });
}

async function ingestSignal(organizationId: string, actor: Actor, input: {
    vendorId?: string | null;
    originatingEngagementId?: string | null;
    sourceType: MonitoringSourceType;
    sourceProvider: string;
    sourceRecordRef?: string | null;
    signalType: string;
    domain: MonitoringDomain;
    observedAt: Date;
    title: string;
    summary: string;
    sourceMetadata: Prisma.InputJsonValue;
    sourceSeverity?: string | null;
    confidence?: string | null;
    relatedEvidenceRef?: string | null;
    thirdPartyLevel?: boolean;
}) {
    if (!input.vendorId) throw new ApiError(400, 'A monitoring signal needs a Third Party.');
    const vendor = await prisma.vendor.findFirst({ where: { organizationId, id: input.vendorId } });
    if (!vendor) throw new ApiError(404, 'Third Party not found.');
    if (input.originatingEngagementId) await loadEngagement(organizationId, input.originatingEngagementId);
    const { attentionPriority, explanation } = normalizeAttentionPriority(input.sourceSeverity);
    const dedupKey = buildDedupKey({
        sourceType: input.sourceType,
        sourceRecordRef: input.sourceRecordRef,
        vendorId: input.vendorId,
        signalType: input.signalType,
        observedAt: input.observedAt,
    });
    const existing = await prisma.engagementMonitoringSignal.findUnique({
        where: { organizationId_dedupKey: { organizationId, dedupKey } },
        include: { impacts: true },
    });
    if (existing) {
        const materialChange = existing.title !== input.title || existing.summary !== input.summary || existing.sourceSeverity !== (input.sourceSeverity || null);
        if (!materialChange) {
            return presentSignal(existing);
        }
        const updated = await prisma.engagementMonitoringSignal.update({
            where: { id: existing.id },
            data: {
                title: input.title,
                summary: input.summary,
                sourceSeverity: input.sourceSeverity || existing.sourceSeverity,
                attentionPriority,
                normalizationExplanation: explanation,
                version: existing.version + 1,
            },
            include: { impacts: true, reviews: true, escalations: true },
        });
        await audit(organizationId, actor.id, 'monitoring.signal.created', 'EngagementMonitoringSignal', updated.id, { dedup: 'versioned', version: updated.version });
        return presentSignal(updated);
    }
    const publicId = await nextSignalPublicId(organizationId);
    const signal = await prisma.engagementMonitoringSignal.create({
        data: {
            organizationId,
            vendorId: input.vendorId,
            originatingEngagementId: input.thirdPartyLevel ? null : input.originatingEngagementId,
            publicId,
            sourceType: input.sourceType,
            sourceProvider: input.sourceProvider,
            sourceRecordRef: input.sourceRecordRef,
            signalType: input.signalType,
            domain: input.domain,
            observedAt: input.observedAt,
            title: input.title,
            summary: input.summary,
            sourceMetadata: input.sourceMetadata,
            sourceSeverity: input.sourceSeverity || null,
            attentionPriority,
            normalizationExplanation: explanation,
            confidence: input.confidence,
            status: MonitoringSignalStatus.NEEDS_REVIEW,
            dedupKey,
            relatedEvidenceRef: input.relatedEvidenceRef,
            createdByUserId: actor.id,
        },
    });
    const engagements = input.thirdPartyLevel || !input.originatingEngagementId
        ? await prisma.engagement.findMany({ where: { organizationId, vendorId: input.vendorId, status: EngagementStatus.ACTIVE }, select: { id: true } })
        : [{ id: input.originatingEngagementId }];
    if (engagements.length) {
        await prisma.monitoringSignalEngagementImpact.createMany({
            data: engagements.map((row) => ({
                organizationId,
                signalId: signal.id,
                engagementId: row.id,
                decision: input.thirdPartyLevel || !input.originatingEngagementId
                    ? MonitoringImpactDecision.NEEDS_REVIEW
                    : MonitoringImpactDecision.AFFECTED,
                decidedByUserId: input.thirdPartyLevel ? null : actor.id,
                decidedAt: input.thirdPartyLevel ? null : new Date(),
            })),
            skipDuplicates: true,
        });
    }
    await graphSignal(organizationId, actor.id, signal.id, signal.title, engagements.map((row) => row.id));
    await audit(organizationId, actor.id, 'monitoring.signal.received', 'EngagementMonitoringSignal', signal.id, { vendorId: input.vendorId, sourceType: input.sourceType });
    await audit(organizationId, actor.id, 'monitoring.signal.created', 'EngagementMonitoringSignal', signal.id, { publicId, attentionPriority });
    if (attentionPriority === MonitoringPriority.HIGH || attentionPriority === MonitoringPriority.CRITICAL) {
        await contributeIntelligence(organizationId, actor, signal);
        const owner = (await prisma.engagementMonitoringProfile.findFirst({ where: { engagementId: input.originatingEngagementId || undefined } }))?.ownerUserId
            || (await prisma.engagement.findFirst({ where: { id: input.originatingEngagementId || '' } }))?.assignedAnalystUserId;
        await notify(organizationId, owner, 'monitoring.signal.high_priority', 'High-priority monitoring signal', `${signal.publicId} needs review. Attention priority is ${attentionPriority}.`, signal.id);
    }
    return presentSignal(await prisma.engagementMonitoringSignal.findFirstOrThrow({ where: { id: signal.id }, include: { impacts: true } }));
}

async function graphSignal(organizationId: string, actorId: string, signalId: string, title: string, engagementIds: string[]) {
    const signalNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.MONITORING_SIGNAL, sourceModel: 'EngagementMonitoringSignal', sourceId: signalId, displayLabel: title, actorUserId: actorId });
    for (const engagementId of engagementIds) {
        const engagement = await prisma.engagement.findUnique({ where: { id: engagementId }, select: { publicId: true, serviceName: true } });
        if (!engagement) continue;
        const engagementNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.ENGAGEMENT, sourceModel: 'Engagement', sourceId: engagementId, displayLabel: `${engagement.publicId} ${engagement.serviceName}`, actorUserId: actorId });
        await createRelationship({ organizationId, fromNodeId: signalNode.node.id, toNodeId: engagementNode.node.id, relationshipType: GovernanceRelationshipType.RELATES_TO, createdBy: actorId });
        const profile = await prisma.engagementMonitoringProfile.findUnique({ where: { engagementId } });
        if (profile) {
            const profileNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.MONITORING_PROFILE, sourceModel: 'EngagementMonitoringProfile', sourceId: profile.id, displayLabel: `Monitoring profile ${engagement.publicId}`, actorUserId: actorId });
            await createRelationship({ organizationId, fromNodeId: profileNode.node.id, toNodeId: signalNode.node.id, relationshipType: GovernanceRelationshipType.OBSERVED, createdBy: actorId });
        }
    }
}

async function contributeIntelligence(organizationId: string, actor: Actor, signal: { id: string; publicId: string; title: string; summary: string; attentionPriority: MonitoringPriority }) {
    const groupingKey = `monitoring:${signal.id}`;
    const existing = await prisma.intelligenceItem.findFirst({ where: { organizationId, groupingKey, ruleId: 'tprm.wave6.monitoring.signal' } });
    if (existing) return;
    const year = new Date().getUTCFullYear();
    const count = await prisma.intelligenceItem.count({ where: { organizationId } });
    await prisma.intelligenceItem.create({
        data: {
            organizationId,
            publicId: `MON-${year}-${String(count + 1).padStart(4, '0')}`,
            groupingKey,
            ruleId: 'tprm.wave6.monitoring.signal',
            ruleVersion: '1.0.0',
            domain: IntelligenceDomain.THIRD_PARTY,
            changeType: 'MONITORING_SIGNAL',
            priority: signal.attentionPriority === 'CRITICAL' ? IntelligencePriority.CRITICAL_ATTENTION : IntelligencePriority.HIGH_ATTENTION,
            polarity: IntelligencePolarity.NEGATIVE,
            title: signal.title,
            summary: signal.summary,
            whyItMatters: 'A monitoring observation needs human triage. This is not a residual-risk change.',
            reviewGuidance: 'Open Engagement Monitoring and decide relevance, materiality, and next action.',
            ownerLabel: 'Assigned TPRM analyst',
            ownerUserId: actor.id,
            sourceProduct: 'Supreme Third Party',
            sourceModel: 'EngagementMonitoringSignal',
            sourceId: signal.id,
            sourcePublicId: signal.publicId,
            sourceTimestamp: new Date(),
            fingerprint: groupingKey,
            facts: { signalId: signal.id, publicId: signal.publicId },
            affected: {},
            links: [{ href: `/monitoring/signals/${signal.id}`, label: 'Open monitoring signal' }],
            roleAudience: ['RISK_MANAGER', 'ASSESSOR'],
            requiredPermissions: ['monitoring.read'],
        },
    });
}

function presentSignal(row: any) {
    const ageHours = Math.max(0, Math.round((Date.now() - new Date(row.receivedAt).getTime()) / 36e5));
    const openEscalation = (row.escalations || []).find((item: any) => item.status === 'OPEN');
    return {
        ...row,
        ageHours,
        overdue: Boolean(openEscalation?.dueAt && new Date(openEscalation.dueAt).getTime() < Date.now()),
        dueAt: openEscalation?.dueAt || null,
        slaConfigured: Boolean(openEscalation?.dueAt),
        nextAction: nextSignalAction(row),
    };
}

function nextSignalAction(row: any) {
    if (row.status === 'CLOSED') return 'No action required';
    if (row.triageOutcome === 'REASSESSMENT_RECOMMENDED') return 'Submit reassessment recommendation';
    if (row.status === 'ESCALATED') return 'Review escalation';
    if (!row.reviewOwnerUserId) return 'Assign reviewer';
    if (!row.triageOutcome) return 'Review signal';
    if (row.triageOutcome === 'ACTION_REQUIRED') return 'Review action';
    return 'Continue review';
}

export async function listSignals(organizationId: string, actor: Actor, query: any = {}) {
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You do not have permission to read monitoring signals.');
    const where: Prisma.EngagementMonitoringSignalWhereInput = { organizationId };
    if (query.status) where.status = query.status;
    if (query.priority) where.attentionPriority = query.priority;
    if (query.domain) where.domain = query.domain;
    if (query.source) where.sourceType = query.source;
    if (query.owner) where.reviewOwnerUserId = query.owner;
    if (query.vendorId) where.vendorId = query.vendorId;
    if (query.engagementId) where.OR = [{ originatingEngagementId: query.engagementId }, { impacts: { some: { engagementId: query.engagementId } } }];
    if (query.reassessmentRecommended === 'true') where.triageOutcome = MonitoringTriageOutcome.REASSESSMENT_RECOMMENDED;
    const signals = await prisma.engagementMonitoringSignal.findMany({
        where,
        include: {
            vendor: { select: { id: true, name: true, publicId: true } },
            impacts: { include: { engagement: { select: { id: true, publicId: true, serviceName: true, status: true } } } },
        },
        orderBy: { receivedAt: 'desc' },
        take: 100,
    });
    return { signals: signals.map(presentSignal), sourceHealth: await sourceHealth(organizationId) };
}

export async function getSignalDetail(organizationId: string, actor: Actor, signalId: string) {
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You do not have permission to read monitoring signals.');
    const signal = await prisma.engagementMonitoringSignal.findFirst({
        where: { organizationId, id: signalId },
        include: {
            vendor: { select: { id: true, name: true, publicId: true } },
            impacts: { include: { engagement: { select: { id: true, publicId: true, serviceName: true, status: true } } } },
            reviews: { orderBy: { reviewedAt: 'desc' } },
            escalations: { orderBy: { createdAt: 'desc' } },
            recommendations: true,
            evidenceLinks: true,
        },
    });
    if (!signal) throw new ApiError(404, 'Monitoring signal not found.');
    const residualByEngagement: Record<string, unknown> = {};
    for (const impact of signal.impacts) {
        residualByEngagement[impact.engagementId] = await snapshotRisk(organizationId, impact.engagementId);
    }
    return {
        ...presentSignal(signal),
        what: signal.title,
        why: signal.normalizationExplanation,
        source: `${signal.sourceProvider} · ${signal.sourceType}`,
        state: signal.status,
        owner: signal.reviewOwnerUserId || 'Unassigned',
        impact: signal.impacts.map((row) => `${row.engagement.serviceName}: ${row.decision}`).join(' · ') || 'Not yet reviewed',
        evidence: signal.relatedEvidenceRef || (signal.evidenceLinks.length ? `${signal.evidenceLinks.length} linked evidence record(s)` : 'Not recorded'),
        relationships: { thirdParty: signal.vendor, engagements: signal.impacts.map((row) => row.engagement), findingId: signal.relatedFindingId },
        nextAction: nextSignalAction(signal),
        residualUnchanged: residualByEngagement,
        wave7Started: false,
    };
}

export async function assignSignal(organizationId: string, actor: Actor, signalId: string, ownerUserId: string) {
    assertPractitioner(actor);
    if (!canTriage(actor)) throw new ApiError(403, 'You do not have permission to assign this monitoring signal.');
    if (!ownerUserId) throw new ApiError(400, 'Choose a reviewer before assigning the signal.');
    const signal = await requireSignal(organizationId, signalId);
    const updated = await prisma.engagementMonitoringSignal.update({
        where: { id: signal.id },
        data: { reviewOwnerUserId: ownerUserId, status: MonitoringSignalStatus.ASSIGNED },
        include: { impacts: true },
    });
    await audit(organizationId, actor.id, 'monitoring.signal.assigned', 'EngagementMonitoringSignal', signal.id, { ownerUserId });
    await notify(organizationId, ownerUserId, 'monitoring.signal.assigned', 'Monitoring signal assigned', `${signal.publicId} is assigned for review.`, signal.id);
    return presentSignal(updated);
}

export async function setImpact(organizationId: string, actor: Actor, signalId: string, body: any) {
    assertPractitioner(actor);
    if (!canTriage(actor)) throw new ApiError(403, 'You do not have permission to record Engagement relevance.');
    const signal = await requireSignal(organizationId, signalId);
    if (!body.engagementId || !body.decision) throw new ApiError(400, 'Mark each Engagement as Affected, Not affected, or Needs review.');
    if (!Object.values(MonitoringImpactDecision).includes(body.decision)) throw new ApiError(400, 'Use Affected, Not affected, or Needs review.');
    await loadEngagement(organizationId, body.engagementId);
    const impact = await prisma.monitoringSignalEngagementImpact.upsert({
        where: { signalId_engagementId: { signalId, engagementId: body.engagementId } },
        update: { decision: body.decision, rationale: body.rationale || null, decidedByUserId: actor.id, decidedAt: new Date() },
        create: { organizationId, signalId, engagementId: body.engagementId, decision: body.decision, rationale: body.rationale || null, decidedByUserId: actor.id, decidedAt: new Date() },
    });
    return { impact, signal: await getSignalDetail(organizationId, actor, signal.id) };
}

export async function triageSignal(organizationId: string, actor: Actor, signalId: string, body: any) {
    assertPractitioner(actor);
    if (!canTriage(actor)) throw new ApiError(403, 'You do not have permission to triage this monitoring signal.');
    const signal = await requireSignal(organizationId, signalId);
    if (!body.decision || !body.rationale) throw new ApiError(400, 'Record a triage decision and rationale.');
    if (!Object.values(MonitoringTriageOutcome).includes(body.decision)) throw new ApiError(400, 'Choose a supported triage outcome.');
    const status = body.decision === MonitoringTriageOutcome.NOT_RELEVANT
        ? MonitoringSignalStatus.CLOSED
        : body.decision === MonitoringTriageOutcome.MONITOR
            ? MonitoringSignalStatus.WATCHING
            : body.decision === MonitoringTriageOutcome.ESCALATE
                ? MonitoringSignalStatus.ESCALATED
                : MonitoringSignalStatus.NEEDS_REVIEW;
    await prisma.monitoringReview.create({
        data: {
            organizationId,
            signalId,
            reviewerUserId: actor.id,
            decision: body.decision,
            rationale: body.rationale,
            engagementId: body.engagementId || signal.originatingEngagementId,
            materiality: body.materiality || null,
            nextAction: body.nextAction || nextSignalAction({ ...signal, triageOutcome: body.decision, status }),
        },
    });
    const updated = await prisma.engagementMonitoringSignal.update({
        where: { id: signalId },
        data: {
            triageOutcome: body.decision,
            materiality: body.materiality || null,
            materialityRationale: body.materialityRationale || body.rationale,
            status,
            reviewOwnerUserId: signal.reviewOwnerUserId || actor.id,
        },
        include: { impacts: true, reviews: true },
    });
    await audit(organizationId, actor.id, 'monitoring.signal.triaged', 'EngagementMonitoringSignal', signalId, { decision: body.decision });
    return presentSignal(updated);
}

export async function escalateSignal(organizationId: string, actor: Actor, signalId: string, body: any) {
    assertPractitioner(actor);
    if (!canEscalate(actor)) throw new ApiError(403, 'You do not have permission to escalate this monitoring signal.');
    const signal = await requireSignal(organizationId, signalId);
    if (!body.toUserId || !body.reason) throw new ApiError(400, 'Escalation needs an owner and a reason. Escalation does not change residual risk.');
    const escalation = await prisma.monitoringEscalation.create({
        data: {
            organizationId,
            signalId,
            engagementId: body.engagementId || signal.originatingEngagementId,
            fromUserId: actor.id,
            toUserId: body.toUserId,
            reason: body.reason,
            priority: body.priority || signal.attentionPriority,
            dueAt: body.dueAt ? new Date(body.dueAt) : null,
        },
    });
    const updated = await prisma.engagementMonitoringSignal.update({
        where: { id: signalId },
        data: { status: MonitoringSignalStatus.ESCALATED, reviewOwnerUserId: body.toUserId },
        include: { impacts: true, escalations: true },
    });
    await audit(organizationId, actor.id, 'monitoring.signal.escalated', 'EngagementMonitoringSignal', signalId, { toUserId: body.toUserId });
    await notify(organizationId, body.toUserId, 'monitoring.signal.escalated', 'Monitoring signal escalated', `${signal.publicId} was escalated and needs review.`, signal.id);
    return { escalation, signal: presentSignal(updated) };
}

export async function closeSignal(organizationId: string, actor: Actor, signalId: string, rationale: string) {
    assertPractitioner(actor);
    if (!canTriage(actor)) throw new ApiError(403, 'You do not have permission to close this monitoring signal.');
    if (!rationale) throw new ApiError(400, 'Record why this signal needs no further action.');
    const signal = await requireSignal(organizationId, signalId);
    await prisma.monitoringReview.create({
        data: { organizationId, signalId, reviewerUserId: actor.id, decision: MonitoringTriageOutcome.NOT_RELEVANT, rationale, nextAction: 'No action required' },
    });
    const updated = await prisma.engagementMonitoringSignal.update({
        where: { id: signalId },
        data: { status: MonitoringSignalStatus.CLOSED, triageOutcome: signal.triageOutcome || MonitoringTriageOutcome.NOT_RELEVANT },
        include: { impacts: true },
    });
    await audit(organizationId, actor.id, 'monitoring.signal.closed', 'EngagementMonitoringSignal', signalId, { rationale });
    return presentSignal(updated);
}

export async function createFindingFromSignal(organizationId: string, actor: Actor, signalId: string, body: any) {
    assertPractitioner(actor);
    if (!hasPermission(actor.role, PERMISSIONS['finding.create'])) throw new ApiError(403, 'You do not have permission to create a Finding from this signal.');
    const signal = await requireSignal(organizationId, signalId);
    if (!signal.triageOutcome) throw new ApiError(409, 'Review and triage the signal before creating a Finding. A signal alone is not a Finding.');
    const engagementId = body.engagementId || signal.originatingEngagementId || signal.impacts.find((row: any) => row.decision === 'AFFECTED')?.engagementId;
    if (!engagementId) throw new ApiError(400, 'Choose the affected Engagement before creating a Finding.');
    const before = await snapshotRisk(organizationId, engagementId);
    const finding = await prisma.vendorIssue.create({
        data: {
            organizationId,
            vendorId: signal.vendorId,
            engagementId,
            title: body.title || signal.title,
            description: body.description || `${signal.summary}\n\nSource signal ${signal.publicId}. Signal is not residual risk.`,
            issueType: VendorIssueType.CONTROL_FAILURE,
            severity: body.severity || IssueSeverity.MEDIUM,
            priority: IssuePriority.MEDIUM,
            source: IssueSource.CONTINUOUS_MONITORING,
            identifiedBy: actor.id,
            category: signal.domain,
            reviewState: 'CONFIRMED',
            status: VendorIssueStatus.OPEN,
            determinationNote: body.rationale || 'Created from a reviewed monitoring signal.',
        },
    });
    await prisma.engagementMonitoringSignal.update({ where: { id: signalId }, data: { relatedFindingId: finding.id } });
    const findingNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.FINDING, sourceModel: 'VendorIssue', sourceId: finding.id, displayLabel: finding.title, actorUserId: actor.id });
    const signalNode = await ensureNode({ organizationId, nodeType: GovernanceNodeType.MONITORING_SIGNAL, sourceModel: 'EngagementMonitoringSignal', sourceId: signalId, displayLabel: signal.title, actorUserId: actor.id });
    await createRelationship({ organizationId, fromNodeId: signalNode.node.id, toNodeId: findingNode.node.id, relationshipType: GovernanceRelationshipType.SUPPORTED_BY, createdBy: actor.id });
    await audit(organizationId, actor.id, 'monitoring.finding.created_from_signal', 'VendorIssue', finding.id, { signalId, engagementId });
    const after = await snapshotRisk(organizationId, engagementId);
    return {
        finding: { id: finding.id, title: finding.title, status: finding.status, sourceSignalId: signalId },
        residualBefore: before.residual,
        residualAfter: after.residual,
        controlsBefore: before.controls,
        controlsAfter: after.controls,
        engagementStatus: after.engagementStatus,
        honesty: 'A Finding was created through explicit handoff. Residual risk and Control Effectiveness were not recalculated.',
    };
}

export async function recommendReassessment(organizationId: string, actor: Actor, signalId: string, body: any) {
    assertPractitioner(actor);
    if (!canTriage(actor)) throw new ApiError(403, 'You do not have permission to recommend reassessment.');
    const signal = await requireSignal(organizationId, signalId);
    const engagementId = body.engagementId || signal.originatingEngagementId || signal.impacts.find((row: any) => row.decision === 'AFFECTED')?.engagementId;
    if (!engagementId) throw new ApiError(400, 'Choose the Engagement this reassessment recommendation belongs to.');
    if (!body.reason || !body.recommendedScope) throw new ApiError(400, 'Record why reassessment is recommended and the suggested scope. Wave 7 will consume this handoff.');
    const recommendation = await prisma.reassessmentRecommendation.create({
        data: {
            organizationId,
            engagementId,
            signalId,
            reason: body.reason,
            recommendedScope: body.recommendedScope,
            urgency: body.urgency || 'NORMAL',
            triggerType: body.triggerType || ReassessmentTriggerType.MATERIAL_SECURITY_INCIDENT,
            requestedByUserId: actor.id,
            status: ReassessmentRecommendationStatus.RECOMMENDED,
            wave7Started: false,
        },
    });
    await prisma.engagementMonitoringSignal.update({
        where: { id: signalId },
        data: { triageOutcome: MonitoringTriageOutcome.REASSESSMENT_RECOMMENDED, relatedRecommendationId: recommendation.id },
    });
    await audit(organizationId, actor.id, 'monitoring.reassessment_recommended', 'ReassessmentRecommendation', recommendation.id, { signalId, engagementId, wave7Started: false });
    const owner = (await prisma.engagement.findUnique({ where: { id: engagementId } }))?.assignedAnalystUserId;
    await notify(organizationId, owner, 'monitoring.reassessment_recommended', 'Reassessment recommended', `${signal.publicId} recommends reassessment. Wave 7 has not started.`, recommendation.id);
    const ira = await prisma.engagementIra.count({ where: { engagementId, submittedAt: { gt: recommendation.createdAt } } });
    return {
        recommendation: { ...recommendation, wave7Started: false },
        wave7Started: false,
        newIraCreated: ira > 0,
        honesty: 'Reassessment recommended / due. Reassessment has not started.',
    };
}

export async function portfolioMonitoring(organizationId: string, actor: Actor) {
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You do not have permission to read monitoring.');
    const [profiles, signals, recommendations, health, legacy] = await Promise.all([
        prisma.engagementMonitoringProfile.findMany({ where: { organizationId, status: EngagementMonitoringProfileStatus.ACTIVE } }),
        prisma.engagementMonitoringSignal.findMany({
            where: { organizationId, status: { in: [...OPEN_SIGNAL] } },
            include: { vendor: { select: { name: true, publicId: true } }, impacts: { include: { engagement: { select: { id: true, publicId: true, serviceName: true } } } } },
            orderBy: { receivedAt: 'desc' },
            take: 50,
        }),
        prisma.reassessmentRecommendation.findMany({ where: { organizationId, status: { not: ReassessmentRecommendationStatus.WITHDRAWN } } }),
        sourceHealth(organizationId),
        prisma.vendorMonitoring.count({ where: { organizationId } }),
    ]);
    return {
        activeMonitoredEngagements: profiles.length,
        signalsNeedingReview: signals.filter((row) => row.status !== MonitoringSignalStatus.WATCHING).length,
        highPrioritySignals: signals.filter((row) => row.attentionPriority === 'HIGH' || row.attentionPriority === 'CRITICAL').length,
        overdueReviews: signals.filter((row) => presentSignal(row).overdue).length,
        reassessmentRecommendations: recommendations.length,
        coverage: 'Not calculated',
        sourceHealth: health,
        signals: signals.map(presentSignal),
        legacyVendorMonitoringCount: legacy,
        honesty: 'Coverage is not calculated. Supreme is not claiming 100% continuous monitoring.',
    };
}

async function requireSignal(organizationId: string, signalId: string) {
    const signal = await prisma.engagementMonitoringSignal.findFirst({ where: { organizationId, id: signalId }, include: { impacts: true } });
    if (!signal) throw new ApiError(404, 'Monitoring signal not found.');
    return signal;
}

async function notify(organizationId: string, userId: string | null | undefined, eventType: NotificationEvent, title: string, body: string, resourceId: string) {
    if (!userId) return;
    await notifyUser({ organizationId, userId, eventType, title, body, resourceType: 'EngagementMonitoringSignal', resourceId });
}

export async function monitoringExtras(organizationId: string, engagementId: string) {
    const profile = await prisma.engagementMonitoringProfile.findUnique({ where: { engagementId }, select: { status: true } });
    const signals = await prisma.engagementMonitoringSignal.findMany({
        where: { organizationId, OR: [{ originatingEngagementId: engagementId }, { impacts: { some: { engagementId } } }] },
        select: { status: true, attentionPriority: true },
    });
    const recommended = await prisma.reassessmentRecommendation.count({
        where: { organizationId, engagementId, status: { not: ReassessmentRecommendationStatus.WITHDRAWN } },
    });
    return {
        monitoringProfileStatus: profile?.status || null,
        openMonitoringSignals: signals.filter((row) => OPEN_SIGNAL.has(row.status)).length,
        highPrioritySignals: signals.filter((row) => OPEN_SIGNAL.has(row.status) && (row.attentionPriority === 'HIGH' || row.attentionPriority === 'CRITICAL')).length,
        reassessmentRecommended: recommended > 0,
        openSignals: signals.filter((row) => OPEN_SIGNAL.has(row.status)).length,
        lastReview: (await prisma.engagementMonitoringProfile.findUnique({ where: { engagementId }, select: { lastReviewedAt: true, nextReviewAt: true } })),
    };
}
