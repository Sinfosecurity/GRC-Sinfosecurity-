import { Box, Button, Typography } from '@mui/material';
import { color, type } from '../../design/tokens';

export const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'];
export const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'];

export function heatStyle(likelihood: number, impact: number) {
    const score = likelihood * impact;
    if (score >= 20) return { bgcolor: 'rgba(159, 42, 31, 0.18)', borderColor: color.critical, color: color.critical };
    if (score >= 13) return { bgcolor: 'rgba(161, 74, 13, 0.16)', borderColor: color.high, color: color.high };
    if (score >= 7) return { bgcolor: 'rgba(106, 100, 88, 0.14)', borderColor: color.medium, color: color.ink };
    return { bgcolor: 'rgba(61, 92, 68, 0.14)', borderColor: color.low, color: color.low };
}

type HeatCell = { likelihood: number; impact: number; count: number };

export function HeatmapMatrix({
    cells,
    selected,
    onSelect,
}: {
    cells: HeatCell[][];
    selected?: { likelihood: number; impact: number } | null;
    onSelect?: (cell: HeatCell) => void;
}) {
    return (
        <Box sx={{ overflowX: 'auto' }}>
            <Box
                role="grid"
                aria-label="Likelihood by impact"
                sx={{ minWidth: 420, display: 'grid', gridTemplateColumns: '88px repeat(5, minmax(52px, 1fr))', gap: 0.75, alignItems: 'stretch' }}
            >
                <Box />
                {LIKELIHOOD_LABELS.map((label) => (
                    <Typography key={label} variant="caption" sx={{ textAlign: 'center', color: 'text.secondary' }}>{label}</Typography>
                ))}
                {[5, 4, 3, 2, 1].map((impact) => (
                    <Box key={impact} sx={{ display: 'contents' }}>
                        <Typography variant="caption" sx={{ alignSelf: 'center', color: 'text.secondary' }}>{IMPACT_LABELS[impact - 1]}</Typography>
                        {[1, 2, 3, 4, 5].map((likelihood) => {
                            const item = cells[impact - 1]?.[likelihood - 1];
                            const count = item?.count ?? 0;
                            const isSelected = selected?.likelihood === likelihood && selected?.impact === impact;
                            return (
                                <Button
                                    key={`${likelihood}-${impact}`}
                                    size="small"
                                    role="gridcell"
                                    aria-label={`${IMPACT_LABELS[impact - 1]} by ${LIKELIHOOD_LABELS[likelihood - 1]}: ${count}`}
                                    onClick={item && onSelect ? () => onSelect(item) : undefined}
                                    sx={{
                                        minHeight: 56,
                                        border: '1px solid',
                                        borderRadius: '6px',
                                        ...heatStyle(likelihood, impact),
                                        fontFamily: type.display,
                                        fontSize: count ? 18 : 14,
                                        fontWeight: 550,
                                        outline: isSelected ? `2px solid ${color.navy800}` : 'none',
                                    }}
                                >
                                    {count}
                                </Button>
                            );
                        })}
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

export function CoverageRing({
    phase = 'ready',
    label,
    numerator,
    denominator,
    caption,
    emptyReason,
    tone = 'high',
}: {
    phase?: 'loading' | 'error' | 'ready';
    label: string;
    numerator?: number;
    denominator?: number;
    caption?: string;
    emptyReason?: string;
    tone?: 'critical' | 'high' | 'gold';
}) {
    const ready = phase === 'ready' && denominator != null && denominator > 0 && numerator != null;
    const ratio = ready ? Math.max(0, Math.min(1, numerator / denominator)) : 0;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const fill = tone === 'critical' ? color.critical : tone === 'gold' ? color.gold : color.high;
    const spoken = phase === 'loading'
        ? `${label}: checking`
        : phase === 'error'
            ? `${label}: unavailable`
            : ready
                ? `${label}: ${numerator} of ${denominator}`
                : `${label}: ${emptyReason || 'not recorded'}`;

    return (
        <Box aria-label={spoken} aria-busy={phase === 'loading' || undefined} sx={{ textAlign: 'center' }}>
            <Box sx={{ position: 'relative', width: 148, height: 148, mx: 'auto' }}>
                <svg width="148" height="148" viewBox="0 0 148 148" aria-hidden>
                    <circle cx="74" cy="74" r={radius} fill="none" stroke={color.surfaceMuted} strokeWidth="12" />
                    {ready && (
                        <circle
                            cx="74"
                            cy="74"
                            r={radius}
                            fill="none"
                            stroke={fill}
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={`${ratio * circumference} ${circumference}`}
                            transform="rotate(-90 74 74)"
                        />
                    )}
                </svg>
                <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                    {phase === 'loading' ? (
                        <Box sx={{ width: 36, height: 20, bgcolor: color.surfaceMuted, borderRadius: 0.5 }} />
                    ) : (
                        <Typography sx={{ fontFamily: type.display, fontSize: 28, fontWeight: 500, lineHeight: 1 }}>
                            {phase === 'error' ? '—' : ready ? numerator : '—'}
                        </Typography>
                    )}
                </Box>
            </Box>
            <Typography sx={{ mt: 1, fontWeight: 700 }}>{label}</Typography>
            <Typography variant="body2" sx={{ mt: 0.4 }}>
                {phase === 'loading' && 'Checking recorded coverage…'}
                {phase === 'error' && 'Coverage is unavailable. This is not an all-clear.'}
                {phase === 'ready' && ready && `${numerator} of ${denominator}`}
                {phase === 'ready' && !ready && (emptyReason || 'Nothing recorded yet, so there is no coverage to show.')}
            </Typography>
            {caption && phase === 'ready' && ready && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>{caption}</Typography>
            )}
        </Box>
    );
}
