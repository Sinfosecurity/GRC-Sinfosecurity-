export const C = {
    navy: '#0B1F33',
    navyMid: '#143049',
    gold: '#C4A35A',
    goldSoft: '#E8D7A8',
    paper: '#FFFFFF',
    sand: '#F6F3EC',
    sandDeep: '#EFE9DC',
    ink: '#1B2430',
    muted: '#5B6B7A',
    rule: '#D8D2C6',
    hairline: '#E9E4D8',
    critical: '#B42318',
    high: '#B54708',
    medium: '#CA8A04',
    low: '#027A48',
    info: '#175CD3',
    white: '#FFFFFF',
};

export const PAGE = {
    width: 612,
    height: 792,
    marginX: 44,
    contentTop: 132,
    runningTop: 58,
    footerY: 768,
    contentBottom: 58,
};

export const FONT = {
    title: 22,
    section: 13,
    body: 10,
    small: 8.5,
    caption: 8,
    kpi: 22,
    table: 8.5,
};

export type RiskTone = 'critical' | 'high' | 'medium' | 'low' | 'neutral' | 'info';

export function riskTone(value?: string | number | null): RiskTone {
    const text = String(value || '').toUpperCase();
    if (typeof value === 'number') {
        if (value >= 80) return 'critical';
        if (value >= 60) return 'high';
        if (value >= 40) return 'medium';
        return 'low';
    }
    if (text.includes('CRITICAL') || text.includes('REJECT') || text.includes('ESCALATE')) return 'critical';
    if (text.includes('HIGH') || text.includes('OVERDUE') || text.includes('DEGRADED') || text.includes('ERROR')) return 'high';
    if (text.includes('MEDIUM') || text.includes('CONDITIONS') || text.includes('PENDING') || text.includes('ACCEPTED')) return 'medium';
    if (text.includes('LOW') || text.includes('APPROVE') || text.includes('CLOSED') || text.includes('RESOLVED') || text.includes('CONNECTED') || text.includes('CLEAN')) return 'low';
    if (text.includes('INFO') || text.includes('DRAFT')) return 'info';
    return 'neutral';
}

export function toneColor(tone: RiskTone): string {
    if (tone === 'critical') return C.critical;
    if (tone === 'high') return C.high;
    if (tone === 'medium') return C.medium;
    if (tone === 'low') return C.low;
    if (tone === 'info') return C.info;
    return C.muted;
}

export function humanizeEnum(value?: string | null): string {
    if (!value) return '—';
    return String(value)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function humanizeProviderStatus(status?: string | null): string {
    switch (String(status || '').toUpperCase()) {
        case 'NOT_CONFIGURED':
            return 'External monitoring not configured';
        case 'CONNECTED':
            return 'External monitoring connected';
        case 'DEGRADED':
            return 'External monitoring degraded';
        case 'ERROR':
            return 'External monitoring error';
        case 'DISABLED':
            return 'External monitoring disabled';
        default:
            return humanizeEnum(status);
    }
}

export function shortProviderStatus(status?: string | null): string {
    switch (String(status || '').toUpperCase()) {
        case 'NOT_CONFIGURED':
            return 'Not set';
        case 'CONNECTED':
            return 'On';
        case 'DEGRADED':
            return 'Degraded';
        case 'ERROR':
            return 'Error';
        case 'DISABLED':
            return 'Off';
        default:
            return humanizeEnum(status);
    }
}

export function reportId(code: string, date: Date | string): string {
    const stamp = (typeof date === 'string' ? date : date.toISOString()).slice(0, 10).replace(/-/g, '');
    return `SR-${code}-${stamp}`;
}

export function formatTimestamp(value: Date): string {
    return value.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

export function contentWidth(): number {
    return PAGE.width - PAGE.marginX * 2;
}
