import { Box } from '@mui/material';
import { findingTone, severityTone, toneColor } from '../../design/tokens';
import { humanizeLabel } from '../../utils/humanizeLabel';

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
    return { label: humanizeLabel(value), tone: 'neutral' };
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
                pl: 1,
                py: 0.1,
                borderLeft: `2px solid ${color}`,
                color,
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
            }}
        >
            {shown}
        </Box>
    );
}
