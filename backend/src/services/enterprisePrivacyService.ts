import {
    GovernanceNodeType,
    GovernanceRelationshipType,
    Prisma,
    PrivacyActivityStatus,
    PrivacyBasisType,
    PrivacyConsentStatus,
    PrivacyDataKind,
    PrivacyDataSubjectKind,
    PrivacyDeletionStatus,
    PrivacyDpiaDecision,
    PrivacyReviewStatus,
    PrivacyRightsStatus,
    PrivacyRightsType,
    PrivacyRole,
    PrivacyTransferMechanism,
    PrivacyVendorRole,
    PrivacyVerificationStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { createRelationship, ensureNode } from './governanceGraphService';
import {
    configuredDeadline,
    daysBetween,
    DPIA_SCREENING,
    dpiaScreeningAdvice,
    humanPrivacyLabel,
    maskRequester,
    neutralizeSpreadsheetCell,
    nextPrivacyId,
    PRIVACY_HONESTY,
    PRIVACY_REGIMES,
    rankAttention,
    type PrivacyAttentionItem,
} from './enterprisePrivacyEngine';

const ACTIVITY_INCLUDE = {
    purposes: { include: { bases: true } },
    dataCategories: true,
    dataSubjects: true,
    parties: true,
    transfers: { include: { assessments: true } },
    dpias: { include: { screening: true } },
    rightsRequests: { select: { id: true, publicId: true, requestType: true, regime: true, status: true, dueAt: true, verificationStatus: true } },
    retentionRules: true,
    noticeVersions: true,
    incidentLinks: true,
    deletionTasks: true,
} satisfies Prisma.PrivacyProcessingActivityInclude;

async function nextIds(organizationId: string, kind: string, count = 1) {
    const row = await prisma.privacyCounter.upsert({
        where: { organizationId_kind: { organizationId, kind } },
        create: { organizationId, kind, next: 1 + count },
        update: { next: { increment: count } },
    });
    return Array.from({ length: count }, (_, index) => nextPrivacyId(kind, row.next - count + index));
}

async function nextId(organizationId: string, kind: string) {
    const [id] = await nextIds(organizationId, kind, 1);
    return id;
}

async function history(organizationId: string, entityType: string, entityId: string, eventType: string, summary: string, actorUserId?: string | null, change?: string | null, payload?: unknown) {
    await prisma.privacyHistory.create({
        data: {
            organizationId,
            entityType,
            entityId,
            eventType,
            summary,
            change: change || null,
            actorUserId: actorUserId || null,
            payload: payload as Prisma.InputJsonValue || undefined,
        },
    });
}

async function audit(input: { organizationId: string; actorUserId?: string | null; action: string; resourceType: string; resourceId?: string; metadata?: Record<string, unknown> }) {
    await recordAudit({ ...input, result: 'success' });
}

async function userNames(organizationId: string, ids: Array<string | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (!unique.length) return new Map<string, string>();
    const users = await prisma.user.findMany({
        where: { organizationId, id: { in: unique } },
        select: { id: true, firstName: true, lastName: true },
    });
    return new Map(users.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim() || 'Unassigned']));
}

function ownerLabel(map: Map<string, string>, userId?: string | null) {
    if (!userId) return 'Unassigned';
    return map.get(userId) || 'Unassigned';
}

async function activityOrThrow(organizationId: string, publicId: string) {
    const row = await prisma.privacyProcessingActivity.findFirst({
        where: { organizationId, OR: [{ publicId }, { id: publicId }] },
        include: ACTIVITY_INCLUDE,
    });
    if (!row) throw new ApiError(404, 'Processing activity not found');
    return row;
}

async function projectActivity(organizationId: string, activityId: string, actorUserId?: string | null) {
    const activity = await prisma.privacyProcessingActivity.findFirst({
        where: { organizationId, id: activityId },
        include: { dataCategories: true, dataSubjects: true, parties: true, transfers: true, dpias: true, rightsRequests: true, retentionRules: true },
    });
    if (!activity) return;
    const activityNode = await ensureNode({
        organizationId,
        nodeType: GovernanceNodeType.PROCESSING_ACTIVITY,
        sourceModel: 'PrivacyProcessingActivity',
        sourceId: activity.id,
        displayLabel: `${activity.publicId} ${activity.name}`,
        actorUserId,
    });
    for (const item of activity.dataCategories) {
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.DATA_CATEGORY,
            sourceModel: 'PrivacyActivityData',
            sourceId: item.id,
            displayLabel: item.label,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: activityNode.node.id,
            toNodeId: node.node.id,
            relationshipType: GovernanceRelationshipType.PROCESSES,
            createdBy: actorUserId,
        });
    }
    for (const item of activity.dataSubjects) {
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.DATA_SUBJECT_CATEGORY,
            sourceModel: 'PrivacyActivitySubject',
            sourceId: item.id,
            displayLabel: item.label,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: activityNode.node.id,
            toNodeId: node.node.id,
            relationshipType: GovernanceRelationshipType.CONCERNS,
            createdBy: actorUserId,
        });
    }
    for (const party of activity.parties) {
        if (party.vendorId) {
            const vendor = await prisma.vendor.findFirst({ where: { organizationId, id: party.vendorId }, select: { id: true, name: true } });
            if (!vendor) continue;
            const vendorNode = await ensureNode({
                organizationId,
                nodeType: GovernanceNodeType.VENDOR,
                sourceModel: 'Vendor',
                sourceId: vendor.id,
                displayLabel: vendor.name,
                actorUserId,
            });
            await createRelationship({
                organizationId,
                fromNodeId: activityNode.node.id,
                toNodeId: vendorNode.node.id,
                relationshipType: GovernanceRelationshipType.SHARES_WITH,
                createdBy: actorUserId,
            });
        } else if (party.systemName) {
            const systemNode = await ensureNode({
                organizationId,
                nodeType: GovernanceNodeType.SYSTEM,
                sourceModel: 'PrivacyActivityParty',
                sourceId: party.id,
                displayLabel: party.systemName,
                actorUserId,
            });
            await createRelationship({
                organizationId,
                fromNodeId: activityNode.node.id,
                toNodeId: systemNode.node.id,
                relationshipType: GovernanceRelationshipType.USES,
                createdBy: actorUserId,
            });
        }
    }
    for (const transfer of activity.transfers) {
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.TRANSFER,
            sourceModel: 'PrivacyTransfer',
            sourceId: transfer.id,
            displayLabel: transfer.publicId,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: activityNode.node.id,
            toNodeId: node.node.id,
            relationshipType: GovernanceRelationshipType.TRANSFERS_VIA,
            createdBy: actorUserId,
        });
    }
    for (const dpia of activity.dpias) {
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.DPIA,
            sourceModel: 'PrivacyDpia',
            sourceId: dpia.id,
            displayLabel: `${dpia.publicId} ${dpia.title}`,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: node.node.id,
            toNodeId: activityNode.node.id,
            relationshipType: GovernanceRelationshipType.ASSESSED_BY,
            createdBy: actorUserId,
        });
        if (dpia.enterpriseRiskId) {
            const risk = await prisma.enterpriseRisk.findFirst({ where: { organizationId, id: dpia.enterpriseRiskId } });
            if (risk) {
                const riskNode = await ensureNode({
                    organizationId,
                    nodeType: GovernanceNodeType.RISK,
                    sourceModel: 'EnterpriseRisk',
                    sourceId: risk.id,
                    displayLabel: `${risk.publicId} ${risk.title}`,
                    actorUserId,
                });
                await createRelationship({
                    organizationId,
                    fromNodeId: node.node.id,
                    toNodeId: riskNode.node.id,
                    relationshipType: GovernanceRelationshipType.ASSOCIATED_WITH,
                    createdBy: actorUserId,
                });
            }
        }
    }
    for (const request of activity.rightsRequests) {
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.RIGHTS_REQUEST,
            sourceModel: 'PrivacyRightsRequest',
            sourceId: request.id,
            displayLabel: request.publicId,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: node.node.id,
            toNodeId: activityNode.node.id,
            relationshipType: GovernanceRelationshipType.ASSOCIATED_WITH,
            createdBy: actorUserId,
        });
    }
    for (const rule of activity.retentionRules) {
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.RETENTION_RULE,
            sourceModel: 'PrivacyRetentionRule',
            sourceId: rule.id,
            displayLabel: rule.publicId,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: node.node.id,
            toNodeId: activityNode.node.id,
            relationshipType: GovernanceRelationshipType.COVERS,
            createdBy: actorUserId,
        });
    }
}

function presentActivity(row: Prisma.PrivacyProcessingActivityGetPayload<{ include: typeof ACTIVITY_INCLUDE }>, owners: Map<string, string>) {
    return {
        publicId: row.publicId,
        name: row.name,
        description: row.description,
        businessProcess: row.businessProcess,
        businessUnitId: row.businessUnitId,
        owner: ownerLabel(owners, row.ownerUserId),
        ownerUserId: row.ownerUserId,
        controllerRole: humanPrivacyLabel(row.controllerRole),
        status: humanPrivacyLabel(row.status),
        jurisdictions: row.jurisdictions,
        storageLocations: row.storageLocations,
        sourceOfData: row.sourceOfData,
        retentionSummary: row.retentionSummary,
        disposalMethod: row.disposalMethod,
        dpiaRequired: row.dpiaRequired,
        dpiaStatus: row.dpiaStatus ? humanPrivacyLabel(row.dpiaStatus) : 'Not assessed',
        riskLevel: row.riskLevel ? humanPrivacyLabel(row.riskLevel) : 'Not scored',
        effectiveFrom: row.effectiveFrom,
        effectiveTo: row.effectiveTo,
        reviewAt: row.reviewAt,
        purposes: row.purposes.map((purpose) => ({
            name: purpose.name,
            summary: purpose.summary,
            status: humanPrivacyLabel(purpose.status),
            noticeVersionId: purpose.noticeVersionId,
            bases: purpose.bases.map((basis) => ({
                basisType: humanPrivacyLabel(basis.basisType),
                rationale: basis.rationale,
                regime: basis.regime,
                owner: ownerLabel(owners, basis.ownerUserId),
                status: 'Recorded legal basis',
                honesty: 'This is a recorded organizational assertion, not a finding that processing is lawful.',
                effectiveFrom: basis.effectiveFrom,
                reviewAt: basis.reviewAt,
            })),
        })),
        dataCategories: row.dataCategories.map((item) => ({
            kind: humanPrivacyLabel(item.kind),
            label: item.label,
            sensitive: item.sensitive,
            honesty: item.sensitive ? 'Sensitivity is recorded metadata. It is not a legal conclusion.' : null,
        })),
        dataSubjects: row.dataSubjects.map((item) => ({ kind: humanPrivacyLabel(item.kind), label: item.label })),
        systems: row.parties.filter((item) => item.partyType === 'SYSTEM' || item.systemName).map((item) => ({
            name: item.systemName,
            jurisdiction: item.jurisdiction,
            role: humanPrivacyLabel(item.privacyRole),
        })),
        vendors: row.parties.filter((item) => item.partyType === 'VENDOR' || item.vendorId).map((item) => ({
            vendorId: item.vendorId,
            name: item.recipientName,
            role: humanPrivacyLabel(item.privacyRole),
            jurisdiction: item.jurisdiction,
        })),
        recipients: row.parties.filter((item) => item.partyType === 'RECIPIENT' || item.recipientName).map((item) => ({
            name: item.recipientName,
            role: humanPrivacyLabel(item.privacyRole),
            jurisdiction: item.jurisdiction,
        })),
        transfers: row.transfers.map((item) => ({
            publicId: item.publicId,
            source: item.sourceJurisdiction,
            destination: item.destinationJurisdiction,
            mechanism: humanPrivacyLabel(item.mechanism),
            status: humanPrivacyLabel(item.status),
            honesty: 'A recorded transfer mechanism is not a finding that the transfer is lawful.',
        })),
        dpias: row.dpias.map((item) => ({
            publicId: item.publicId,
            title: item.title,
            status: humanPrivacyLabel(item.status),
            decision: item.decision ? humanPrivacyLabel(item.decision) : 'No decision',
        })),
        rightsRequests: row.rightsRequests.map((item) => ({
            publicId: item.publicId,
            requestType: humanPrivacyLabel(item.requestType),
            regime: item.regime,
            status: humanPrivacyLabel(item.status),
            dueAt: item.dueAt,
            verificationStatus: humanPrivacyLabel(item.verificationStatus),
        })),
        retentionRules: row.retentionRules.map((item) => ({
            publicId: item.publicId,
            period: item.period,
            triggerEvent: item.triggerEvent,
            disposalMethod: item.disposalMethod,
            legalHold: item.legalHold,
        })),
        notices: row.noticeVersions.map((item) => ({ version: item.version, title: item.title, effectiveFrom: item.effectiveFrom })),
        incidents: row.incidentLinks.map((item) => ({ incidentId: item.incidentId, findingId: item.findingId, note: item.note })),
        deletionTasks: row.deletionTasks.map((item) => ({
            publicId: item.publicId,
            status: humanPrivacyLabel(item.status),
            honesty: 'A closed deletion task is not proof the data is gone.',
        })),
        flow: {
            source: row.sourceOfData || 'Not recorded',
            systems: row.parties.filter((item) => item.systemName).map((item) => item.systemName),
            businessProcess: row.businessProcess || 'Not recorded',
            vendors: row.parties.filter((item) => item.vendorId || item.partyType === 'VENDOR').map((item) => item.recipientName || 'Vendor'),
            recipients: row.parties.filter((item) => item.partyType === 'RECIPIENT').map((item) => item.recipientName),
            storage: row.storageLocations,
            jurisdictions: row.jurisdictions,
        },
        honesty: PRIVACY_HONESTY,
    };
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
    if (typeof value !== 'string' || !allowed.includes(value as T)) throw new ApiError(400, `Invalid ${label}`);
    return value as T;
}

function parseDate(value: unknown) {
    if (!value) return null;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new ApiError(400, 'Invalid date');
    return date;
}

export const enterprisePrivacyService = {
    honesty: PRIVACY_HONESTY,

    catalog() {
        return {
            honesty: PRIVACY_HONESTY,
            regimes: PRIVACY_REGIMES,
            dataSubjects: Object.values(PrivacyDataSubjectKind).map((kind) => ({ key: kind, label: humanPrivacyLabel(kind) })),
            dataCategories: Object.values(PrivacyDataKind).map((kind) => ({ key: kind, label: humanPrivacyLabel(kind) })),
            purposes: ['Service delivery', 'Employment', 'Marketing', 'Security', 'Legal obligation', 'Other'],
            basisTypes: Object.values(PrivacyBasisType).map((kind) => ({ key: kind, label: humanPrivacyLabel(kind) })),
            transferMechanisms: Object.values(PrivacyTransferMechanism).map((kind) => ({ key: kind, label: humanPrivacyLabel(kind) })),
            rightsTypes: Object.values(PrivacyRightsType).map((kind) => ({ key: kind, label: humanPrivacyLabel(kind) })),
            screening: DPIA_SCREENING,
            consentCollector: { status: 'Not configured / manual', honesty: 'Supreme is not a cookie-consent platform unless a collector is implemented.' },
        };
    },

    async dashboard(organizationId: string) {
        const now = new Date();
        const [activities, transfers, dpias, rights, retention, deletions, historyRows, vendors, expiredEvidence, gaps] = await Promise.all([
            prisma.privacyProcessingActivity.findMany({ where: { organizationId }, include: { purposes: { include: { bases: true } }, retentionRules: true, parties: true } }),
            prisma.privacyTransfer.findMany({ where: { organizationId } }),
            prisma.privacyDpia.findMany({ where: { organizationId } }),
            prisma.privacyRightsRequest.findMany({ where: { organizationId } }),
            prisma.privacyRetentionRule.findMany({ where: { organizationId } }),
            prisma.privacyDeletionTask.findMany({ where: { organizationId } }),
            prisma.privacyHistory.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 12 }),
            prisma.privacyActivityParty.findMany({ where: { organizationId, vendorId: { not: null } } }),
            prisma.evidenceGovernanceLink.findMany({
                where: { organizationId, freshness: 'EXPIRED' },
                select: { targetId: true, targetType: true },
            }),
            prisma.complianceGap.findMany({ where: { organizationId, status: { in: ['OPEN', 'IN_PROGRESS'] } }, select: { publicId: true, title: true } }),
        ]);
        const owners = await userNames(organizationId, [
            ...activities.map((row) => row.ownerUserId),
            ...transfers.map((row) => row.ownerUserId),
            ...dpias.map((row) => row.ownerUserId),
            ...rights.map((row) => row.ownerUserId),
        ]);
        const attention: PrivacyAttentionItem[] = [];
        for (const row of rights.filter((item) => item.dueAt && item.dueAt < now && !['COMPLETED', 'CLOSED', 'DENIED'].includes(item.status))) {
            attention.push({
                type: 'Overdue rights request',
                why: `${row.publicId} passed its configured deadline. This is not legal advice.`,
                related: humanPrivacyLabel(row.requestType),
                owner: ownerLabel(owners, row.ownerUserId),
                dueAt: row.dueAt?.toISOString() || null,
                ageDays: daysBetween(row.dueAt || now),
                severity: 'High',
                href: '/privacy-ops/rights',
                publicId: row.publicId,
                priority: 1,
            });
        }
        for (const row of dpias.filter((item) => (item.reviewAt && item.reviewAt < now && item.status !== 'COMPLETED') || item.status === 'OVERDUE')) {
            attention.push({
                type: 'DPIA overdue',
                why: `${row.publicId} needs review. This is not a legal requirement statement.`,
                related: row.title,
                owner: ownerLabel(owners, row.ownerUserId),
                dueAt: row.reviewAt?.toISOString() || null,
                ageDays: row.reviewAt ? daysBetween(row.reviewAt) : 0,
                severity: 'High',
                href: `/privacy-ops/dpias`,
                publicId: row.publicId,
                priority: 2,
            });
        }
        for (const row of transfers.filter((item) => item.status === 'REVIEW_REQUIRED' || item.status === 'OVERDUE' || (item.reviewAt && item.reviewAt < now))) {
            attention.push({
                type: 'Transfer requiring review',
                why: `${row.publicId} ${row.sourceJurisdiction} → ${row.destinationJurisdiction} is recorded as review required. This is not a lawfulness finding.`,
                related: humanPrivacyLabel(row.mechanism),
                owner: ownerLabel(owners, row.ownerUserId),
                dueAt: row.reviewAt?.toISOString() || null,
                ageDays: row.reviewAt ? daysBetween(row.reviewAt) : 0,
                severity: 'Medium',
                href: '/privacy-ops/transfers',
                publicId: row.publicId,
                priority: 3,
            });
        }
        for (const row of activities.filter((item) => !item.purposes.some((purpose) => purpose.bases.length))) {
            attention.push({
                type: 'Missing lawful-basis record',
                why: `${row.publicId} has no recorded legal basis. A missing record is not a finding of unlawfulness.`,
                related: row.name,
                owner: ownerLabel(owners, row.ownerUserId),
                dueAt: null,
                ageDays: daysBetween(row.createdAt),
                severity: 'Medium',
                href: `/privacy-ops/activities/${row.publicId}`,
                publicId: row.publicId,
                priority: 4,
            });
        }
        for (const row of activities.filter((item) => !item.retentionRules.length && !item.retentionSummary)) {
            attention.push({
                type: 'Missing retention rule',
                why: `${row.publicId} has no retention rule recorded.`,
                related: row.name,
                owner: ownerLabel(owners, row.ownerUserId),
                dueAt: null,
                ageDays: daysBetween(row.createdAt),
                severity: 'Medium',
                href: `/privacy-ops/activities/${row.publicId}`,
                publicId: row.publicId,
                priority: 5,
            });
        }
        for (const row of retention.filter((item) => item.reviewAt && item.reviewAt < now && !item.legalHold)) {
            attention.push({
                type: 'Retention action due',
                why: `${row.publicId} reached its review date. Supreme does not auto-delete customer data.`,
                related: row.period,
                owner: ownerLabel(owners, row.ownerUserId),
                dueAt: row.reviewAt?.toISOString() || null,
                ageDays: daysBetween(row.reviewAt || now),
                severity: 'Medium',
                href: '/privacy-ops/retention',
                publicId: row.publicId,
                priority: 6,
            });
        }
        if (expiredEvidence.length) {
            attention.push({
                type: 'Expired evidence',
                why: `${expiredEvidence.length} evidence link${expiredEvidence.length === 1 ? '' : 's'} marked expired. Presence of a file is not proof.`,
                related: 'Shared evidence',
                owner: null,
                dueAt: null,
                ageDays: 0,
                severity: 'Medium',
                href: '/control-center',
                publicId: 'EVIDENCE',
                priority: 7,
            });
        }
        for (const gap of gaps.slice(0, 6)) {
            attention.push({
                type: 'Open privacy-related gap',
                why: `${gap.publicId} ${gap.title}. A gap is remaining work, not a legal conclusion.`,
                related: gap.title,
                owner: null,
                dueAt: null,
                ageDays: 0,
                severity: 'Medium',
                href: '/compliance/gaps',
                publicId: gap.publicId,
                priority: 8,
            });
        }
        const highRisk = activities.filter((row) => /high|critical/i.test(row.riskLevel || '')).length;
        return {
            honesty: PRIVACY_HONESTY,
            consentCollector: { status: 'Not configured / manual' },
            totals: {
                activeActivities: activities.filter((row) => row.status === 'ACTIVE').length,
                highRiskProcessing: highRisk,
                dpiasDue: dpias.filter((row) => row.status !== 'COMPLETED' && row.reviewAt && row.reviewAt < now).length,
                transfersRequiringReview: transfers.filter((row) => row.status === 'REVIEW_REQUIRED' || row.status === 'OVERDUE').length,
                openRightsRequests: rights.filter((row) => !['COMPLETED', 'CLOSED', 'DENIED'].includes(row.status)).length,
                overdueRightsRequests: rights.filter((row) => row.dueAt && row.dueAt < now && !['COMPLETED', 'CLOSED', 'DENIED'].includes(row.status)).length,
                retentionActionsDue: retention.filter((row) => row.reviewAt && row.reviewAt < now && !row.legalHold).length,
                openGaps: gaps.length,
                processorsWithIssues: new Set(vendors.map((row) => row.vendorId).filter(Boolean)).size,
                evidenceRefresh: expiredEvidence.length,
                deletionPending: deletions.filter((row) => ['REQUESTED', 'PENDING'].includes(row.status)).length,
            },
            attention: rankAttention(attention),
            changed: historyRows.map((row) => ({
                title: row.eventType,
                change: row.change,
                summary: row.summary,
                actor: ownerLabel(owners, row.actorUserId),
                createdAt: row.createdAt,
            })),
        };
    },

    async listActivities(organizationId: string, query: { q?: string; status?: string; jurisdiction?: string; dataKind?: string; take?: number } = {}) {
        const rows = await prisma.privacyProcessingActivity.findMany({
            where: {
                organizationId,
                ...(query.status ? { status: parseEnum(query.status, Object.values(PrivacyActivityStatus), 'status') } : {}),
                ...(query.jurisdiction ? { jurisdictions: { has: query.jurisdiction } } : {}),
                ...(query.dataKind ? { dataCategories: { some: { kind: parseEnum(query.dataKind, Object.values(PrivacyDataKind), 'data category') } } } : {}),
                ...(query.q
                    ? {
                          OR: [
                              { publicId: { contains: query.q, mode: 'insensitive' } },
                              { name: { contains: query.q, mode: 'insensitive' } },
                              { businessProcess: { contains: query.q, mode: 'insensitive' } },
                          ],
                      }
                    : {}),
            },
            include: ACTIVITY_INCLUDE,
            orderBy: { publicId: 'asc' },
            take: Math.min(query.take || 200, 500),
        });
        const owners = await userNames(organizationId, rows.map((row) => row.ownerUserId));
        return rows.map((row) => presentActivity(row, owners));
    },

    async getActivity(organizationId: string, publicId: string) {
        const row = await activityOrThrow(organizationId, publicId);
        const owners = await userNames(organizationId, [row.ownerUserId, ...row.purposes.flatMap((purpose) => purpose.bases.map((basis) => basis.ownerUserId))]);
        const affected = await this.whatIsAffected(organizationId, 'activity', publicId);
        const historyRows = await prisma.privacyHistory.findMany({
            where: { organizationId, entityId: row.id },
            orderBy: { createdAt: 'desc' },
            take: 40,
        });
        return {
            ...presentActivity(row, owners),
            affected,
            history: historyRows.map((item) => ({
                eventType: item.eventType,
                summary: item.summary,
                change: item.change,
                createdAt: item.createdAt,
            })),
        };
    },

    async createActivity(organizationId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const name = String(input.name || '').trim();
        if (!name) throw new ApiError(400, 'Name is required');
        const publicId = await nextId(organizationId, 'PA');
        const created = await prisma.privacyProcessingActivity.create({
            data: {
                organizationId,
                publicId,
                name,
                description: input.description ? String(input.description) : null,
                businessProcess: input.businessProcess ? String(input.businessProcess) : null,
                businessUnitId: input.businessUnitId ? String(input.businessUnitId) : null,
                ownerUserId: input.ownerUserId ? String(input.ownerUserId) : actorUserId,
                controllerRole: input.controllerRole ? parseEnum(input.controllerRole, Object.values(PrivacyRole), 'controller role') : 'CONTROLLER',
                status: input.status ? parseEnum(input.status, Object.values(PrivacyActivityStatus), 'status') : 'DRAFT',
                jurisdictions: Array.isArray(input.jurisdictions) ? input.jurisdictions.map(String) : [],
                storageLocations: Array.isArray(input.storageLocations) ? input.storageLocations.map(String) : [],
                sourceOfData: input.sourceOfData ? String(input.sourceOfData) : null,
                retentionSummary: input.retentionSummary ? String(input.retentionSummary) : null,
                disposalMethod: input.disposalMethod ? String(input.disposalMethod) : null,
                riskLevel: input.riskLevel ? String(input.riskLevel) : null,
                effectiveFrom: parseDate(input.effectiveFrom),
                effectiveTo: parseDate(input.effectiveTo),
                reviewAt: parseDate(input.reviewAt),
            },
        });
        await projectActivity(organizationId, created.id, actorUserId);
        await history(organizationId, 'ACTIVITY', created.id, 'Processing activity created', `${publicId} ${name} was recorded.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'privacy.activity.created', resourceType: 'PrivacyProcessingActivity', resourceId: created.id, metadata: { publicId } });
        return this.getActivity(organizationId, publicId);
    },

    async updateActivity(organizationId: string, publicId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const row = await activityOrThrow(organizationId, publicId);
        const updated = await prisma.privacyProcessingActivity.update({
            where: { id: row.id },
            data: {
                name: input.name != null ? String(input.name) : undefined,
                description: input.description != null ? String(input.description) : undefined,
                businessProcess: input.businessProcess != null ? String(input.businessProcess) : undefined,
                ownerUserId: input.ownerUserId != null ? String(input.ownerUserId) : undefined,
                controllerRole: input.controllerRole ? parseEnum(input.controllerRole, Object.values(PrivacyRole), 'controller role') : undefined,
                status: input.status ? parseEnum(input.status, Object.values(PrivacyActivityStatus), 'status') : undefined,
                jurisdictions: Array.isArray(input.jurisdictions) ? input.jurisdictions.map(String) : undefined,
                storageLocations: Array.isArray(input.storageLocations) ? input.storageLocations.map(String) : undefined,
                sourceOfData: input.sourceOfData != null ? String(input.sourceOfData) : undefined,
                retentionSummary: input.retentionSummary != null ? String(input.retentionSummary) : undefined,
                disposalMethod: input.disposalMethod != null ? String(input.disposalMethod) : undefined,
                riskLevel: input.riskLevel != null ? String(input.riskLevel) : undefined,
                reviewAt: input.reviewAt !== undefined ? parseDate(input.reviewAt) : undefined,
            },
        });
        await history(organizationId, 'ACTIVITY', row.id, 'Processing activity updated', `${publicId} was updated.`, actorUserId, input.name && String(input.name) !== row.name ? `${row.name} → ${input.name}` : null);
        await audit({ organizationId, actorUserId, action: 'privacy.activity.updated', resourceType: 'PrivacyProcessingActivity', resourceId: row.id, metadata: { publicId } });
        return this.getActivity(organizationId, updated.publicId);
    },

    async addPurpose(organizationId: string, publicId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const activity = await activityOrThrow(organizationId, publicId);
        const name = String(input.name || '').trim();
        if (!name) throw new ApiError(400, 'Purpose name is required');
        const purpose = await prisma.privacyPurpose.create({
            data: {
                organizationId,
                activityId: activity.id,
                name,
                summary: input.summary ? String(input.summary) : null,
                noticeVersionId: input.noticeVersionId ? String(input.noticeVersionId) : null,
                effectiveFrom: parseDate(input.effectiveFrom),
            },
        });
        await history(organizationId, 'ACTIVITY', activity.id, 'Purpose recorded', `${name} was added to ${publicId}.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'privacy.purpose.created', resourceType: 'PrivacyPurpose', resourceId: purpose.id, metadata: { publicId } });
        return this.getActivity(organizationId, publicId);
    },

    async addBasis(organizationId: string, publicId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const activity = await activityOrThrow(organizationId, publicId);
        const purpose = activity.purposes.find((item) => item.name === input.purposeName) || activity.purposes[0];
        if (!purpose) throw new ApiError(400, 'Record a purpose before a legal basis');
        const rationale = String(input.rationale || '').trim();
        if (!rationale) throw new ApiError(400, 'Rationale is required');
        const basis = await prisma.privacyLawfulBasis.create({
            data: {
                organizationId,
                purposeId: purpose.id,
                basisType: parseEnum(input.basisType, Object.values(PrivacyBasisType), 'basis'),
                rationale,
                regime: String(input.regime || 'UNSPECIFIED'),
                ownerUserId: input.ownerUserId ? String(input.ownerUserId) : actorUserId,
                storedObjectId: input.storedObjectId ? String(input.storedObjectId) : null,
                effectiveFrom: parseDate(input.effectiveFrom) || new Date(),
                reviewAt: parseDate(input.reviewAt),
            },
        });
        await history(organizationId, 'ACTIVITY', activity.id, 'Legal basis recorded', `A recorded legal basis was added to ${publicId}. This is not a lawfulness finding.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'privacy.basis.created', resourceType: 'PrivacyLawfulBasis', resourceId: basis.id, metadata: { publicId } });
        return this.getActivity(organizationId, publicId);
    },

    async addData(organizationId: string, publicId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const activity = await activityOrThrow(organizationId, publicId);
        const kind = parseEnum(input.kind, Object.values(PrivacyDataKind), 'data category');
        await prisma.privacyActivityData.create({
            data: {
                organizationId,
                activityId: activity.id,
                kind,
                label: String(input.label || humanPrivacyLabel(kind)),
                sensitive: Boolean(input.sensitive),
            },
        });
        await projectActivity(organizationId, activity.id, actorUserId);
        await history(organizationId, 'ACTIVITY', activity.id, 'Data category added', `${humanPrivacyLabel(kind)} was linked to ${publicId}.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'privacy.data.linked', resourceType: 'PrivacyProcessingActivity', resourceId: activity.id, metadata: { publicId, kind } });
        return this.getActivity(organizationId, publicId);
    },

    async addSubject(organizationId: string, publicId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const activity = await activityOrThrow(organizationId, publicId);
        const kind = parseEnum(input.kind, Object.values(PrivacyDataSubjectKind), 'data subject');
        await prisma.privacyActivitySubject.create({
            data: {
                organizationId,
                activityId: activity.id,
                kind,
                label: String(input.label || humanPrivacyLabel(kind)),
            },
        });
        await projectActivity(organizationId, activity.id, actorUserId);
        await history(organizationId, 'ACTIVITY', activity.id, 'Data subject added', `${humanPrivacyLabel(kind)} was linked to ${publicId}.`, actorUserId);
        return this.getActivity(organizationId, publicId);
    },

    async addParty(organizationId: string, publicId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const activity = await activityOrThrow(organizationId, publicId);
        if (input.vendorId) {
            const vendor = await prisma.vendor.findFirst({ where: { organizationId, id: String(input.vendorId) } });
            if (!vendor) throw new ApiError(404, 'Vendor not found');
        }
        await prisma.privacyActivityParty.create({
            data: {
                organizationId,
                activityId: activity.id,
                partyType: String(input.partyType || (input.vendorId ? 'VENDOR' : input.systemName ? 'SYSTEM' : 'RECIPIENT')),
                vendorId: input.vendorId ? String(input.vendorId) : null,
                systemName: input.systemName ? String(input.systemName) : null,
                recipientName: input.recipientName ? String(input.recipientName) : null,
                privacyRole: input.privacyRole ? parseEnum(input.privacyRole, Object.values(PrivacyVendorRole), 'privacy role') : 'PROCESSOR',
                jurisdiction: input.jurisdiction ? String(input.jurisdiction) : null,
            },
        });
        await projectActivity(organizationId, activity.id, actorUserId);
        await history(organizationId, 'ACTIVITY', activity.id, 'System or vendor linked', `A ${String(input.partyType || 'party')} was linked to ${publicId}.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'privacy.party.linked', resourceType: 'PrivacyProcessingActivity', resourceId: activity.id, metadata: { publicId } });
        return this.getActivity(organizationId, publicId);
    },

    async listTransfers(organizationId: string) {
        const rows = await prisma.privacyTransfer.findMany({ where: { organizationId }, include: { assessments: true, activity: { select: { publicId: true, name: true } } }, orderBy: { publicId: 'asc' } });
        const owners = await userNames(organizationId, rows.map((row) => row.ownerUserId));
        return rows.map((row) => ({
            publicId: row.publicId,
            activity: row.activity ? `${row.activity.publicId} ${row.activity.name}` : null,
            source: row.sourceJurisdiction,
            destination: row.destinationJurisdiction,
            recipient: row.recipientName,
            mechanism: humanPrivacyLabel(row.mechanism),
            status: humanPrivacyLabel(row.status),
            owner: ownerLabel(owners, row.ownerUserId),
            reviewAt: row.reviewAt,
            honesty: 'A recorded mechanism is not a finding that the transfer is lawful.',
            assessments: row.assessments.map((item) => ({
                publicId: item.publicId,
                status: humanPrivacyLabel(item.status),
                decision: item.decision,
            })),
        }));
    },

    async createTransfer(organizationId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const activity = input.activityPublicId ? await activityOrThrow(organizationId, String(input.activityPublicId)) : null;
        if (input.vendorId) {
            const vendor = await prisma.vendor.findFirst({ where: { organizationId, id: String(input.vendorId) } });
            if (!vendor) throw new ApiError(404, 'Vendor not found');
        }
        const publicId = await nextId(organizationId, 'XFR');
        const created = await prisma.privacyTransfer.create({
            data: {
                organizationId,
                publicId,
                activityId: activity?.id || null,
                vendorId: input.vendorId ? String(input.vendorId) : null,
                sourceJurisdiction: String(input.sourceJurisdiction || 'Not recorded'),
                destinationJurisdiction: String(input.destinationJurisdiction || 'Not recorded'),
                recipientName: input.recipientName ? String(input.recipientName) : null,
                dataSummary: input.dataSummary ? String(input.dataSummary) : null,
                mechanism: parseEnum(input.mechanism || 'OTHER', Object.values(PrivacyTransferMechanism), 'mechanism'),
                supplementaryMeasures: input.supplementaryMeasures ? String(input.supplementaryMeasures) : null,
                ownerUserId: input.ownerUserId ? String(input.ownerUserId) : actorUserId,
                reviewAt: parseDate(input.reviewAt),
                status: 'REVIEW_REQUIRED',
            },
        });
        if (activity) await projectActivity(organizationId, activity.id, actorUserId);
        await history(organizationId, 'TRANSFER', created.id, 'Transfer recorded', `${publicId} was recorded. Review is required.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'privacy.transfer.created', resourceType: 'PrivacyTransfer', resourceId: created.id, metadata: { publicId } });
        return this.listTransfers(organizationId).then((rows) => rows.find((row) => row.publicId === publicId));
    },

    async createTransferAssessment(organizationId: string, transferPublicId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const transfer = await prisma.privacyTransfer.findFirst({ where: { organizationId, publicId: transferPublicId } });
        if (!transfer) throw new ApiError(404, 'Transfer not found');
        const publicId = await nextId(organizationId, 'TIA');
        const created = await prisma.privacyTransferAssessment.create({
            data: {
                organizationId,
                transferId: transfer.id,
                publicId,
                sensitivity: input.sensitivity ? String(input.sensitivity) : null,
                governmentAccess: input.governmentAccess ? String(input.governmentAccess) : null,
                measures: input.measures ? String(input.measures) : null,
                decision: input.decision ? String(input.decision) : 'Assessment recorded. This is not a lawfulness finding.',
                ownerUserId: actorUserId,
                reviewAt: parseDate(input.reviewAt),
                status: 'IN_PROGRESS',
            },
        });
        await history(organizationId, 'TRANSFER', transfer.id, 'Transfer assessment recorded', `${publicId} was added to ${transferPublicId}.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'privacy.transfer.assessed', resourceType: 'PrivacyTransferAssessment', resourceId: created.id, metadata: { publicId } });
        return created;
    },

    async listDpias(organizationId: string) {
        const rows = await prisma.privacyDpia.findMany({ where: { organizationId }, include: { screening: true, activity: { select: { publicId: true, name: true } } }, orderBy: { publicId: 'asc' } });
        return rows.map((row) => {
            const yes = row.screening.filter((item) => item.answer).length;
            return {
                publicId: row.publicId,
                title: row.title,
                activity: row.activity ? `${row.activity.publicId} ${row.activity.name}` : null,
                status: humanPrivacyLabel(row.status),
                decision: row.decision ? humanPrivacyLabel(row.decision) : 'No decision',
                advice: dpiaScreeningAdvice(yes),
                reviewAt: row.reviewAt,
            };
        });
    },

    async createDpia(organizationId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const activity = input.activityPublicId ? await activityOrThrow(organizationId, String(input.activityPublicId)) : null;
        const publicId = await nextId(organizationId, 'DPIA');
        const answers = Array.isArray(input.screening) ? input.screening as Array<{ key: string; answer: boolean }> : [];
        const created = await prisma.privacyDpia.create({
            data: {
                organizationId,
                publicId,
                activityId: activity?.id || null,
                title: String(input.title || 'Privacy impact assessment'),
                trigger: input.trigger ? String(input.trigger) : null,
                scope: input.scope ? String(input.scope) : null,
                necessity: input.necessity ? String(input.necessity) : null,
                residualNote: input.residualNote ? String(input.residualNote) : null,
                enterpriseRiskId: input.enterpriseRiskId ? String(input.enterpriseRiskId) : null,
                ownerUserId: actorUserId,
                reviewAt: parseDate(input.reviewAt),
                status: 'IN_PROGRESS',
                screening: {
                    create: answers.map((item) => ({
                        organizationId,
                        questionKey: item.key,
                        answer: Boolean(item.answer),
                    })),
                },
            },
            include: { screening: true },
        });
        if (activity) {
            await prisma.privacyProcessingActivity.update({
                where: { id: activity.id },
                data: { dpiaStatus: created.status, dpiaRequired: answers.filter((item) => item.answer).length >= 2 },
            });
            await projectActivity(organizationId, activity.id, actorUserId);
        }
        const advice = dpiaScreeningAdvice(created.screening.filter((item) => item.answer).length);
        await history(organizationId, 'DPIA', created.id, 'DPIA screening recorded', `${publicId}: ${advice}`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'privacy.dpia.created', resourceType: 'PrivacyDpia', resourceId: created.id, metadata: { publicId } });
        return { ...created, advice, honesty: PRIVACY_HONESTY };
    },

    async decideDpia(organizationId: string, publicId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const row = await prisma.privacyDpia.findFirst({ where: { organizationId, publicId } });
        if (!row) throw new ApiError(404, 'DPIA not found');
        const updated = await prisma.privacyDpia.update({
            where: { id: row.id },
            data: {
                decision: parseEnum(input.decision, Object.values(PrivacyDpiaDecision), 'decision'),
                status: 'COMPLETED',
                residualNote: input.residualNote ? String(input.residualNote) : row.residualNote,
            },
        });
        await history(organizationId, 'DPIA', row.id, 'DPIA decision recorded', `${publicId} decision recorded. This is not a claim that GDPR is satisfied.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'privacy.dpia.approved', resourceType: 'PrivacyDpia', resourceId: row.id, metadata: { publicId } });
        return updated;
    },

    maskRightsRow(row: {
        publicId: string;
        requestType: PrivacyRightsType;
        regime: string;
        requesterRef: string;
        requesterIdentity: string | null;
        verificationStatus: PrivacyVerificationStatus;
        receivedAt: Date;
        originalDueAt: Date | null;
        extensionDays: number | null;
        dueAt: Date | null;
        deadlineWhy: string | null;
        status: PrivacyRightsStatus;
        decision: string | null;
        completedAt: Date | null;
        ownerUserId: string | null;
    }, includeIdentity: boolean, owner: string) {
        return {
            publicId: row.publicId,
            requestType: humanPrivacyLabel(row.requestType),
            regime: row.regime,
            requester: includeIdentity ? row.requesterIdentity || row.requesterRef : maskRequester(row.requesterRef),
            requesterIdentity: includeIdentity ? row.requesterIdentity : undefined,
            verificationStatus: humanPrivacyLabel(row.verificationStatus),
            receivedAt: row.receivedAt,
            originalDueAt: row.originalDueAt,
            extensionDays: row.extensionDays,
            dueAt: row.dueAt,
            deadlineWhy: row.deadlineWhy,
            status: humanPrivacyLabel(row.status),
            decision: row.decision,
            completedAt: row.completedAt,
            owner,
            honesty: 'Configured deadline is not legal advice. Requester identity is need-to-know.',
        };
    },

    async listRights(organizationId: string, includeIdentity: boolean) {
        const rows = await prisma.privacyRightsRequest.findMany({ where: { organizationId }, orderBy: { publicId: 'asc' } });
        const owners = await userNames(organizationId, rows.map((row) => row.ownerUserId));
        return rows.map((row) => this.maskRightsRow(row, includeIdentity, ownerLabel(owners, row.ownerUserId)));
    },

    async getRights(organizationId: string, publicId: string, includeIdentity: boolean) {
        const row = await prisma.privacyRightsRequest.findFirst({
            where: { organizationId, publicId },
            include: { tasks: true, activity: { select: { publicId: true, name: true } } },
        });
        if (!row) throw new ApiError(404, 'Rights request not found');
        const owners = await userNames(organizationId, [row.ownerUserId]);
        return {
            ...this.maskRightsRow(row, includeIdentity, ownerLabel(owners, row.ownerUserId)),
            activity: row.activity ? `${row.activity.publicId} ${row.activity.name}` : null,
            tasks: row.tasks.map((task) => ({
                taskType: humanPrivacyLabel(task.taskType),
                target: task.targetLabel,
                status: humanPrivacyLabel(task.status),
                notes: task.notes,
                honesty: task.taskType === 'DELETION' ? 'Task status is not automated deletion across systems.' : null,
            })),
        };
    },

    async createRights(organizationId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const activity = input.activityPublicId ? await activityOrThrow(organizationId, String(input.activityPublicId)) : null;
        const receivedAt = parseDate(input.receivedAt) || new Date();
        const regime = String(input.regime || 'GDPR');
        const requestType = parseEnum(input.requestType, Object.values(PrivacyRightsType), 'request type');
        const deadline = configuredDeadline(regime, requestType, receivedAt);
        const extensionDays = input.extensionDays != null ? Number(input.extensionDays) : null;
        const dueAt = extensionDays ? new Date(deadline.dueAt.getTime() + extensionDays * 86400000) : deadline.dueAt;
        const why = input.deadlineOverrideWhy
            ? `${deadline.why} Override: ${String(input.deadlineOverrideWhy)}`
            : deadline.why;
        const publicId = await nextId(organizationId, 'DSR');
        const created = await prisma.privacyRightsRequest.create({
            data: {
                organizationId,
                publicId,
                activityId: activity?.id || null,
                requestType,
                regime,
                requesterRef: String(input.requesterRef || 'Requester'),
                requesterIdentity: input.requesterIdentity ? String(input.requesterIdentity) : null,
                receivedAt,
                originalDueAt: deadline.dueAt,
                extensionDays,
                dueAt,
                deadlineWhy: why,
                ownerUserId: actorUserId,
            },
        });
        if (activity) await projectActivity(organizationId, activity.id, actorUserId);
        await history(organizationId, 'RIGHTS', created.id, 'Rights request received', `${publicId} was recorded.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'privacy.rights.received', resourceType: 'PrivacyRightsRequest', resourceId: created.id, metadata: { publicId } });
        return this.getRights(organizationId, publicId, true);
    },

    async updateRights(organizationId: string, publicId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const row = await prisma.privacyRightsRequest.findFirst({ where: { organizationId, publicId } });
        if (!row) throw new ApiError(404, 'Rights request not found');
        const status = input.status ? parseEnum(input.status, Object.values(PrivacyRightsStatus), 'status') : undefined;
        const verification = input.verificationStatus ? parseEnum(input.verificationStatus, Object.values(PrivacyVerificationStatus), 'verification') : undefined;
        const updated = await prisma.privacyRightsRequest.update({
            where: { id: row.id },
            data: {
                status,
                verificationStatus: verification,
                decision: input.decision != null ? String(input.decision) : undefined,
                completedAt: status && ['COMPLETED', 'DENIED', 'CLOSED'].includes(status) ? new Date() : undefined,
                extensionDays: input.extensionDays != null ? Number(input.extensionDays) : undefined,
                deadlineWhy: input.deadlineOverrideWhy
                    ? `${row.deadlineWhy || ''} Override: ${String(input.deadlineOverrideWhy)}`.trim()
                    : undefined,
                dueAt: input.extensionDays != null && row.originalDueAt
                    ? new Date(row.originalDueAt.getTime() + Number(input.extensionDays) * 86400000)
                    : undefined,
            },
        });
        if (verification) {
            await history(organizationId, 'RIGHTS', row.id, 'Identity verification changed', `${publicId} verification is now ${humanPrivacyLabel(verification)}.`, actorUserId);
            await audit({ organizationId, actorUserId, action: 'privacy.rights.verification', resourceType: 'PrivacyRightsRequest', resourceId: row.id, metadata: { publicId, verification } });
        }
        if (status) {
            await history(organizationId, 'RIGHTS', row.id, 'Rights request status changed', `${publicId} is now ${humanPrivacyLabel(status)}.`, actorUserId);
            await audit({ organizationId, actorUserId, action: 'privacy.rights.status', resourceType: 'PrivacyRightsRequest', resourceId: row.id, metadata: { publicId, status } });
        }
        return this.getRights(organizationId, updated.publicId, true);
    },

    async addRightsTask(organizationId: string, publicId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const row = await prisma.privacyRightsRequest.findFirst({ where: { organizationId, publicId } });
        if (!row) throw new ApiError(404, 'Rights request not found');
        if (input.vendorId) {
            const vendor = await prisma.vendor.findFirst({ where: { organizationId, id: String(input.vendorId) } });
            if (!vendor) throw new ApiError(404, 'Vendor not found');
        }
        await prisma.privacyRightsTask.create({
            data: {
                organizationId,
                requestId: row.id,
                taskType: String(input.taskType || 'SYSTEM_SEARCH'),
                targetLabel: String(input.targetLabel || 'Manual search'),
                vendorId: input.vendorId ? String(input.vendorId) : null,
                notes: input.notes ? String(input.notes) : 'Manual task. No automated deletion across systems.',
            },
        });
        await history(organizationId, 'RIGHTS', row.id, 'Fulfillment task added', `${publicId} gained a manual fulfillment task.`, actorUserId);
        return this.getRights(organizationId, publicId, true);
    },

    async listRetention(organizationId: string) {
        const rows = await prisma.privacyRetentionRule.findMany({
            where: { organizationId },
            include: { activity: { select: { publicId: true, name: true } } },
            orderBy: { publicId: 'asc' },
        });
        const now = new Date();
        return rows.map((row) => ({
            publicId: row.publicId,
            activity: row.activity ? `${row.activity.publicId} ${row.activity.name}` : null,
            period: row.period,
            triggerEvent: row.triggerEvent,
            disposalMethod: row.disposalMethod,
            legalHold: row.legalHold,
            reviewAt: row.reviewAt,
            due: Boolean(row.reviewAt && row.reviewAt < now && !row.legalHold),
            honesty: 'Supreme surfaces due retention work. It does not auto-delete customer data.',
        }));
    },

    async createRetention(organizationId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const activity = input.activityPublicId ? await activityOrThrow(organizationId, String(input.activityPublicId)) : null;
        const publicId = await nextId(organizationId, 'RET');
        const created = await prisma.privacyRetentionRule.create({
            data: {
                organizationId,
                publicId,
                activityId: activity?.id || null,
                dataKind: input.dataKind ? parseEnum(input.dataKind, Object.values(PrivacyDataKind), 'data category') : null,
                systemName: input.systemName ? String(input.systemName) : null,
                period: String(input.period || 'Not recorded'),
                triggerEvent: input.triggerEvent ? String(input.triggerEvent) : null,
                disposalMethod: input.disposalMethod ? String(input.disposalMethod) : null,
                legalHold: Boolean(input.legalHold),
                ownerUserId: actorUserId,
                reviewAt: parseDate(input.reviewAt),
            },
        });
        if (activity) await projectActivity(organizationId, activity.id, actorUserId);
        await history(organizationId, 'RETENTION', created.id, 'Retention rule recorded', `${publicId} was recorded.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'privacy.retention.created', resourceType: 'PrivacyRetentionRule', resourceId: created.id, metadata: { publicId } });
        return created;
    },

    async createDeletion(organizationId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const activity = input.activityPublicId ? await activityOrThrow(organizationId, String(input.activityPublicId)) : null;
        const publicId = await nextId(organizationId, 'DEL');
        const created = await prisma.privacyDeletionTask.create({
            data: {
                organizationId,
                publicId,
                activityId: activity?.id || null,
                status: input.status ? parseEnum(input.status, Object.values(PrivacyDeletionStatus), 'deletion status') : 'REQUESTED',
                attestation: input.attestation ? String(input.attestation) : null,
                storedObjectId: input.storedObjectId ? String(input.storedObjectId) : null,
                ownerUserId: actorUserId,
                dueAt: parseDate(input.dueAt),
            },
        });
        await history(organizationId, 'DELETION', created.id, 'Deletion task recorded', `${publicId} was recorded. A task is not proof of deletion.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'privacy.deletion.created', resourceType: 'PrivacyDeletionTask', resourceId: created.id, metadata: { publicId } });
        return { ...created, honesty: 'A closed deletion task is not proof the data is gone.' };
    },

    async createConsent(organizationId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const publicId = await nextId(organizationId, 'CNS');
        const created = await prisma.privacyConsentRecord.create({
            data: {
                organizationId,
                publicId,
                purpose: String(input.purpose || 'Not recorded'),
                subjectRef: String(input.subjectRef || 'Manual reference'),
                choice: input.choice ? parseEnum(input.choice, Object.values(PrivacyConsentStatus), 'consent') : 'MANUAL',
                source: 'MANUAL',
                noticeVersion: input.noticeVersion ? String(input.noticeVersion) : null,
            },
        });
        await history(organizationId, 'CONSENT', created.id, 'Consent record added', `${publicId} is a manual record. Collector is not configured.`, actorUserId);
        return { ...created, collector: 'Not configured / manual' };
    },

    async createNotice(organizationId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const activity = input.activityPublicId ? await activityOrThrow(organizationId, String(input.activityPublicId)) : null;
        const created = await prisma.privacyNoticeVersion.create({
            data: {
                organizationId,
                activityId: activity?.id || null,
                version: String(input.version || 'v1'),
                title: String(input.title || 'Privacy notice'),
                effectiveFrom: parseDate(input.effectiveFrom) || new Date(),
                storedObjectId: input.storedObjectId ? String(input.storedObjectId) : null,
            },
        });
        await history(organizationId, 'NOTICE', created.id, 'Notice version recorded', `${created.version} is now historical record.`, actorUserId);
        return created;
    },

    async linkIncident(organizationId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const activity = input.activityPublicId ? await activityOrThrow(organizationId, String(input.activityPublicId)) : null;
        const created = await prisma.privacyIncidentLink.create({
            data: {
                organizationId,
                activityId: activity?.id || null,
                incidentId: input.incidentId ? String(input.incidentId) : null,
                findingId: input.findingId ? String(input.findingId) : null,
                note: input.note ? String(input.note) : 'Notification assessment required. This is not an automatic notification obligation.',
            },
        });
        await history(organizationId, 'INCIDENT', created.id, 'Privacy incident linked', 'A privacy incident flag was linked. Notification assessment required.', actorUserId);
        return created;
    },

    async linkAuthoritative(organizationId: string, actorUserId: string | null, input: { activityPublicId: string; targetType: 'CONTROL' | 'RISK' | 'REQUIREMENT'; targetId: string }) {
        const activity = await activityOrThrow(organizationId, input.activityPublicId);
        const activityNode = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.PROCESSING_ACTIVITY,
            sourceModel: 'PrivacyProcessingActivity',
            sourceId: activity.id,
            displayLabel: `${activity.publicId} ${activity.name}`,
            actorUserId,
        });
        if (input.targetType === 'CONTROL') {
            const control = await prisma.organizationControl.findFirst({
                where: { organizationId, OR: [{ id: input.targetId }, { controlKey: input.targetId }] },
            });
            if (!control) throw new ApiError(404, 'Control not found');
            const node = await ensureNode({
                organizationId,
                nodeType: GovernanceNodeType.CONTROL,
                sourceModel: 'OrganizationControl',
                sourceId: control.id,
                displayLabel: control.controlKey,
                actorUserId,
            });
            await createRelationship({
                organizationId,
                fromNodeId: node.node.id,
                toNodeId: activityNode.node.id,
                relationshipType: GovernanceRelationshipType.MITIGATES,
                createdBy: actorUserId,
            });
        } else if (input.targetType === 'RISK') {
            const risk = await prisma.enterpriseRisk.findFirst({
                where: { organizationId, OR: [{ id: input.targetId }, { publicId: input.targetId }] },
            });
            if (!risk) throw new ApiError(404, 'Risk not found');
            const node = await ensureNode({
                organizationId,
                nodeType: GovernanceNodeType.RISK,
                sourceModel: 'EnterpriseRisk',
                sourceId: risk.id,
                displayLabel: `${risk.publicId} ${risk.title}`,
                actorUserId,
            });
            await createRelationship({
                organizationId,
                fromNodeId: activityNode.node.id,
                toNodeId: node.node.id,
                relationshipType: GovernanceRelationshipType.HAS_RISK,
                createdBy: actorUserId,
            });
        } else {
            const requirement = await prisma.complianceRequirementState.findFirst({
                where: { organizationId, OR: [{ id: input.targetId }, { publicId: input.targetId }] },
            });
            if (!requirement) throw new ApiError(404, 'Requirement not found');
            const node = await ensureNode({
                organizationId,
                nodeType: GovernanceNodeType.REQUIREMENT,
                sourceModel: 'ComplianceRequirementState',
                sourceId: requirement.id,
                displayLabel: requirement.publicId,
                actorUserId,
            });
            await createRelationship({
                organizationId,
                fromNodeId: activityNode.node.id,
                toNodeId: node.node.id,
                relationshipType: GovernanceRelationshipType.REQUIRED_BY,
                createdBy: actorUserId,
            });
        }
        await history(organizationId, 'ACTIVITY', activity.id, 'Authoritative link recorded', `${activity.publicId} was linked to an existing ${input.targetType.toLowerCase()}.`, actorUserId);
        return this.getActivity(organizationId, activity.publicId);
    },

    async dataMap(organizationId: string, query: { q?: string; dataKind?: string; jurisdiction?: string; transfer?: string } = {}) {
        const activities = await this.listActivities(organizationId, { ...query, take: 200 });
        const rows = activities.flatMap((activity) => {
            const data = activity.dataCategories.length ? activity.dataCategories : [{ kind: 'Not recorded', label: 'Not recorded', sensitive: false, honesty: null }];
            const subjects = activity.dataSubjects.length ? activity.dataSubjects : [{ kind: 'Not recorded', label: 'Not recorded' }];
            return data.flatMap((category) => subjects.map((subject) => ({
                activity: activity.publicId,
                name: activity.name,
                data: category.label,
                dataKind: category.kind,
                subject: subject.label,
                systems: activity.systems.map((item) => item.name).filter(Boolean),
                vendors: activity.vendors.map((item) => item.name).filter(Boolean),
                jurisdictions: activity.jurisdictions,
                transfers: activity.transfers.map((item) => `${item.source} → ${item.destination}`),
                international: activity.transfers.length > 0,
            })));
        });
        const filtered = query.transfer === 'international' ? rows.filter((row) => row.international) : rows;
        return {
            honesty: 'This map is built from recorded processing activities. It is not a decorative graph.',
            paths: activities.map((activity) => activity.flow),
            rows: filtered,
        };
    },

    async vendorPrivacy(organizationId: string, vendorId: string) {
        const vendor = await prisma.vendor.findFirst({
            where: { organizationId, id: vendorId },
            include: { assessments: { take: 5, orderBy: { createdAt: 'desc' } }, issues: { take: 8, orderBy: { createdAt: 'desc' } } },
        });
        if (!vendor) throw new ApiError(404, 'Vendor not found');
        const parties = await prisma.privacyActivityParty.findMany({
            where: { organizationId, vendorId },
            include: { activity: { include: { dataCategories: true, transfers: true } } },
        });
        return {
            vendor: { id: vendor.id, name: vendor.name, residualRisk: vendor.residualRiskScore },
            roles: parties.map((item) => humanPrivacyLabel(item.privacyRole)),
            activities: parties.map((item) => ({
                publicId: item.activity.publicId,
                name: item.activity.name,
                data: item.activity.dataCategories.map((category) => category.label),
                transfers: item.activity.transfers.map((transfer) => transfer.publicId),
            })),
            assessments: vendor.assessments.map((item) => ({ id: item.id, status: item.status })),
            findings: vendor.issues.map((item) => ({ id: item.id, title: item.title, status: item.status })),
            honesty: 'Vendor identity remains the Third Party record. Privacy adds role and processing links only.',
        };
    },

    async whatIsAffected(organizationId: string, kind: 'activity' | 'vendor', id: string) {
        if (kind === 'vendor') {
            const view = await this.vendorPrivacy(organizationId, id);
            return {
                systems: [],
                vendors: [view.vendor.name],
                dataCategories: [...new Set(view.activities.flatMap((item) => item.data))],
                dataSubjects: [],
                jurisdictions: [],
                transfers: [...new Set(view.activities.flatMap((item) => item.transfers))],
                activities: view.activities.map((item) => item.publicId),
            };
        }
        const activity = await activityOrThrow(organizationId, id);
        const vendorIds = activity.parties.map((item) => item.vendorId).filter((value): value is string => Boolean(value));
        const vendors = vendorIds.length
            ? await prisma.vendor.findMany({ where: { organizationId, id: { in: vendorIds } }, select: { id: true, name: true, residualRiskScore: true } })
            : [];
        const controlEdges = await prisma.governanceNode.findFirst({
            where: { organizationId, sourceModel: 'PrivacyProcessingActivity', sourceId: activity.id },
            include: {
                outgoingEdges: { include: { toNode: true } },
                incomingEdges: { include: { fromNode: true } },
            },
        });
        const related = [...(controlEdges?.outgoingEdges || []).map((edge) => edge.toNode), ...(controlEdges?.incomingEdges || []).map((edge) => edge.fromNode)];
        const controlIds = related.filter((node) => node.nodeType === 'CONTROL').map((node) => node.sourceId);
        const requirementIds = related.filter((node) => node.nodeType === 'REQUIREMENT').map((node) => node.sourceId);
        const evidenceLinks = controlIds.length
            ? await prisma.evidenceGovernanceLink.findMany({
                where: { organizationId, targetType: 'CONTROL', targetId: { in: controlIds }, validTo: null },
                include: { storedObject: { select: { filename: true, scanStatus: true } } },
            })
            : [];
        const gaps = requirementIds.length
            ? await prisma.complianceGap.findMany({
                where: { organizationId, requirementStateId: { in: requirementIds } },
                select: { publicId: true, title: true, status: true },
            })
            : [];
        return {
            systems: activity.parties.filter((item) => item.systemName).map((item) => item.systemName),
            vendors: vendors.map((item) => `${item.name} (vendor residual ${item.residualRiskScore})`),
            dataCategories: activity.dataCategories.map((item) => item.label),
            dataSubjects: activity.dataSubjects.map((item) => item.label),
            jurisdictions: activity.jurisdictions,
            transfers: activity.transfers.map((item) => item.publicId),
            privacyRisks: related.filter((node) => node.nodeType === 'RISK').map((node) => node.displayLabel),
            controls: related.filter((node) => node.nodeType === 'CONTROL').map((node) => node.displayLabel),
            requirements: related.filter((node) => node.nodeType === 'REQUIREMENT').map((node) => node.displayLabel),
            evidence: evidenceLinks.map((link) => `${link.storedObject.filename} (${link.storedObject.scanStatus})`),
            gaps: gaps.map((item) => `${item.publicId} ${item.title} · ${item.status}`),
            dpias: activity.dpias.map((item) => item.publicId),
            rightsRequests: activity.rightsRequests.map((item) => item.publicId),
            retentionRules: activity.retentionRules.map((item) => item.publicId),
        };
    },

    previewImport(rows: unknown[]) {
        const preview = (Array.isArray(rows) ? rows : []).map((raw, index) => {
            const row = (raw || {}) as Record<string, unknown>;
            const name = neutralizeSpreadsheetCell(row.name || row.Name);
            const errors: string[] = [];
            if (!String(name).replace(/^'/, '').trim()) errors.push('Name is required');
            return {
                row: index + 1,
                name: String(name),
                description: neutralizeSpreadsheetCell(row.description || ''),
                jurisdictions: String(row.jurisdictions || '').split(',').map((item) => item.trim()).filter(Boolean),
                dataKind: row.dataKind ? String(row.dataKind) : null,
                duplicate: false,
                errors,
            };
        });
        return { honesty: PRIVACY_HONESTY, rows: preview, accepted: preview.filter((row) => !row.errors.length).length };
    },

    async commitImport(organizationId: string, actorUserId: string | null, rows: unknown[]) {
        const preview = this.previewImport(rows);
        const created: string[] = [];
        for (const row of preview.rows.filter((item) => !item.errors.length)) {
            const existing = await prisma.privacyProcessingActivity.findFirst({ where: { organizationId, name: row.name } });
            if (existing) continue;
            const activity = await this.createActivity(organizationId, actorUserId, {
                name: row.name,
                description: row.description,
                jurisdictions: row.jurisdictions,
                status: 'DRAFT',
            });
            if (row.dataKind && Object.values(PrivacyDataKind).includes(row.dataKind as PrivacyDataKind)) {
                await this.addData(organizationId, activity.publicId, actorUserId, { kind: row.dataKind, label: humanPrivacyLabel(row.dataKind) });
            }
            created.push(activity.publicId);
        }
        await audit({ organizationId, actorUserId, action: 'privacy.import.committed', resourceType: 'PrivacyProcessingActivity', metadata: { count: created.length } });
        return { created, honesty: PRIVACY_HONESTY };
    },

    async pack(organizationId: string) {
        const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
        const [dashboard, activities, transfers, dpias, rights, retention] = await Promise.all([
            this.dashboard(organizationId),
            this.listActivities(organizationId),
            this.listTransfers(organizationId),
            this.listDpias(organizationId),
            this.listRights(organizationId, false),
            this.listRetention(organizationId),
        ]);
        return {
            name: organization?.name || 'Organization',
            honesty: PRIVACY_HONESTY,
            dashboard,
            activities,
            transfers,
            dpias,
            rights,
            retention,
        };
    },

    async exportPack(organizationId: string) {
        const pack = await this.pack(organizationId);
        const rows = [
            ...pack.activities.map((row) => ({ sheet: 'Processing', id: row.publicId, title: row.name, extra: row.status, owner: row.owner })),
            ...pack.transfers.map((row) => ({ sheet: 'Transfers', id: row.publicId, title: `${row.source} → ${row.destination}`, extra: row.status, owner: row.owner })),
            ...pack.rights.map((row) => ({ sheet: 'Rights', id: row.publicId, title: row.requestType, extra: row.status, owner: row.owner })),
            ...pack.retention.map((row) => ({ sheet: 'Retention', id: row.publicId, title: row.period, extra: row.due ? 'Due' : 'Scheduled', owner: '' })),
        ];
        return { ...pack, rows };
    },
};

