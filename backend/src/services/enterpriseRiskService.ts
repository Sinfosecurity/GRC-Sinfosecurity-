import {
    EnterpriseAppetiteScope,
    EnterpriseDecisionStatus,
    EnterpriseDecisionType,
    EnterpriseKriDirection,
    EnterpriseRiskCategory,
    EnterpriseRiskStatus,
    EnterpriseTreatmentStatus,
    EnterpriseTreatmentStrategy,
    GovernanceNodeType,
    GovernanceRelationshipType,
    Prisma,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { assertIndependentReviewer } from '../security/separationOfDuties';
import { requireBusinessUnitForOrganization } from '../security/tenantOwnership';
import { recordAudit } from './auditEventService';

function audit(input: Omit<Parameters<typeof recordAudit>[0], 'result'>) {
    return recordAudit({ ...input, result: 'success' });
}
import { createRelationship, ensureNode } from './governanceGraphService';
import {
    ENTERPRISE_RISK_METHODOLOGY_VERSION,
    calculateEnterpriseRisk,
    kriStatus,
    neutralizeSpreadsheetCell,
    nextPublicId,
    resolveAppetite,
    type ControlEffectiveness,
    type EnterpriseRating,
} from './enterpriseRiskEngine';
import { presentHistoryEntry, scoreChangeSummary } from './enterpriseRiskHistory';

const CANONICAL_CATEGORIES = Object.values(EnterpriseRiskCategory);

async function nextId(organizationId: string, kind: 'RISK' | 'KRI') {
    const sequence = await prisma.$transaction(async (tx) => {
        const current = await tx.enterpriseRiskCounter.upsert({
            where: { organizationId },
            create: { organizationId, nextRisk: 1, nextKri: 1 },
            update: {},
        });
        const value = kind === 'RISK' ? current.nextRisk : current.nextKri;
        await tx.enterpriseRiskCounter.update({
            where: { organizationId },
            data: kind === 'RISK' ? { nextRisk: value + 1 } : { nextKri: value + 1 },
        });
        return value;
    });
    return nextPublicId(kind, sequence);
}

async function ensureMethodology(organizationId: string) {
    const existing = await prisma.enterpriseRiskMethodology.findFirst({
        where: { organizationId, isActive: true },
        orderBy: { publishedAt: 'desc' },
    });
    if (existing) return existing;
    return prisma.enterpriseRiskMethodology.create({
        data: {
            organizationId,
            version: ENTERPRISE_RISK_METHODOLOGY_VERSION,
            isActive: true,
            likelihoodLabels: ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'],
            impactLabels: ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'],
            matrix: { formula: 'likelihood * impact', bands: { LOW: '1-6', MEDIUM: '7-12', HIGH: '13-19', CRITICAL: '20-25' } },
            notes: 'Default 5×5. Highest impact dimension suggests overall impact. Acceptance does not change residual.',
        },
    });
}

async function history(organizationId: string, riskId: string, eventType: string, summary: string, actorUserId?: string | null, payload?: unknown) {
    await prisma.enterpriseRiskHistory.create({
        data: { organizationId, riskId, eventType, summary, actorUserId: actorUserId || null, payload: payload as Prisma.InputJsonValue || undefined },
    });
}

async function projectRiskNode(organizationId: string, risk: { id: string; publicId: string; title: string; status: string }, actorUserId?: string | null) {
    return ensureNode({
        organizationId,
        nodeType: GovernanceNodeType.RISK,
        sourceModel: 'EnterpriseRisk',
        sourceId: risk.id,
        displayLabel: `${risk.publicId} ${risk.title}`,
        status: risk.status,
        actorUserId,
    });
}

async function scoreRisk(organizationId: string, riskId: string, reason: string, actorUserId?: string | null) {
    const risk = await prisma.enterpriseRisk.findFirst({
        where: { id: riskId, organizationId },
        include: { dimensions: true, controlLinks: true },
    });
    if (!risk) throw new ApiError(404, 'Risk not found');
    const controls = risk.controlLinks.length
        ? await prisma.organizationControl.findMany({
            where: { organizationId, id: { in: risk.controlLinks.map((link) => link.controlId) } },
            select: { effectivenessStatus: true },
        })
        : [];
    const methodology = await ensureMethodology(organizationId);
    const scored = calculateEnterpriseRisk({
        likelihood: risk.likelihood,
        impact: risk.impact,
        dimensions: risk.dimensions,
        controlEffectiveness: controls.map((row) => row.effectivenessStatus as ControlEffectiveness),
        targetLikelihood: risk.targetLikelihood,
        targetImpact: risk.targetImpact,
        methodologyVersion: methodology.version,
        reason,
    });
    const appetites = await prisma.enterpriseRiskAppetite.findMany({
        where: {
            organizationId,
            OR: [
                { scope: 'ORGANIZATION' },
                { scope: 'CATEGORY', category: risk.category },
                { scope: 'BUSINESS_UNIT', businessUnitId: risk.businessUnitId || undefined },
            ],
        },
    });
    const appetite = resolveAppetite(scored.residualRating, appetites.map((row) => ({
        scope: row.scope,
        maxResidualRating: row.maxResidualRating as EnterpriseRating,
    })));
    const updated = await prisma.enterpriseRisk.update({
        where: { id: risk.id },
        data: {
            impact: scored.impact,
            inherentScore: scored.inherentScore,
            inherentRating: scored.inherentRating,
            residualScore: scored.residualScore,
            residualRating: scored.residualRating,
            targetScore: scored.targetScore,
            targetRating: scored.targetRating,
            appetiteStatus: appetite,
            methodologyVersion: scored.methodologyVersion,
            lastCalculatedAt: new Date(scored.calculatedAt),
        },
    });
    await prisma.enterpriseRiskScoreSnapshot.create({
        data: {
            organizationId,
            riskId: risk.id,
            methodologyId: methodology.id,
            methodologyVersion: scored.methodologyVersion,
            inherentScore: scored.inherentScore,
            inherentRating: scored.inherentRating,
            residualScore: scored.residualScore,
            residualRating: scored.residualRating,
            controlReduction: scored.controlReduction,
            inputs: scored.inputs as Prisma.InputJsonValue,
            explanation: scored.explanation,
            reason,
        },
    });
    if (reason !== 'Risk created') {
        const summary = scoreChangeSummary({
            fromRating: risk.residualRating,
            toRating: scored.residualRating,
            fromScore: risk.residualScore,
            toScore: scored.residualScore,
            fromLikelihood: risk.likelihood,
            toLikelihood: scored.likelihood,
            fromAppetite: risk.appetiteStatus,
            toAppetite: appetite,
        });
        await history(organizationId, risk.id, 'Risk reassessed', summary, actorUserId, {
            explanation: scored.explanation,
            change: summary,
            fromRating: risk.residualRating,
            toRating: scored.residualRating,
            fromScore: risk.residualScore,
            toScore: scored.residualScore,
            fromLikelihood: risk.likelihood,
            toLikelihood: scored.likelihood,
            fromAppetite: risk.appetiteStatus,
            toAppetite: appetite,
        });
    }
    await audit({
        organizationId,
        actorUserId,
        action: 'risk.score.calculated',
        resourceType: 'EnterpriseRisk',
        resourceId: risk.id,
        metadata: { publicId: risk.publicId, residualScore: scored.residualScore, methodologyVersion: scored.methodologyVersion },
    });
    if (appetite === 'OUTSIDE_APPETITE') {
        const { emitSupremeAutomationEvent } = await import('./supremeAutomationBus');
        await emitSupremeAutomationEvent({
            organizationId,
            event: 'risk.outside_appetite',
            sourceModel: 'EnterpriseRisk',
            sourceId: risk.id,
            sourcePublicId: risk.publicId,
            actorUserId,
        });
    }
    return { risk: updated, scored, appetite };
}

export const enterpriseRiskService = {
    async dashboard(organizationId: string) {
        const where = { organizationId, archivedAt: null, status: { not: EnterpriseRiskStatus.ARCHIVED } };
        const risks = await prisma.enterpriseRisk.findMany({ where, include: { controlLinks: true, treatments: true, decisions: true, businessUnit: true } });
        const now = Date.now();
        const controlIds = [...new Set(risks.flatMap((row) => row.controlLinks.map((link) => link.controlId)))];
        const controls = controlIds.length
            ? await prisma.organizationControl.findMany({ where: { organizationId, id: { in: controlIds } }, include: { tests: { orderBy: { testedAt: 'desc' }, take: 1 } } })
            : [];
        const controlById = new Map(controls.map((row) => [row.id, row]));
        const heatmap = Array.from({ length: 5 }, (_, impact) => Array.from({ length: 5 }, (__, likelihood) => ({
            likelihood: likelihood + 1,
            impact: impact + 1,
            count: risks.filter((row) => row.likelihood === likelihood + 1 && row.impact === impact + 1).length,
        })));
        const byCategory = CANONICAL_CATEGORIES.map((category) => ({
            category,
            count: risks.filter((row) => row.category === category).length,
            critical: risks.filter((row) => row.category === category && row.residualRating === 'CRITICAL').length,
        }));
        const unitNames = [...new Set(risks.map((row) => row.businessUnit?.name || 'Unassigned'))];
        const byBusinessUnit = unitNames.map((name) => ({
            name,
            count: risks.filter((row) => (row.businessUnit?.name || 'Unassigned') === name).length,
            critical: risks.filter((row) => (row.businessUnit?.name || 'Unassigned') === name && row.residualRating === 'CRITICAL').length,
        }));
        const appetite = await prisma.enterpriseRiskAppetite.findMany({
            where: { organizationId },
            include: { businessUnit: true },
            orderBy: { createdAt: 'desc' },
        });
        return {
            honesty: 'Counts are live tenant records. Ordinal scores are not summed into an enterprise risk number.',
            totals: {
                active: risks.length,
                critical: risks.filter((row) => row.residualRating === 'CRITICAL').length,
                high: risks.filter((row) => row.residualRating === 'HIGH').length,
                outsideAppetite: risks.filter((row) => row.appetiteStatus === 'OUTSIDE_APPETITE').length,
                overdueReviews: risks.filter((row) => row.reviewDate && row.reviewDate.getTime() < now).length,
                overdueTreatments: risks.filter((row) => row.treatments.some((item) => item.dueDate && item.dueDate.getTime() < now && item.status !== 'COMPLETED' && item.status !== 'CANCELLED')).length,
                worsening: risks.filter((row) => row.trend === 'WORSENING').length,
                improving: risks.filter((row) => row.trend === 'IMPROVING').length,
                withoutOwners: risks.filter((row) => !row.ownerUserId).length,
                withoutTestedControls: risks.filter((row) => !row.controlLinks.some((link) => controlById.get(link.controlId)?.effectivenessStatus && controlById.get(link.controlId)?.effectivenessStatus !== 'NOT_TESTED')).length,
            },
            heatmap,
            byCategory,
            byBusinessUnit,
            appetite,
            topRisks: [...risks].sort((a, b) => b.residualScore - a.residualScore).slice(0, 8),
            attention: risks
                .map((row) => {
                    const reasons: string[] = [];
                    const unownedHigh = !row.ownerUserId && (row.residualRating === 'CRITICAL' || row.residualRating === 'HIGH');
                    if (unownedHigh) reasons.push('Unassigned');
                    if (row.appetiteStatus === 'OUTSIDE_APPETITE') reasons.push('Outside appetite');
                    if (row.reviewDate && row.reviewDate.getTime() < now) reasons.push('Overdue review');
                    if (row.decisions.some((item) => item.status === 'APPROVED' && item.expiresAt && item.expiresAt.getTime() < now)) reasons.push('Acceptance expired');
                    if (!row.ownerUserId && !unownedHigh) reasons.push('Unassigned');
                    return { ...row, reasons };
                })
                .filter((row) => row.reasons.length)
                .sort((left, right) => {
                    const rank = (row: { ownerUserId: string | null; residualRating: string }) => {
                        if (!row.ownerUserId && row.residualRating === 'CRITICAL') return 0;
                        if (!row.ownerUserId && row.residualRating === 'HIGH') return 1;
                        return 2;
                    };
                    return rank(left) - rank(right) || right.residualScore - left.residualScore;
                })
                .slice(0, 12),
        };
    },

    async list(organizationId: string, filters: { category?: string; rating?: string; appetite?: string; q?: string; likelihood?: number; impact?: number; unowned?: boolean }) {
        const rows = await prisma.enterpriseRisk.findMany({
            where: {
                organizationId,
                archivedAt: null,
                ...(filters.category ? { category: filters.category as EnterpriseRiskCategory } : {}),
                ...(filters.rating ? { residualRating: filters.rating as EnterpriseRating } : {}),
                ...(filters.appetite ? { appetiteStatus: filters.appetite as never } : {}),
                ...(filters.likelihood ? { likelihood: filters.likelihood } : {}),
                ...(filters.impact ? { impact: filters.impact } : {}),
                ...(filters.unowned ? { ownerUserId: null } : {}),
                ...(filters.q ? { OR: [{ title: { contains: filters.q, mode: 'insensitive' } }, { publicId: { contains: filters.q, mode: 'insensitive' } }] } : {}),
            },
            orderBy: [{ residualScore: 'desc' }, { publicId: 'asc' }],
            include: { businessUnit: true },
            take: 500,
        });
        const owners = await prisma.user.findMany({
            where: { organizationId, id: { in: [...new Set(rows.map((row) => row.ownerUserId).filter(Boolean) as string[])] } },
            select: { id: true, firstName: true, lastName: true },
        });
        const ownerName = new Map(owners.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim()]));
        return rows.map((row) => ({ ...row, ownerName: row.ownerUserId ? ownerName.get(row.ownerUserId) || 'Unassigned' : 'Unassigned' }));
    },

    async get(organizationId: string, publicId: string) {
        const risk = await prisma.enterpriseRisk.findFirst({
            where: { organizationId, OR: [{ publicId }, { id: publicId }] },
            include: {
                dimensions: true,
                businessUnit: true,
                customCategory: true,
                scores: { orderBy: { calculatedAt: 'desc' }, take: 12 },
                treatments: { include: { actions: true }, orderBy: { createdAt: 'desc' } },
                decisions: { orderBy: { createdAt: 'desc' } },
                controlLinks: true,
                findingLinks: true,
                kris: { include: { measurements: { orderBy: { measuredAt: 'desc' }, take: 8 } } },
                events: { orderBy: { occurredAt: 'desc' }, take: 20 },
                history: { orderBy: { createdAt: 'desc' }, take: 40 },
                relationshipLinks: true,
            },
        });
        if (!risk) throw new ApiError(404, 'Risk not found');
        const controlIds = risk.controlLinks.map((link) => link.controlId);
        const controls = controlIds.length
            ? await prisma.organizationControl.findMany({
                where: { organizationId, id: { in: controlIds } },
                include: { tests: { orderBy: { testedAt: 'desc' }, take: 1 } },
            })
            : [];
        const evidence = controlIds.length
            ? await prisma.evidenceGovernanceLink.findMany({
                where: { organizationId, targetType: 'CONTROL', targetId: { in: controlIds }, validTo: null },
                include: { storedObject: { select: { id: true, filename: true, scanStatus: true } } },
            })
            : [];
        const findings = risk.findingLinks.length
            ? await prisma.vendorIssue.findMany({
                where: { organizationId, id: { in: risk.findingLinks.map((link) => link.findingId) } },
                select: { id: true, title: true, status: true, severity: true },
            })
            : [];
        const owners = await prisma.user.findMany({
            where: { organizationId, id: { in: [risk.ownerUserId, risk.executiveOwnerUserId].filter(Boolean) as string[] } },
            select: { id: true, firstName: true, lastName: true, email: true },
        });
        const actorIds = [...new Set(risk.history.map((row) => row.actorUserId).filter(Boolean) as string[])];
        const actors = actorIds.length
            ? await prisma.user.findMany({ where: { organizationId, id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true } })
            : [];
        const actorName = new Map(actors.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim()]));
        const timeline = risk.history.map((row) => ({
            ...presentHistoryEntry({ ...row, payload: row.payload as never }),
            actor: row.actorUserId ? actorName.get(row.actorUserId) || 'A teammate' : 'System',
        }));
        return {
            honesty: 'This risk is scored by the enterprise 5×5 methodology. Vendor residual scores are separate. Acceptance does not lower residual risk.',
            risk,
            controls: controls.map((control) => ({
                ...control,
                lastTest: control.tests[0] || null,
                evidence: evidence.filter((row) => row.targetId === control.id).map((row) => ({
                    filename: row.storedObject.filename,
                    scanStatus: row.storedObject.scanStatus,
                    usable: row.storedObject.scanStatus === 'CLEAN' && row.relationship === 'SUPPORTS',
                    freshness: row.freshness,
                })),
            })),
            findings,
            owners,
            timeline,
        };
    },

    async create(organizationId: string, actorUserId: string | null, input: {
        title: string;
        statement?: string;
        description?: string;
        category: EnterpriseRiskCategory;
        likelihood: number;
        impact: number;
        ownerUserId?: string;
        businessUnitId?: string;
        source?: string;
        reviewDate?: string;
        dimensions?: Array<{ dimension: string; rating: number }>;
    }) {
        if (!input.title?.trim()) throw new ApiError(400, 'A risk title is required');
        if (input.businessUnitId) {
            await requireBusinessUnitForOrganization(organizationId, input.businessUnitId);
        }
        await ensureMethodology(organizationId);
        const publicId = await nextId(organizationId, 'RISK');
        const scored = calculateEnterpriseRisk({
            likelihood: input.likelihood,
            impact: input.impact,
            dimensions: input.dimensions,
            reason: 'Risk created',
        });
        const risk = await prisma.enterpriseRisk.create({
            data: {
                organizationId,
                publicId,
                title: input.title.trim(),
                statement: input.statement,
                description: input.description,
                category: input.category,
                businessUnitId: input.businessUnitId,
                ownerUserId: input.ownerUserId,
                source: input.source,
                status: 'IDENTIFIED',
                likelihood: scored.likelihood,
                impact: scored.impact,
                inherentScore: scored.inherentScore,
                inherentRating: scored.inherentRating,
                residualScore: scored.residualScore,
                residualRating: scored.residualRating,
                methodologyVersion: scored.methodologyVersion,
                lastCalculatedAt: new Date(scored.calculatedAt),
                reviewDate: input.reviewDate ? new Date(input.reviewDate) : undefined,
                dimensions: input.dimensions?.length
                    ? { create: input.dimensions.map((row) => ({ dimension: row.dimension as never, rating: row.rating })) }
                    : undefined,
            },
        });
        const scoredRow = await scoreRisk(organizationId, risk.id, 'Risk created', actorUserId);
        const node = await projectRiskNode(organizationId, scoredRow.risk, actorUserId);
        await history(organizationId, risk.id, 'Risk created', `${publicId} recorded.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'risk.created', resourceType: 'EnterpriseRisk', resourceId: risk.id, metadata: { publicId } });
        return { ...scoredRow.risk, publicId, graphNodeId: node.node.id };
    },

    async update(organizationId: string, publicId: string, actorUserId: string | null, input: Record<string, unknown>) {
        const current = await prisma.enterpriseRisk.findFirst({ where: { organizationId, publicId } });
        if (!current) throw new ApiError(404, 'Risk not found');
        const data: Prisma.EnterpriseRiskUpdateInput = {};
        if (typeof input.title === 'string') data.title = input.title;
        if (typeof input.statement === 'string') data.statement = input.statement;
        if (typeof input.description === 'string') data.description = input.description;
        if (typeof input.ownerUserId === 'string' || input.ownerUserId === null) {
            data.ownerUserId = input.ownerUserId as string | null;
        }
        if (typeof input.status === 'string') data.status = input.status as EnterpriseRiskStatus;
        if (typeof input.likelihood === 'number') data.likelihood = input.likelihood;
        if (typeof input.impact === 'number') data.impact = input.impact;
        if (typeof input.trend === 'string') data.trend = input.trend as never;
        if (typeof input.treatmentStrategy === 'string') data.treatmentStrategy = input.treatmentStrategy as EnterpriseTreatmentStrategy;
        if (typeof input.reviewDate === 'string') data.reviewDate = new Date(input.reviewDate);
        if (typeof input.businessUnitId === 'string') {
            await requireBusinessUnitForOrganization(organizationId, input.businessUnitId);
            data.businessUnit = { connect: { id: input.businessUnitId } };
        } else if (input.businessUnitId === null) {
            data.businessUnit = { disconnect: true };
        }
        const updated = await prisma.enterpriseRisk.update({ where: { id: current.id }, data });
        if (input.likelihood || input.impact) {
            await scoreRisk(organizationId, current.id, 'Inputs changed', actorUserId);
        }
        if (input.ownerUserId !== undefined && input.ownerUserId !== current.ownerUserId) {
            const ids = [current.ownerUserId, typeof input.ownerUserId === 'string' ? input.ownerUserId : null].filter(Boolean) as string[];
            const people = ids.length
                ? await prisma.user.findMany({ where: { organizationId, id: { in: ids } }, select: { id: true, firstName: true, lastName: true } })
                : [];
            const nameOf = (id: string | null) => {
                if (!id) return 'Unassigned';
                const person = people.find((row) => row.id === id);
                return person ? `${person.firstName} ${person.lastName}`.trim() : 'Unassigned';
            };
            const fromOwner = nameOf(current.ownerUserId);
            const toOwner = nameOf(typeof input.ownerUserId === 'string' ? input.ownerUserId : null);
            await history(organizationId, current.id, 'Owner changed', `Owner changed ${fromOwner} → ${toOwner}`, actorUserId, { fromOwner, toOwner });
        }
        await audit({ organizationId, actorUserId, action: 'risk.updated', resourceType: 'EnterpriseRisk', resourceId: current.id, metadata: { publicId } });
        return updated;
    },

    async archive(organizationId: string, publicId: string, actorUserId: string | null) {
        const current = await prisma.enterpriseRisk.findFirst({ where: { organizationId, publicId } });
        if (!current) throw new ApiError(404, 'Risk not found');
        const updated = await prisma.enterpriseRisk.update({
            where: { id: current.id },
            data: { status: 'ARCHIVED', archivedAt: new Date() },
        });
        await history(organizationId, current.id, 'Risk archived', `${publicId} archived.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'risk.archived', resourceType: 'EnterpriseRisk', resourceId: current.id, metadata: { publicId } });
        return updated;
    },

    async linkControl(organizationId: string, publicId: string, controlId: string, rationale: string | undefined, actorUserId: string | null) {
        const risk = await prisma.enterpriseRisk.findFirst({ where: { organizationId, publicId } });
        const control = await prisma.organizationControl.findFirst({ where: { organizationId, id: controlId } });
        if (!risk || !control) throw new ApiError(404, 'Risk or control not found');
        const link = await prisma.enterpriseRiskControlLink.upsert({
            where: { riskId_controlId: { riskId: risk.id, controlId } },
            create: { organizationId, riskId: risk.id, controlId, rationale },
            update: { rationale },
        });
        await scoreRisk(organizationId, risk.id, 'Control linked', actorUserId);
        const riskNode = await projectRiskNode(organizationId, risk, actorUserId);
        const controlNode = await ensureNode({
            organizationId,
            nodeType: 'CONTROL',
            sourceModel: 'OrganizationControl',
            sourceId: control.id,
            displayLabel: control.title,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: controlNode.node.id,
            toNodeId: riskNode.node.id,
            relationshipType: GovernanceRelationshipType.MITIGATES,
            createdBy: actorUserId,
        });
        await history(organizationId, risk.id, 'Control linked', `${control.title} is expected to reduce this risk.`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'risk.control.linked', resourceType: 'EnterpriseRisk', resourceId: risk.id, metadata: { publicId, controlId } });
        return link;
    },

    async linkFinding(organizationId: string, publicId: string, findingId: string, actorUserId: string | null) {
        const risk = await prisma.enterpriseRisk.findFirst({ where: { organizationId, publicId } });
        const finding = await prisma.vendorIssue.findFirst({ where: { organizationId, id: findingId } });
        if (!risk || !finding) throw new ApiError(404, 'Risk or finding not found');
        const link = await prisma.enterpriseRiskFindingLink.upsert({
            where: { riskId_findingId: { riskId: risk.id, findingId } },
            create: { organizationId, riskId: risk.id, findingId },
            update: {},
        });
        const riskNode = await projectRiskNode(organizationId, risk, actorUserId);
        const findingNode = await ensureNode({
            organizationId,
            nodeType: 'FINDING',
            sourceModel: 'VendorIssue',
            sourceId: finding.id,
            displayLabel: finding.title,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: findingNode.node.id,
            toNodeId: riskNode.node.id,
            relationshipType: GovernanceRelationshipType.INCREASES_EXPOSURE_TO,
            createdBy: actorUserId,
        });
        await history(organizationId, risk.id, 'Finding linked', `${finding.title} increases exposure.`, actorUserId);
        return link;
    },

    async addRelationship(organizationId: string, publicId: string, input: { targetType: string; targetId: string; relationship: string }, actorUserId: string | null) {
        const risk = await prisma.enterpriseRisk.findFirst({ where: { organizationId, publicId } });
        if (!risk) throw new ApiError(404, 'Risk not found');
        const allowed = ['BUSINESS_UNIT', 'VENDOR', 'SYSTEM', 'DATA_ASSET', 'FOURTH_PARTY'];
        if (!allowed.includes(input.targetType)) throw new ApiError(400, 'Unsupported relationship target');
        let targetLabel = input.targetType;
        if (input.targetType === 'VENDOR') {
            const vendor = await prisma.vendor.findFirst({ where: { organizationId, id: input.targetId } });
            if (!vendor) throw new ApiError(404, 'Vendor not found');
            targetLabel = vendor.name;
        }
        if (input.targetType === 'BUSINESS_UNIT') {
            const unit = await prisma.businessUnit.findFirst({ where: { organizationId, id: input.targetId } });
            if (!unit) throw new ApiError(404, 'Business unit not found');
            targetLabel = unit.name;
        }
        const relationship = input.relationship || 'AFFECTS';
        const row = await prisma.enterpriseRiskRelationship.upsert({
            where: { riskId_targetType_targetId_relationship: { riskId: risk.id, targetType: input.targetType, targetId: input.targetId, relationship } },
            create: { organizationId, riskId: risk.id, targetType: input.targetType, targetId: input.targetId, relationship },
            update: {},
        });
        const riskNode = await projectRiskNode(organizationId, risk, actorUserId);
        const nodeType = input.targetType === 'VENDOR' || input.targetType === 'FOURTH_PARTY' ? GovernanceNodeType.VENDOR
            : input.targetType === 'BUSINESS_UNIT' ? GovernanceNodeType.BUSINESS_UNIT
                : input.targetType === 'DATA_ASSET' ? GovernanceNodeType.DATA_ASSET
                    : GovernanceNodeType.SYSTEM;
        const targetNode = await ensureNode({
            organizationId,
            nodeType,
            sourceModel: input.targetType === 'VENDOR' ? 'Vendor' : input.targetType,
            sourceId: input.targetId,
            displayLabel: targetLabel,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: riskNode.node.id,
            toNodeId: targetNode.node.id,
            relationshipType: input.targetType === 'VENDOR' ? GovernanceRelationshipType.ASSOCIATED_WITH : GovernanceRelationshipType.AFFECTS,
            createdBy: actorUserId,
        });
        return row;
    },

    async createTreatment(organizationId: string, publicId: string, actorUserId: string | null, input: {
        strategy: EnterpriseTreatmentStrategy;
        ownerUserId?: string;
        dueDate?: string;
        notes?: string;
        expectedTargetScore?: number;
        actions?: Array<{ title: string; dueDate?: string }>;
    }) {
        const risk = await prisma.enterpriseRisk.findFirst({ where: { organizationId, publicId } });
        if (!risk) throw new ApiError(404, 'Risk not found');
        const treatment = await prisma.enterpriseRiskTreatment.create({
            data: {
                organizationId,
                riskId: risk.id,
                strategy: input.strategy,
                ownerUserId: input.ownerUserId,
                dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
                notes: input.notes,
                expectedTargetScore: input.expectedTargetScore,
                actions: input.actions?.length
                    ? { create: input.actions.map((action) => ({ title: action.title, dueDate: action.dueDate ? new Date(action.dueDate) : undefined })) }
                    : undefined,
            },
            include: { actions: true },
        });
        await prisma.enterpriseRisk.update({ where: { id: risk.id }, data: { treatmentStrategy: input.strategy, status: 'TREATING' } });
        const riskNode = await projectRiskNode(organizationId, risk, actorUserId);
        const treatmentNode = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.TREATMENT,
            sourceModel: 'EnterpriseRiskTreatment',
            sourceId: treatment.id,
            displayLabel: `${input.strategy} ${risk.publicId}`,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: treatmentNode.node.id,
            toNodeId: riskNode.node.id,
            relationshipType: GovernanceRelationshipType.ADDRESSES,
            createdBy: actorUserId,
        });
        await history(organizationId, risk.id, 'Treatment created', 'A treatment plan was recorded. Residual risk is unchanged until the risk is rescored from control evidence.', actorUserId);
        await audit({ organizationId, actorUserId, action: 'risk.treatment.changed', resourceType: 'EnterpriseRisk', resourceId: risk.id, metadata: { publicId, strategy: input.strategy } });
        return treatment;
    },

    async decide(organizationId: string, publicId: string, actorUserId: string | null, input: {
        decision: EnterpriseDecisionType;
        rationale: string;
        authority?: string;
        conditions?: string;
        expiresAt?: string;
        approve?: boolean;
    }) {
        const risk = await prisma.enterpriseRisk.findFirst({ where: { organizationId, publicId } });
        if (!risk) throw new ApiError(404, 'Risk not found');
        if (!input.rationale?.trim()) throw new ApiError(400, 'A rationale is required');
        const created = await prisma.enterpriseRiskHistory.findFirst({
            where: { organizationId, riskId: risk.id },
            orderBy: { createdAt: 'asc' },
        });
        assertIndependentReviewer(risk.ownerUserId || created?.actorUserId, actorUserId);
        const status = input.approve === false ? EnterpriseDecisionStatus.REJECTED : EnterpriseDecisionStatus.APPROVED;
        const decision = await prisma.enterpriseRiskDecision.create({
            data: {
                organizationId,
                riskId: risk.id,
                decision: input.decision,
                status,
                decisionMakerUserId: actorUserId,
                authority: input.authority,
                rationale: input.rationale,
                conditions: input.conditions,
                approvedAt: status === 'APPROVED' ? new Date() : undefined,
                expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
            },
        });
        if (input.decision === 'ACCEPT' && status === 'APPROVED') {
            await prisma.enterpriseRisk.update({ where: { id: risk.id }, data: { status: 'ACCEPTED' } });
        }
        const riskNode = await projectRiskNode(organizationId, risk, actorUserId);
        const decisionNode = await ensureNode({
            organizationId,
            nodeType: 'DECISION',
            sourceModel: 'EnterpriseRiskDecision',
            sourceId: decision.id,
            displayLabel: `${input.decision} ${risk.publicId}`,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: decisionNode.node.id,
            toNodeId: riskNode.node.id,
            relationshipType: GovernanceRelationshipType.GOVERNS,
            createdBy: actorUserId,
        });
        await history(organizationId, risk.id, input.decision === 'ACCEPT' ? 'Risk accepted' : 'Decision recorded', input.rationale, actorUserId);
        await audit({ organizationId, actorUserId, action: 'risk.decision.approved', resourceType: 'EnterpriseRisk', resourceId: risk.id, metadata: { publicId, decision: input.decision, residualUnchanged: true } });
        const latest = await prisma.enterpriseRisk.findUnique({ where: { id: risk.id } });
        return { decision, residualScore: latest?.residualScore, residualUnchanged: latest?.residualScore === risk.residualScore };
    },

    async upsertKri(organizationId: string, publicId: string, actorUserId: string | null, input: {
        name: string;
        description?: string;
        unit?: string;
        direction: EnterpriseKriDirection;
        warningThreshold: number;
        criticalThreshold: number;
        ownerUserId?: string;
    }) {
        const risk = await prisma.enterpriseRisk.findFirst({ where: { organizationId, publicId } });
        if (!risk) throw new ApiError(404, 'Risk not found');
        const kriPublicId = await nextId(organizationId, 'KRI');
        const kri = await prisma.enterpriseRiskKri.create({
            data: {
                organizationId,
                riskId: risk.id,
                publicId: kriPublicId,
                name: input.name,
                description: input.description,
                unit: input.unit,
                direction: input.direction,
                warningThreshold: input.warningThreshold,
                criticalThreshold: input.criticalThreshold,
                ownerUserId: input.ownerUserId,
                source: 'MANUAL',
                status: 'NOT_MEASURED',
            },
        });
        await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.KRI,
            sourceModel: 'EnterpriseRiskKri',
            sourceId: kri.id,
            displayLabel: `${kriPublicId} ${kri.name}`,
            actorUserId,
        });
        await audit({ organizationId, actorUserId, action: 'risk.kri.updated', resourceType: 'EnterpriseRiskKri', resourceId: kri.id, metadata: { publicId: kriPublicId } });
        return kri;
    },

    async measureKri(organizationId: string, kriPublicId: string, value: number, actorUserId: string | null) {
        const kri = await prisma.enterpriseRiskKri.findFirst({ where: { organizationId, publicId: kriPublicId } });
        if (!kri) throw new ApiError(404, 'KRI not found');
        const status = kriStatus({
            value,
            warningThreshold: kri.warningThreshold,
            criticalThreshold: kri.criticalThreshold,
            direction: kri.direction,
        });
        await prisma.enterpriseRiskKriMeasurement.create({
            data: { kriId: kri.id, value, source: 'MANUAL', recordedBy: actorUserId },
        });
        const updated = await prisma.enterpriseRiskKri.update({
            where: { id: kri.id },
            data: { currentValue: value, measuredAt: new Date(), status },
        });
        if (status === 'WARNING' || status === 'CRITICAL') {
            await history(organizationId, kri.riskId, 'KRI threshold exceeded', `${kri.publicId} is ${status.toLowerCase()}.`, actorUserId, { value, status });
            await prisma.enterpriseRiskEvent.create({
                data: {
                    organizationId,
                    riskId: kri.riskId,
                    eventType: 'KRI_THRESHOLD',
                    title: `${kri.name} crossed a threshold`,
                    description: `Manual measurement ${value} is ${status.replace('_', ' ').toLowerCase()}. Score was not rewritten.`,
                    triggersReview: true,
                },
            });
        }
        await audit({ organizationId, actorUserId, action: 'risk.kri.updated', resourceType: 'EnterpriseRiskKri', resourceId: kri.id, metadata: { value, status } });
        return updated;
    },

    async setAppetite(organizationId: string, actorUserId: string | null, input: {
        scope: EnterpriseAppetiteScope;
        maxResidualRating: EnterpriseRating;
        category?: EnterpriseRiskCategory;
        businessUnitId?: string;
        statement?: string;
    }) {
        if (input.businessUnitId) {
            await requireBusinessUnitForOrganization(organizationId, input.businessUnitId);
        }
        const row = await prisma.enterpriseRiskAppetite.create({
            data: {
                organizationId,
                scope: input.scope,
                maxResidualRating: input.maxResidualRating,
                category: input.category,
                businessUnitId: input.businessUnitId,
                statement: input.statement,
            },
        });
        const risks = await prisma.enterpriseRisk.findMany({ where: { organizationId, archivedAt: null } });
        for (const risk of risks) {
            await scoreRisk(organizationId, risk.id, 'Appetite changed', actorUserId);
        }
        await audit({ organizationId, actorUserId, action: 'risk.appetite.changed', resourceType: 'EnterpriseRiskAppetite', resourceId: row.id, metadata: input });
        return row;
    },

    async listAppetite(organizationId: string) {
        return prisma.enterpriseRiskAppetite.findMany({ where: { organizationId }, include: { businessUnit: true }, orderBy: { createdAt: 'desc' } });
    },

    async listBusinessUnits(organizationId: string) {
        return prisma.businessUnit.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
    },

    async createBusinessUnit(organizationId: string, name: string) {
        if (!name.trim()) throw new ApiError(400, 'A business unit name is required');
        return prisma.businessUnit.create({ data: { organizationId, name: name.trim() } });
    },

    async previewImport(organizationId: string, rows: Array<Record<string, string>>) {
        const errors: Array<{ row: number; message: string }> = [];
        const accepted = [];
        for (const [index, row] of rows.entries()) {
            if (!row.title) errors.push({ row: index + 1, message: 'Title is required' });
            if (!CANONICAL_CATEGORIES.includes(row.category as EnterpriseRiskCategory)) {
                errors.push({ row: index + 1, message: 'Category must be a canonical reporting key' });
            }
            const likelihood = Number(row.likelihood);
            const impact = Number(row.impact);
            if (!(likelihood >= 1 && likelihood <= 5 && impact >= 1 && impact <= 5)) {
                errors.push({ row: index + 1, message: 'Likelihood and impact must be 1–5' });
            }
            if (row.title) {
                accepted.push({
                    title: neutralizeSpreadsheetCell(row.title),
                    category: row.category,
                    likelihood,
                    impact,
                    statement: neutralizeSpreadsheetCell(row.statement || ''),
                });
            }
        }
        return { rows: accepted, errors, canCommit: errors.length === 0 && accepted.length > 0 };
    },

    async commitImport(organizationId: string, actorUserId: string | null, rows: Array<Record<string, string>>) {
        const preview = await this.previewImport(organizationId, rows);
        if (!preview.canCommit) throw new ApiError(400, 'Import preview has errors');
        const created = [];
        for (const row of preview.rows) {
            created.push(await this.create(organizationId, actorUserId, {
                title: row.title,
                category: row.category as EnterpriseRiskCategory,
                likelihood: row.likelihood,
                impact: row.impact,
                statement: row.statement,
                source: 'IMPORT',
            }));
        }
        return { created: created.length };
    },

    async exportRows(organizationId: string) {
        const rows = await prisma.enterpriseRisk.findMany({ where: { organizationId, archivedAt: null }, orderBy: { publicId: 'asc' } });
        const owners = await prisma.user.findMany({
            where: { organizationId, id: { in: [...new Set(rows.map((row) => row.ownerUserId).filter(Boolean) as string[])] } },
            select: { id: true, firstName: true, lastName: true },
        });
        const ownerName = new Map(owners.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim()]));
        const readable = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
        return rows.map((row) => ({
            publicId: neutralizeSpreadsheetCell(row.publicId),
            title: neutralizeSpreadsheetCell(row.title),
            category: neutralizeSpreadsheetCell(readable(row.category)),
            status: neutralizeSpreadsheetCell(readable(row.status)),
            likelihood: row.likelihood,
            impact: row.impact,
            inherentScore: row.inherentScore,
            residualScore: row.residualScore,
            residualRating: neutralizeSpreadsheetCell(readable(row.residualRating)),
            appetiteStatus: neutralizeSpreadsheetCell(readable(row.appetiteStatus)),
            owner: neutralizeSpreadsheetCell(row.ownerUserId ? ownerName.get(row.ownerUserId) || 'Unassigned' : 'Unassigned'),
        }));
    },

    async listAssignableOwners(organizationId: string) {
        return prisma.user.findMany({
            where: { organizationId, status: 'ACTIVE' },
            select: { id: true, firstName: true, lastName: true, email: true },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            take: 200,
        });
    },

    async boardPack(organizationId: string) {
        const dashboard = await this.dashboard(organizationId);
        const [kris, decisions, treatments, name] = await Promise.all([
            prisma.enterpriseRiskKri.findMany({
                where: { organizationId, status: { in: ['WARNING', 'CRITICAL'] } },
                include: { risk: { select: { publicId: true, title: true } } },
                take: 20,
            }),
            prisma.enterpriseRiskDecision.findMany({
                where: { organizationId },
                include: { risk: { select: { publicId: true, title: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            prisma.enterpriseRiskTreatment.findMany({
                where: { organizationId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
                include: { risk: { select: { publicId: true, title: true } } },
                take: 20,
            }),
            prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
        ]);
        return { dashboard, kris, decisions, treatments, name: name?.name || 'This organization' };
    },

    async controlFailureImpact(organizationId: string, controlId: string) {
        const control = await prisma.organizationControl.findFirst({
            where: { organizationId, id: controlId },
            include: { tests: { orderBy: { testedAt: 'desc' }, take: 1 } },
        });
        if (!control) throw new ApiError(404, 'Control not found');
        const links = await prisma.enterpriseRiskControlLink.findMany({ where: { organizationId, controlId } });
        const risks = links.length
            ? await prisma.enterpriseRisk.findMany({
                where: { organizationId, id: { in: links.map((link) => link.riskId) } },
                include: { treatments: true, decisions: true, relationshipLinks: true, findingLinks: true },
            })
            : [];
        const evidence = await prisma.evidenceGovernanceLink.findMany({
            where: { organizationId, targetType: 'CONTROL', targetId: controlId, validTo: null },
            include: { storedObject: { select: { filename: true, scanStatus: true } } },
        });
        return {
            honesty: 'Recommendations are rule-based. Residual scores are not rewritten by this view.',
            control: {
                title: control.title,
                implementationStatus: control.implementationStatus,
                effectivenessStatus: control.effectivenessStatus,
                lastTest: control.tests[0] || null,
            },
            evidence: evidence.map((row) => ({ filename: row.storedObject.filename, scanStatus: row.storedObject.scanStatus })),
            risks: risks.map((risk) => ({
                publicId: risk.publicId,
                title: risk.title,
                residualRating: risk.residualRating,
                appetiteStatus: risk.appetiteStatus,
                treatments: risk.treatments.map((item) => item.strategy),
                decisions: risk.decisions.map((item) => item.decision),
                relationships: risk.relationshipLinks,
            })),
            recommendedActions: [
                control.effectivenessStatus !== 'INEFFECTIVE' ? 'Record an ineffective or failed control test if that is what happened.' : 'Review linked risks because this control is already ineffective.',
                risks.some((row) => row.appetiteStatus === 'OUTSIDE_APPETITE') ? 'Escalate risks that are already outside appetite.' : 'Rescore linked risks after the test is recorded.',
                'Open or update treatment for each affected risk. Do not assume residual risk dropped.',
                'Confirm whether a risk decision needs review.',
            ],
        };
    },
};
