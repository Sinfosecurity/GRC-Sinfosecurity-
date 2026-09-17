import { Box, Typography } from '@mui/material';
import { color, type } from '../../design/tokens';

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
                py: 1.5,
                pr: 3,
                border: 0,
                bgcolor: 'transparent',
                cursor: onClick ? 'pointer' : 'default',
                color: 'inherit',
                font: 'inherit',
            }}
        >
            <Typography
                className="sr-metric"
                sx={{ fontFamily: type.display, fontSize: '1.85rem', fontWeight: 500, lineHeight: 1, letterSpacing: '-0.03em' }}
            >
                {value}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: color.inkMuted, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {label}
            </Typography>
            {hint && <Typography variant="caption" display="block">{hint}</Typography>}
        </Box>
    );
}
