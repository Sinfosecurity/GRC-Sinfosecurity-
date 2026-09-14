import { Box, Typography } from '@mui/material';
import { color } from '../../design/tokens';

type Props = {
    label: string;
    value: string | number;
    hint?: string;
    href?: string;
    onClick?: () => void;
};

export default function MetricCard({ label, value, hint, onClick }: Props) {
    return (
        <Box
            component={onClick ? 'button' : 'div'}
            type={onClick ? 'button' : undefined}
            aria-label={onClick ? `${label}: ${value}` : undefined}
            onClick={onClick}
            sx={{
                flex: 1,
                minWidth: 140,
                textAlign: 'left',
                p: 2,
                border: `1px solid ${color.line}`,
                borderRadius: '8px',
                bgcolor: color.surface,
                cursor: onClick ? 'pointer' : 'default',
                color: 'inherit',
                font: 'inherit',
                '&:hover': onClick ? { borderColor: color.lineStrong } : undefined,
            }}
        >
            <Typography
                className="sr-metric"
                sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '1.65rem', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.03em' }}
            >
                {value}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary', fontWeight: 650 }}>
                {label}
            </Typography>
            {hint && <Typography variant="caption" display="block">{hint}</Typography>}
        </Box>
    );
}
