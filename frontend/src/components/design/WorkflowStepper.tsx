import { Box, Typography } from '@mui/material';
import { color } from '../../design/tokens';

type Props = {
    steps: string[];
    active: number;
};

export default function WorkflowStepper({ steps, active }: Props) {
    return (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }} aria-label="Wizard steps">
            {steps.map((label, index) => {
                const current = index === active;
                const done = index < active;
                return (
                    <Box
                        key={label}
                        sx={{
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
    );
}
