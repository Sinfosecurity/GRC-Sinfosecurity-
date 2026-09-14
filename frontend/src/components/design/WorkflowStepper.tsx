import { Box, Typography } from '@mui/material';
import { color } from '../../design/tokens';

type Props = {
    steps: string[];
    active: number;
    compact?: boolean;
};

export default function WorkflowStepper({ steps, active, compact }: Props) {
    const currentLabel = steps[active] || steps[0];
    return (
        <Box aria-label="Lifecycle stages">
            {compact && (
                <Typography sx={{ display: { xs: 'block', md: 'none' }, mb: 1, fontSize: 13, fontWeight: 650 }}>
                    Stage {active + 1} of {steps.length}: {currentLabel}
                </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {steps.map((label, index) => {
                    const current = index === active;
                    const done = index < active;
                    return (
                        <Box
                            key={label}
                            sx={{
                                display: compact && !current && !done && index !== active + 1
                                    ? { xs: 'none', md: 'inline-flex' }
                                    : 'inline-flex',
                                px: 1.25,
                                py: 0.5,
                                borderRadius: '999px',
                                border: `1px solid ${current || done ? color.navy800 : color.line}`,
                                bgcolor: current ? color.navy900 : 'transparent',
                                color: current ? color.navInk : color.inkMuted,
                                fontSize: 12,
                                fontWeight: 700,
                            }}
                        >
                            <Typography component="span" sx={{ fontSize: 12, fontWeight: 700, color: 'inherit' }}>
                                {index + 1}. {label}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
