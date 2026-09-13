export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ScoringWeights = {
    tierBase?: Partial<Record<FindingSeverity, number>>;
    dataSensitivityMultiplier?: number;
    regulatoryMultiplier?: number;
    fourthPartyPoints?: number;
    findingPoints?: Partial<Record<FindingSeverity, number>>;
    monitoringEventPoints?: number;
    monitoringEventCap?: number;
    compensatingControlPoints?: number;
};

export const SUPREME_DEFAULT_WEIGHTS: Required<ScoringWeights> = {
    tierBase: { CRITICAL: 80, HIGH: 60, MEDIUM: 40, LOW: 20 },
    dataSensitivityMultiplier: 3,
    regulatoryMultiplier: 2,
    fourthPartyPoints: 10,
    findingPoints: { CRITICAL: 12, HIGH: 8, MEDIUM: 4, LOW: 2 },
    monitoringEventPoints: 2,
    monitoringEventCap: 10,
    compensatingControlPoints: 3,
};

export function mergeScoringWeights(input?: ScoringWeights | null): Required<ScoringWeights> {
    const value = input || {};
    return {
        tierBase: { ...SUPREME_DEFAULT_WEIGHTS.tierBase, ...value.tierBase },
        dataSensitivityMultiplier: value.dataSensitivityMultiplier ?? SUPREME_DEFAULT_WEIGHTS.dataSensitivityMultiplier,
        regulatoryMultiplier: value.regulatoryMultiplier ?? SUPREME_DEFAULT_WEIGHTS.regulatoryMultiplier,
        fourthPartyPoints: value.fourthPartyPoints ?? SUPREME_DEFAULT_WEIGHTS.fourthPartyPoints,
        findingPoints: { ...SUPREME_DEFAULT_WEIGHTS.findingPoints, ...value.findingPoints },
        monitoringEventPoints: value.monitoringEventPoints ?? SUPREME_DEFAULT_WEIGHTS.monitoringEventPoints,
        monitoringEventCap: value.monitoringEventCap ?? SUPREME_DEFAULT_WEIGHTS.monitoringEventCap,
        compensatingControlPoints: value.compensatingControlPoints ?? SUPREME_DEFAULT_WEIGHTS.compensatingControlPoints,
    };
}

export function scoringWeightsEqual(left: Required<ScoringWeights>, right: Required<ScoringWeights>) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

export const ENGINE_RATING_BANDS = [
    { rating: 'Critical' as const, min: 80, max: 100 },
    { rating: 'High' as const, min: 60, max: 79 },
    { rating: 'Medium' as const, min: 40, max: 59 },
    { rating: 'Low' as const, min: 0, max: 39 },
];

export function ratingBandsAreValid(bands = ENGINE_RATING_BANDS): boolean {
    const ordered = [...bands].sort((left, right) => left.min - right.min);
    if (ordered[0].min !== 0 || ordered[ordered.length - 1].max !== 100) return false;
    return ordered.every((band, index) => {
        if (band.min > band.max) return false;
        if (index === 0) return true;
        return band.min === ordered[index - 1].max + 1;
    });
}

export function validateScoringWeights(weights: Required<ScoringWeights>): string | null {
    const scalars = [
        weights.dataSensitivityMultiplier,
        weights.regulatoryMultiplier,
        weights.fourthPartyPoints,
        weights.monitoringEventPoints,
        weights.monitoringEventCap,
        weights.compensatingControlPoints,
        weights.tierBase.CRITICAL,
        weights.tierBase.HIGH,
        weights.tierBase.MEDIUM,
        weights.tierBase.LOW,
        weights.findingPoints.CRITICAL,
        weights.findingPoints.HIGH,
        weights.findingPoints.MEDIUM,
        weights.findingPoints.LOW,
    ];
    if (scalars.some((value) => !isFiniteNumber(value))) {
        return 'Every weight must be a finite number. Empty, infinite, and invalid values are not allowed.';
    }
    const numbers = scalars.filter(isFiniteNumber);
    if (numbers.some((value) => value < 0)) {
        return 'Every weight must be zero or greater.';
    }
    if (numbers.some((value) => value > 10000)) {
        return 'Every weight must stay within a bounded range.';
    }
    if (weights.monitoringEventCap < 0) {
        return 'The monitoring cap cannot be negative.';
    }
    return null;
}
