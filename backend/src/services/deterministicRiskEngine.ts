/**
 * Deterministic, explainable vendor risk scoring.
 * Identical inputs always produce identical outputs. No randomness.
 */

export const RISK_SCORE_VERSION = 'supreme-risk-1.1.0';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ScoringWeights = {
    tierBase?: Partial<Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', number>>;
    dataSensitivityMultiplier?: number;
    regulatoryMultiplier?: number;
    fourthPartyPoints?: number;
    findingPoints?: Partial<Record<FindingSeverity, number>>;
    monitoringEventPoints?: number;
    monitoringEventCap?: number;
    compensatingControlPoints?: number;
};

export const DEFAULT_SCORING_WEIGHTS: Required<ScoringWeights> = {
    tierBase: { CRITICAL: 80, HIGH: 60, MEDIUM: 40, LOW: 20 },
    dataSensitivityMultiplier: 3,
    regulatoryMultiplier: 2,
    fourthPartyPoints: 10,
    findingPoints: { CRITICAL: 12, HIGH: 8, MEDIUM: 4, LOW: 2 },
    monitoringEventPoints: 2,
    monitoringEventCap: 10,
    compensatingControlPoints: 3,
};

export type RiskEngineInput = {
    questionScores?: Array<{ score: number; maxScore: number; weight: number }>;
    categoryWeights?: Record<string, number>;
    controlMaturity?: number;
    vendorCriticality?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    dataSensitivityCount?: number;
    regulatoryCount?: number;
    hasSubcontractors?: boolean;
    openFindings?: Array<{ severity: FindingSeverity }>;
    monitoringEvents?: number;
    compensatingControls?: number;
    methodology?: ScoringWeights;
    methodologyVersion?: string;
};

export type RiskFactorGroup = 'inherent' | 'control' | 'residual';

export type RiskFactor = {
    code: string;
    label: string;
    group: RiskFactorGroup;
    points: number;
    rationale: string;
};

export type RiskEngineResult = {
    scoreVersion: typeof RISK_SCORE_VERSION;
    inherentRisk: number;
    controlEffectiveness: number;
    residualRisk: number;
    riskBand: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    explanation: string;
    factors: RiskFactor[];
    inputs: RiskEngineInput;
    calculatedAt: string;
};

function resolveWeights(input: RiskEngineInput): Required<ScoringWeights> {
    const methodology = input.methodology || {};
    return {
        tierBase: { ...DEFAULT_SCORING_WEIGHTS.tierBase, ...methodology.tierBase },
        dataSensitivityMultiplier: methodology.dataSensitivityMultiplier ?? DEFAULT_SCORING_WEIGHTS.dataSensitivityMultiplier,
        regulatoryMultiplier: methodology.regulatoryMultiplier ?? DEFAULT_SCORING_WEIGHTS.regulatoryMultiplier,
        fourthPartyPoints: methodology.fourthPartyPoints ?? DEFAULT_SCORING_WEIGHTS.fourthPartyPoints,
        findingPoints: { ...DEFAULT_SCORING_WEIGHTS.findingPoints, ...methodology.findingPoints },
        monitoringEventPoints: methodology.monitoringEventPoints ?? DEFAULT_SCORING_WEIGHTS.monitoringEventPoints,
        monitoringEventCap: methodology.monitoringEventCap ?? DEFAULT_SCORING_WEIGHTS.monitoringEventCap,
        compensatingControlPoints: methodology.compensatingControlPoints ?? DEFAULT_SCORING_WEIGHTS.compensatingControlPoints,
    };
}

function clamp(value: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, Math.round(value)));
}

function band(score: number): RiskEngineResult['riskBand'] {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
}

export function calculateVendorRisk(input: RiskEngineInput): RiskEngineResult {
    const tier = input.vendorCriticality || 'MEDIUM';
    const weights = resolveWeights(input);
    const factors: RiskFactor[] = [];

    const criticalityPoints = weights.tierBase[tier] ?? 40;
    factors.push({
        code: 'criticality',
        label: `${tier} business criticality`,
        group: 'inherent',
        points: criticalityPoints,
        rationale: `Base inherent score for ${tier} tier vendors`,
    });

    const dataPoints = (input.dataSensitivityCount || 0) * weights.dataSensitivityMultiplier;
    factors.push({
        code: 'data_sensitivity',
        label: 'Sensitive data exposure',
        group: 'inherent',
        points: dataPoints,
        rationale: `${input.dataSensitivityCount || 0} sensitive data types × ${weights.dataSensitivityMultiplier}`,
    });

    const regulatoryPoints = (input.regulatoryCount || 0) * weights.regulatoryMultiplier;
    factors.push({
        code: 'regulatory_scope',
        label: 'Regulatory exposure',
        group: 'inherent',
        points: regulatoryPoints,
        rationale: `${input.regulatoryCount || 0} regulatory scopes × ${weights.regulatoryMultiplier}`,
    });

    const fourthPartyPoints = input.hasSubcontractors ? weights.fourthPartyPoints : 0;
    factors.push({
        code: 'fourth_party',
        label: 'Fourth-party / subcontractor exposure',
        group: 'inherent',
        points: fourthPartyPoints,
        rationale: input.hasSubcontractors ? 'Subcontractors flagged' : 'No subcontractors flagged',
    });

    let inherent = criticalityPoints + dataPoints + regulatoryPoints + fourthPartyPoints;
    inherent = clamp(inherent);

    let controlEffectiveness = 50;
    if (input.questionScores && input.questionScores.length > 0) {
        const weighted = input.questionScores.reduce(
            (acc, q) => {
                const ratio = q.maxScore > 0 ? q.score / q.maxScore : 0;
                return {
                    score: acc.score + ratio * q.weight,
                    weight: acc.weight + q.weight,
                };
            },
            { score: 0, weight: 0 }
        );
        controlEffectiveness = weighted.weight > 0 ? (weighted.score / weighted.weight) * 100 : 50;
    }
    if (typeof input.controlMaturity === 'number') {
        controlEffectiveness = (controlEffectiveness + clamp(input.controlMaturity * 20, 0, 100)) / 2;
    }
    controlEffectiveness += (input.compensatingControls || 0) * weights.compensatingControlPoints;
    controlEffectiveness = clamp(controlEffectiveness);

    const afterControls = inherent * (1 - controlEffectiveness / 140);
    factors.push({
        code: 'control_effectiveness',
        label: 'Control effectiveness haircut',
        group: 'control',
        points: clamp(controlEffectiveness) * -1,
        rationale: `Controls scored ${clamp(controlEffectiveness)}; residual starts at ${Math.round(afterControls)}`,
    });

    let residual = afterControls;
    for (const finding of input.openFindings || []) {
        const points = weights.findingPoints[finding.severity] || 0;
        residual += points;
        factors.push({
            code: `finding_${finding.severity.toLowerCase()}`,
            label: `${finding.severity} open finding`,
            group: 'residual',
            points,
            rationale: `Open ${finding.severity} finding adds ${points}`,
        });
    }
    const monitoringCap = weights.monitoringEventCap;
    const monitoringPoints = Math.min(input.monitoringEvents || 0, monitoringCap) * weights.monitoringEventPoints;
    residual += monitoringPoints;
    factors.push({
        code: 'monitoring_events',
        label: 'Monitoring events',
        group: 'residual',
        points: monitoringPoints,
        rationale: `${Math.min(input.monitoringEvents || 0, monitoringCap)} capped events × ${weights.monitoringEventPoints}`,
    });
    residual = clamp(residual);

    const explanation = [
        `Inherent risk ${inherent} from ${tier} criticality`,
        `${input.dataSensitivityCount || 0} sensitive data types`,
        `${input.regulatoryCount || 0} regulatory scopes`,
        input.hasSubcontractors ? 'fourth-party exposure present' : 'no subcontractors flagged',
        `control effectiveness ${controlEffectiveness}`,
        `${(input.openFindings || []).length} open findings`,
        `${input.monitoringEvents || 0} monitoring events`,
        `residual risk ${residual} (${band(residual)})`,
        `score version ${RISK_SCORE_VERSION}`,
        input.methodologyVersion ? `methodology ${input.methodologyVersion}` : 'default methodology',
    ].join('; ');

    return {
        scoreVersion: RISK_SCORE_VERSION,
        inherentRisk: inherent,
        controlEffectiveness,
        residualRisk: residual,
        riskBand: band(residual),
        explanation,
        factors,
        inputs: input,
        calculatedAt: new Date(0).toISOString().replace('1970-01-01T00:00:00.000Z', 'deterministic'),
    };
}

/**
 * Stable timestamp is replaced at persistence time. Calculation fields except calculatedAt are deterministic.
 */
export function calculateVendorRiskAt(input: RiskEngineInput, at: Date): RiskEngineResult {
    return {
        ...calculateVendorRisk(input),
        calculatedAt: at.toISOString(),
    };
}
