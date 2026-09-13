import { Box, LinearProgress, Typography } from '@mui/material';

export default function ProgressIndicator({
    percent,
    answered,
    total,
    evidenceDue,
}: {
    percent: number;
    answered?: number;
    total?: number;
    evidenceDue?: number;
}) {
    return (
        <Box>
            <Typography variant="caption">
                {percent}% complete
                {total != null && answered != null ? ` · ${answered} of ${total} answered` : ''}
                {evidenceDue != null ? ` · ${evidenceDue} evidence requests outstanding` : ''}
            </Typography>
            <LinearProgress variant="determinate" value={percent} sx={{ mt: 0.75 }} />
        </Box>
    );
}
