import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { color } from '../../design/tokens';

type Props = {
    children: ReactNode;
    padded?: boolean;
    flush?: boolean;
};

export default function Surface({ children, padded = true, flush }: Props) {
    return (
        <Box
            sx={{
                bgcolor: color.surface,
                border: flush ? 'none' : `1px solid ${color.line}`,
                borderRadius: flush ? 0 : '8px',
                overflow: 'hidden',
                p: padded ? 2.5 : 0,
            }}
        >
            {children}
        </Box>
    );
}
