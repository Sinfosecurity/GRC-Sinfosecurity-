import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { color, type } from '../../design/tokens';

type Props = {
    title: string;
    body: string;
    action?: ReactNode;
};

export default function EmptyState({ title, body, action }: Props) {
    return (
        <Box sx={{ py: 4, px: 0, textAlign: 'left', maxWidth: 560 }}>
            <Typography sx={{ fontFamily: type.display, fontSize: '1.45rem', fontWeight: 500, mb: 0.75 }}>{title}</Typography>
            <Typography variant="body2" sx={{ mb: action ? 2 : 0, color: color.inkMuted }}>{body}</Typography>
            {action}
        </Box>
    );
}
