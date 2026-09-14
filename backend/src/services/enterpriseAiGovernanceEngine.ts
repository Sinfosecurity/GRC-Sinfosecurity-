import type { AiScoreRating } from '@prisma/client';

export const AI_METHODOLOGY_VERSION = 'supreme-ai-1.0.0';

export const AI_RISK_CATEGORIES = [
    'Bias / discrimination',
    'Privacy',
    'Security',
    'Hallucination / incorrect output',
    'Lack of explainability',
    'Automation overreliance',
    'Model drift',
    'Data leakage',
    'IP / copyright exposure',
    'Regulatory exposure',
    'Safety',
    'Operational resilience',
    'Vendor dependency',
    'Prompt injection',
    'Model extraction',
    'Unauthorized use',
    'Human oversight failure',
] as const;

export const AI_SCREENING_QUESTIONS = [
    { key: 'decisions', label: 'Does this AI make or materially influence decisions?' },
    { key: 'employment', label: 'Does it affect employment?' },
    { key: 'credit', label: 'Does it affect credit?' },
    { key: 'healthcare', label: 'Does it affect healthcare?' },
    { key: 'education', label: 'Does it affect education?' },
    { key: 'insurance', label: 'Does it affect insurance?' },
    { key: 'access', label: 'Does it affect access to services?' },
    { key: 'biometric', label: 'Does it involve biometric processing?' },
    { key: 'vulnerable', label: 'Does it affect children or vulnerable persons?' },
    { key: 'sensitive', label: 'Does it use sensitive data?' },
    { key: 'profiling', label: 'Does it perform large-scale profiling?' },
    { key: 'autonomous', label: 'Does it take autonomous action?' },
    { key: 'publicGen', label: 'Is it public-facing generation?' },
    { key: 'safety', label: 'Is it used in a safety-critical process?' },
] as const;

export const AI_PROHIBITED_POLICY_EXAMPLES = [
    'Biometric categorization without recorded approval',
    'Social scoring',
    'Unapproved employment screening',
    'Fully autonomous high-impact decisions',
    'Sensitive-data training without approval',
] as const;

export function nextAiId(prefix: string, sequence: number) {
    return `${prefix}-${String(sequence).padStart(5, '0')}`;
}

export function clampFactor(value: unknown, fallback = 1) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(1, Math.min(5, Math.round(n)));
}

export function rateAiScore(score: number): AiScoreRating {
    if (score >= 36) return 'HIGH';
    if (score >= 24) return 'ELEVATED';
    if (score >= 14) return 'LIMITED';
    return 'MINIMAL';
}

export function calculateAiScore(input: {
    impact?: unknown;
    likelihood?: unknown;
    autonomy?: unknown;
    decisionCriticality?: unknown;
    dataSensitivity?: unknown;
    affectedPopulation?: unknown;
    oversightStrength?: unknown;
    externalExposure?: unknown;
    vendorDependency?: unknown;
    testingStatus?: unknown;
    controlEffectiveness?: unknown;
    rationale?: string;
}) {
    const impact = clampFactor(input.impact, 3);
    const likelihood = clampFactor(input.likelihood, 3);
    const autonomy = clampFactor(input.autonomy, 2);
    const decisionCriticality = clampFactor(input.decisionCriticality, 2);
    const dataSensitivity = clampFactor(input.dataSensitivity, 2);
    const affectedPopulation = clampFactor(input.affectedPopulation, 2);
    const oversightStrength = clampFactor(input.oversightStrength, 3);
    const externalExposure = clampFactor(input.externalExposure, 2);
    const vendorDependency = clampFactor(input.vendorDependency, 2);
    const testingStatus = clampFactor(input.testingStatus, 1);
    const controlEffectiveness = clampFactor(input.controlEffectiveness, 1);
    const score = (impact * likelihood)
        + autonomy
        + decisionCriticality
        + dataSensitivity
        + affectedPopulation
        + externalExposure
        + vendorDependency
        - oversightStrength
        - testingStatus
        - controlEffectiveness;
    const rating = rateAiScore(score);
    const calculation = `(${impact} × ${likelihood}) + ${autonomy} + ${decisionCriticality} + ${dataSensitivity} + ${affectedPopulation} + ${externalExposure} + ${vendorDependency} − ${oversightStrength} − ${testingStatus} − ${controlEffectiveness} = ${score}`;
    return {
        methodologyVersion: AI_METHODOLOGY_VERSION,
        impact,
        likelihood,
        autonomy,
        decisionCriticality,
        dataSensitivity,
        affectedPopulation,
        oversightStrength,
        externalExposure,
        vendorDependency,
        testingStatus,
        controlEffectiveness,
        score,
        rating,
        rationale: String(input.rationale || 'Recorded factors only. This is not a legal or model-performance conclusion.').trim(),
        calculation,
        inputs: {
            impact,
            likelihood,
            autonomy,
            decisionCriticality,
            dataSensitivity,
            affectedPopulation,
            oversightStrength,
            externalExposure,
            vendorDependency,
            testingStatus,
            controlEffectiveness,
        },
    };
}

export function screeningRecommendation(answers: Array<{ key: string; answer: boolean }>) {
    const hits = answers.filter((row) => row.answer).map((row) => row.key);
    if (!hits.length) {
        return {
            recommendation: 'No enhanced-review triggers were recorded. This is not a clearance.',
            enhancedReview: false,
        };
    }
    return {
        recommendation: `Enhanced review may be required because recorded answers include: ${hits.join(', ')}. This is not a legal prohibition.`,
        enhancedReview: true,
    };
}

export function honestyCopy() {
    return 'Recorded AI inventory is not an approval, not a legal applicability finding, and not a model-performance claim. Human approval is required. Monitoring is manual unless a real source is configured.';
}

const AI_CUSTOMER_LABELS: Record<string, string> = {
    NOT_CLASSIFIED: 'Not Classified',
    APPROVED_WITH_CONDITIONS: 'Approved with Conditions',
    NOT_TESTED: 'Not Tested',
    NOT_REVIEWED: 'Not Reviewed',
    HUMAN_IN_THE_LOOP: 'Human in the Loop',
    NOT_RECORDED: 'Not Recorded',
    NOT_APPLICABLE: 'Not Applicable',
    IN_REVIEW: 'In Review',
    NOT_STARTED: 'Not Started',
    PARTIALLY_EFFECTIVE: 'Partially Effective',
};

export function humanizeAiLabel(value?: string | null): string {
    if (!value) return 'Not recorded';
    const key = String(value).trim();
    if (AI_CUSTOMER_LABELS[key]) return AI_CUSTOMER_LABELS[key];
    if (!/^[A-Z0-9_]+$/.test(key)) return key;
    return key
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isAutomaticLegalClaim(value: string) {
    const text = String(value || '');
    if (/does not automatically claim|not a legal finding|potential applicability|review required|not certified|organization classification/i.test(text)
        && /eu ai act high-risk|iso 42001|nist/i.test(text)) {
        return false;
    }
    return /this system is (an )?(eu ai act )?high-risk|automatically (classified|determined|declared) as.{0,60}high-risk|iso 42001 certified|nist certified|this system is legally prohibited|ai analysis says|model is safe|automatically compliant/i.test(text);
}

export function neutralizeSpreadsheetCell(value: unknown): string {
    const text = value == null ? '' : String(value);
    if (/^[=+\-@]/.test(text) || text.includes('\t') || text.includes('\r') || text.includes('\n')) {
        return `'${text}`;
    }
    return text;
}

export function containsForbiddenAiClaim(value: string) {
    return isAutomaticLegalClaim(value);
}
