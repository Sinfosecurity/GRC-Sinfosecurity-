const CUSTOMER_LABELS: Record<string, string> = {
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

export function humanizeLabel(value?: string | null): string {
    if (!value) return '—';
    const key = String(value).trim();
    if (CUSTOMER_LABELS[key]) return CUSTOMER_LABELS[key];
    if (!/^[A-Z0-9_]+$/.test(key)) return key;
    return key
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
