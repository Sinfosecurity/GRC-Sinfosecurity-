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
                bgcolor: 'transparent',
                border: 'none',
                borderBottom: flush ? 'none' : `1px solid ${color.line}`,
                borderRadius: 0,
                overflow: 'hidden',
                py: padded ? 2.25 : 0,
                px: 0,
            }}
        >
            {children}
        </Box>
    );
}
