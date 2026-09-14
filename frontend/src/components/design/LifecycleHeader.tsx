import { Box, Stack, Typography } from '@mui/material';
import StatusBadge from './StatusBadge';
import WorkflowStepper from './WorkflowStepper';
import { color } from '../../design/tokens';
import { formatShortDate, humanizeLabel } from '../../utils/humanizeLabel';

type Props = {
    name: string;
    publicId?: string | null;
    tier?: string | null;
    status?: string | null;
    owner?: string | null;
    stage?: string | null;
    nextAction?: string | null;
    nextActionOwner?: string | null;
    dueDate?: string | null;
    overdue?: boolean;
    steps: string[];
    activeStep: number;
};

export default function LifecycleHeader({
    name,
    publicId,
    tier,
    status,
    owner,
    stage,
    nextAction,
    nextActionOwner,
    dueDate,
    overdue,
    steps,
    activeStep,
}: Props) {
    const facts = [
        { label: 'Public ID', value: publicId || '—' },
        { label: 'Tier', value: humanizeLabel(tier) },
        { label: 'Status', value: humanizeLabel(status || stage) },
        { label: 'Business owner', value: owner || 'Not assigned' },
        { label: 'Current stage', value: stage || '—' },
        { label: 'Next action', value: nextAction || 'None recorded' },
        { label: 'Next action owner', value: nextActionOwner || owner || '—' },
        { label: 'Due', value: overdue ? 'Overdue' : formatShortDate(dueDate) },
    ];

    return (
        <Box
            aria-label={`${name} lifecycle`}
            sx={{
                border: `1px solid ${color.line}`,
                bgcolor: color.surface,
                borderRadius: '8px',
                p: { xs: 2, md: 2.5 },
            }}
        >
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                <Typography variant="overline">Third Party lifecycle</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <StatusBadge kind="plain" value={tier} />
                    <StatusBadge kind="plain" value={status || stage} />
                    <StatusBadge kind="plain" label={overdue ? 'Overdue' : formatShortDate(dueDate)} tone={overdue ? 'critical' : 'info'} />
                </Stack>
            </Stack>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' },
                    gap: 1.5,
                    mb: 2,
                }}
            >
                {facts.map((fact) => (
                    <Box key={fact.label}>
                        <Typography variant="caption">{fact.label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 650 }}>{fact.value}</Typography>
                    </Box>
                ))}
            </Box>
            <WorkflowStepper steps={steps} active={activeStep} compact />
        </Box>
    );
}
