import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { color } from '../../design/tokens';

type Props = {
    title: string;
    body: string;
    action?: ReactNode;
};

export default function EmptyState({ title, body, action }: Props) {
    return (
        <Box
            sx={{
                py: 5,
                px: 3,
                textAlign: 'left',
                border: `1px dashed ${color.lineStrong}`,
                borderRadius: '8px',
                bgcolor: color.surface,
                maxWidth: 560,
            }}
        >
            <Typography variant="h5" sx={{ mb: 0.75 }}>{title}</Typography>
            <Typography variant="body2" sx={{ mb: action ? 2 : 0 }}>{body}</Typography>
            {action}
        </Box>
    );
}
