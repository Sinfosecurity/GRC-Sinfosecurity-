export const COMPLIANCE_HONESTY =
    'Readiness and coverage are not certification, attestation, or a claim that this organization is compliant. Not applicable is not pass. Evidence presence is not pass. An attestation is not a control test. An exception does not make a control effective. Residual risk does not change unless Supreme Risk recalculates it.';

export const FORBIDDEN_COMPLIANCE_CLAIMS = [
    'you are iso 27001 certified',
    'you are soc 2 compliant',
    'you passed cmmc',
    'certified compliant',
];

export function nextComplianceId(prefix: string, sequence: number) {
    return `${prefix}-${String(sequence).padStart(5, '0')}`;
}

export function neutralizeSpreadsheetCell(value: unknown): string {
    const text = value == null ? '' : String(value);
    if (/^[=+\-@]/.test(text) || text.includes('\t') || text.includes('\r') || text.includes('\n')) {
        return `'${text}`;
    }
    return text;
}

export function humanComplianceLabel(value: string | null | undefined): string {
    if (!value) return 'Not set';
    const labels: Record<string, string> = {
        DRAFT: 'Draft',
        ACTIVE: 'Active',
        PAUSED: 'Paused',
        CLOSED: 'Closed',
        APPLICABLE: 'Applicable',
        NOT_APPLICABLE: 'Not applicable',
        UNDER_REVIEW: 'Under review',
        NOT_DETERMINED: 'Not determined',
        IMPLEMENTED: 'Implemented',
        PARTIALLY_IMPLEMENTED: 'Partially implemented',
        NOT_IMPLEMENTED: 'Not implemented',
        NOT_STARTED: 'Not started',
        IN_PROGRESS: 'In progress',
        SUBMITTED: 'Submitted',
        REVIEWED: 'Reviewed',
        OVERDUE: 'Overdue',
        PENDING: 'Pending',
        REJECTED: 'Rejected',
        UNMAPPED: 'Unmapped requirement',
        INEFFECTIVE: 'Control ineffective',
        EVIDENCE_MISSING: 'Evidence missing',
        EVIDENCE_EXPIRED: 'Evidence expired',
        FAILED_TEST: 'Failed control test',
        OPEN_FINDING: 'Open finding',
        UNRESOLVED_EXCEPTION: 'Unresolved exception',
        OPEN: 'Open',
        LINKED_FINDING: 'Linked to finding',
        POLICY: 'Policy exception',
        CONTROL: 'Control exception',
        EVIDENCE: 'Evidence exception',
        INTERPRETATION: 'Interpretation exception',
        REQUESTED: 'Requested',
        APPROVED: 'Approved',
        EXPIRED: 'Expired',
        PREPARING: 'Preparing',
        COMPLETED: 'Completed',
        RECEIVED: 'Received',
        PRIMARY: 'Primary',
        CONTRIBUTING: 'Contributing',
        PARTIAL: 'Partial',
        RELATED: 'Related',
        CURRENT: 'Evidence available',
        EXPIRING: 'Evidence expiring',
        SUPERSEDED: 'Evidence superseded',
        REVOKED: 'Evidence revoked',
        UNDER_REVIEW_EVIDENCE: 'Evidence under review',
        CLEAN: 'Clean',
        PASS: 'Pass',
        FAIL: 'Fail',
        NOT_TESTED: 'Not tested',
    };
    return labels[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export type CoverageMetric = {
    label: string;
    numerator: number;
    denominator: number;
    percent: number | null;
    display: string;
    emptyReason: string | null;
    formula: string;
};

export function coverageDisplay(metric: Pick<CoverageMetric, 'percent' | 'denominator' | 'label'>): string {
    if (metric.percent == null || metric.denominator <= 0) {
        return metric.label === 'Testing coverage' ? 'No implemented mapped controls to test' : 'Not calculated';
    }
    return `${metric.percent}%`;
}

export type AttentionItem = {
    type: string;
    why: string;
    framework: string | null;
    related: string | null;
    owner: string | null;
    dueAt: string | null;
    ageDays: number | null;
    severity: string | null;
    href: string;
    publicId: string;
    priority: number;
};

export function daysBetween(from: Date, to = new Date()) {
    return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));
}

export function rankAttention(items: AttentionItem[]) {
    return [...items].sort((a, b) => a.priority - b.priority || (b.ageDays || 0) - (a.ageDays || 0)).slice(0, 24);
}

export type ReadinessInput = {
    totalRequirements: number;
    applicable: number;
    notApplicable: number;
    notDetermined: number;
    underReview: number;
    mappedApplicable: number;
    implementedMapped: number;
    implementedControls: number;
    testedImplemented: number;
    evidenceMapped: number;
};

export function buildReadiness(input: ReadinessInput) {
    const percent = (numerator: number, denominator: number): number | null => {
        if (denominator <= 0) return null;
        return Math.round((numerator / denominator) * 100);
    };
    const metric = (label: string, numerator: number, denominator: number, formula: string): CoverageMetric => {
        const value = percent(numerator, denominator);
        const emptyReason = denominator <= 0
            ? (label === 'Testing coverage' ? 'No implemented mapped controls to test' : 'Not calculated')
            : null;
        return {
            label,
            numerator,
            denominator,
            percent: value,
            display: value == null ? (emptyReason || 'Not calculated') : `${value}%`,
            emptyReason,
            formula,
        };
    };
    const calculable = input.applicable > 0;
    return {
        honesty: COMPLIANCE_HONESTY,
        calculable,
        emptyReason: calculable
            ? null
            : 'Applicability is not determined for enough requirements to calculate readiness. Not determined is not treated as not applicable, and not applicable is not treated as pass.',
        totals: {
            totalRequirements: input.totalRequirements,
            applicable: input.applicable,
            notApplicable: input.notApplicable,
            notDetermined: input.notDetermined,
            underReview: input.underReview,
        },
        metrics: {
            requirementCoverage: metric(
                'Requirement coverage',
                input.mappedApplicable,
                input.applicable,
                'Applicable requirements with at least one active mapping ÷ applicable requirements. Not applicable is excluded.',
            ),
            implementationCoverage: metric(
                'Control implementation coverage',
                input.implementedMapped,
                input.mappedApplicable,
                'Mapped applicable requirements with at least one implemented control ÷ mapped applicable requirements.',
            ),
            testingCoverage: metric(
                'Testing coverage',
                input.testedImplemented,
                input.implementedControls,
                'Implemented mapped controls whose latest test is Pass, Fail, or Partial ÷ implemented mapped controls. Not tested and not applicable are not pass.',
            ),
            evidenceCoverage: metric(
                'Evidence coverage',
                input.evidenceMapped,
                input.mappedApplicable,
                'Mapped applicable requirements with at least one CLEAN current supporting evidence link ÷ mapped applicable requirements. A file is not compliance.',
            ),
        },
    };
}

export function evidenceCoverageLabel(input: {
    scanStatus?: string | null;
    freshness?: string | null;
    expiresAt?: Date | string | null;
    relationship?: string | null;
}): string {
    if (input.scanStatus && input.scanStatus !== 'CLEAN') return 'Evidence not usable';
    if (input.relationship === 'CONTRADICTS') return 'Evidence contradicted';
    if (input.freshness === 'SUPERSEDED') return 'Evidence superseded';
    if (input.freshness === 'REVOKED') return 'Evidence revoked';
    if (input.freshness === 'UNDER_REVIEW') return 'Evidence under review';
    if (input.freshness === 'EXPIRED') return 'Evidence expired';
    if (input.freshness === 'EXPIRING') return 'Evidence expiring';
    if (input.expiresAt) {
        const expires = new Date(input.expiresAt).getTime();
        if (Number.isFinite(expires) && expires < Date.now()) return 'Evidence expired';
        const soon = Date.now() + 30 * 24 * 60 * 60 * 1000;
        if (expires <= soon) return 'Evidence expiring';
    }
    if (input.scanStatus === 'CLEAN') return 'Evidence available';
    return 'Evidence missing';
}

export function containsForbiddenClaim(text: string): boolean {
    const lowered = text.toLowerCase();
    return FORBIDDEN_COMPLIANCE_CLAIMS.some((claim) => lowered.includes(claim));
}
