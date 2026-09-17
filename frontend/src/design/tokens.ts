/**
 * Supreme Design System 2.0 — The Ledger.
 * Warm ink chrome, stone canvas, brass reserved for action and current state.
 * Semantic color is for risk and governance status only.
 */

export const color = {
    navy950: '#100e0b',
    navy900: '#1c1812',
    navy850: '#26211a',
    navy800: '#322b22',
    navy700: '#4a4033',
    navy600: '#6a5c48',
    workspace: '#cfc8b8',
    surface: '#f7f1e6',
    surfaceMuted: '#e4dccb',
    ink: '#16130f',
    inkMuted: '#5c564c',
    inkFaint: '#7a7368',
    gold: '#9a7b3c',
    goldSoft: '#c4a056',
    goldInk: '#5c4716',
    goldDim: 'rgba(154, 123, 60, 0.14)',
    line: 'rgba(22, 19, 15, 0.12)',
    lineStrong: 'rgba(22, 19, 15, 0.22)',
    focus: '#9a7b3c',
    critical: '#9f2a1f',
    high: '#a14a0d',
    medium: '#6a6458',
    low: '#3d5c44',
    success: '#3d5c44',
    warning: '#a14a0d',
    info: '#3f5366',
    danger: '#9f2a1f',
    navInk: '#f3ecde',
    navMuted: '#b7ae9c',
} as const;

export const space = {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
} as const;

export const radius = {
    sm: 2,
    md: 3,
    lg: 4,
    pill: 999,
} as const;

export const shadow = {
    none: 'none',
    sm: '0 1px 0 rgba(22,19,15,0.06)',
    md: '0 18px 40px rgba(16,14,11,0.12)',
    drawer: '0 20px 56px rgba(16,14,11,0.28)',
} as const;

export const type = {
    display: '"Newsreader", "Iowan Old Style", Georgia, serif',
    ui: '"Source Sans 3", "Source Sans Pro", "Segoe UI", sans-serif',
    mono: '"IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace',
} as const;

export const motion = {
    standard: '180ms ease',
    enter: '220ms ease',
} as const;

export const toneColor: Record<'critical' | 'high' | 'medium' | 'low' | 'info' | 'success' | 'neutral', string> = {
    critical: color.critical,
    high: color.high,
    medium: color.medium,
    low: color.low,
    info: color.info,
    success: color.success,
    neutral: color.inkMuted,
};

export const findingTone: Record<string, { label: string; tone: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'success' | 'neutral' }> = {
    OPEN: { label: 'Open', tone: 'critical' },
    IN_REMEDIATION: { label: 'In remediation', tone: 'high' },
    IN_PROGRESS: { label: 'In remediation', tone: 'high' },
    PENDING_VALIDATION: { label: 'Verification', tone: 'info' },
    VALIDATION: { label: 'Verification', tone: 'info' },
    CLOSED: { label: 'Closed', tone: 'success' },
    RISK_ACCEPTED: { label: 'Accepted', tone: 'medium' },
    ACCEPTED: { label: 'Accepted', tone: 'medium' },
    DRAFT: { label: 'Draft', tone: 'neutral' },
    READY_FOR_REVIEW: { label: 'Ready for review', tone: 'info' },
    READY_FOR_INDEPENDENT_APPROVAL: { label: 'Ready for independent approval', tone: 'high' },
    WAITING_FOR_APPROVAL: { label: 'Waiting for approval', tone: 'info' },
    APPROVED: { label: 'Approved', tone: 'success' },
    APPROVE: { label: 'Approved', tone: 'success' },
    APPROVE_WITH_CONDITIONS: { label: 'Approved with conditions', tone: 'info' },
    REJECTED: { label: 'Rejected', tone: 'critical' },
    REJECT: { label: 'Rejected', tone: 'critical' },
};

export const severityTone: Record<string, { label: string; tone: 'critical' | 'high' | 'medium' | 'low' }> = {
    CRITICAL: { label: 'Critical', tone: 'critical' },
    HIGH: { label: 'High', tone: 'high' },
    MEDIUM: { label: 'Medium', tone: 'medium' },
    LOW: { label: 'Low', tone: 'low' },
};

export const riskBand = (score?: number | null) => {
    if (score == null || Number.isNaN(Number(score))) return { label: '—', tone: 'medium' as const };
    const value = Number(score);
    if (value >= 80) return { label: 'Critical', tone: 'critical' as const };
    if (value >= 60) return { label: 'High', tone: 'high' as const };
    if (value >= 40) return { label: 'Medium', tone: 'medium' as const };
    return { label: 'Low', tone: 'low' as const };
};
