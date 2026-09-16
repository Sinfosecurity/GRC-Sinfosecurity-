const CUSTOMER_LABELS: Record<string, string> = {
    NOT_CLASSIFIED: 'Not Classified',
    APPROVED_WITH_CONDITIONS: 'Approved with Conditions',
    APPROVE_WITH_CONDITIONS: 'Approve with Conditions',
    NOT_TESTED: 'Not Tested',
    NOT_REVIEWED: 'Not Reviewed',
    HUMAN_IN_THE_LOOP: 'Human in the Loop',
    NOT_RECORDED: 'Not Recorded',
    NOT_APPLICABLE: 'Not Applicable',
    IN_REVIEW: 'In Review',
    NOT_STARTED: 'Not Started',
    PARTIALLY_EFFECTIVE: 'Partially Effective',
    PENDING_REVIEW: 'Pending review',
    SATISFIED_BY: 'Mapped to Control',
    SUPPORTED_BY: 'Supported by Evidence',
    INITIAL_DUE_DILIGENCE: 'Initial Due Diligence',
    RISK_ACCEPTED: 'Risk Accepted',
    IN_PROGRESS: 'In Progress',
    NEEDS_ATTENTION: 'Needs Attention',
    READY_FOR_DECISION: 'Ready for Decision',
    AWAITING_VENDOR: 'Waiting for Vendor',
    NOT_CONFIGURED: 'Not Configured',
    CLEAN: 'Ready',
    PENDING: 'Security check in progress',
    PENDING_SCAN: 'Security check in progress',
    QUARANTINED: 'Blocked',
    INFECTED: 'Blocked',
    FAILED: 'Scan failed',
    ERROR: 'Scan failed',
    UNKNOWN: 'Security status unavailable',
    UNAVAILABLE: 'Security status unavailable',
    EXPIRED: 'Expired',
    EXPIRING: 'Expiring',
    SUPERSEDED: 'Superseded',
    REVOKED: 'Revoked',
    UNDER_REVIEW: 'Under Review',
    CURRENT: 'Current',
};

export function humanizeLabel(value?: string | null): string {
    if (!value) return '—';
    const key = String(value).trim();
    if (CUSTOMER_LABELS[key]) return CUSTOMER_LABELS[key];
    if (key.includes('.')) return humanizeEventType(key);
    if (!/^[A-Z0-9_]+$/.test(key)) return key;
    return key
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function humanizeEventType(value?: string | null): string {
    if (!value) return '—';
    const key = String(value).trim();
    if (CUSTOMER_LABELS[key]) return CUSTOMER_LABELS[key];
    return key
        .split(/[.\s]+/)
        .filter(Boolean)
        .map((part) => part.replace(/[_-]/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()))
        .join(' ');
}

export function formatShortDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
