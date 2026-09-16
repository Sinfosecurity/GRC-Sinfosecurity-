/**
 * Supreme visual identity — premium light workspace, dark navy chrome.
 * Gold is a restrained accent. Semantic color is for risk/status only.
 */

export const color = {
    navy950: '#07111c',
    navy900: '#0c1826',
    navy850: '#122033',
    navy800: '#18283e',
    navy700: '#22344d',
    navy600: '#2d4460',
    workspace: '#f3efe6',
    surface: '#fffcf7',
    surfaceMuted: '#ebe6db',
    ink: '#14202e',
    inkMuted: '#5a6573',
    inkFaint: '#7a8491',
    gold: '#b0893a',
    goldSoft: '#c9a45a',
    goldInk: '#6b5014',
    goldDim: 'rgba(176, 137, 58, 0.12)',
    line: 'rgba(20, 32, 46, 0.1)',
    lineStrong: 'rgba(20, 32, 46, 0.18)',
    focus: '#b0893a',
    critical: '#b42318',
    high: '#b54708',
    medium: '#5c6b7a',
    low: '#3b6d4a',
    success: '#3b6d4a',
    warning: '#b54708',
    info: '#3d5a73',
    danger: '#b42318',
    navInk: '#e7e0d4',
    navMuted: '#9aa6b5',
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
    md: 8,
    lg: 12,
    pill: 999,
} as const;

export const shadow = {
    none: 'none',
    sm: '0 1px 2px rgba(20,32,46,0.06)',
    md: '0 10px 30px rgba(20,32,46,0.08)',
    drawer: '0 16px 48px rgba(20,32,46,0.18)',
} as const;

export const type = {
    display: '"Newsreader", "Iowan Old Style", Georgia, serif',
    ui: '"Source Sans 3", "Source Sans Pro", "Segoe UI", sans-serif',
    mono: '"IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace',
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
