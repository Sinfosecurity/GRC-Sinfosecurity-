/**
 * Deterministic enterprise-risk scoring, appetite, and KRI thresholds.
 * Distinct from TPRM supreme-risk-1.1.0. Same inputs always produce the same outputs.
 */

export const ENTERPRISE_RISK_METHODOLOGY_VERSION = 'supreme-erm-1.0.0';

export type EnterpriseRating = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AppetiteState = 'WITHIN_APPETITE' | 'NEAR_TOLERANCE' | 'OUTSIDE_APPETITE' | 'NOT_CONFIGURED';
export type ControlEffectiveness = 'NOT_TESTED' | 'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'INEFFECTIVE';
export type KriDirection = 'HIGHER_IS_WORSE' | 'LOWER_IS_WORSE';
export type KriStatus = 'WITHIN' | 'WARNING' | 'CRITICAL' | 'NOT_MEASURED';

export const DEFAULT_LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'];
export const DEFAULT_IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'];

export const RATING_ORDER: EnterpriseRating[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function ratingFromScore(score: number): EnterpriseRating {
    if (score >= 20) return 'CRITICAL';
    if (score >= 13) return 'HIGH';
    if (score >= 7) return 'MEDIUM';
    return 'LOW';
}

export function matrixScore(likelihood: number, impact: number) {
    const l = clampScale(likelihood);
    const i = clampScale(impact);
    return l * i;
}

export function clampScale(value: number) {
    return Math.min(5, Math.max(1, Math.round(value)));
}

export function rollupImpact(dimensions: Array<{ rating: number }>, override?: number | null) {
    if (dimensions.length) return clampScale(Math.max(...dimensions.map((row) => row.rating)));
    if (override) return clampScale(override);
    return 1;
}

export function controlReduction(effectiveness: ControlEffectiveness[]) {
    const effective = effectiveness.filter((item) => item === 'EFFECTIVE').length;
    const partial = effectiveness.filter((item) => item === 'PARTIALLY_EFFECTIVE').length;
    const notches = Math.min(2, effective + Math.floor(partial / 2));
    return notches;
}

export function residualImpact(inherentImpact: number, reduction: number) {
    return Math.max(1, clampScale(inherentImpact) - reduction);
}

export type ScoreInput = {
    likelihood: number;
    impact: number;
    dimensions?: Array<{ rating: number }>;
    controlEffectiveness?: ControlEffectiveness[];
    targetLikelihood?: number | null;
    targetImpact?: number | null;
    methodologyVersion?: string;
    reason?: string;
};

export type ScoreResult = {
    methodologyVersion: string;
    likelihood: number;
    impact: number;
    inherentScore: number;
    inherentRating: EnterpriseRating;
    controlReduction: number;
    residualLikelihood: number;
    residualImpact: number;
    residualScore: number;
    residualRating: EnterpriseRating;
    targetScore: number | null;
    targetRating: EnterpriseRating | null;
    explanation: string;
    inputs: ScoreInput;
    calculatedAt: string;
    reason: string;
};

export function calculateEnterpriseRisk(input: ScoreInput): ScoreResult {
    const likelihood = clampScale(input.likelihood);
    const impact = rollupImpact(input.dimensions || [], input.impact);
    const inherentScore = matrixScore(likelihood, impact);
    const reduction = controlReduction(input.controlEffectiveness || []);
    const residualL = likelihood;
    const residualI = residualImpact(impact, reduction);
    const residualScore = matrixScore(residualL, residualI);
    const targetScore = input.targetLikelihood && input.targetImpact
        ? matrixScore(input.targetLikelihood, input.targetImpact)
        : null;
    const methodologyVersion = input.methodologyVersion || ENTERPRISE_RISK_METHODOLOGY_VERSION;
    const explanation = [
        `Inherent ${inherentScore} (${ratingFromScore(inherentScore)}) from likelihood ${likelihood} × impact ${impact}.`,
        reduction
            ? `Linked control effectiveness reduced impact by ${reduction} notch${reduction === 1 ? '' : 'es'} to ${residualI}. Evidence files were not used as effectiveness.`
            : 'No effective linked controls reduced impact. Evidence files were not treated as effectiveness.',
        `Residual ${residualScore} (${ratingFromScore(residualScore)}). Acceptance and treatment plans do not change this score.`,
        `Methodology ${methodologyVersion}.`,
    ].join(' ');
    return {
        methodologyVersion,
        likelihood,
        impact,
        inherentScore,
        inherentRating: ratingFromScore(inherentScore),
        controlReduction: reduction,
        residualLikelihood: residualL,
        residualImpact: residualI,
        residualScore,
        residualRating: ratingFromScore(residualScore),
        targetScore,
        targetRating: targetScore == null ? null : ratingFromScore(targetScore),
        explanation,
        inputs: { ...input, likelihood, impact },
        calculatedAt: new Date().toISOString(),
        reason: input.reason || 'Risk scored',
    };
}

export function compareRating(left: EnterpriseRating, right: EnterpriseRating) {
    return RATING_ORDER.indexOf(left) - RATING_ORDER.indexOf(right);
}

export function appetiteStatus(residual: EnterpriseRating, maxResidual?: EnterpriseRating | null): AppetiteState {
    if (!maxResidual) return 'NOT_CONFIGURED';
    const delta = compareRating(residual, maxResidual);
    if (delta > 0) return 'OUTSIDE_APPETITE';
    if (delta === 0) return 'NEAR_TOLERANCE';
    return 'WITHIN_APPETITE';
}

export function resolveAppetite(
    residual: EnterpriseRating,
    scopes: Array<{ scope: 'ORGANIZATION' | 'CATEGORY' | 'BUSINESS_UNIT'; maxResidualRating: EnterpriseRating }>
) {
    const specific = scopes.find((row) => row.scope === 'BUSINESS_UNIT')
        || scopes.find((row) => row.scope === 'CATEGORY')
        || scopes.find((row) => row.scope === 'ORGANIZATION');
    return appetiteStatus(residual, specific?.maxResidualRating);
}

export function kriStatus(input: {
    value?: number | null;
    warningThreshold: number;
    criticalThreshold: number;
    direction: KriDirection;
}): KriStatus {
    if (input.value == null || Number.isNaN(input.value)) return 'NOT_MEASURED';
    const value = input.value;
    if (input.direction === 'HIGHER_IS_WORSE') {
        if (value >= input.criticalThreshold) return 'CRITICAL';
        if (value >= input.warningThreshold) return 'WARNING';
        return 'WITHIN';
    }
    if (value <= input.criticalThreshold) return 'CRITICAL';
    if (value <= input.warningThreshold) return 'WARNING';
    return 'WITHIN';
}

export function neutralizeSpreadsheetCell(value: unknown) {
    const text = value == null ? '' : String(value);
    if (/^[=+\-@]/.test(text) || text.includes('\t') || text.includes('\r') || text.includes('\n')) {
        return `'${text}`;
    }
    return text;
}

export function nextPublicId(prefix: 'RISK' | 'KRI', sequence: number) {
    return `${prefix}-${String(sequence).padStart(5, '0')}`;
}
