import { IntelligenceLifecycle, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { recordAudit } from './auditEventService';
import { ApiError } from '../middleware/errorHandler';
import { impact as graphImpact } from './governanceGraphService';
import { aiStatus, runAi, sanitizeAiContext } from '../ai/aiProvider';
import { permissionsForRole } from '../security/rbac';
import {
    INTELLIGENCE_RULE_VERSION,
    collectCandidates,
    filterForRole,
    honestyCopy,
    humanizePriority,
    periodComparison,
    type IntelligenceCandidate,
    type IntelligenceSnapshot,
} from './enterpriseIntelligenceEngine';

const BOUND = 400;

function hrefForTarget(type: string, id: string, label: string) {
    if (type === 'CONTROL') return { type: 'Control', id, label, href: '/control-center' };
    if (type === 'REQUIREMENT') return { type: 'Requirement', id, label, href: '/compliance' };
    if (type === 'VENDOR') return { type: 'Vendor', id, label, href: `/vendor-management/${id}` };
    if (type === 'FINDING') return { type: 'Finding', id, label, href: '/findings' };
    if (type === 'RISK') return { type: 'Risk', id, label, href: `/risks/${label}` };
    return { type: type.toLowerCase(), id, label, href: '/documents' };
}

async function nextPublicId(organizationId: string) {
    const row = await prisma.intelligenceCounter.upsert({
        where: { organizationId_kind: { organizationId, kind: 'INT' } },
        create: { organizationId, kind: 'INT', next: 1 },
        update: { next: { increment: 1 } },
    });
    return `INT-${String(row.next).padStart(5, '0')}`;
}

async function history(organizationId: string, itemId: string, eventType: string, summary: string, actorUserId?: string, payload?: Prisma.InputJsonValue) {
    await prisma.intelligenceHistory.create({
        data: { organizationId, itemId, eventType, summary, actorUserId, payload },
    });
}

async function emitIntelligenceCriticalAttention(input: {
    organizationId: string;
    actorUserId?: string;
    item: { id: string; publicId: string; priority: string; current: boolean; domain: string; ruleId: string; lifecycle: string };
    prior: { current: boolean; priority: string } | null;
}) {
    if (input.item.priority !== 'CRITICAL_ATTENTION' || !input.item.current) return;
    if (input.prior?.current && input.prior.priority === 'CRITICAL_ATTENTION') return;
    const { emitSupremeAutomationEvent } = await import('./supremeAutomationBus');
    await emitSupremeAutomationEvent({
        organizationId: input.organizationId,
        event: 'intelligence.critical_attention',
        sourceModel: 'IntelligenceItem',
        sourceId: input.item.id,
        sourcePublicId: input.item.publicId,
        actorUserId: input.actorUserId,
        priority: input.item.priority,
        domain: input.item.domain,
        ruleId: input.item.ruleId,
        lifecycle: input.item.lifecycle,
        current: true,
    });
}

async function buildSnapshot(organizationId: string): Promise<IntelligenceSnapshot> {
    const now = new Date();
    const [
        vendors,
        findings,
        risks,
        acceptances,
        controlTests,
        links,
        gaps,
        rights,
        transfers,
        dpias,
        aiSystems,
        approvals,
        aiTests,
        aiChanges,
        decisions,
    ] = await Promise.all([
        prisma.vendor.findMany({
            where: { organizationId },
            select: { id: true, publicId: true, name: true, tier: true, nextReviewDate: true, businessOwnerUserId: true, updatedAt: true },
            take: BOUND,
        }),
        prisma.vendorIssue.findMany({
            where: { organizationId },
            select: {
                id: true, title: true, severity: true, status: true, vendorId: true, identifiedDate: true, closedAt: true,
                assignedTo: true, targetRemediationDate: true,
                vendor: { select: { name: true, tier: true } },
            },
            take: BOUND,
            orderBy: { identifiedDate: 'desc' },
        }),
        prisma.enterpriseRisk.findMany({
            where: { organizationId, archivedAt: null },
            select: { id: true, publicId: true, title: true, residualRating: true, appetiteStatus: true, status: true, ownerUserId: true, reviewDate: true, updatedAt: true },
            take: BOUND,
        }),
        prisma.enterpriseRiskDecision.findMany({
            where: { organizationId, decision: 'ACCEPT' },
            select: { id: true, riskId: true, expiresAt: true, status: true, createdAt: true, risk: { select: { publicId: true, title: true, residualRating: true } } },
            take: BOUND,
        }),
        prisma.organizationControlTest.findMany({
            where: { organizationId },
            select: { id: true, controlId: true, result: true, testedAt: true, testerUserId: true, control: { select: { controlKey: true, title: true } } },
            take: BOUND,
            orderBy: { testedAt: 'desc' },
        }),
        prisma.evidenceGovernanceLink.findMany({
            where: { organizationId, validTo: null },
            select: {
                storedObjectId: true, targetType: true, targetId: true, freshness: true, expiresAt: true, validTo: true,
                storedObject: { select: { filename: true, scanStatus: true, uploadedAt: true } },
            },
            take: BOUND,
        }),
        prisma.complianceGap.findMany({
            where: { organizationId },
            select: { id: true, publicId: true, title: true, status: true, ownerUserId: true, dueDate: true, updatedAt: true, control: { select: { controlKey: true } } },
            take: BOUND,
        }),
        prisma.privacyRightsRequest.findMany({
            where: { organizationId },
            select: { id: true, publicId: true, requestType: true, status: true, dueAt: true, ownerUserId: true, updatedAt: true },
            take: BOUND,
        }),
        prisma.privacyTransfer.findMany({
            where: { organizationId },
            select: { id: true, publicId: true, status: true, destinationJurisdiction: true, ownerUserId: true, updatedAt: true },
            take: BOUND,
        }),
        prisma.privacyDpia.findMany({
            where: { organizationId },
            select: { id: true, publicId: true, title: true, status: true, ownerUserId: true, updatedAt: true },
            take: BOUND,
        }),
        prisma.aiSystem.findMany({
            where: { organizationId },
            select: { id: true, publicId: true, name: true, lifecycle: true, updatedAt: true },
            take: BOUND,
        }),
        prisma.aiApproval.findMany({
            where: { organizationId, decision: { in: ['APPROVED', 'APPROVED_WITH_CONDITIONS'] } },
            select: { systemId: true, reviewAt: true },
            take: BOUND,
        }),
        prisma.aiTest.findMany({
            where: { organizationId },
            select: { id: true, publicId: true, kind: true, result: true, testedAt: true, createdAt: true, system: { select: { publicId: true } } },
            take: BOUND,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.aiChange.findMany({
            where: { organizationId },
            select: { id: true, changeType: true, summary: true, createdAt: true, system: { select: { publicId: true, name: true } } },
            take: BOUND,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.riskDecisionBrief.findMany({
            where: { organizationId, status: 'DRAFT' },
            select: { id: true, engagementName: true, status: true, vendorId: true, updatedAt: true },
            take: BOUND,
        }),
    ]);

    const currentApprovals = new Set(
        approvals.filter((row) => !row.reviewAt || row.reviewAt > now).map((row) => row.systemId)
    );

    const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
    const controlById = new Map(controlTests.map((test) => [test.controlId, test.control]));

    return {
        now,
        vendors,
        findings: findings.map((row) => ({
            id: row.id,
            title: row.title,
            severity: row.severity,
            status: row.status,
            vendorId: row.vendorId,
            vendorName: row.vendor.name,
            vendorTier: row.vendor.tier,
            identifiedDate: row.identifiedDate,
            closedAt: row.closedAt,
            assignedTo: row.assignedTo,
            targetRemediationDate: row.targetRemediationDate,
        })),
        risks,
        acceptances: acceptances.map((row) => ({
            id: row.id,
            riskId: row.riskId,
            riskPublicId: row.risk.publicId,
            riskTitle: row.risk.title,
            residualRating: row.risk.residualRating,
            expiresAt: row.expiresAt,
            status: row.status,
            createdAt: row.createdAt,
        })),
        controlTests: controlTests.map((row) => ({
            id: row.id,
            controlId: row.controlId,
            controlKey: row.control.controlKey,
            controlTitle: row.control.title,
            result: row.result,
            testedAt: row.testedAt,
            testerUserId: row.testerUserId,
        })),
        evidence: links.map((row) => {
            const vendor = row.targetType === 'VENDOR' ? vendorById.get(row.targetId) : undefined;
            const control = row.targetType === 'CONTROL' ? controlById.get(row.targetId) : undefined;
            return {
                storedObjectId: row.storedObjectId,
                filename: row.storedObject.filename,
                scanStatus: row.storedObject.scanStatus,
                freshness: row.freshness,
                expiresAt: row.expiresAt,
                validTo: row.validTo,
                updatedAt: row.storedObject.uploadedAt,
                vendorId: vendor?.id,
                vendorName: vendor?.name,
                vendorTier: vendor?.tier,
                controlId: control ? row.targetId : undefined,
                controlKey: control?.controlKey,
                targets: [hrefForTarget(row.targetType, row.targetId, control?.controlKey || vendor?.name || row.targetId)],
            };
        }),
        gaps: gaps.map((row) => ({
            id: row.id,
            publicId: row.publicId,
            title: row.title,
            status: row.status,
            ownerUserId: row.ownerUserId,
            dueDate: row.dueDate,
            updatedAt: row.updatedAt,
            controlKey: row.control?.controlKey,
        })),
        rights,
        transfers,
        dpias,
        aiSystems: aiSystems.map((row) => ({
            ...row,
            ownerUserId: undefined,
            hasCurrentApproval: currentApprovals.has(row.id),
        })),
        aiTests: aiTests.map((row) => ({
            id: row.id,
            publicId: row.publicId,
            kind: row.kind,
            result: row.result,
            testedAt: row.testedAt || row.createdAt,
            systemPublicId: row.system?.publicId,
        })),
        aiChanges: aiChanges.map((row) => ({
            id: row.id,
            systemPublicId: row.system.publicId,
            systemName: row.system.name,
            changeType: row.changeType,
            summary: row.summary,
            createdAt: row.createdAt,
        })),
        decisions: decisions.map((row) => ({
            id: row.id,
            title: row.engagementName || 'Vendor decision',
            status: row.status,
            vendorId: row.vendorId,
            vendorName: vendorById.get(row.vendorId)?.name,
            updatedAt: row.updatedAt,
        })),
    };
}

function publicItem(row: {
    publicId: string;
    groupingKey: string;
    ruleId: string;
    ruleVersion: string;
    domain: string;
    changeType: string;
    priority: string;
    polarity: string;
    lifecycle: string;
    title: string;
    summary: string;
    whyItMatters: string;
    reviewGuidance: string;
    ownerLabel?: string | null;
    sourceProduct: string;
    sourceModel: string;
    sourceId: string;
    sourcePublicId?: string | null;
    sourceTimestamp: Date;
    generatedAt: Date;
    resolvedAt?: Date | null;
    fingerprint: string;
    facts: Prisma.JsonValue;
    affected: Prisma.JsonValue;
    links: Prisma.JsonValue;
    current: boolean;
}) {
    return {
        publicId: row.publicId,
        groupingKey: row.groupingKey,
        ruleId: row.ruleId,
        ruleVersion: row.ruleVersion,
        domain: row.domain,
        changeType: row.changeType,
        priority: row.priority,
        priorityLabel: humanizePriority(row.priority),
        polarity: row.polarity,
        lifecycle: row.lifecycle,
        title: row.title,
        summary: row.summary,
        whatHappened: row.summary,
        whyItMatters: row.whyItMatters,
        reviewGuidance: row.reviewGuidance,
        ownerLabel: row.ownerLabel,
        sourceProduct: row.sourceProduct,
        sourceModel: row.sourceModel,
        sourceId: row.sourceId,
        sourcePublicId: row.sourcePublicId,
        sourceTimestamp: row.sourceTimestamp,
        generatedAt: row.generatedAt,
        resolvedAt: row.resolvedAt,
        fingerprint: row.fingerprint,
        facts: row.facts,
        affected: row.affected,
        links: row.links,
        current: row.current,
        authority: {
            facts: 'FACT',
            explanation: 'DERIVED INTELLIGENCE',
            narrative: 'AI-GENERATED NARRATIVE',
        },
        href: `/intelligence/${row.publicId}`,
    };
}

async function persist(organizationId: string, candidates: IntelligenceCandidate[], actorUserId?: string) {
    const existing = await prisma.intelligenceItem.findMany({
        where: { organizationId },
    });
    const byKey = new Map(existing.map((row) => [`${row.groupingKey}::${row.ruleId}`, row]));
    const seen = new Set<string>();

    for (const candidate of candidates) {
        const key = `${candidate.groupingKey}::${candidate.ruleId}`;
        seen.add(key);
        const prior = byKey.get(key);
        if (!prior) {
            const publicId = await nextPublicId(organizationId);
            const created = await prisma.intelligenceItem.create({
                data: {
                    organizationId,
                    publicId,
                    groupingKey: candidate.groupingKey,
                    ruleId: candidate.ruleId,
                    ruleVersion: candidate.ruleVersion,
                    domain: candidate.domain,
                    changeType: candidate.changeType,
                    priority: candidate.priority,
                    polarity: candidate.polarity,
                    lifecycle: 'NEW',
                    title: candidate.title,
                    summary: candidate.summary,
                    whyItMatters: candidate.whyItMatters,
                    reviewGuidance: candidate.reviewGuidance,
                    ownerLabel: candidate.ownerLabel,
                    ownerUserId: candidate.ownerUserId,
                    sourceProduct: candidate.sourceProduct,
                    sourceModel: candidate.sourceModel,
                    sourceId: candidate.sourceId,
                    sourcePublicId: candidate.sourcePublicId,
                    sourceTimestamp: candidate.sourceTimestamp,
                    fingerprint: candidate.fingerprint,
                    facts: candidate.facts as Prisma.InputJsonValue,
                    affected: candidate.affected as Prisma.InputJsonValue,
                    links: candidate.links as Prisma.InputJsonValue,
                    roleAudience: candidate.roleAudience,
                    requiredPermissions: candidate.requiredPermissions,
                    current: true,
                },
            });
            await history(organizationId, created.id, 'generated', `${created.publicId} generated from ${candidate.ruleId} ${candidate.ruleVersion}`, actorUserId, {
                ruleId: candidate.ruleId,
                ruleVersion: candidate.ruleVersion,
                sourceModel: candidate.sourceModel,
                sourceId: candidate.sourceId,
            });
            await recordAudit({
                organizationId,
                actorUserId,
                action: 'intelligence.generated',
                resourceType: 'IntelligenceItem',
                resourceId: created.id,
                result: 'success',
                metadata: { publicId: created.publicId, ruleId: candidate.ruleId, ruleVersion: candidate.ruleVersion },
            });
            await emitIntelligenceCriticalAttention({
                organizationId,
                item: created,
                actorUserId,
                prior: null,
            });
            continue;
        }
        if (prior.fingerprint !== candidate.fingerprint || !prior.current) {
            const updated = await prisma.intelligenceItem.update({
                where: { id: prior.id },
                data: {
                    title: candidate.title,
                    summary: candidate.summary,
                    whyItMatters: candidate.whyItMatters,
                    reviewGuidance: candidate.reviewGuidance,
                    ownerLabel: candidate.ownerLabel,
                    ownerUserId: candidate.ownerUserId,
                    sourceTimestamp: candidate.sourceTimestamp,
                    fingerprint: candidate.fingerprint,
                    facts: candidate.facts as Prisma.InputJsonValue,
                    affected: candidate.affected as Prisma.InputJsonValue,
                    links: candidate.links as Prisma.InputJsonValue,
                    priority: candidate.priority,
                    polarity: candidate.polarity,
                    changeType: candidate.changeType,
                    current: true,
                    resolvedAt: null,
                    lifecycle: prior.current ? prior.lifecycle : 'NEW',
                },
            });
            await history(organizationId, prior.id, prior.current ? 'updated' : 'reopened', `${prior.publicId} reconciled from source change`, actorUserId, {
                ruleVersion: candidate.ruleVersion,
                fingerprint: candidate.fingerprint,
            });
            await emitIntelligenceCriticalAttention({
                organizationId,
                item: updated,
                actorUserId,
                prior,
            });
        }
    }

    for (const prior of existing) {
        const key = `${prior.groupingKey}::${prior.ruleId}`;
        if (seen.has(key) || !prior.current) continue;
        await prisma.intelligenceItem.update({
            where: { id: prior.id },
            data: { current: false, lifecycle: 'RESOLVED_BY_SOURCE', resolvedAt: new Date() },
        });
        await history(organizationId, prior.id, 'resolved', `${prior.publicId} resolved because the authoritative condition changed`, actorUserId);
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'intelligence.resolved',
            resourceType: 'IntelligenceItem',
            resourceId: prior.id,
            result: 'success',
            metadata: { publicId: prior.publicId, ruleId: prior.ruleId },
        });
    }
}

function visibleRows<T extends { requiredPermissions: string[]; roleAudience: string[]; ownerUserId?: string | null; polarity: string; priority: string; domain: string }>(
    rows: T[],
    role: string,
    actorUserId?: string
): T[] {
    const permissions = permissionsForRole(role);
    const candidates = rows.map((row) => ({
        ...row,
        ownerUserId: row.ownerUserId || undefined,
        requiredPermissions: row.requiredPermissions,
        roleAudience: row.roleAudience,
        priority: row.priority as IntelligenceCandidate['priority'],
        domain: row.domain as IntelligenceCandidate['domain'],
        groupingKey: 'x',
        ruleId: 'x',
        ruleVersion: INTELLIGENCE_RULE_VERSION,
        changeType: 'x',
        polarity: row.polarity as 'NEGATIVE' | 'POSITIVE',
        title: '',
        summary: '',
        whyItMatters: '',
        reviewGuidance: '',
        sourceProduct: '',
        sourceModel: '',
        sourceId: '',
        sourceTimestamp: new Date(),
        facts: [],
        affected: { counts: {}, objects: [] },
        links: [],
        fingerprint: '',
    }));
    const allowed = new Set(filterForRole(candidates as IntelligenceCandidate[], role, permissions, actorUserId).map((_, index) => index));
    return rows.filter((_, index) => allowed.has(index));
}

export const enterpriseIntelligenceService = {
    catalog() {
        return {
            honesty: honestyCopy(),
            ruleVersion: INTELLIGENCE_RULE_VERSION,
            externalIntelligence: { status: 'NOT_CONFIGURED', message: 'External intelligence not configured' },
            aiNarrative: aiStatus(),
            priorities: ['CRITICAL_ATTENTION', 'HIGH_ATTENTION', 'REVIEW', 'POSITIVE'],
            domains: ['THIRD_PARTY', 'RISK', 'CONTROL', 'EVIDENCE', 'COMPLIANCE', 'PRIVACY', 'AI_GOVERNANCE', 'DECISION', 'CROSS_PLATFORM'],
        };
    },

    async generate(organizationId: string, actorUserId?: string) {
        const started = Date.now();
        const snapshot = await buildSnapshot(organizationId);
        const candidates = collectCandidates(snapshot);
        await persist(organizationId, candidates, actorUserId);
        return { generated: candidates.length, durationMs: Date.now() - started, ruleVersion: INTELLIGENCE_RULE_VERSION };
    },

    async workspace(organizationId: string, role: string, actorUserId?: string) {
        const generated = await this.generate(organizationId, actorUserId);
        const rows = await prisma.intelligenceItem.findMany({
            where: { organizationId },
            orderBy: [{ current: 'desc' }, { generatedAt: 'desc' }],
        });
        const visible = visibleRows(rows, role, actorUserId);
        const current = visible.filter((row) => row.current);
        const byPriority = (priority: string) => current.filter((row) => row.priority === priority).map(publicItem);
        const measures = await this.measures(organizationId);
        return {
            honesty: honestyCopy(),
            ruleVersion: INTELLIGENCE_RULE_VERSION,
            generated,
            externalIntelligence: { status: 'NOT_CONFIGURED', message: 'External intelligence not configured' },
            aiNarrative: aiStatus(),
            criticalAttention: byPriority('CRITICAL_ATTENTION'),
            highAttention: byPriority('HIGH_ATTENTION'),
            review: byPriority('REVIEW'),
            whatChanged: current.filter((row) => row.polarity === 'NEGATIVE').slice(0, 20).map(publicItem),
            positiveMovement: current.filter((row) => row.polarity === 'POSITIVE').map(publicItem),
            decisionsToWatch: current.filter((row) => row.domain === 'DECISION').map(publicItem),
            evidenceAndControl: current.filter((row) => row.domain === 'EVIDENCE' || row.domain === 'CONTROL').map(publicItem),
            crossPlatform: current.filter((row) => {
                const affected = row.affected as { counts?: Record<string, number> };
                return Object.keys(affected?.counts || {}).length >= 2;
            }).map(publicItem),
            executive: current.filter((row) => row.priority !== 'REVIEW' || row.domain === 'DECISION').slice(0, 12).map(publicItem),
            period: measures.period,
            teaser: current.filter((row) => row.priority === 'CRITICAL_ATTENTION' || row.priority === 'HIGH_ATTENTION').slice(0, 3).map(publicItem),
        };
    },

    async search(organizationId: string, role: string, query: {
        q?: string;
        priority?: string;
        domain?: string;
        status?: string;
        changeType?: string;
        current?: string;
        actorUserId?: string;
    }) {
        await this.generate(organizationId, query.actorUserId);
        const rows = await prisma.intelligenceItem.findMany({
            where: {
                organizationId,
                ...(query.priority ? { priority: query.priority as never } : {}),
                ...(query.domain ? { domain: query.domain as never } : {}),
                ...(query.status ? { lifecycle: query.status as IntelligenceLifecycle } : {}),
                ...(query.changeType ? { changeType: query.changeType } : {}),
                ...(query.current === 'false' ? {} : query.current === 'all' ? {} : { current: true }),
            },
            orderBy: [{ current: 'desc' }, { generatedAt: 'desc' }],
            take: 100,
        });
        const visible = visibleRows(rows, role, query.actorUserId);
        const needle = (query.q || '').trim().toLowerCase();
        return visible
            .filter((row) => !needle || `${row.title} ${row.summary} ${row.publicId} ${row.sourcePublicId || ''}`.toLowerCase().includes(needle))
            .map(publicItem);
    },

    async get(organizationId: string, publicId: string, role: string, actorUserId?: string) {
        const row = await prisma.intelligenceItem.findFirst({
            where: { organizationId, publicId },
        });
        if (!row) throw new ApiError(404, 'Intelligence item not found');
        const visible = visibleRows([row], role, actorUserId);
        if (!visible.length) throw new ApiError(404, 'Intelligence item not found');
        const timeline = await prisma.intelligenceHistory.findMany({
            where: { organizationId, itemId: row.id },
            orderBy: { createdAt: 'asc' },
            take: 50,
        });
        let graph: { relatedCounts?: Record<string, number>; truncated?: boolean } | null = null;
        const node = await prisma.governanceNode.findFirst({
            where: { organizationId, sourceModel: row.sourceModel, sourceId: row.sourceId },
        });
        if (node) {
            try {
                graph = await graphImpact(organizationId, node.id);
            } catch {
                graph = null;
            }
        }
        return {
            ...publicItem(row),
            timeline: timeline.map((event) => ({
                eventType: event.eventType,
                summary: event.summary,
                createdAt: event.createdAt,
            })),
            graph: graph ? {
                relatedCounts: graph.relatedCounts || {},
                truncated: Boolean(graph.truncated),
                human: Object.entries(graph.relatedCounts || {}).map(([type, count]) => ({ type, count })),
            } : { relatedCounts: {}, truncated: false, human: [], message: 'No recorded graph relationships for this source.' },
            nextReview: row.reviewGuidance,
        };
    },

    async acknowledge(organizationId: string, publicId: string, actorUserId: string, next: 'ACKNOWLEDGED' | 'UNDER_REVIEW' = 'ACKNOWLEDGED') {
        const row = await prisma.intelligenceItem.findFirst({ where: { organizationId, publicId } });
        if (!row) throw new ApiError(404, 'Intelligence item not found');
        if (!row.current) throw new ApiError(409, 'Historical intelligence cannot be acknowledged as current work.');
        const updated = await prisma.intelligenceItem.update({
            where: { id: row.id },
            data: { lifecycle: next },
        });
        await history(organizationId, row.id, next === 'UNDER_REVIEW' ? 'reviewed' : 'acknowledged', `${row.publicId} marked ${next.toLowerCase().replace(/_/g, ' ')}`, actorUserId);
        await recordAudit({
            organizationId,
            actorUserId,
            action: next === 'UNDER_REVIEW' ? 'intelligence.reviewed' : 'intelligence.acknowledged',
            resourceType: 'IntelligenceItem',
            resourceId: row.id,
            result: 'success',
            metadata: { publicId: row.publicId, lifecycle: next },
        });
        return publicItem(updated);
    },

    async narrative(organizationId: string, publicId: string, role: string, actorUserId?: string) {
        const item = await this.get(organizationId, publicId, role, actorUserId);
        const status = aiStatus();
        if (status.status === 'NOT_CONFIGURED') {
            return { status: 'NOT_CONFIGURED', authority: 'AI-GENERATED NARRATIVE', text: null, message: 'AI narrative is not configured. Deterministic intelligence remains available.' };
        }
        const context = sanitizeAiContext(JSON.stringify({
            title: item.title,
            facts: item.facts,
            whyItMatters: item.whyItMatters,
            instruction: 'Summarize only these recorded facts. Do not invent scores, findings, approvals, or legal conclusions.',
        }));
        const result = await runAi({ organizationId, feature: 'executive_summary', context });
        return {
            status: result.status,
            authority: 'AI-GENERATED NARRATIVE',
            text: result.text || null,
            provider: result.provider,
            message: result.status === 'SUCCESS' ? 'This narrative restates recorded facts. It is not a decision.' : 'AI narrative is unavailable. Deterministic intelligence remains available.',
        };
    },

    async measures(organizationId: string) {
        const now = new Date();
        const start = new Date(now.getTime() - 30 * 86400000);
        const priorStart = new Date(now.getTime() - 60 * 86400000);
        const [currentFindings, priorFindings, currentRisks, olderThanPrior] = await Promise.all([
            prisma.vendorIssue.count({ where: { organizationId, severity: { in: ['CRITICAL', 'HIGH'] }, identifiedDate: { gte: start } } }),
            prisma.vendorIssue.count({ where: { organizationId, severity: { in: ['CRITICAL', 'HIGH'] }, identifiedDate: { gte: priorStart, lt: start } } }),
            prisma.enterpriseRisk.count({ where: { organizationId, residualRating: { in: ['HIGH', 'CRITICAL'] }, appetiteStatus: 'OUTSIDE_APPETITE' } }),
            prisma.vendorIssue.count({ where: { organizationId, identifiedDate: { lt: start } } }),
        ]);
        const expiredEvidence = await prisma.evidenceGovernanceLink.count({ where: { organizationId, freshness: { in: ['EXPIRED', 'REVOKED'] }, validTo: null } });
        const openGaps = await prisma.complianceGap.count({ where: { organizationId, status: { in: ['OPEN', 'IN_PROGRESS', 'LINKED_FINDING'] } } });
        const current = {
            highCriticalFindingsOpened: currentFindings,
            outsideAppetiteRisks: currentRisks,
            expiredEvidence,
            openComplianceGaps: openGaps,
        };
        return {
            period: periodComparison({
                current,
                previous: { highCriticalFindingsOpened: priorFindings, outsideAppetiteRisks: currentRisks, expiredEvidence, openComplianceGaps: openGaps },
                previousEstablished: olderThanPrior > 0,
            }),
        };
    },

    async pack(organizationId: string, role: string, actorUserId?: string) {
        const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
        const workspace = await this.workspace(organizationId, role, actorUserId);
        return { name: organization?.name || 'Organization', workspace };
    },

    async teaser(organizationId: string, role: string, actorUserId?: string) {
        const rows = await prisma.intelligenceItem.findMany({
            where: {
                organizationId,
                current: true,
                priority: { in: ['CRITICAL_ATTENTION', 'HIGH_ATTENTION'] },
            },
            orderBy: { generatedAt: 'desc' },
            take: 20,
        });
        const visible = visibleRows(rows, role, actorUserId);
        return {
            honesty: honestyCopy(),
            items: visible.slice(0, 3).map(publicItem),
        };
    },
};

export { honestyCopy };
