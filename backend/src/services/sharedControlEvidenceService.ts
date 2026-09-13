import {
    ControlEffectivenessStatus,
    ControlImplementationStatus,
    ControlLifecycleStatus,
    EvidenceFreshness,
    EvidenceGovernanceTarget,
    EvidenceLinkRelation,
    EvidenceReviewStatus,
    GovernanceAuthority,
    GovernanceNodeType,
    GovernanceProvenance,
    GovernanceRelationshipType,
    MappingReviewStatus,
    MappingStrength,
    Prisma,
    ScanStatus,
    SharedControlTestMethod,
    SharedControlTestResult,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { SUPREME_COMMON_CONTROLS, SUPREME_FRAMEWORK_PACKS } from './controlLibrary';
import { governanceGraphService } from './governanceGraphService';

const USABLE_RELATIONS: EvidenceLinkRelation[] = ['SUPPORTS', 'PARTIALLY_SUPPORTS'];
let catalogSeeded = false;

export function resetCatalogSeedForTests() {
    catalogSeeded = false;
}

const HISTORY_LABELS: Record<string, string> = {
    'control.update': 'Control updated',
    'control.test': 'Control test recorded',
    'evidence.link': 'Evidence linked',
    'evidence.review': 'Evidence reviewed',
    'evidence.unlink': 'Evidence unlinked',
};

function actorLabel(user?: { firstName: string; lastName: string; email: string } | null, fallback?: string | null) {
    if (!user) {
        if (!fallback) return 'Supreme';
        if (fallback === 'system') return 'Supreme';
        return 'A workspace member';
    }
    const name = `${user.firstName} ${user.lastName}`.trim();
    return name || user.email.split('@')[0];
}

export function displayedFreshness(input: {
    freshness: EvidenceFreshness;
    expiresAt?: Date | null;
    now?: Date;
}): EvidenceFreshness {
    if (input.freshness === 'REVOKED' || input.freshness === 'SUPERSEDED' || input.freshness === 'UNDER_REVIEW') {
        return input.freshness;
    }
    if (!input.expiresAt) return input.freshness === 'EXPIRED' || input.freshness === 'EXPIRING' ? 'CURRENT' : input.freshness;
    const now = input.now || new Date();
    if (input.expiresAt.getTime() <= now.getTime()) return 'EXPIRED';
    const days = (input.expiresAt.getTime() - now.getTime()) / 86400000;
    if (days <= 30) return 'EXPIRING';
    return 'CURRENT';
}

export async function seedPlatformCatalog() {
    if (catalogSeeded) return;
    for (const entry of SUPREME_COMMON_CONTROLS) {
        await prisma.controlCatalogEntry.upsert({
            where: { controlKey: entry.controlKey },
            update: {
                title: entry.title,
                description: entry.description,
                objective: entry.objective,
                domain: entry.domain,
                category: entry.category,
                controlType: entry.controlType,
            },
            create: entry,
        });
    }
    for (const pack of SUPREME_FRAMEWORK_PACKS) {
        const framework = await prisma.frameworkDefinition.upsert({
            where: { frameworkKey: pack.frameworkKey },
            update: { name: pack.name, publisher: pack.publisher, sourceUrl: pack.sourceUrl },
            create: { frameworkKey: pack.frameworkKey, name: pack.name, publisher: pack.publisher, sourceUrl: pack.sourceUrl },
        });
        const version = await prisma.frameworkVersion.upsert({
            where: { frameworkId_version: { frameworkId: framework.id, version: pack.version } },
            update: { sourceUrl: pack.sourceUrl, status: 'ACTIVE' },
            create: { frameworkId: framework.id, version: pack.version, sourceUrl: pack.sourceUrl, status: 'ACTIVE' },
        });
        for (const req of pack.requirements) {
            const requirement = await prisma.frameworkRequirement.upsert({
                where: { frameworkVersionId_requirementKey: { frameworkVersionId: version.id, requirementKey: req.requirementKey } },
                update: { supremeSummary: req.supremeSummary, sourceUrl: req.sourceUrl },
                create: {
                    frameworkVersionId: version.id,
                    requirementKey: req.requirementKey,
                    supremeSummary: req.supremeSummary,
                    sourceUrl: req.sourceUrl,
                },
            });
            for (const map of req.maps) {
                const catalog = await prisma.controlCatalogEntry.findUnique({ where: { controlKey: map.controlKey } });
                if (!catalog) continue;
                const existing = await prisma.requirementControlMapping.findFirst({
                    where: { organizationId: null, requirementId: requirement.id, catalogEntryId: catalog.id, validTo: null },
                });
                if (existing) {
                    await prisma.requirementControlMapping.update({
                        where: { id: existing.id },
                        data: { mappingStrength: map.strength, reviewStatus: MappingReviewStatus.APPROVED },
                    });
                    continue;
                }
                await prisma.requirementControlMapping.create({
                    data: {
                        requirementId: requirement.id,
                        catalogEntryId: catalog.id,
                        mappingStrength: map.strength,
                        provenance: GovernanceProvenance.SYSTEM,
                        authority: GovernanceAuthority.AUTHORITATIVE,
                        reviewStatus: MappingReviewStatus.APPROVED,
                    },
                });
            }
        }
    }
    catalogSeeded = true;
}

export async function adoptCatalogForOrganization(organizationId: string, actorUserId?: string) {
    await seedPlatformCatalog();
    const catalog = await prisma.controlCatalogEntry.findMany({ where: { archivedAt: null } });
    const existingCount = await prisma.organizationControl.count({ where: { organizationId } });
    const controlNodes = await prisma.governanceNode.count({ where: { organizationId, nodeType: 'CONTROL' } });
    if (existingCount >= catalog.length && controlNodes >= catalog.length && catalog.length > 0) {
        return { created: 0, controlCount: existingCount };
    }
    let created = 0;
    for (const entry of catalog) {
        const result = await prisma.organizationControl.upsert({
            where: { organizationId_controlKey: { organizationId, controlKey: entry.controlKey } },
            update: {},
            create: {
                organizationId,
                catalogEntryId: entry.id,
                controlKey: entry.controlKey,
                title: entry.title,
                description: entry.description,
                objective: entry.objective,
                domain: entry.domain,
                category: entry.category,
                controlType: entry.controlType,
            },
        });
        if (result.createdAt.getTime() === result.updatedAt.getTime()) created += 1;
        await governanceGraphService.ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.CONTROL,
            sourceModel: 'OrganizationControl',
            sourceId: result.id,
            displayLabel: `${result.controlKey} ${result.title}`,
            status: result.status,
            actorUserId,
        });
    }
    const frameworks = await prisma.frameworkDefinition.findMany({ include: { versions: { include: { requirements: true } } } });
    for (const framework of frameworks) {
        await governanceGraphService.ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.FRAMEWORK,
            sourceModel: 'FrameworkDefinition',
            sourceId: framework.id,
            displayLabel: framework.name,
            status: 'ACTIVE',
            actorUserId,
        });
        for (const version of framework.versions) {
            for (const requirement of version.requirements) {
                await governanceGraphService.ensureNode({
                    organizationId,
                    nodeType: GovernanceNodeType.REQUIREMENT,
                    sourceModel: 'FrameworkRequirement',
                    sourceId: requirement.id,
                    displayLabel: `${framework.frameworkKey} ${requirement.requirementKey}`,
                    status: 'ACTIVE',
                    actorUserId,
                });
            }
        }
    }
    await syncSatisfiesEdges(organizationId, actorUserId);
    return { created, controlCount: catalog.length };
}

async function syncSatisfiesEdges(organizationId: string, actorUserId?: string) {
    const controls = await prisma.organizationControl.findMany({ where: { organizationId, archivedAt: null } });
    const mappings = await prisma.requirementControlMapping.findMany({
        where: { organizationId: null, validTo: null, catalogEntryId: { not: null } },
        include: { catalogEntry: true, requirement: true },
    });
    for (const mapping of mappings) {
        const control = controls.find((row) => row.catalogEntryId === mapping.catalogEntryId || row.controlKey === mapping.catalogEntry?.controlKey);
        if (!control) continue;
        const from = await prisma.governanceNode.findFirst({
            where: { organizationId, nodeType: 'REQUIREMENT', sourceModel: 'FrameworkRequirement', sourceId: mapping.requirementId },
        });
        const to = await prisma.governanceNode.findFirst({
            where: { organizationId, nodeType: 'CONTROL', sourceModel: 'OrganizationControl', sourceId: control.id },
        });
        if (!from || !to) continue;
        await governanceGraphService.createRelationship({
            organizationId,
            fromNodeId: from.id,
            toNodeId: to.id,
            relationshipType: GovernanceRelationshipType.SATISFIED_BY,
            provenance: GovernanceProvenance.SYSTEM,
            authority: GovernanceAuthority.AUTHORITATIVE,
            isDerived: true,
            createdBy: actorUserId,
        });
    }
}

export async function listControls(organizationId: string, query: {
    q?: string;
    domain?: string;
    implementationStatus?: ControlImplementationStatus;
    effectivenessStatus?: ControlEffectivenessStatus;
}) {
    await adoptCatalogForOrganization(organizationId);
    const where: Prisma.OrganizationControlWhereInput = {
        organizationId,
        archivedAt: null,
        ...(query.domain ? { domain: query.domain as never } : {}),
        ...(query.implementationStatus ? { implementationStatus: query.implementationStatus } : {}),
        ...(query.effectivenessStatus ? { effectivenessStatus: query.effectivenessStatus } : {}),
        ...(query.q
            ? {
                  OR: [
                      { title: { contains: query.q, mode: 'insensitive' } },
                      { controlKey: { contains: query.q, mode: 'insensitive' } },
                      { description: { contains: query.q, mode: 'insensitive' } },
                  ],
              }
            : {}),
    };
    const [controls, tests, links] = await Promise.all([
        prisma.organizationControl.findMany({ where, orderBy: [{ domain: 'asc' }, { controlKey: 'asc' }] }),
        prisma.organizationControlTest.findMany({ where: { organizationId }, select: { controlId: true, result: true, findingId: true } }),
        prisma.evidenceGovernanceLink.findMany({
            where: { organizationId, targetType: 'CONTROL', validTo: null },
            include: { storedObject: { select: { id: true, scanStatus: true, filename: true } } },
        }),
    ]);
    const expiringLinks = await prisma.evidenceGovernanceLink.findMany({
        where: { organizationId, targetType: 'CONTROL', validTo: null, expiresAt: { not: null } },
        select: { targetId: true, expiresAt: true, freshness: true },
    });
    return controls.map((control) => {
        const controlTests = tests.filter((row) => row.controlId === control.id);
        const evidence = links.filter((row) => row.targetId === control.id);
        const expiring = expiringLinks.some((row) => row.targetId === control.id && displayedFreshness(row) !== 'CURRENT' && displayedFreshness(row) !== 'UNDER_REVIEW');
        return {
            ...control,
            testedCount: controlTests.filter((row) => row.result !== 'NOT_TESTED').length,
            openFindings: controlTests.filter((row) => row.findingId).length,
            evidenceCount: evidence.length,
            usableEvidenceCount: evidence.filter((row) => row.storedObject.scanStatus === ScanStatus.CLEAN && USABLE_RELATIONS.includes(row.relationship)).length,
            needsReview: expiring,
        };
    });
}

export async function controlCenterSummary(organizationId: string) {
    const controls = await listControls(organizationId, {});
    const frameworks = await prisma.frameworkDefinition.count();
    return {
        controlCount: controls.length,
        implemented: controls.filter((row) => row.implementationStatus === 'IMPLEMENTED').length,
        planned: controls.filter((row) => row.implementationStatus === 'PLANNED').length,
        notImplemented: controls.filter((row) => row.implementationStatus === 'NOT_IMPLEMENTED').length,
        tested: controls.filter((row) => row.effectivenessStatus !== 'NOT_TESTED').length,
        ineffective: controls.filter((row) => row.effectivenessStatus === 'INEFFECTIVE').length,
        partiallyEffective: controls.filter((row) => row.effectivenessStatus === 'PARTIALLY_EFFECTIVE').length,
        needsReview: controls.filter((row) => row.needsReview).length,
        withFindings: controls.filter((row) => row.openFindings > 0).length,
        frameworkPacks: frameworks,
        honesty: 'These counts are readiness and mapping measures. They are not a certification or compliance attestation.',
    };
}

export async function getControl(organizationId: string, controlId: string) {
    await adoptCatalogForOrganization(organizationId);
    const control = await prisma.organizationControl.findFirst({ where: { id: controlId, organizationId } });
    if (!control) throw new ApiError(404, 'Control not found');
    const [tests, mappings, evidence] = await Promise.all([
        prisma.organizationControlTest.findMany({ where: { organizationId, controlId }, orderBy: { testedAt: 'desc' } }),
        prisma.requirementControlMapping.findMany({
            where: {
                validTo: null,
                OR: [
                    { organizationControlId: control.id },
                    ...(control.catalogEntryId ? [{ catalogEntryId: control.catalogEntryId, organizationId: null as string | null }] : []),
                ],
            },
            include: { requirement: { include: { frameworkVersion: { include: { framework: true } } } } },
        }),
        prisma.evidenceGovernanceLink.findMany({
            where: { organizationId, targetType: 'CONTROL', targetId: control.id, validTo: null },
            include: { storedObject: { select: { id: true, filename: true, scanStatus: true, uploadedAt: true, ownerType: true, ownerId: true } } },
            orderBy: { createdAt: 'desc' },
        }),
    ]);
    const findingIds = tests.map((row) => row.findingId).filter((id): id is string => Boolean(id));
    const [history, people, findings, linkableFindings] = await Promise.all([
        prisma.auditEvent.findMany({
            where: {
                organizationId,
                OR: [
                    { resourceType: 'OrganizationControl', resourceId: control.id },
                    { resourceType: 'OrganizationControlTest', resourceId: { in: tests.map((row) => row.id) } },
                    { resourceType: 'EvidenceGovernanceLink', resourceId: { in: evidence.map((row) => row.id) } },
                ],
            },
            orderBy: { timestamp: 'desc' },
            take: 40,
            select: { id: true, action: true, actorUserId: true, timestamp: true, result: true },
        }),
        prisma.user.findMany({
            where: {
                organizationId,
                id: {
                    in: [
                        ...tests.map((row) => row.testerUserId),
                        ...evidence.map((row) => row.createdBy),
                        ...evidence.map((row) => row.reviewedBy || ''),
                    ].filter(Boolean),
                },
            },
            select: { id: true, firstName: true, lastName: true, email: true },
        }),
        prisma.vendorIssue.findMany({
            where: { organizationId, id: { in: findingIds } },
            select: { id: true, title: true, status: true, severity: true },
        }),
        prisma.vendorIssue.findMany({
            where: { organizationId, status: { notIn: ['CLOSED', 'RESOLVED'] } },
            select: { id: true, title: true, status: true, severity: true },
            orderBy: { identifiedDate: 'desc' },
            take: 50,
        }),
    ]);
    const byId = new Map(people.map((user) => [user.id, user]));
    const findingById = new Map(findings.map((row) => [row.id, row]));
    const historyActors = await prisma.user.findMany({
        where: { organizationId, id: { in: history.map((row) => row.actorUserId || '').filter(Boolean) } },
        select: { id: true, firstName: true, lastName: true, email: true },
    });
    const historyById = new Map(historyActors.map((user) => [user.id, user]));
    return {
        control,
        tests: tests.map((row) => ({
            ...row,
            testerName: actorLabel(byId.get(row.testerUserId), row.testerUserId),
            finding: row.findingId ? findingById.get(row.findingId) || null : null,
        })),
        mappings: mappings.map((row) => ({
            id: row.id,
            strength: row.mappingStrength,
            reviewStatus: row.reviewStatus,
            version: row.version,
            requirementKey: row.requirement.requirementKey,
            supremeSummary: row.requirement.supremeSummary,
            framework: row.requirement.frameworkVersion.framework.name,
            frameworkKey: row.requirement.frameworkVersion.framework.frameworkKey,
            frameworkVersion: row.requirement.frameworkVersion.version,
        })),
        evidence: evidence.map((row) => ({
            ...row,
            linkedBy: actorLabel(byId.get(row.createdBy), row.createdBy),
            reviewedByName: row.reviewedBy ? actorLabel(byId.get(row.reviewedBy), row.reviewedBy) : null,
            freshness: displayedFreshness(row),
            usable: row.storedObject.scanStatus === ScanStatus.CLEAN && USABLE_RELATIONS.includes(row.relationship),
        })),
        findings: tests
            .filter((row) => row.findingId && findingById.has(row.findingId))
            .map((row) => ({
                testId: row.id,
                testedAt: row.testedAt,
                result: row.result,
                ...findingById.get(row.findingId!)!,
            })),
        linkableFindings,
        history: history.map((row) => ({
            id: row.id,
            action: row.action,
            label: HISTORY_LABELS[row.action] || row.action.replace(/[._]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
            actorName: actorLabel(historyById.get(row.actorUserId || ''), row.actorUserId),
            createdAt: row.timestamp,
            result: row.result,
        })),
        honesty: 'Mapped requirements are identifiers plus Supreme summaries. This is not a certification.',
    };
}

export async function updateControl(
    organizationId: string,
    controlId: string,
    actorUserId: string,
    input: {
        implementationStatus?: ControlImplementationStatus;
        effectivenessStatus?: ControlEffectivenessStatus;
        ownerUserId?: string | null;
        reviewerUserId?: string | null;
        frequency?: string | null;
        nextTestAt?: Date | null;
        status?: ControlLifecycleStatus;
    }
) {
    const existing = await prisma.organizationControl.findFirst({ where: { id: controlId, organizationId } });
    if (!existing) throw new ApiError(404, 'Control not found');
    const updated = await prisma.organizationControl.update({
        where: { id: existing.id },
        data: {
            implementationStatus: input.implementationStatus,
            effectivenessStatus: input.effectivenessStatus,
            ownerUserId: input.ownerUserId === undefined ? existing.ownerUserId : input.ownerUserId,
            reviewerUserId: input.reviewerUserId === undefined ? existing.reviewerUserId : input.reviewerUserId,
            frequency: input.frequency === undefined ? existing.frequency : input.frequency,
            nextTestAt: input.nextTestAt === undefined ? existing.nextTestAt : input.nextTestAt,
            status: input.status,
            archivedAt: input.status === 'ARCHIVED' ? new Date() : input.status === 'ACTIVE' ? null : existing.archivedAt,
        },
    });
    await recordAudit({
        organizationId,
        actorUserId,
        action: 'control.update',
        resourceType: 'OrganizationControl',
        resourceId: updated.id,
        result: 'success',
        metadata: { controlKey: updated.controlKey, implementationStatus: updated.implementationStatus, effectivenessStatus: updated.effectivenessStatus },
    });
    return updated;
}

export async function listFrameworkCoverage(organizationId: string, frameworkKey?: string) {
    await adoptCatalogForOrganization(organizationId);
    const frameworks = await prisma.frameworkDefinition.findMany({
        where: frameworkKey ? { frameworkKey } : undefined,
        include: { versions: { where: { status: 'ACTIVE' }, include: { requirements: { include: { mappings: true } } } } },
        orderBy: { name: 'asc' },
    });
    const controls = await prisma.organizationControl.findMany({ where: { organizationId, archivedAt: null } });
    return {
        honesty: 'Coverage and readiness only. This is not certified, compliant, or attested.',
        frameworks: frameworks.map((framework) => {
            const version = framework.versions[0];
            const requirements = (version?.requirements || []).map((requirement) => {
                const mappedKeys = requirement.mappings
                    .filter((row) => !row.validTo && (row.organizationId === null || row.organizationId === organizationId))
                    .map((row) => controls.find((control) => control.catalogEntryId === row.catalogEntryId || control.id === row.organizationControlId))
                    .filter(Boolean);
                const implemented = mappedKeys.filter((row) => row!.implementationStatus === 'IMPLEMENTED');
                const tested = mappedKeys.filter((row) => row!.effectivenessStatus !== 'NOT_TESTED');
                return {
                    id: requirement.id,
                    requirementKey: requirement.requirementKey,
                    supremeSummary: requirement.supremeSummary,
                    mappedControls: mappedKeys.length,
                    implementedControls: implemented.length,
                    testedControls: tested.length,
                    gap: mappedKeys.length === 0 || implemented.length === 0,
                };
            });
            return {
                id: framework.id,
                frameworkKey: framework.frameworkKey,
                name: framework.name,
                publisher: framework.publisher,
                sourceUrl: framework.sourceUrl,
                version: version?.version,
                requirementCount: requirements.length,
                mapped: requirements.filter((row) => row.mappedControls > 0).length,
                implemented: requirements.filter((row) => row.implementedControls > 0).length,
                tested: requirements.filter((row) => row.testedControls > 0).length,
                gaps: requirements.filter((row) => row.gap).length,
                requirements,
            };
        }),
    };
}

export async function searchReusableEvidence(organizationId: string, q?: string) {
    const objects = await prisma.storedObject.findMany({
        where: {
            organizationId,
            deletedAt: null,
            ...(q ? { filename: { contains: q, mode: 'insensitive' } } : {}),
        },
        orderBy: { uploadedAt: 'desc' },
        take: 80,
    });
    const links = await prisma.evidenceGovernanceLink.findMany({
        where: { organizationId, storedObjectId: { in: objects.map((row) => row.id) }, validTo: null },
    });
    const tprmLinks = await prisma.evidenceLink.findMany({
        where: { organizationId, storedObjectId: { in: objects.map((row) => row.id) } },
    });
    return objects.map((object) => {
        const gov = links.filter((row) => row.storedObjectId === object.id);
        return {
            id: object.id,
            filename: object.filename,
            ownerType: object.ownerType,
            ownerId: object.ownerId,
            scanStatus: object.scanStatus,
            uploadedAt: object.uploadedAt,
            usable: object.scanStatus === ScanStatus.CLEAN,
            reuseCount: gov.length + tprmLinks.filter((row) => row.storedObjectId === object.id).length,
            linkedControls: gov.filter((row) => row.targetType === 'CONTROL').length,
            freshness: displayedFreshness({ freshness: gov[0]?.freshness || 'CURRENT', expiresAt: gov[0]?.expiresAt }),
        };
    });
}

export async function linkEvidence(input: {
    organizationId: string;
    actorUserId: string;
    storedObjectId: string;
    targetType: EvidenceGovernanceTarget;
    targetId: string;
    relationship: EvidenceLinkRelation;
    rationale: string;
    expiresAt?: Date | null;
    issuedAt?: Date | null;
    effectiveFrom?: Date | null;
    reviewDueAt?: Date | null;
    freshness?: EvidenceFreshness;
}) {
    if (!input.rationale.trim()) throw new ApiError(400, 'A rationale is required');
    const stored = await prisma.storedObject.findFirst({ where: { id: input.storedObjectId, organizationId: input.organizationId, deletedAt: null } });
    if (!stored) throw new ApiError(404, 'Evidence not found');
    if (USABLE_RELATIONS.includes(input.relationship) && stored.scanStatus !== ScanStatus.CLEAN) {
        throw new ApiError(403, 'Only files with a CLEAN malware scan can be used as supporting evidence');
    }
    await assertTarget(input.organizationId, input.targetType, input.targetId);
    const duplicate = await prisma.evidenceGovernanceLink.findFirst({
        where: {
            organizationId: input.organizationId,
            storedObjectId: stored.id,
            targetType: input.targetType,
            targetId: input.targetId,
            relationship: input.relationship,
            validTo: null,
        },
    });
    if (duplicate) {
        throw new ApiError(409, 'This file is already linked to that record with the same relationship. Choose a different relationship or unlink the current one first.');
    }
    const freshness = input.freshness || (input.expiresAt ? displayedFreshness({ freshness: 'CURRENT', expiresAt: input.expiresAt }) : 'CURRENT');
    let link;
    try {
        link = await prisma.evidenceGovernanceLink.create({
            data: {
                organizationId: input.organizationId,
                storedObjectId: stored.id,
                targetType: input.targetType,
                targetId: input.targetId,
                relationship: input.relationship,
                rationale: input.rationale.trim(),
                createdBy: input.actorUserId,
                expiresAt: input.expiresAt,
                issuedAt: input.issuedAt,
                effectiveFrom: input.effectiveFrom,
                reviewDueAt: input.reviewDueAt,
                freshness,
                provenance: GovernanceProvenance.USER,
                authority: GovernanceAuthority.AUTHORITATIVE,
                reviewStatus: EvidenceReviewStatus.SUBMITTED,
            },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ApiError(409, 'This file is already linked to that record with the same relationship. Choose a different relationship or unlink the current one first.');
        }
        throw error;
    }
    await recordAudit({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: 'evidence.link',
        resourceType: 'EvidenceGovernanceLink',
        resourceId: link.id,
        result: 'success',
        metadata: { storedObjectId: stored.id, targetType: input.targetType, relationship: input.relationship },
    });
    if (input.targetType === 'CONTROL' && USABLE_RELATIONS.includes(input.relationship) && stored.scanStatus === ScanStatus.CLEAN) {
        const evidenceNode = await governanceGraphService.ensureNode({
            organizationId: input.organizationId,
            nodeType: GovernanceNodeType.EVIDENCE,
            sourceModel: 'StoredObject',
            sourceId: stored.id,
            displayLabel: stored.filename,
            status: stored.scanStatus,
            actorUserId: input.actorUserId,
        });
        const controlNode = await prisma.governanceNode.findFirst({
            where: { organizationId: input.organizationId, nodeType: 'CONTROL', sourceModel: 'OrganizationControl', sourceId: input.targetId },
        });
        if (controlNode) {
            await governanceGraphService.createRelationship({
                organizationId: input.organizationId,
                fromNodeId: evidenceNode.node.id,
                toNodeId: controlNode.id,
                relationshipType: GovernanceRelationshipType.SUPPORTED_BY,
                provenance: GovernanceProvenance.USER,
                authority: GovernanceAuthority.AUTHORITATIVE,
                createdBy: input.actorUserId,
            });
        }
    }
    return { ...link, freshness: displayedFreshness(link), usable: stored.scanStatus === ScanStatus.CLEAN && USABLE_RELATIONS.includes(link.relationship) };
}

export async function unlinkEvidence(organizationId: string, linkId: string, actorUserId: string, reason?: string) {
    const existing = await prisma.evidenceGovernanceLink.findFirst({ where: { id: linkId, organizationId, validTo: null } });
    if (!existing) throw new ApiError(404, 'Evidence link not found');
    const updated = await prisma.evidenceGovernanceLink.update({
        where: { id: existing.id },
        data: { validTo: new Date(), freshness: existing.freshness === 'REVOKED' ? 'REVOKED' : 'SUPERSEDED' },
    });
    await recordAudit({
        organizationId,
        actorUserId,
        action: 'evidence.unlink',
        resourceType: 'EvidenceGovernanceLink',
        resourceId: updated.id,
        result: 'success',
        metadata: { storedObjectId: existing.storedObjectId, targetType: existing.targetType, reason: reason || null },
    });
    return updated;
}

export async function reviewEvidenceLink(organizationId: string, linkId: string, actorUserId: string, input: {
    reviewStatus: EvidenceReviewStatus;
    freshness?: EvidenceFreshness;
}) {
    const existing = await prisma.evidenceGovernanceLink.findFirst({ where: { id: linkId, organizationId } });
    if (!existing) throw new ApiError(404, 'Evidence link not found');
    const updated = await prisma.evidenceGovernanceLink.update({
        where: { id: existing.id },
        data: { reviewStatus: input.reviewStatus, reviewedBy: actorUserId, reviewedAt: new Date(), freshness: input.freshness || existing.freshness },
    });
    await recordAudit({
        organizationId,
        actorUserId,
        action: 'evidence.review',
        resourceType: 'EvidenceGovernanceLink',
        resourceId: updated.id,
        result: 'success',
        metadata: { reviewStatus: updated.reviewStatus, freshness: updated.freshness },
    });
    return updated;
}

export async function recordControlTest(input: {
    organizationId: string;
    actorUserId: string;
    controlId: string;
    method: SharedControlTestMethod;
    procedure?: string;
    result: SharedControlTestResult;
    notes?: string;
    nextTestAt?: Date | null;
    findingId?: string | null;
    createFinding?: boolean;
    findingTitle?: string;
}) {
    if (input.result === 'NOT_APPLICABLE' && input.createFinding) {
        throw new ApiError(400, 'A not-applicable result cannot create a finding or be treated as a pass');
    }
    const control = await prisma.organizationControl.findFirst({ where: { id: input.controlId, organizationId: input.organizationId } });
    if (!control) throw new ApiError(404, 'Control not found');
    let findingId = input.findingId || null;
    if (findingId) {
        const finding = await prisma.vendorIssue.findFirst({ where: { id: findingId, organizationId: input.organizationId } });
        if (!finding) throw new ApiError(404, 'Finding not found');
    }
    if (input.createFinding && (input.result === 'FAIL' || input.result === 'PARTIAL')) {
        throw new ApiError(400, 'Create the finding from the Findings workspace, then link it here. Tests do not invent findings.');
    }
    const effectiveness =
        input.result === 'PASS' ? ControlEffectivenessStatus.EFFECTIVE
            : input.result === 'PARTIAL' ? ControlEffectivenessStatus.PARTIALLY_EFFECTIVE
                : input.result === 'FAIL' ? ControlEffectivenessStatus.INEFFECTIVE
                    : ControlEffectivenessStatus.NOT_TESTED;
    const test = await prisma.organizationControlTest.create({
        data: {
            organizationId: input.organizationId,
            controlId: control.id,
            method: input.method,
            procedure: input.procedure,
            testerUserId: input.actorUserId,
            result: input.result,
            notes: input.notes,
            nextTestAt: input.nextTestAt,
            findingId,
        },
    });
    await prisma.organizationControl.update({
        where: { id: control.id },
        data: {
            lastTestedAt: test.testedAt,
            nextTestAt: input.nextTestAt === undefined ? control.nextTestAt : input.nextTestAt,
            effectivenessStatus: input.result === 'NOT_APPLICABLE' ? control.effectivenessStatus : effectiveness,
        },
    });
    await recordAudit({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: 'control.test',
        resourceType: 'OrganizationControlTest',
        resourceId: test.id,
        result: 'success',
        metadata: { controlId: control.id, testResult: test.result, findingId },
    });
    const testNode = await governanceGraphService.ensureNode({
        organizationId: input.organizationId,
        nodeType: GovernanceNodeType.CONTROL_TEST,
        sourceModel: 'OrganizationControlTest',
        sourceId: test.id,
        displayLabel: `${control.controlKey} test ${test.result}`,
        status: test.result,
        actorUserId: input.actorUserId,
    });
    const controlNode = await prisma.governanceNode.findFirst({
        where: { organizationId: input.organizationId, nodeType: 'CONTROL', sourceModel: 'OrganizationControl', sourceId: control.id },
    });
    if (controlNode) {
        await governanceGraphService.createRelationship({
            organizationId: input.organizationId,
            fromNodeId: controlNode.id,
            toNodeId: testNode.node.id,
            relationshipType: GovernanceRelationshipType.TESTED_BY,
            provenance: GovernanceProvenance.USER,
            authority: GovernanceAuthority.AUTHORITATIVE,
            createdBy: input.actorUserId,
        });
    }
    if (findingId) {
        const findingNode = await prisma.governanceNode.findFirst({
            where: { organizationId: input.organizationId, nodeType: 'FINDING', sourceModel: 'VendorIssue', sourceId: findingId },
        });
        if (findingNode) {
            await governanceGraphService.createRelationship({
                organizationId: input.organizationId,
                fromNodeId: testNode.node.id,
                toNodeId: findingNode.id,
                relationshipType: GovernanceRelationshipType.HAS_FINDING,
                provenance: GovernanceProvenance.USER,
                authority: GovernanceAuthority.AUTHORITATIVE,
                createdBy: input.actorUserId,
            });
        }
    }
    return test;
}

export async function evidenceImpact(organizationId: string, storedObjectId: string) {
    const stored = await prisma.storedObject.findFirst({ where: { id: storedObjectId, organizationId, deletedAt: null } });
    if (!stored) throw new ApiError(404, 'Evidence not found');
    const links = await prisma.evidenceGovernanceLink.findMany({ where: { organizationId, storedObjectId, validTo: null } });
    const controlIds = links.filter((row) => row.targetType === 'CONTROL').map((row) => row.targetId);
    const controls = await prisma.organizationControl.findMany({ where: { organizationId, id: { in: controlIds } } });
    const mappings = await prisma.requirementControlMapping.findMany({
        where: { validTo: null, OR: [{ organizationControlId: { in: controlIds } }, { catalogEntryId: { in: controls.map((row) => row.catalogEntryId || '') } }] },
        include: { requirement: { include: { frameworkVersion: { include: { framework: true } } } } },
    });
    const tprm = await prisma.evidenceLink.findMany({ where: { organizationId, storedObjectId } });
    const vendors = tprm.map((row) => row.vendorId).filter(Boolean);
    const assessments = tprm.map((row) => row.assessmentId).filter(Boolean);
    const findings = tprm.map((row) => row.issueId).filter(Boolean);
    return {
        storedObjectId: stored.id,
        filename: stored.filename,
        scanStatus: stored.scanStatus,
        usable: stored.scanStatus === ScanStatus.CLEAN,
        freshness: displayedFreshness({ freshness: links[0]?.freshness || 'CURRENT', expiresAt: links[0]?.expiresAt }),
        residualScoresUnchanged: true,
        potentialImpact: {
            controls: controls.map((row) => ({ id: row.id, controlKey: row.controlKey, title: row.title })),
            requirements: mappings.map((row) => ({
                id: row.requirement.id,
                requirementKey: row.requirement.requirementKey,
                framework: row.requirement.frameworkVersion.framework.name,
            })),
            vendors,
            assessments,
            findings,
        },
        honesty: 'This is potential governance impact. Residual risk scores are not changed by evidence expiry or revocation.',
    };
}

export async function coverageReport(organizationId: string) {
    const [summary, coverage, evidence] = await Promise.all([
        controlCenterSummary(organizationId),
        listFrameworkCoverage(organizationId),
        searchReusableEvidence(organizationId),
    ]);
    const tests = await prisma.organizationControlTest.findMany({ where: { organizationId }, orderBy: { testedAt: 'desc' }, take: 100 });
    return {
        generatedAt: new Date().toISOString(),
        honesty: 'Readiness and mapping only. Not certified, compliant, or attested.',
        controlCoverage: summary,
        frameworkReadiness: coverage,
        evidenceCoverage: {
            objects: evidence.length,
            cleanUsable: evidence.filter((row) => row.usable).length,
            reused: evidence.filter((row) => row.reuseCount > 1).length,
        },
        controlTesting: tests.map((row) => ({ id: row.id, controlId: row.controlId, result: row.result, testedAt: row.testedAt, findingId: row.findingId })),
    };
}

async function assertTarget(organizationId: string, targetType: EvidenceGovernanceTarget, targetId: string) {
    if (targetType === 'CONTROL') {
        const row = await prisma.organizationControl.findFirst({ where: { id: targetId, organizationId } });
        if (!row) throw new ApiError(404, 'Control not found');
        return;
    }
    if (targetType === 'REQUIREMENT') {
        const row = await prisma.frameworkRequirement.findFirst({ where: { id: targetId } });
        if (!row) throw new ApiError(404, 'Requirement not found');
        return;
    }
    if (targetType === 'VENDOR') {
        const row = await prisma.vendor.findFirst({ where: { id: targetId, organizationId } });
        if (!row) throw new ApiError(404, 'Vendor not found');
        return;
    }
    if (targetType === 'ASSESSMENT') {
        const row = await prisma.vendorAssessment.findFirst({ where: { id: targetId, organizationId } });
        if (!row) throw new ApiError(404, 'Assessment not found');
        return;
    }
    if (targetType === 'FINDING') {
        const row = await prisma.vendorIssue.findFirst({ where: { id: targetId, organizationId } });
        if (!row) throw new ApiError(404, 'Finding not found');
        return;
    }
    if (targetType === 'RISK') {
        const row = await prisma.scoreCalculation.findFirst({ where: { id: targetId, organizationId } });
        if (!row) throw new ApiError(404, 'Risk record not found');
        return;
    }
    if (targetType === 'FRAMEWORK') {
        const row = await prisma.frameworkDefinition.findFirst({ where: { id: targetId } });
        if (!row) throw new ApiError(404, 'Framework not found');
        return;
    }
    if (targetType === 'CONTROL_TEST') {
        const row = await prisma.organizationControlTest.findFirst({ where: { id: targetId, organizationId } });
        if (!row) throw new ApiError(404, 'Control test not found');
    }
}

export const sharedControlEvidenceService = {
    seedPlatformCatalog,
    adoptCatalogForOrganization,
    listControls,
    controlCenterSummary,
    getControl,
    updateControl,
    listFrameworkCoverage,
    searchReusableEvidence,
    linkEvidence,
    unlinkEvidence,
    reviewEvidenceLink,
    recordControlTest,
    evidenceImpact,
    coverageReport,
    displayedFreshness,
};
