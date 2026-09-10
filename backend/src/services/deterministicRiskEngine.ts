/**
 * Deterministic, explainable vendor risk scoring.
 * Identical inputs always produce identical outputs. No randomness.
 */

export const RISK_SCORE_VERSION = 'supreme-risk-1.0.0';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

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
    riskAccepted?: boolean;
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

const TIER_BASE: Record<string, number> = {
    CRITICAL: 80,
    HIGH: 60,
    MEDIUM: 40,
    LOW: 20,
};

const FINDING_POINTS: Record<FindingSeverity, number> = {
    CRITICAL: 12,
    HIGH: 8,
    MEDIUM: 4,
    LOW: 2,
};

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
    const factors: RiskFactor[] = [];

    const criticalityPoints = TIER_BASE[tier] ?? 40;
    factors.push({
        code: 'criticality',
        label: `${tier} business criticality`,
        group: 'inherent',
        points: criticalityPoints,
        rationale: `Base inherent score for ${tier} tier vendors`,
    });

    const dataPoints = (input.dataSensitivityCount || 0) * 3;
    factors.push({
        code: 'data_sensitivity',
        label: 'Sensitive data exposure',
        group: 'inherent',
        points: dataPoints,
        rationale: `${input.dataSensitivityCount || 0} sensitive data types × 3`,
    });

    const regulatoryPoints = (input.regulatoryCount || 0) * 2;
    factors.push({
        code: 'regulatory_scope',
        label: 'Regulatory exposure',
        group: 'inherent',
        points: regulatoryPoints,
        rationale: `${input.regulatoryCount || 0} regulatory scopes × 2`,
    });

    const fourthPartyPoints = input.hasSubcontractors ? 10 : 0;
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
    controlEffectiveness += (input.compensatingControls || 0) * 3;
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
        const points = FINDING_POINTS[finding.severity] || 0;
        residual += points;
        factors.push({
            code: `finding_${finding.severity.toLowerCase()}`,
            label: `${finding.severity} open finding`,
            group: 'residual',
            points,
            rationale: `Open ${finding.severity} finding adds ${points}`,
        });
    }
    const monitoringPoints = Math.min(input.monitoringEvents || 0, 10) * 2;
    residual += monitoringPoints;
    factors.push({
        code: 'monitoring_events',
        label: 'Monitoring events',
        group: 'residual',
        points: monitoringPoints,
        rationale: `${Math.min(input.monitoringEvents || 0, 10)} capped events × 2`,
    });
    if (input.riskAccepted) {
        residual -= 8;
        factors.push({
            code: 'risk_acceptance',
            label: 'Documented risk acceptance',
            group: 'residual',
            points: -8,
            rationale: 'Formal risk acceptance applied',
        });
    }
    residual = clamp(residual);

    const explanation = [
        `Inherent risk ${inherent} from ${tier} criticality`,
        `${input.dataSensitivityCount || 0} sensitive data types`,
        `${input.regulatoryCount || 0} regulatory scopes`,
        input.hasSubcontractors ? 'fourth-party exposure present' : 'no subcontractors flagged',
        `control effectiveness ${controlEffectiveness}`,
        `${(input.openFindings || []).length} open findings`,
        `${input.monitoringEvents || 0} monitoring events`,
        input.riskAccepted ? 'risk acceptance applied' : 'no risk acceptance',
        `residual risk ${residual} (${band(residual)})`,
        `score version ${RISK_SCORE_VERSION}`,
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
