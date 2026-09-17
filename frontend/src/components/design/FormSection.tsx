import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { color, type } from '../../design/tokens';

export default function FormSection({
    title,
    body,
    children,
}: {
    title: string;
    body?: string;
    children: ReactNode;
}) {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' },
                gap: { xs: 1.25, md: 3 },
                py: { xs: 2.25, md: 2.75 },
                borderBottom: `1px solid ${color.line}`,
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontFamily: type.display, fontSize: 18, fontWeight: 500, color: color.ink, letterSpacing: '-0.02em' }}>
                    {title}
                </Typography>
                {body && <Typography variant="body2" sx={{ mt: 0.5, maxWidth: 240 }}>{body}</Typography>}
            </Box>
            <Box sx={{ minWidth: 0 }}>{children}</Box>
        </Box>
    );
}
