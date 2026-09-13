import { VendorIssueStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { calculateVendorRisk, DEFAULT_SCORING_WEIGHTS, type FindingSeverity, type ScoringWeights } from './deterministicRiskEngine';
import { recordAudit } from './auditEventService';

export type MethodologyRecord = {
    id: string;
    version: string;
    name: string;
    isActive: boolean;
    weights: ScoringWeights;
    notes: string | null;
    createdBy: string;
    createdAt: Date;
};

const OPEN_FINDING_STATUSES: VendorIssueStatus[] = [
    VendorIssueStatus.OPEN,
    VendorIssueStatus.IN_PROGRESS,
    VendorIssueStatus.PENDING_VALIDATION,
];
const SEVERITIES: FindingSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const WEIGHT_BOUND = 10000;

function asWeights(value: unknown): ScoringWeights {
    if (!value || typeof value !== 'object') {
        return { ...DEFAULT_SCORING_WEIGHTS };
    }
    return value as ScoringWeights;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

export function assertValidWeights(input: unknown): ScoringWeights {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new ApiError(400, 'A complete scoring methodology is required');
    }
    const weights = input as ScoringWeights;
    const scalars: Array<unknown> = [
        weights.dataSensitivityMultiplier,
        weights.regulatoryMultiplier,
        weights.fourthPartyPoints,
        weights.monitoringEventPoints,
        weights.monitoringEventCap,
        weights.compensatingControlPoints,
    ];
    for (const key of SEVERITIES) {
        scalars.push(weights.tierBase?.[key], weights.findingPoints?.[key]);
    }
    if (scalars.some((value) => value != null && !isFiniteNumber(value))) {
        throw new ApiError(400, 'Every weight must be a finite number. Empty, infinite, and invalid values are not allowed.');
    }
    if (scalars.some((value) => isFiniteNumber(value) && value < 0)) {
        throw new ApiError(400, 'Every weight must be zero or greater.');
    }
    if (scalars.some((value) => isFiniteNumber(value) && value > WEIGHT_BOUND)) {
        throw new ApiError(400, 'Every weight must stay within a bounded range.');
    }
    const unknownTier = Object.keys(weights.tierBase || {}).some((key) => !SEVERITIES.includes(key as FindingSeverity));
    const unknownFinding = Object.keys(weights.findingPoints || {}).some((key) => !SEVERITIES.includes(key as FindingSeverity));
    if (unknownTier || unknownFinding) {
        throw new ApiError(400, 'Severity mappings may only use Critical, High, Medium, or Low.');
    }
    return weights;
}

export function summarizeBandChanges(
    rows: Array<{ current: string; preview: string }>
): { unchanged: number; changes: Array<{ from: string; to: string; count: number }> } {
    const buckets = new Map<string, number>();
    let unchanged = 0;
    for (const row of rows) {
        if (row.current === row.preview) {
            unchanged += 1;
            continue;
        }
        const key = `${row.current}->${row.preview}`;
        buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    return {
        unchanged,
        changes: [...buckets.entries()].map(([key, count]) => {
            const [from, to] = key.split('->');
            return { from, to, count };
        }),
    };
}

function nextVersion(existing: string[]): string {
    const patches = existing
        .map((version) => {
            const match = version.match(/^1\.0\.(\d+)$/);
            return match ? Number(match[1]) : 0;
        })
        .filter((n) => Number.isFinite(n));
    const next = patches.length ? Math.max(...patches) + 1 : 0;
    return `1.0.${next}`;
}

export const scoringMethodologyService = {
    defaults(): ScoringWeights {
        return { ...DEFAULT_SCORING_WEIGHTS };
    },

    async list(organizationId: string) {
        return prisma.scoringMethodology.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
    },

    async getActive(organizationId: string) {
        const active = await prisma.scoringMethodology.findFirst({
            where: { organizationId, isActive: true },
            orderBy: { createdAt: 'desc' },
        });
        if (active) {
            return {
                ...active,
                weights: asWeights(active.weights),
            };
        }
        return {
            id: null,
            organizationId,
            version: '1.0.0',
            name: 'Supreme Risk default',
            isActive: true,
            weights: { ...DEFAULT_SCORING_WEIGHTS },
            notes: 'Built-in formula weights. Publishing a version stores an immutable copy for this organization.',
            createdBy: 'system',
            createdAt: new Date(0),
        };
    },

    async publish(
        organizationId: string,
        actorUserId: string,
        input: { name?: string; weights: ScoringWeights; notes?: string }
    ) {
        assertValidWeights(input.weights);
        if (!input.name?.trim()) {
            throw new ApiError(400, 'A version name is required');
        }
        if (!input.notes?.trim()) {
            throw new ApiError(400, 'A rationale is required before publishing a new methodology version');
        }
        const current = await this.list(organizationId);
        const version = nextVersion(current.map((row) => row.version));
        const created = await prisma.$transaction(async (tx) => {
            await tx.scoringMethodology.updateMany({
                where: { organizationId, isActive: true },
                data: { isActive: false },
            });
            return tx.scoringMethodology.create({
                data: {
                    organizationId,
                    version,
                    name: input.name?.trim() || `Organization methodology ${version}`,
                    isActive: true,
                    weights: input.weights as object,
                    notes: input.notes,
                    createdBy: actorUserId,
                },
            });
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'scoring_methodology.publish',
            resourceType: 'ScoringMethodology',
            resourceId: created.id,
            result: 'success',
            metadata: { version: created.version },
        });
        return created;
    },

    async requireActive(organizationId: string): Promise<{ version: string; weights: ScoringWeights }> {
        const active = await this.getActive(organizationId);
        if (!active.weights) {
            throw new ApiError(500, 'Scoring methodology is unavailable');
        }
        return { version: active.version, weights: asWeights(active.weights) };
    },

    async recordDraftAction(
        organizationId: string,
        actorUserId: string,
        input: { action: 'save' | 'restore_default' | 'load_version' | 'discard'; sourceVersion?: string; weights?: ScoringWeights }
    ) {
        const allowed = ['save', 'restore_default', 'load_version', 'discard'] as const;
        if (!allowed.includes(input.action as typeof allowed[number])) {
            throw new ApiError(400, 'Unknown draft action');
        }
        if (input.weights) assertValidWeights(input.weights);
        const action =
            input.action === 'restore_default'
                ? 'scoring_methodology.draft_restore_default'
                : input.action === 'load_version'
                    ? 'scoring_methodology.draft_load_version'
                    : input.action === 'discard'
                        ? 'scoring_methodology.draft_discard'
                        : 'scoring_methodology.draft_update';
        await recordAudit({
            organizationId,
            actorUserId,
            action,
            resourceType: 'ScoringMethodologyDraft',
            resourceId: organizationId,
            result: 'success',
            metadata: {
                sourceVersion: input.sourceVersion || null,
                version: input.sourceVersion || 'draft',
            },
        });
        return { recorded: true, action };
    },

    async previewImpact(organizationId: string, weights: ScoringWeights) {
        assertValidWeights(weights);
        const active = await this.requireActive(organizationId);
        const vendors = await prisma.vendor.findMany({
            where: { organizationId, terminatedAt: null },
            select: {
                id: true,
                name: true,
                tier: true,
                dataTypesAccessed: true,
                regulatoryScope: true,
                hasSubcontractors: true,
            },
            take: 200,
        });
        const vendorIds = vendors.map((row) => row.id);
        const [issues, monitoring, assessments] = vendorIds.length
            ? await Promise.all([
                prisma.vendorIssue.findMany({
                    where: { organizationId, vendorId: { in: vendorIds }, status: { in: OPEN_FINDING_STATUSES } },
                    select: { vendorId: true, severity: true },
                }),
                prisma.vendorMonitoring.groupBy({
                    by: ['vendorId'],
                    where: { organizationId, vendorId: { in: vendorIds }, requiresAction: true },
                    _count: { _all: true },
                }),
                prisma.vendorAssessment.findMany({
                    where: { organizationId, vendorId: { in: vendorIds }, status: 'COMPLETED' },
                    include: { responses: true },
                    orderBy: { completedAt: 'desc' },
                }),
            ])
            : [[], [], []];
        const findingsByVendor = new Map<string, Array<{ severity: FindingSeverity }>>();
        for (const issue of issues) {
            if (!SEVERITIES.includes(issue.severity as FindingSeverity)) continue;
            const list = findingsByVendor.get(issue.vendorId) || [];
            list.push({ severity: issue.severity as FindingSeverity });
            findingsByVendor.set(issue.vendorId, list);
        }
        const monitoringByVendor = new Map(monitoring.map((row) => [row.vendorId, row._count._all]));
        const assessmentByVendor = new Map<string, (typeof assessments)[number]>();
        for (const assessment of assessments) {
            if (!assessmentByVendor.has(assessment.vendorId)) {
                assessmentByVendor.set(assessment.vendorId, assessment);
            }
        }
        const rows = vendors.map((vendor) => {
            const assessment = assessmentByVendor.get(vendor.id);
            const input = {
                vendorCriticality: vendor.tier as FindingSeverity,
                dataSensitivityCount: vendor.dataTypesAccessed.length,
                regulatoryCount: vendor.regulatoryScope.length,
                hasSubcontractors: vendor.hasSubcontractors,
                openFindings: findingsByVendor.get(vendor.id) || [],
                monitoringEvents: monitoringByVendor.get(vendor.id) || 0,
                questionScores: assessment?.responses
                    .filter((row) => row.score != null)
                    .map((row) => ({ score: row.score || 0, maxScore: row.maxScore || 10, weight: row.weight || 1 })),
                controlMaturity: typeof assessment?.overallScore === 'number'
                    ? Math.round(assessment.overallScore / 20)
                    : undefined,
            };
            const current = calculateVendorRisk({ ...input, methodology: active.weights, methodologyVersion: active.version });
            const preview = calculateVendorRisk({ ...input, methodology: weights, methodologyVersion: 'draft' });
            return { current: current.riskBand, preview: preview.riskBand };
        });
        const summary = summarizeBandChanges(rows);
        return {
            vendorCount: vendors.length,
            ...summary,
            residualScoresUnchanged: true,
            honesty: 'Preview only. No vendor residual scores or ScoreCalculation records were written.',
        };
    },
};
