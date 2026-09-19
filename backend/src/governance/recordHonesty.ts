import { VendorTier } from '@prisma/client';

export const HONESTY = {
    residualIsNotCompliance: 'Residual risk is not a compliance score. Supreme does not invert risk into a percentage.',
    unknownTierIsNotMedium: 'A missing or unrated tier is Not rated. It is not Medium.',
    noEvidenceIsNotFailure: 'No supporting evidence is currently attached is not a control failure.',
    noResponseIsNotNo: 'No response recorded is not the same as No.',
    acceptanceDoesNotReduceScore: 'Risk acceptance is a decision. It does not reduce residual score.',
    aiIsNotAuthoritative: 'AI interpretation is not an authoritative fact.',
};

export function isUnratedTier(tier?: string | null): boolean {
    if (!tier) return true;
    return tier === VendorTier.UNRATED || /^(UNRATED|NOT_RATED|UNKNOWN)$/i.test(tier);
}

export function displayRiskTier(tier?: string | null): string {
    if (isUnratedTier(tier)) return 'Not rated';
    return String(tier).charAt(0) + String(tier).slice(1).toLowerCase();
}

export function presentResidualScore(score?: number | null, tier?: string | null): number | null {
    if (isUnratedTier(tier)) return null;
    return score == null ? null : score;
}

export function requirementNextAction(input: {
    applicabilityKey?: string | null;
    mappedControls: number;
    usableEvidence: number;
    latestTest?: string | null;
}): { key: string; label: string; detail: string } {
    const applicability = String(input.applicabilityKey || 'NOT_DETERMINED');
    if (applicability === 'NOT_DETERMINED' || applicability === 'UNDER_REVIEW') {
        return { key: 'review_applicability', label: 'Review applicability', detail: 'Record whether this requirement applies before mapping work.' };
    }
    if (applicability === 'NOT_APPLICABLE') {
        return { key: 'none', label: 'No mapping required', detail: 'Not applicable is recorded. That is not pass.' };
    }
    if (!input.mappedControls) {
        return { key: 'map_control', label: 'Map control', detail: 'This applicable requirement has no mapped common control.' };
    }
    if (!input.usableEvidence) {
        return { key: 'add_evidence', label: 'Add evidence', detail: 'Mapped controls have no usable supporting evidence yet. Absence is not failure.' };
    }
    if (!input.latestTest || /not tested/i.test(input.latestTest)) {
        return { key: 'test_control', label: 'Test control', detail: 'Not tested is not pass.' };
    }
    return { key: 'review', label: 'Review posture', detail: 'Review mapped controls, evidence freshness, and exceptions.' };
}
