import { Box } from '@mui/material';
import { findingTone, severityTone, toneColor } from '../../design/tokens';

type Tone = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'success' | 'neutral';

type Props = {
    value?: string | null;
    kind?: 'status' | 'severity' | 'plain';
    label?: string;
    tone?: Tone;
};

function resolve(value?: string | null, kind: Props['kind'] = 'status'): { label: string; tone: Tone } {
    const key = (value || '').toUpperCase();
    if (kind === 'severity') {
        const mapped = severityTone[key];
        if (mapped) return mapped;
    }
    if (kind === 'status') {
        const mapped = findingTone[key];
        if (mapped) return mapped;
    }
    return { label: value || '—', tone: 'neutral' };
}

export default function StatusBadge({ value, kind = 'status', label, tone }: Props) {
    const resolved = resolve(value, kind);
    const shown = label || resolved.label;
    const usedTone = tone || resolved.tone;
    const color = toneColor[usedTone];

    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1,
                py: 0.25,
                borderRadius: '4px',
                border: `1px solid ${color}55`,
                color,
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
            }}
        >
            <Box
                aria-hidden
                sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: color,
                }}
            />
            {shown}
        </Box>
    );
}
