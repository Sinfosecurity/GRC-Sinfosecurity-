import { useOutletContext } from 'react-router-dom';
import { Stack, Typography } from '@mui/material';
import Surface from '../components/design/Surface';

export default function EngagementDecisions() {
    const { engagement } = useOutletContext<{ engagement: any }>();
    return (
        <Stack spacing={2}>
            <Surface>
                <Typography variant="h6">Decisions</Typography>
                <Typography>Risk treatment, risk acceptance, contract requirements, and Engagement activation are Wave 5 and have not started.</Typography>
                <Typography sx={{ mt: 1 }}>Current residual: {engagement.residual || 'Not calculated'}</Typography>
                <Typography>Confirmed inherent: {engagement.confirmedInherentTier || 'Not yet assessed'}</Typography>
                <Typography>Next recorded action: {engagement.nextAction}</Typography>
            </Surface>
        </Stack>
    );
}
