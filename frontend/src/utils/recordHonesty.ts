export const NOT_RATED = 'Not rated';
export const NOT_SCORED = 'Not scored';
export const NOT_CALCULATED = 'Not calculated';
export const NOT_DETERMINED = 'NOT_DETERMINED';

const UNRATED_TIERS = new Set(['', 'UNRATED', 'NOT_RATED', 'UNKNOWN', 'NULL', 'UNDEFINED']);

export function isUnratedTier(tier?: string | null): boolean {
    if (tier == null) return true;
    return UNRATED_TIERS.has(String(tier).trim().toUpperCase());
}

export function displayRiskTier(tier?: string | null): string {
    if (isUnratedTier(tier)) return NOT_RATED;
    const value = String(tier).trim();
    if (!value) return NOT_RATED;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/** Residual risk is never inverted into a compliance percentage. */
export function complianceFromAuthoritative(value?: number | null): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function residualDisplay(score?: number | null, tier?: string | null): string {
    if (isUnratedTier(tier)) return NOT_SCORED;
    if (score == null) return NOT_SCORED;
    return String(score);
}

export function unknownLabel(kind: 'count' | 'score' | 'state' | 'evidence' = 'state'): string {
    if (kind === 'count') return 'No records';
    if (kind === 'score') return NOT_SCORED;
    if (kind === 'evidence') return 'No evidence recorded';
    return 'Unknown';
}
