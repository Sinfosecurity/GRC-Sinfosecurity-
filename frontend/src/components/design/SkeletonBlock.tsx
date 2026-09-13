import { Box, Skeleton, Stack } from '@mui/material';

type Props = {
    rows?: number;
    metrics?: boolean;
};

export default function SkeletonBlock({ rows = 5, metrics = true }: Props) {
    return (
        <Box role="status" aria-live="polite" aria-label="Loading">
            {metrics && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
                    {[0, 1, 2, 3].map((item) => (
                        <Skeleton key={item} variant="rounded" height={88} sx={{ flex: 1, bgcolor: 'rgba(232,228,220,0.06)' }} />
                    ))}
                </Stack>
            )}
            <Stack spacing={1}>
                {Array.from({ length: rows }).map((_, index) => (
                    <Skeleton key={index} variant="rounded" height={44} sx={{ bgcolor: 'rgba(232,228,220,0.06)' }} />
                ))}
            </Stack>
        </Box>
    );
}
