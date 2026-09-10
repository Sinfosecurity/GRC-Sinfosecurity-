import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { DEFAULT_SCORING_WEIGHTS, type ScoringWeights } from './deterministicRiskEngine';
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

function asWeights(value: unknown): ScoringWeights {
    if (!value || typeof value !== 'object') {
        return { ...DEFAULT_SCORING_WEIGHTS };
    }
    return value as ScoringWeights;
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
};
