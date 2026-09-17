import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { color, radius, shadow } from '../../design/tokens';

type Props = {
    children: ReactNode;
    padded?: boolean;
    flush?: boolean;
};

export default function Surface({ children, padded = true, flush }: Props) {
    return (
        <Box
            sx={{
                bgcolor: flush ? 'transparent' : color.surface,
                border: flush ? 'none' : `1px solid ${color.line}`,
                borderRadius: flush ? 0 : `${radius.lg}px`,
                boxShadow: flush ? 'none' : shadow.sm,
                overflow: 'hidden',
                p: flush ? 0 : padded ? { xs: 2, md: 3 } : 0,
            }}
        >
            {children}
        </Box>
    );
}
