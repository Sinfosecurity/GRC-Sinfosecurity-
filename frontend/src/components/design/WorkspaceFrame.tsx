import type { ReactNode } from 'react';
import { Box } from '@mui/material';

type Purpose = 'register' | 'admin' | 'reading';

/**
 * Page-purpose width. Registers use the full workspace.
 * Admin/reading stay constrained. Do not replace Layout or PageShell globally.
 */
export default function WorkspaceFrame({
    children,
    purpose = 'register',
}: {
    children: ReactNode;
    purpose?: Purpose;
}) {
    return (
        <Box
            sx={{
                width: '100%',
                maxWidth: purpose === 'register' ? 'none' : purpose === 'admin' ? 960 : 760,
                mx: purpose === 'register' ? 0 : 'auto',
            }}
        >
            {children}
        </Box>
    );
}
