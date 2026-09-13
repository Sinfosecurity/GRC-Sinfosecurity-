import {
    ComplianceActivationStatus,
    ComplianceApplicability,
    ComplianceAttestationReviewStatus,
    ComplianceAttestationStatus,
    ComplianceCampaignStatus,
    ComplianceExceptionStatus,
    ComplianceExceptionType,
    ComplianceGapSource,
    ComplianceGapStatus,
    CompliancePeriodItemStatus,
    CompliancePeriodItemType,
    CompliancePeriodStatus,
    EvidenceFreshness,
    GovernanceNodeType,
    GovernanceRelationshipType,
    Prisma,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { createRelationship, ensureNode } from './governanceGraphService';
import { adoptCatalogForOrganization, seedPlatformCatalog } from './sharedControlEvidenceService';
import { notifyUser } from './notificationDeliveryService';
import {
    buildReadiness,
    COMPLIANCE_HONESTY,
    evidenceCoverageLabel,
    humanComplianceLabel,
    neutralizeSpreadsheetCell,
    nextComplianceId,
} from './enterpriseComplianceEngine';

const USABLE_EVIDENCE = ['SUPPORTS', 'PARTIALLY_SUPPORTS'] as const;
const TESTED_RESULTS = ['PASS', 'FAIL', 'PARTIAL'] as const;

async function nextIds(organizationId: string, kind: string, count = 1) {
    const row = await prisma.complianceCounter.upsert({
        where: { organizationId_kind: { organizationId, kind } },
        create: { organizationId, kind, next: 1 + count },
        update: { next: { increment: count } },
    });
    const first = row.next - count;
    return Array.from({ length: count }, (_, index) => nextComplianceId(kind, first + index));
}

async function nextId(organizationId: string, kind: string) {
    const [id] = await nextIds(organizationId, kind, 1);
    return id;
}

async function history(organizationId: string, entityType: string, entityId: string, eventType: string, summary: string, actorUserId?: string | null, change?: string | null, payload?: unknown) {
    await prisma.complianceHistory.create({
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

async function expireExceptions(organizationId: string) {
    const now = new Date();
    const expired = await prisma.complianceException.findMany({
        where: { organizationId, status: 'APPROVED', expiresAt: { lt: now } },
        select: { id: true, publicId: true },
    });
    if (!expired.length) return;
    await prisma.complianceException.updateMany({
        where: { id: { in: expired.map((row) => row.id) } },
        data: { status: 'EXPIRED' },
    });
    for (const row of expired) {
        await history(organizationId, 'EXCEPTION', row.id, 'Exception expired', `${row.publicId} reached its end date.`, null, 'Approved → Expired');
    }
}

async function projectActivation(organizationId: string, activation: { id: string; publicId: string; status: string }, actorUserId?: string | null) {
    return ensureNode({
        organizationId,
        nodeType: GovernanceNodeType.FRAMEWORK,
        sourceModel: 'ComplianceActivation',
        sourceId: activation.id,
        displayLabel: activation.publicId,
        status: activation.status,
        actorUserId,
    });
}

function usableEvidenceWhere(organizationId: string) {
    return {
        organizationId,
        validTo: null,
        relationship: { in: [...USABLE_EVIDENCE] },
        storedObject: { scanStatus: 'CLEAN' as const },
        freshness: { in: [EvidenceFreshness.CURRENT, EvidenceFreshness.EXPIRING] },
    };
}

export const enterpriseComplianceService = {
    honesty: COMPLIANCE_HONESTY,

    async catalog(organizationId: string) {
        await seedPlatformCatalog();
        await adoptCatalogForOrganization(organizationId);
        const [versions, activations] = await Promise.all([
            prisma.frameworkVersion.findMany({
                include: { framework: true, _count: { select: { requirements: true } } },
                orderBy: [{ framework: { name: 'asc' } }, { version: 'asc' }],
            }),
            prisma.complianceActivation.findMany({
                where: { organizationId },
                select: { id: true, publicId: true, frameworkVersionId: true, status: true, businessUnitId: true },
            }),
        ]);
        return versions.map((version) => {
            const tenant = activations.filter((row) => row.frameworkVersionId === version.id);
            return {
                frameworkKey: version.framework.frameworkKey,
                name: version.framework.name,
                publisher: version.framework.publisher,
                sourceUrl: version.framework.sourceUrl,
                version: version.version,
                versionStatus: version.status,
                requirementCount: version._count.requirements,
                versionId: version.id,
                activated: tenant.length > 0,
                activations: tenant.map((row) => ({ publicId: row.publicId, status: humanComplianceLabel(row.status) })),
                endorsement: 'Supreme original summaries and public identifiers only. Not an official endorsement and not certification.',
            };
        });
    },

    async activate(organizationId: string, actorUserId: string | null, input: {
        frameworkVersionId: string;
        scope?: string;
        ownerUserId?: string | null;
        businessUnitId?: string | null;
        startDate?: string | null;
        targetDate?: string | null;
        status?: ComplianceActivationStatus;
    }) {
        await seedPlatformCatalog();
        await adoptCatalogForOrganization(organizationId, actorUserId || undefined);
        const version = await prisma.frameworkVersion.findUnique({
            where: { id: input.frameworkVersionId },
            include: { framework: true, requirements: true },
        });
        if (!version) throw new ApiError(404, 'Framework version not found');
        if (input.businessUnitId) {
            const unit = await prisma.businessUnit.findFirst({ where: { id: input.businessUnitId, organizationId } });
            if (!unit) throw new ApiError(404, 'Business unit not found');
        }
        const duplicate = await prisma.complianceActivation.findFirst({
            where: {
                organizationId,
                frameworkVersionId: version.id,
                businessUnitId: input.businessUnitId || null,
                status: { not: 'CLOSED' },
            },
        });
        if (duplicate) throw new ApiError(409, `${version.framework.name} ${version.version} is already active for this scope.`);
        const publicId = await nextId(organizationId, 'ACT');
        const activation = await prisma.complianceActivation.create({
            data: {
                organizationId,
                publicId,
                frameworkVersionId: version.id,
                businessUnitId: input.businessUnitId || null,
                ownerUserId: input.ownerUserId || null,
                scope: input.scope?.trim() || null,
                startDate: input.startDate ? new Date(input.startDate) : null,
                targetDate: input.targetDate ? new Date(input.targetDate) : null,
                status: input.status || 'ACTIVE',
            },
        });
        const stateIds = await nextIds(organizationId, 'CRS', version.requirements.length || 1);
        if (version.requirements.length) {
            await prisma.complianceRequirementState.createMany({
                data: version.requirements.map((requirement, index) => ({
                    organizationId,
                    publicId: stateIds[index],
                    activationId: activation.id,
                    requirementId: requirement.id,
                })),
            });
        }
        await projectActivation(organizationId, activation, actorUserId);
        await history(organizationId, 'ACTIVATION', activation.id, 'Framework activated', `${version.framework.name} ${version.version} is now in this compliance program.`, actorUserId, null, { framework: version.framework.name, version: version.version });
        await audit({ organizationId, actorUserId, action: 'compliance.framework.activated', resourceType: 'ComplianceActivation', resourceId: activation.id, metadata: { publicId, version: version.version } });
        await this.refreshGaps(organizationId, activation.publicId, actorUserId);
        return this.getActivation(organizationId, activation.publicId);
    },

    async dashboard(organizationId: string) {
        await seedPlatformCatalog();
        await adoptCatalogForOrganization(organizationId);
        await expireExceptions(organizationId);
        const now = new Date();
        const [activations, gaps, exceptions, campaigns, periods, changed] = await Promise.all([
            prisma.complianceActivation.findMany({
                where: { organizationId, status: { not: 'CLOSED' } },
                include: { frameworkVersion: { include: { framework: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.complianceGap.findMany({ where: { organizationId, status: { not: 'CLOSED' } }, orderBy: { createdAt: 'desc' }, take: 50 }),
            prisma.complianceException.findMany({ where: { organizationId, status: { in: ['REQUESTED', 'APPROVED', 'EXPIRED'] } } }),
            prisma.complianceAttestationCampaign.findMany({ where: { organizationId, status: { not: 'CLOSED' } } }),
            prisma.compliancePeriod.findMany({ where: { organizationId, status: { in: ['PREPARING', 'IN_PROGRESS'] } } }),
            prisma.complianceHistory.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 20 }),
        ]);
        const readiness = [];
        for (const activation of activations) {
            readiness.push({
                publicId: activation.publicId,
                name: activation.frameworkVersion.framework.name,
                version: activation.frameworkVersion.version,
                status: humanComplianceLabel(activation.status),
                ...(await this.readinessFor(organizationId, activation.id)),
            });
        }
        const names = await userNames(organizationId, [
            ...activations.map((row) => row.ownerUserId),
            ...changed.map((row) => row.actorUserId),
        ]);
        const overdueCampaigns = campaigns.filter((row) => row.dueAt && row.dueAt < now && row.status !== 'CLOSED');
        const expiredExceptions = exceptions.filter((row) => row.status === 'EXPIRED' || (row.expiresAt && row.expiresAt < now && row.status === 'APPROVED'));
        const attention = [
            ...overdueCampaigns.map((row) => ({ kind: 'Overdue attestations', title: row.name, href: `/compliance/campaigns/${row.publicId}`, publicId: row.publicId })),
            ...expiredExceptions.map((row) => ({ kind: 'Expired exceptions', title: row.scope, href: `/compliance/exceptions`, publicId: row.publicId })),
            ...gaps.filter((row) => row.source === 'UNMAPPED').slice(0, 8).map((row) => ({ kind: 'Requirements with no mapped controls', title: row.title, href: `/compliance/gaps`, publicId: row.publicId })),
            ...gaps.filter((row) => row.source === 'FAILED_TEST').slice(0, 6).map((row) => ({ kind: 'Failed control tests', title: row.title, href: `/compliance/gaps`, publicId: row.publicId })),
            ...gaps.filter((row) => row.source === 'EVIDENCE_EXPIRED').slice(0, 6).map((row) => ({ kind: 'Expired evidence', title: row.title, href: `/compliance/gaps`, publicId: row.publicId })),
            ...periods.filter((row) => row.endAt && row.endAt < now).map((row) => ({ kind: 'Upcoming framework/audit deadlines', title: row.name, href: `/compliance/audits/${row.publicId}`, publicId: row.publicId })),
        ].slice(0, 16);
        return {
            honesty: COMPLIANCE_HONESTY,
            totals: {
                activeFrameworks: activations.length,
                openGaps: gaps.length,
                overdueAttestations: overdueCampaigns.length,
                expiredExceptions: expiredExceptions.length,
                openPeriods: periods.length,
            },
            frameworks: readiness,
            gaps: gaps.slice(0, 8).map((row) => ({ publicId: row.publicId, title: row.title, source: humanComplianceLabel(row.source), status: humanComplianceLabel(row.status) })),
            exceptions: exceptions.slice(0, 8).map((row) => ({ publicId: row.publicId, scope: row.scope, type: humanComplianceLabel(row.type), status: humanComplianceLabel(row.status) })),
            campaigns: campaigns.map((row) => ({ publicId: row.publicId, name: row.name, status: humanComplianceLabel(row.dueAt && row.dueAt < now && row.status !== 'CLOSED' ? 'OVERDUE' : row.status), dueAt: row.dueAt })),
            periods: periods.map((row) => ({ publicId: row.publicId, name: row.name, status: humanComplianceLabel(row.status), endAt: row.endAt })),
            attention,
            changed: changed.map((row) => ({
                title: row.eventType,
                change: row.change,
                summary: row.summary,
                actor: ownerLabel(names, row.actorUserId) === 'Unassigned' && !row.actorUserId ? 'System' : ownerLabel(names, row.actorUserId),
                createdAt: row.createdAt,
                entityType: row.entityType,
            })),
        };
    },

    async readinessFor(organizationId: string, activationId: string) {
        const states = await prisma.complianceRequirementState.findMany({
            where: { organizationId, activationId },
            include: {
                requirement: { include: { mappings: { where: { validTo: null } } } },
            },
        });
        const applicable = states.filter((row) => row.applicability === 'APPLICABLE');
        const controlIds = [...new Set(applicable.flatMap((row) => row.requirement.mappings.map((map) => map.organizationControlId || map.catalogEntryId).filter(Boolean)))] as string[];
        const orgControls = await prisma.organizationControl.findMany({
            where: { organizationId, OR: [{ id: { in: controlIds } }, { catalogEntryId: { in: controlIds } }] },
            include: { tests: { orderBy: { testedAt: 'desc' }, take: 1 } },
        });
        const byId = new Map(orgControls.map((row) => [row.id, row]));
        const byCatalog = new Map(orgControls.filter((row) => row.catalogEntryId).map((row) => [row.catalogEntryId as string, row]));
        const resolve = (map: { organizationControlId: string | null; catalogEntryId: string | null }) =>
            (map.organizationControlId && byId.get(map.organizationControlId)) || (map.catalogEntryId && byCatalog.get(map.catalogEntryId)) || null;
        const evidence = await prisma.evidenceGovernanceLink.findMany({
            where: { ...usableEvidenceWhere(organizationId), targetType: 'CONTROL' },
            select: { targetId: true },
        });
        const evidenced = new Set(evidence.map((row) => row.targetId));
        let mappedApplicable = 0;
        let implementedMapped = 0;
        let evidenceMapped = 0;
        const implementedControls = new Set<string>();
        const testedImplemented = new Set<string>();
        for (const state of applicable) {
            const mapped = state.requirement.mappings.map(resolve).filter(Boolean);
            if (!mapped.length) continue;
            mappedApplicable += 1;
            if (mapped.some((control) => control!.implementationStatus === 'IMPLEMENTED')) implementedMapped += 1;
            if (mapped.some((control) => evidenced.has(control!.id))) evidenceMapped += 1;
            for (const control of mapped) {
                if (control!.implementationStatus !== 'IMPLEMENTED') continue;
                implementedControls.add(control!.id);
                const latest = control!.tests[0];
                if (latest && TESTED_RESULTS.includes(latest.result as typeof TESTED_RESULTS[number])) testedImplemented.add(control!.id);
            }
        }
        return buildReadiness({
            totalRequirements: states.length,
            applicable: applicable.length,
            notApplicable: states.filter((row) => row.applicability === 'NOT_APPLICABLE').length,
            notDetermined: states.filter((row) => row.applicability === 'NOT_DETERMINED').length,
            underReview: states.filter((row) => row.applicability === 'UNDER_REVIEW').length,
            mappedApplicable,
            implementedMapped,
            implementedControls: implementedControls.size,
            testedImplemented: testedImplemented.size,
            evidenceMapped,
        });
    },

    async listActivations(organizationId: string) {
        const rows = await this.catalog(organizationId);
        return rows.filter((row) => row.activated);
    },

    async getActivation(organizationId: string, publicId: string) {
        const activation = await prisma.complianceActivation.findFirst({
            where: { organizationId, OR: [{ publicId }, { id: publicId }] },
            include: {
                frameworkVersion: { include: { framework: true, requirements: true } },
                businessUnit: true,
            },
        });
        if (!activation) throw new ApiError(404, 'Framework program not found');
        const [states, gaps, exceptions, campaigns, periods, historyRows, names] = await Promise.all([
            this.listRequirements(organizationId, { activationId: activation.publicId }),
            prisma.complianceGap.findMany({ where: { organizationId, activationId: activation.id }, orderBy: { createdAt: 'desc' } }),
            prisma.complianceException.findMany({ where: { organizationId, activationId: activation.id }, orderBy: { createdAt: 'desc' } }),
            prisma.complianceAttestationCampaign.findMany({ where: { organizationId, activationId: activation.id } }),
            prisma.compliancePeriod.findMany({ where: { organizationId, activationId: activation.id } }),
            prisma.complianceHistory.findMany({ where: { organizationId, entityId: activation.id }, orderBy: { createdAt: 'desc' }, take: 40 }),
            userNames(organizationId, [activation.ownerUserId]),
        ]);
        const readiness = await this.readinessFor(organizationId, activation.id);
        return {
            honesty: COMPLIANCE_HONESTY,
            publicId: activation.publicId,
            name: activation.frameworkVersion.framework.name,
            publisher: activation.frameworkVersion.framework.publisher,
            version: activation.frameworkVersion.version,
            versionStatus: activation.frameworkVersion.status,
            versionId: activation.frameworkVersionId,
            scope: activation.scope,
            businessUnit: activation.businessUnit?.name || null,
            owner: ownerLabel(names, activation.ownerUserId),
            ownerUserId: activation.ownerUserId,
            startDate: activation.startDate,
            targetDate: activation.targetDate,
            status: humanComplianceLabel(activation.status),
            statusKey: activation.status,
            readiness,
            remainingWork: this.remainingWork(readiness, states, gaps),
            requirements: states,
            gaps: gaps.map((row) => ({ publicId: row.publicId, title: row.title, source: humanComplianceLabel(row.source), status: humanComplianceLabel(row.status) })),
            exceptions: exceptions.map((row) => ({ publicId: row.publicId, scope: row.scope, type: humanComplianceLabel(row.type), status: humanComplianceLabel(row.status), expiresAt: row.expiresAt })),
            campaigns: campaigns.map((row) => ({ publicId: row.publicId, name: row.name, status: humanComplianceLabel(row.status), dueAt: row.dueAt })),
            periods: periods.map((row) => ({ publicId: row.publicId, name: row.name, status: humanComplianceLabel(row.status), startAt: row.startAt, endAt: row.endAt })),
            history: historyRows.map((row) => ({ title: row.eventType, change: row.change, summary: row.summary, createdAt: row.createdAt })),
        };
    },

    remainingWork(readiness: Awaited<ReturnType<typeof buildReadiness>>, states: Array<{ applicability: string; mapped: boolean }>, gaps: Array<{ status: string }>) {
        const unmapped = states.filter((row) => row.applicability === 'Applicable' && !row.mapped).length;
        const openGaps = gaps.filter((row) => row.status !== 'CLOSED').length;
        return {
            unmappedRequirements: unmapped,
            openGaps,
            notDetermined: readiness.totals.notDetermined,
            message: readiness.calculable
                ? `${readiness.metrics.requirementCoverage.percent ?? 0}% of applicable requirements are mapped. ${readiness.metrics.evidenceCoverage.percent ?? 0}% already have current evidence. ${unmapped} requirements remain unmapped. ${openGaps} gaps are open.`
                : readiness.emptyReason,
        };
    },

    async listRequirements(organizationId: string, filters: {
        activationId?: string;
        q?: string;
        applicability?: string;
        owner?: string;
        unmapped?: boolean;
    }) {
        const activation = filters.activationId
            ? await prisma.complianceActivation.findFirst({ where: { organizationId, OR: [{ publicId: filters.activationId }, { id: filters.activationId }] } })
            : null;
        const states = await prisma.complianceRequirementState.findMany({
            where: {
                organizationId,
                ...(activation ? { activationId: activation.id } : {}),
                ...(filters.applicability ? { applicability: filters.applicability as ComplianceApplicability } : {}),
                ...(filters.owner === 'unassigned' ? { ownerUserId: null } : {}),
            },
            include: {
                requirement: { include: { frameworkVersion: { include: { framework: true } }, mappings: { where: { validTo: null } } } },
                activation: { include: { frameworkVersion: { include: { framework: true } } } },
            },
            take: 1000,
            orderBy: { publicId: 'asc' },
        });
        const controlIds = [...new Set(states.flatMap((row) => row.requirement.mappings.map((map) => map.organizationControlId || map.catalogEntryId).filter(Boolean)))] as string[];
        const controls = await prisma.organizationControl.findMany({
            where: { organizationId, OR: [{ id: { in: controlIds } }, { catalogEntryId: { in: controlIds } }] },
            include: { tests: { orderBy: { testedAt: 'desc' }, take: 1 } },
        });
        const names = await userNames(organizationId, states.map((row) => row.ownerUserId));
        const q = filters.q?.toLowerCase();
        return states
            .map((state) => {
                const mappedControls = controls.filter((control) =>
                    state.requirement.mappings.some((map) => map.organizationControlId === control.id || map.catalogEntryId === control.catalogEntryId),
                );
                const latestTest = mappedControls.map((control) => control.tests[0]).find(Boolean);
                return {
                    publicId: state.publicId,
                    requirementKey: state.requirement.requirementKey,
                    summary: state.requirement.supremeSummary,
                    framework: state.requirement.frameworkVersion.framework.name,
                    version: state.requirement.frameworkVersion.version,
                    applicability: humanComplianceLabel(state.applicability),
                    applicabilityKey: state.applicability,
                    owner: ownerLabel(names, state.ownerUserId),
                    mapped: mappedControls.length > 0,
                    mappedCount: mappedControls.length,
                    implementation: mappedControls.some((control) => control.implementationStatus === 'IMPLEMENTED')
                        ? 'Implemented'
                        : mappedControls.length
                            ? 'Not implemented'
                            : 'Unmapped',
                    effectiveness: mappedControls[0] ? humanComplianceLabel(mappedControls[0].effectivenessStatus) : 'Not tested',
                    latestTest: latestTest ? humanComplianceLabel(latestTest.result) : 'Not tested',
                    sourceUrl: state.requirement.sourceUrl,
                };
            })
            .filter((row) => {
                if (filters.unmapped && row.mapped) return false;
                if (q && !`${row.requirementKey} ${row.summary} ${row.framework}`.toLowerCase().includes(q)) return false;
                return true;
            });
    },

    async getRequirement(organizationId: string, publicId: string) {
        const state = await prisma.complianceRequirementState.findFirst({
            where: { organizationId, OR: [{ publicId }, { id: publicId }] },
            include: {
                requirement: { include: { frameworkVersion: { include: { framework: true } }, mappings: { where: { validTo: null }, include: { catalogEntry: true } } } },
                activation: { include: { frameworkVersion: { include: { framework: true } } } },
            },
        });
        if (!state) throw new ApiError(404, 'Requirement not found');
        const controls = await prisma.organizationControl.findMany({
            where: {
                organizationId,
                OR: [
                    { id: { in: state.requirement.mappings.map((map) => map.organizationControlId).filter(Boolean) as string[] } },
                    { catalogEntryId: { in: state.requirement.mappings.map((map) => map.catalogEntryId).filter(Boolean) as string[] } },
                ],
            },
            include: { tests: { orderBy: { testedAt: 'desc' }, take: 3 } },
        });
        const evidence = await prisma.evidenceGovernanceLink.findMany({
            where: {
                organizationId,
                validTo: null,
                OR: [
                    { targetType: 'REQUIREMENT', targetId: state.requirementId },
                    { targetType: 'CONTROL', targetId: { in: controls.map((row) => row.id) } },
                ],
            },
            include: { storedObject: true },
        });
        const [gaps, exceptions, historyRows, names] = await Promise.all([
            prisma.complianceGap.findMany({ where: { organizationId, requirementStateId: state.id } }),
            prisma.complianceException.findMany({ where: { organizationId, requirementStateId: state.id } }),
            prisma.complianceHistory.findMany({ where: { organizationId, entityId: state.id }, orderBy: { createdAt: 'desc' }, take: 40 }),
            userNames(organizationId, [state.ownerUserId, state.naActorUserId]),
        ]);
        const riskIds = [...new Set([...gaps, ...exceptions].map((row) => row.enterpriseRiskId).filter(Boolean) as string[])];
        const findingIds = gaps.map((row) => row.findingId).filter(Boolean) as string[];
        const [risks, findings] = await Promise.all([
            riskIds.length
                ? prisma.enterpriseRisk.findMany({
                    where: { organizationId, id: { in: riskIds } },
                    select: { publicId: true, title: true, residualRating: true, appetiteStatus: true },
                })
                : Promise.resolve([]),
            findingIds.length
                ? prisma.vendorIssue.findMany({
                    where: { organizationId, id: { in: findingIds } },
                    select: { id: true, title: true, severity: true, status: true },
                })
                : Promise.resolve([]),
        ]);
        const cleanExisting = evidence.filter((link) => link.storedObject.scanStatus === 'CLEAN' && USABLE_EVIDENCE.includes(link.relationship as typeof USABLE_EVIDENCE[number]));
        return {
            honesty: COMPLIANCE_HONESTY,
            publicId: state.publicId,
            requirementKey: state.requirement.requirementKey,
            summary: state.requirement.supremeSummary,
            sourceUrl: state.requirement.sourceUrl,
            framework: state.requirement.frameworkVersion.framework.name,
            version: state.requirement.frameworkVersion.version,
            activationId: state.activation.publicId,
            applicability: humanComplianceLabel(state.applicability),
            applicabilityKey: state.applicability,
            naRationale: state.naRationale,
            naActor: ownerLabel(names, state.naActorUserId),
            naAt: state.naAt,
            owner: ownerLabel(names, state.ownerUserId),
            ownerUserId: state.ownerUserId,
            controls: controls.map((control) => {
                const mapping = state.requirement.mappings.find((map) => map.organizationControlId === control.id || map.catalogEntryId === control.catalogEntryId);
                const latest = control.tests[0];
                return {
                    id: control.id,
                    controlKey: control.controlKey,
                    title: control.title,
                    strength: humanComplianceLabel(mapping?.mappingStrength || 'RELATED'),
                    implementation: humanComplianceLabel(control.implementationStatus),
                    effectiveness: humanComplianceLabel(control.effectivenessStatus),
                    latestTest: latest ? humanComplianceLabel(latest.result) : 'Not tested',
                    tester: latest?.testerUserId || null,
                    nextTestAt: latest?.nextTestAt || control.nextTestAt,
                };
            }),
            evidence: evidence.map((link) => ({
                id: link.id,
                filename: link.storedObject.filename,
                coverage: evidenceCoverageLabel({
                    scanStatus: link.storedObject.scanStatus,
                    freshness: link.freshness,
                    expiresAt: link.expiresAt,
                    relationship: link.relationship,
                }),
                relationship: humanComplianceLabel(link.relationship),
                usable: link.storedObject.scanStatus === 'CLEAN' && USABLE_EVIDENCE.includes(link.relationship as typeof USABLE_EVIDENCE[number]),
            })),
            existingEvidenceOffer: cleanExisting.length
                ? `${cleanExisting.length} CLEAN evidence item${cleanExisting.length === 1 ? '' : 's'} already support this requirement or its mapped controls. Use existing evidence before uploading a new file.`
                : 'No CLEAN reusable evidence is linked yet. Upload only if nothing existing applies.',
            gaps: gaps.map((row) => ({ publicId: row.publicId, title: row.title, source: humanComplianceLabel(row.source), status: humanComplianceLabel(row.status) })),
            exceptions: exceptions.map((row) => ({ publicId: row.publicId, scope: row.scope, status: humanComplianceLabel(row.status) })),
            relatedRisks: risks.map((row) => ({
                publicId: row.publicId,
                title: row.title,
                residualRating: humanComplianceLabel(row.residualRating),
                appetite: humanComplianceLabel(row.appetiteStatus),
                note: 'Potential risk impact. Residual score is unchanged until Supreme Risk recalculates it.',
            })),
            findings: findings.map((row) => ({ title: row.title, severity: humanComplianceLabel(row.severity), status: humanComplianceLabel(row.status) })),
            history: historyRows.map((row) => ({ title: row.eventType, change: row.change, summary: row.summary, createdAt: row.createdAt })),
        };
    },

    async setApplicability(organizationId: string, publicId: string, actorUserId: string | null, input: { applicability: ComplianceApplicability; rationale?: string }) {
        const state = await prisma.complianceRequirementState.findFirst({ where: { organizationId, publicId } });
        if (!state) throw new ApiError(404, 'Requirement not found');
        if (input.applicability === 'NOT_APPLICABLE') {
            if (!input.rationale?.trim()) throw new ApiError(400, 'Not applicable requires a rationale, actor, and date.');
        }
        const updated = await prisma.complianceRequirementState.update({
            where: { id: state.id },
            data: {
                applicability: input.applicability,
                naRationale: input.applicability === 'NOT_APPLICABLE' ? input.rationale!.trim() : state.naRationale,
                naActorUserId: input.applicability === 'NOT_APPLICABLE' ? actorUserId : state.naActorUserId,
                naAt: input.applicability === 'NOT_APPLICABLE' ? new Date() : state.naAt,
            },
        });
        await history(organizationId, 'REQUIREMENT', state.id, 'Applicability changed', `${state.publicId} is now ${humanComplianceLabel(input.applicability)}.`, actorUserId, `${humanComplianceLabel(state.applicability)} → ${humanComplianceLabel(input.applicability)}`);
        await audit({ organizationId, actorUserId, action: 'compliance.applicability.changed', resourceType: 'ComplianceRequirementState', resourceId: state.id });
        if (updated.activationId) {
            const activation = await prisma.complianceActivation.findUnique({ where: { id: updated.activationId } });
            if (activation) await this.refreshGaps(organizationId, activation.publicId, actorUserId);
        }
        return this.getRequirement(organizationId, publicId);
    },

    async setRequirementOwner(organizationId: string, publicId: string, actorUserId: string | null, ownerUserId: string | null) {
        const state = await prisma.complianceRequirementState.findFirst({ where: { organizationId, publicId } });
        if (!state) throw new ApiError(404, 'Requirement not found');
        if (ownerUserId) {
            const user = await prisma.user.findFirst({ where: { id: ownerUserId, organizationId, status: 'ACTIVE' } });
            if (!user) throw new ApiError(404, 'Owner not found in this organization');
        }
        const names = await userNames(organizationId, [state.ownerUserId, ownerUserId]);
        await prisma.complianceRequirementState.update({ where: { id: state.id }, data: { ownerUserId } });
        await history(organizationId, 'REQUIREMENT', state.id, 'Owner changed', 'Requirement ownership was updated.', actorUserId, `${ownerLabel(names, state.ownerUserId)} → ${ownerLabel(names, ownerUserId)}`);
        return this.getRequirement(organizationId, publicId);
    },

    async refreshGaps(organizationId: string, activationPublicId: string, actorUserId?: string | null) {
        const activation = await prisma.complianceActivation.findFirst({
            where: { organizationId, OR: [{ publicId: activationPublicId }, { id: activationPublicId }] },
        });
        if (!activation) throw new ApiError(404, 'Framework program not found');
        const states = await prisma.complianceRequirementState.findMany({
            where: { organizationId, activationId: activation.id, applicability: 'APPLICABLE' },
            include: {
                requirement: { include: { mappings: { where: { validTo: null } } } },
            },
        });
        const controls = await prisma.organizationControl.findMany({
            where: { organizationId },
            include: { tests: { orderBy: { testedAt: 'desc' }, take: 1 } },
        });
        const evidence = await prisma.evidenceGovernanceLink.findMany({
            where: usableEvidenceWhere(organizationId),
        });
        const expiredEvidence = await prisma.evidenceGovernanceLink.findMany({
            where: { organizationId, validTo: null, OR: [{ freshness: 'EXPIRED' }, { expiresAt: { lt: new Date() } }] },
        });
        const findings = await prisma.vendorIssue.findMany({
            where: { organizationId, status: { in: ['OPEN', 'IN_PROGRESS'] }, issueType: { in: ['CONTROL_FAILURE', 'COMPLIANCE_GAP', 'AUDIT_FINDING'] } },
            select: { id: true, title: true },
        });
        const openExceptions = await prisma.complianceException.findMany({
            where: { organizationId, activationId: activation.id, status: { in: ['REQUESTED', 'APPROVED', 'EXPIRED'] } },
        });
        const existing = await prisma.complianceGap.findMany({
            where: { organizationId, activationId: activation.id, status: { not: 'CLOSED' } },
        });
        const wanted: Array<{ source: ComplianceGapSource; requirementStateId?: string; organizationControlId?: string; findingId?: string; title: string; explanation: string }> = [];
        for (const state of states) {
            const mapped = controls.filter((control) =>
                state.requirement.mappings.some((map) => map.organizationControlId === control.id || map.catalogEntryId === control.catalogEntryId),
            );
            if (!mapped.length) {
                wanted.push({
                    source: 'UNMAPPED',
                    requirementStateId: state.id,
                    title: `${state.requirement.requirementKey} has no mapped control`,
                    explanation: 'This applicable requirement has no active common-control mapping.',
                });
                continue;
            }
            if (mapped.every((control) => control.implementationStatus !== 'IMPLEMENTED')) {
                wanted.push({
                    source: 'NOT_IMPLEMENTED',
                    requirementStateId: state.id,
                    organizationControlId: mapped[0].id,
                    title: `${state.requirement.requirementKey} is mapped to controls that are not implemented`,
                    explanation: 'Mapped controls exist but none are recorded as implemented.',
                });
            }
            if (mapped.some((control) => control.effectivenessStatus === 'INEFFECTIVE')) {
                const control = mapped.find((row) => row.effectivenessStatus === 'INEFFECTIVE')!;
                wanted.push({
                    source: 'INEFFECTIVE',
                    requirementStateId: state.id,
                    organizationControlId: control.id,
                    title: `${control.controlKey} is ineffective for ${state.requirement.requirementKey}`,
                    explanation: 'A mapped control is recorded as ineffective. An exception does not change that status.',
                });
            }
            const latestFail = mapped.find((control) => control.tests[0]?.result === 'FAIL');
            if (latestFail) {
                wanted.push({
                    source: 'FAILED_TEST',
                    requirementStateId: state.id,
                    organizationControlId: latestFail.id,
                    findingId: latestFail.tests[0]?.findingId || findings.find((row) => row.title.includes(latestFail.controlKey))?.id,
                    title: `${latestFail.controlKey} failed its latest test`,
                    explanation: 'The latest recorded control test is Fail. Not tested is not pass.',
                });
            }
            const hasEvidence = mapped.some((control) => evidence.some((link) => link.targetType === 'CONTROL' && link.targetId === control.id));
            if (!hasEvidence) {
                wanted.push({
                    source: 'EVIDENCE_MISSING',
                    requirementStateId: state.id,
                    title: `${state.requirement.requirementKey} has no current CLEAN evidence`,
                    explanation: 'No CLEAN supporting evidence is linked to the mapped controls or this requirement.',
                });
            }
            if (mapped.some((control) => expiredEvidence.some((link) => link.targetType === 'CONTROL' && link.targetId === control.id))) {
                wanted.push({
                    source: 'EVIDENCE_EXPIRED',
                    requirementStateId: state.id,
                    title: `${state.requirement.requirementKey} has expired evidence`,
                    explanation: 'A linked evidence object is expired. Availability is not compliance.',
                });
            }
        }
        for (const item of openExceptions.filter((row) => row.status === 'EXPIRED')) {
            wanted.push({
                source: 'UNRESOLVED_EXCEPTION',
                requirementStateId: item.requirementStateId || undefined,
                organizationControlId: item.organizationControlId || undefined,
                title: `Expired exception ${item.publicId}`,
                explanation: 'An approved exception reached its end date and is now expired.',
            });
        }
        let created = 0;
        for (const item of wanted) {
            const match = existing.find((row) =>
                row.source === item.source
                && row.requirementStateId === (item.requirementStateId || null)
                && row.organizationControlId === (item.organizationControlId || null),
            );
            if (match) continue;
            const linkedFinding = item.findingId || null;
            await prisma.complianceGap.create({
                data: {
                    organizationId,
                    publicId: await nextId(organizationId, 'GAP'),
                    activationId: activation.id,
                    requirementStateId: item.requirementStateId || null,
                    organizationControlId: item.organizationControlId || null,
                    findingId: linkedFinding,
                    source: item.source,
                    title: item.title,
                    explanation: item.explanation,
                    status: linkedFinding ? 'LINKED_FINDING' : 'OPEN',
                },
            });
            created += 1;
        }
        if (created) {
            await history(organizationId, 'ACTIVATION', activation.id, 'Gaps refreshed', `${created} gap${created === 1 ? '' : 's'} opened from live control, evidence, and test records.`, actorUserId);
        }
        return this.getActivation(organizationId, activation.publicId);
    },

    async createGap(organizationId: string, actorUserId: string | null, input: {
        activationId?: string;
        requirementStateId?: string;
        organizationControlId?: string;
        findingId?: string;
        enterpriseRiskId?: string;
        source: ComplianceGapSource;
        title: string;
        explanation: string;
        ownerUserId?: string;
        dueDate?: string;
        remediation?: string;
    }) {
        const activation = input.activationId
            ? await prisma.complianceActivation.findFirst({ where: { organizationId, OR: [{ publicId: input.activationId }, { id: input.activationId }] } })
            : null;
        if (input.findingId) {
            const finding = await prisma.vendorIssue.findFirst({ where: { organizationId, id: input.findingId } });
            if (!finding) throw new ApiError(404, 'Finding not found');
        }
        if (input.enterpriseRiskId) {
            const risk = await prisma.enterpriseRisk.findFirst({ where: { organizationId, OR: [{ id: input.enterpriseRiskId }, { publicId: input.enterpriseRiskId }] } });
            if (!risk) throw new ApiError(404, 'Enterprise risk not found');
            input.enterpriseRiskId = risk.id;
        }
        const gap = await prisma.complianceGap.create({
            data: {
                organizationId,
                publicId: await nextId(organizationId, 'GAP'),
                activationId: activation?.id || null,
                requirementStateId: input.requirementStateId || null,
                organizationControlId: input.organizationControlId || null,
                findingId: input.findingId || null,
                enterpriseRiskId: input.enterpriseRiskId || null,
                source: input.source,
                title: input.title.trim(),
                explanation: input.explanation.trim(),
                ownerUserId: input.ownerUserId || null,
                dueDate: input.dueDate ? new Date(input.dueDate) : null,
                remediation: input.remediation || null,
                status: input.findingId ? 'LINKED_FINDING' : 'OPEN',
            },
        });
        if (input.enterpriseRiskId) {
            const risk = await prisma.enterpriseRisk.findFirst({ where: { organizationId, id: input.enterpriseRiskId } });
            if (risk) {
                const gapNode = await ensureNode({
                    organizationId,
                    nodeType: GovernanceNodeType.COMPLIANCE_GAP,
                    sourceModel: 'ComplianceGap',
                    sourceId: gap.id,
                    displayLabel: gap.publicId,
                    actorUserId,
                });
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
                    fromNodeId: gapNode.node.id,
                    toNodeId: riskNode.node.id,
                    relationshipType: GovernanceRelationshipType.ASSOCIATED_WITH,
                    createdBy: actorUserId,
                });
            }
        }
        await history(organizationId, 'GAP', gap.id, 'Gap opened', gap.title, actorUserId);
        await audit({ organizationId, actorUserId, action: 'compliance.gap.opened', resourceType: 'ComplianceGap', resourceId: gap.id });
        return gap;
    },

    async updateGap(organizationId: string, publicId: string, actorUserId: string | null, input: { status?: ComplianceGapStatus; remediation?: string; enterpriseRiskId?: string; findingId?: string }) {
        const gap = await prisma.complianceGap.findFirst({ where: { organizationId, publicId } });
        if (!gap) throw new ApiError(404, 'Gap not found');
        let enterpriseRiskId = gap.enterpriseRiskId;
        if (input.enterpriseRiskId) {
            const risk = await prisma.enterpriseRisk.findFirst({ where: { organizationId, OR: [{ id: input.enterpriseRiskId }, { publicId: input.enterpriseRiskId }] } });
            if (!risk) throw new ApiError(404, 'Enterprise risk not found');
            enterpriseRiskId = risk.id;
        }
        const updated = await prisma.complianceGap.update({
            where: { id: gap.id },
            data: {
                status: input.status || gap.status,
                remediation: input.remediation ?? gap.remediation,
                enterpriseRiskId,
                findingId: input.findingId ?? gap.findingId,
            },
        });
        await history(organizationId, 'GAP', gap.id, input.status === 'CLOSED' ? 'Gap closed' : 'Gap updated', updated.title, actorUserId, input.status ? `${humanComplianceLabel(gap.status)} → ${humanComplianceLabel(input.status)}` : null);
        return updated;
    },

    async createException(organizationId: string, actorUserId: string | null, input: {
        type: ComplianceExceptionType;
        scope: string;
        rationale: string;
        conditions?: string;
        ownerUserId: string;
        startAt: string;
        expiresAt?: string;
        reviewAt?: string;
        activationId?: string;
        requirementStateId?: string;
        organizationControlId?: string;
        enterpriseRiskId?: string;
    }) {
        const activation = input.activationId
            ? await prisma.complianceActivation.findFirst({ where: { organizationId, OR: [{ publicId: input.activationId }, { id: input.activationId }] } })
            : null;
        const exception = await prisma.complianceException.create({
            data: {
                organizationId,
                publicId: await nextId(organizationId, 'EXC'),
                type: input.type,
                scope: input.scope.trim(),
                rationale: input.rationale.trim(),
                conditions: input.conditions || null,
                ownerUserId: input.ownerUserId,
                startAt: new Date(input.startAt),
                expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
                reviewAt: input.reviewAt ? new Date(input.reviewAt) : null,
                activationId: activation?.id || null,
                requirementStateId: input.requirementStateId || null,
                organizationControlId: input.organizationControlId || null,
                enterpriseRiskId: input.enterpriseRiskId || null,
            },
        });
        if (input.organizationControlId || input.requirementStateId) {
            const exceptionNode = await ensureNode({
                organizationId,
                nodeType: GovernanceNodeType.EXCEPTION,
                sourceModel: 'ComplianceException',
                sourceId: exception.id,
                displayLabel: exception.publicId,
                actorUserId,
            });
            if (input.organizationControlId) {
                const controlNode = await ensureNode({
                    organizationId,
                    nodeType: GovernanceNodeType.CONTROL,
                    sourceModel: 'OrganizationControl',
                    sourceId: input.organizationControlId,
                    displayLabel: 'Control',
                    actorUserId,
                });
                await createRelationship({
                    organizationId,
                    fromNodeId: exceptionNode.node.id,
                    toNodeId: controlNode.node.id,
                    relationshipType: GovernanceRelationshipType.APPLIES_TO,
                    createdBy: actorUserId,
                });
            }
        }
        await history(organizationId, 'EXCEPTION', exception.id, 'Exception requested', exception.scope, actorUserId);
        await audit({ organizationId, actorUserId, action: 'compliance.exception.requested', resourceType: 'ComplianceException', resourceId: exception.id });
        return exception;
    },

    async decideException(organizationId: string, publicId: string, actorUserId: string | null, input: { decision: 'APPROVED' | 'REJECTED' | 'CLOSED' }) {
        const exception = await prisma.complianceException.findFirst({ where: { organizationId, publicId } });
        if (!exception) throw new ApiError(404, 'Exception not found');
        const updated = await prisma.complianceException.update({
            where: { id: exception.id },
            data: {
                status: input.decision,
                approverUserId: actorUserId,
                approvedAt: input.decision === 'APPROVED' ? new Date() : exception.approvedAt,
            },
        });
        await history(organizationId, 'EXCEPTION', exception.id, input.decision === 'APPROVED' ? 'Exception approved' : input.decision === 'REJECTED' ? 'Exception rejected' : 'Exception closed', exception.scope, actorUserId, `${humanComplianceLabel(exception.status)} → ${humanComplianceLabel(input.decision)}`);
        await audit({ organizationId, actorUserId, action: `compliance.exception.${input.decision.toLowerCase()}`, resourceType: 'ComplianceException', resourceId: exception.id });
        return updated;
    },

    async createCampaign(organizationId: string, actorUserId: string | null, input: {
        name: string;
        activationId?: string;
        periodStart?: string;
        periodEnd?: string;
        dueAt?: string;
        ownerUserId?: string;
        attestorUserIds?: string[];
        reviewerUserId?: string;
        controlIds?: string[];
    }) {
        const activation = input.activationId
            ? await prisma.complianceActivation.findFirst({ where: { organizationId, OR: [{ publicId: input.activationId }, { id: input.activationId }] } })
            : null;
        const campaign = await prisma.complianceAttestationCampaign.create({
            data: {
                organizationId,
                publicId: await nextId(organizationId, 'CAM'),
                name: input.name.trim(),
                activationId: activation?.id || null,
                periodStart: input.periodStart ? new Date(input.periodStart) : null,
                periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
                dueAt: input.dueAt ? new Date(input.dueAt) : null,
                ownerUserId: input.ownerUserId || actorUserId,
                status: 'NOT_STARTED',
            },
        });
        for (const attestorUserId of input.attestorUserIds || []) {
            await prisma.complianceCampaignAssignment.create({
                data: {
                    organizationId,
                    campaignId: campaign.id,
                    attestorUserId,
                    reviewerUserId: input.reviewerUserId || null,
                },
            });
            await notifyUser({
                organizationId,
                userId: attestorUserId,
                eventType: 'attestation.assigned',
                title: 'Control attestation assigned',
                body: `${campaign.name} needs an attestation. This is a governance statement, not a control test.`,
                resourceType: 'ComplianceAttestationCampaign',
                resourceId: campaign.id,
            });
        }
        await history(organizationId, 'CAMPAIGN', campaign.id, 'Attestation campaign created', campaign.name, actorUserId);
        await audit({ organizationId, actorUserId, action: 'compliance.campaign.created', resourceType: 'ComplianceAttestationCampaign', resourceId: campaign.id });
        return this.getCampaign(organizationId, campaign.publicId);
    },

    async getCampaign(organizationId: string, publicId: string) {
        const campaign = await prisma.complianceAttestationCampaign.findFirst({
            where: { organizationId, OR: [{ publicId }, { id: publicId }] },
            include: { assignments: true, attestations: true, activation: { include: { frameworkVersion: { include: { framework: true } } } } },
        });
        if (!campaign) throw new ApiError(404, 'Attestation campaign not found');
        const now = new Date();
        const status = campaign.dueAt && campaign.dueAt < now && campaign.status !== 'CLOSED' && campaign.status !== 'REVIEWED'
            ? 'OVERDUE'
            : campaign.status;
        return {
            publicId: campaign.publicId,
            name: campaign.name,
            framework: campaign.activation?.frameworkVersion.framework.name || null,
            periodStart: campaign.periodStart,
            periodEnd: campaign.periodEnd,
            dueAt: campaign.dueAt,
            status: humanComplianceLabel(status),
            statusKey: status,
            assignments: campaign.assignments.length,
            submitted: campaign.attestations.length,
            honesty: 'An attestation is a governance statement. It is not a control test and does not prove effectiveness.',
        };
    },

    async attest(organizationId: string, actorUserId: string, input: {
        campaignId?: string;
        organizationControlId: string;
        requirementStateId?: string;
        status: ComplianceAttestationStatus;
        statement: string;
        periodStart?: string;
        periodEnd?: string;
    }) {
        if (!input.statement?.trim()) throw new ApiError(400, 'An attestation requires a statement.');
        const control = await prisma.organizationControl.findFirst({ where: { organizationId, id: input.organizationControlId } });
        if (!control) throw new ApiError(404, 'Control not found');
        const campaign = input.campaignId
            ? await prisma.complianceAttestationCampaign.findFirst({ where: { organizationId, OR: [{ publicId: input.campaignId }, { id: input.campaignId }] } })
            : null;
        const attestation = await prisma.complianceAttestation.create({
            data: {
                organizationId,
                publicId: await nextId(organizationId, 'ATT'),
                campaignId: campaign?.id || null,
                organizationControlId: control.id,
                requirementStateId: input.requirementStateId || null,
                status: input.status,
                statement: input.statement.trim(),
                periodStart: input.periodStart ? new Date(input.periodStart) : null,
                periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
                attestorUserId: actorUserId,
            },
        });
        if (campaign && campaign.status === 'NOT_STARTED') {
            await prisma.complianceAttestationCampaign.update({ where: { id: campaign.id }, data: { status: 'IN_PROGRESS' } });
        }
        await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.ATTESTATION,
            sourceModel: 'ComplianceAttestation',
            sourceId: attestation.id,
            displayLabel: attestation.publicId,
            actorUserId,
        });
        await history(organizationId, 'ATTESTATION', attestation.id, 'Attestation submitted', `${control.controlKey} attested as ${humanComplianceLabel(input.status)}.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'compliance.attestation.submitted', resourceType: 'ComplianceAttestation', resourceId: attestation.id });
        return attestation;
    },

    async reviewAttestation(organizationId: string, publicId: string, actorUserId: string | null, input: { reviewStatus: ComplianceAttestationReviewStatus; reviewNotes?: string }) {
        const attestation = await prisma.complianceAttestation.findFirst({ where: { organizationId, publicId } });
        if (!attestation) throw new ApiError(404, 'Attestation not found');
        const updated = await prisma.complianceAttestation.update({
            where: { id: attestation.id },
            data: { reviewStatus: input.reviewStatus, reviewerUserId: actorUserId, reviewedAt: new Date(), reviewNotes: input.reviewNotes || null },
        });
        await history(organizationId, 'ATTESTATION', attestation.id, 'Attestation reviewed', `Review is ${humanComplianceLabel(input.reviewStatus)}.`, actorUserId);
        return updated;
    },

    async createPeriod(organizationId: string, actorUserId: string | null, input: {
        activationId: string;
        name: string;
        startAt: string;
        endAt?: string;
        ownerUserId?: string;
    }) {
        const activation = await prisma.complianceActivation.findFirst({
            where: { organizationId, OR: [{ publicId: input.activationId }, { id: input.activationId }] },
        });
        if (!activation) throw new ApiError(404, 'Framework program not found');
        const period = await prisma.compliancePeriod.create({
            data: {
                organizationId,
                publicId: await nextId(organizationId, 'AUD'),
                activationId: activation.id,
                frameworkVersionId: activation.frameworkVersionId,
                name: input.name.trim(),
                startAt: new Date(input.startAt),
                endAt: input.endAt ? new Date(input.endAt) : null,
                ownerUserId: input.ownerUserId || actorUserId,
            },
        });
        await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.COMPLIANCE_PERIOD,
            sourceModel: 'CompliancePeriod',
            sourceId: period.id,
            displayLabel: `${period.publicId} ${period.name}`,
            actorUserId,
        });
        await history(organizationId, 'PERIOD', period.id, 'Audit period created', `${period.name} is tied to the framework version in force when it was created.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'compliance.period.created', resourceType: 'CompliancePeriod', resourceId: period.id });
        return this.getPeriod(organizationId, period.publicId);
    },

    async getPeriod(organizationId: string, publicId: string) {
        const period = await prisma.compliancePeriod.findFirst({
            where: { organizationId, OR: [{ publicId }, { id: publicId }] },
            include: {
                frameworkVersion: { include: { framework: true } },
                activation: true,
                items: true,
            },
        });
        if (!period) throw new ApiError(404, 'Audit period not found');
        return {
            publicId: period.publicId,
            name: period.name,
            framework: period.frameworkVersion.framework.name,
            version: period.frameworkVersion.version,
            activationId: period.activation.publicId,
            startAt: period.startAt,
            endAt: period.endAt,
            status: humanComplianceLabel(period.status),
            statusKey: period.status,
            items: period.items.map((item) => ({
                id: item.id,
                type: humanComplianceLabel(item.itemType),
                status: humanComplianceLabel(item.status),
                notes: item.notes,
                dueAt: item.dueAt,
            })),
            honesty: 'This is internal audit or readiness work. It is not an external attestation or certification.',
        };
    },

    async addPeriodItem(organizationId: string, publicId: string, actorUserId: string | null, input: {
        itemType: CompliancePeriodItemType;
        requirementStateId?: string;
        organizationControlId?: string;
        storedObjectId?: string;
        notes?: string;
        dueAt?: string;
    }) {
        const period = await prisma.compliancePeriod.findFirst({ where: { organizationId, publicId } });
        if (!period) throw new ApiError(404, 'Audit period not found');
        const item = await prisma.compliancePeriodItem.create({
            data: {
                organizationId,
                periodId: period.id,
                itemType: input.itemType,
                requirementStateId: input.requirementStateId || null,
                organizationControlId: input.organizationControlId || null,
                storedObjectId: input.storedObjectId || null,
                notes: input.notes || null,
                dueAt: input.dueAt ? new Date(input.dueAt) : null,
            },
        });
        if (input.requirementStateId || input.organizationControlId) {
            const periodNode = await ensureNode({
                organizationId,
                nodeType: GovernanceNodeType.COMPLIANCE_PERIOD,
                sourceModel: 'CompliancePeriod',
                sourceId: period.id,
                displayLabel: period.publicId,
                actorUserId,
            });
            if (input.requirementStateId) {
                const state = await prisma.complianceRequirementState.findFirst({ where: { organizationId, id: input.requirementStateId } });
                if (state) {
                    const reqNode = await ensureNode({
                        organizationId,
                        nodeType: GovernanceNodeType.REQUIREMENT,
                        sourceModel: 'FrameworkRequirement',
                        sourceId: state.requirementId,
                        displayLabel: state.publicId,
                        actorUserId,
                    });
                    await createRelationship({
                        organizationId,
                        fromNodeId: periodNode.node.id,
                        toNodeId: reqNode.node.id,
                        relationshipType: GovernanceRelationshipType.COVERS,
                        createdBy: actorUserId,
                    });
                }
            }
        }
        await history(organizationId, 'PERIOD', period.id, 'Period item added', humanComplianceLabel(input.itemType), actorUserId);
        return item;
    },

    async updatePeriodItem(organizationId: string, itemId: string, input: { status?: CompliancePeriodItemStatus; notes?: string }) {
        const item = await prisma.compliancePeriodItem.findFirst({ where: { organizationId, id: itemId } });
        if (!item) throw new ApiError(404, 'Period item not found');
        return prisma.compliancePeriodItem.update({ where: { id: item.id }, data: { status: input.status || item.status, notes: input.notes ?? item.notes } });
    },

    async changeVersion(organizationId: string, publicId: string, actorUserId: string | null, frameworkVersionId: string, notes?: string) {
        const activation = await prisma.complianceActivation.findFirst({
            where: { organizationId, publicId },
            include: { frameworkVersion: true },
        });
        if (!activation) throw new ApiError(404, 'Framework program not found');
        const next = await prisma.frameworkVersion.findUnique({
            where: { id: frameworkVersionId },
            include: { framework: true, requirements: true },
        });
        if (!next || next.frameworkId !== activation.frameworkVersion.frameworkId) {
            throw new ApiError(400, 'Version change must stay on the same framework.');
        }
        const periods = await prisma.compliancePeriod.count({ where: { activationId: activation.id, frameworkVersionId: activation.frameworkVersionId } });
        await prisma.complianceVersionChange.create({
            data: {
                organizationId,
                activationId: activation.id,
                fromVersionId: activation.frameworkVersionId,
                toVersionId: next.id,
                actorUserId,
                notes: notes || `${periods} historical period${periods === 1 ? '' : 's'} remain tied to ${activation.frameworkVersion.version}.`,
            },
        });
        await prisma.complianceActivation.update({ where: { id: activation.id }, data: { frameworkVersionId: next.id } });
        for (const requirement of next.requirements) {
            await prisma.complianceRequirementState.upsert({
                where: { activationId_requirementId: { activationId: activation.id, requirementId: requirement.id } },
                create: {
                    organizationId,
                    publicId: await nextId(organizationId, 'CRS'),
                    activationId: activation.id,
                    requirementId: requirement.id,
                },
                update: {},
            });
        }
        await history(organizationId, 'ACTIVATION', activation.id, 'Framework version updated', `${activation.frameworkVersion.version} → ${next.version}. Historical periods stay on the earlier version.`, actorUserId, `${activation.frameworkVersion.version} → ${next.version}`);
        await audit({ organizationId, actorUserId, action: 'compliance.version.changed', resourceType: 'ComplianceActivation', resourceId: activation.id });
        return this.getActivation(organizationId, publicId);
    },

    async crossFramework(organizationId: string, controlId?: string) {
        await adoptCatalogForOrganization(organizationId);
        const controls = await prisma.organizationControl.findMany({
            where: { organizationId, ...(controlId ? { OR: [{ id: controlId }, { controlKey: controlId }] } : {}) },
            include: { catalogEntry: { include: { defaultMappings: { where: { validTo: null }, include: { requirement: { include: { frameworkVersion: { include: { framework: true } } } } } } } } },
        });
        return controls.map((control) => ({
            controlKey: control.controlKey,
            title: control.title,
            implementation: humanComplianceLabel(control.implementationStatus),
            effectiveness: humanComplianceLabel(control.effectivenessStatus),
            mappings: (control.catalogEntry?.defaultMappings || []).map((map) => ({
                framework: map.requirement.frameworkVersion.framework.name,
                version: map.requirement.frameworkVersion.version,
                requirementKey: map.requirement.requirementKey,
                strength: humanComplianceLabel(map.mappingStrength),
            })),
            honesty: 'Only mappings stored in the database are shown. Equivalence is not invented.',
        }));
    },

    async evidenceReuse(organizationId: string, storedObjectId: string) {
        const object = await prisma.storedObject.findFirst({ where: { organizationId, id: storedObjectId } });
        if (!object) throw new ApiError(404, 'Evidence not found');
        const links = await prisma.evidenceGovernanceLink.findMany({
            where: { organizationId, storedObjectId, validTo: null },
        });
        const controlIds = links.filter((link) => link.targetType === 'CONTROL').map((link) => link.targetId);
        const requirementIds = links.filter((link) => link.targetType === 'REQUIREMENT').map((link) => link.targetId);
        const states = requirementIds.length
            ? await prisma.complianceRequirementState.findMany({
                where: { organizationId, requirementId: { in: requirementIds } },
                include: { activation: { include: { frameworkVersion: { include: { framework: true } } } } },
            })
            : [];
        const programs = [...new Set(states.map((row) => row.activation.frameworkVersion.framework.name))];
        return {
            filename: object.filename,
            scanStatus: object.scanStatus,
            usable: object.scanStatus === 'CLEAN',
            controls: controlIds.length,
            requirements: requirementIds.length,
            programs: programs.length,
            programNames: programs,
            offer: object.scanStatus === 'CLEAN'
                ? 'Use this existing CLEAN evidence before uploading a new file.'
                : 'This file is not usable. Malware policy remains fail-closed.',
            honesty: 'Reuse counts only explicit links. A file that supports one control does not automatically cover every mapped requirement.',
        };
    },

    async listGaps(organizationId: string) {
        const rows = await prisma.complianceGap.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 300 });
        return rows.map((row) => ({
            publicId: row.publicId,
            title: row.title,
            source: humanComplianceLabel(row.source),
            status: humanComplianceLabel(row.status),
            dueDate: row.dueDate,
            potentialRisk: row.enterpriseRiskId ? 'Linked enterprise risk — potential impact only' : null,
        }));
    },

    async listExceptions(organizationId: string) {
        await expireExceptions(organizationId);
        const rows = await prisma.complianceException.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 300 });
        return rows.map((row) => ({
            publicId: row.publicId,
            type: humanComplianceLabel(row.type),
            scope: row.scope,
            status: humanComplianceLabel(row.status),
            expiresAt: row.expiresAt,
            honesty: 'An exception does not make the underlying control effective.',
        }));
    },

    async owners(organizationId: string) {
        return prisma.user.findMany({
            where: { organizationId, status: 'ACTIVE' },
            select: { id: true, firstName: true, lastName: true, email: true },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            take: 200,
        });
    },

    async previewImport(organizationId: string, rows: Array<Record<string, unknown>>) {
        await adoptCatalogForOrganization(organizationId);
        const activations = await prisma.complianceActivation.findMany({
            where: { organizationId },
            include: { requirementStates: { include: { requirement: true } }, frameworkVersion: { include: { framework: true } } },
        });
        const report = [];
        for (const raw of rows.slice(0, 500)) {
            const requirementKey = neutralizeSpreadsheetCell(raw.requirementKey || raw.requirement || raw.id);
            const applicability = String(raw.applicability || 'NOT_DETERMINED').toUpperCase().replace(/ /g, '_');
            const activationId = String(raw.activationId || raw.framework || '');
            const state = activations
                .flatMap((activation) => activation.requirementStates.map((row) => ({ activation, row })))
                .find((item) => item.row.requirement.requirementKey === requirementKey && (!activationId || item.activation.publicId === activationId || item.activation.frameworkVersion.framework.frameworkKey === activationId));
            const errors = [];
            if (!state) errors.push('Requirement is not on an activated framework.');
            if (!['APPLICABLE', 'NOT_APPLICABLE', 'UNDER_REVIEW', 'NOT_DETERMINED'].includes(applicability)) errors.push('Applicability is not recognized.');
            if (applicability === 'NOT_APPLICABLE' && !String(raw.rationale || '').trim()) errors.push('Not applicable requires a rationale.');
            report.push({
                requirementKey,
                applicability: humanComplianceLabel(applicability),
                ok: errors.length === 0,
                errors,
            });
        }
        return { honesty: 'Import updates applicability on activated programs only. It does not create copyrighted framework text.', rows: report };
    },

    async commitImport(organizationId: string, actorUserId: string | null, rows: Array<Record<string, unknown>>) {
        const preview = await this.previewImport(organizationId, rows);
        let updated = 0;
        for (const row of preview.rows.filter((item) => item.ok)) {
            const state = await prisma.complianceRequirementState.findFirst({
                where: { organizationId, requirement: { requirementKey: row.requirementKey } },
                include: { requirement: true },
            });
            if (!state) continue;
            const source = rows.find((item) => neutralizeSpreadsheetCell(item.requirementKey || item.requirement || item.id) === row.requirementKey);
            const applicability = String(source?.applicability || 'NOT_DETERMINED').toUpperCase().replace(/ /g, '_') as ComplianceApplicability;
            await this.setApplicability(organizationId, state.publicId, actorUserId, {
                applicability,
                rationale: String(source?.rationale || ''),
            });
            updated += 1;
        }
        return { updated, preview };
    },

    async exportRows(organizationId: string) {
        const rows = await this.listRequirements(organizationId, {});
        return rows.map((row) => ({
            requirement: neutralizeSpreadsheetCell(row.requirementKey),
            summary: neutralizeSpreadsheetCell(row.summary),
            framework: neutralizeSpreadsheetCell(row.framework),
            version: neutralizeSpreadsheetCell(row.version),
            applicability: neutralizeSpreadsheetCell(row.applicability),
            owner: neutralizeSpreadsheetCell(row.owner),
            implementation: neutralizeSpreadsheetCell(row.implementation),
            latestTest: neutralizeSpreadsheetCell(row.latestTest),
        }));
    },

    async pack(organizationId: string) {
        const dashboard = await this.dashboard(organizationId);
        const gaps = await this.listGaps(organizationId);
        const exceptions = await this.listExceptions(organizationId);
        const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
        return { name: org?.name || 'This organization', dashboard, gaps, exceptions, honesty: COMPLIANCE_HONESTY };
    },
};
