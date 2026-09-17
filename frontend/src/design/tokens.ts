/**
 * Supreme Design System 2.0 — Boardroom paper.
 * Warm white workspace, ivory documents, ink chrome.
 * Color is reserved for risk, status, and the current action.
 */

export const color = {
    navy950: '#14110e',
    navy900: '#1f1a15',
    navy850: '#2a241d',
    navy800: '#3a3228',
    navy700: '#53483b',
    navy600: '#6d6152',
    workspace: '#efe8db',
    surface: '#fffdf8',
    surfaceMuted: '#f3eee3',
    ink: '#1a1612',
    inkMuted: '#5f584e',
    inkFaint: '#7d756a',
    gold: '#a07d38',
    goldSoft: '#c4a056',
    goldInk: '#5c4716',
    goldDim: 'rgba(160, 125, 56, 0.12)',
    line: 'rgba(26, 22, 18, 0.08)',
    lineStrong: 'rgba(26, 22, 18, 0.14)',
    focus: '#a07d38',
    critical: '#9f2a1f',
    high: '#a14a0d',
    medium: '#6a6458',
    low: '#3d5c44',
    success: '#3d5c44',
    warning: '#a14a0d',
    info: '#3f5366',
    danger: '#9f2a1f',
    navInk: '#f6f0e4',
    navMuted: '#b8ae9d',
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
    sm: 6,
    md: 10,
    lg: 14,
    pill: 999,
} as const;

export const shadow = {
    none: 'none',
    sm: '0 1px 2px rgba(20,17,14,0.04), 0 8px 24px rgba(20,17,14,0.04)',
    md: '0 12px 40px rgba(20,17,14,0.08)',
    drawer: '0 20px 56px rgba(20,17,14,0.24)',
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
