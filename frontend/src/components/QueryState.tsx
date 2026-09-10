import type { ReactNode } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';

type Props = {
    loading?: boolean;
    error?: string | null;
    empty?: boolean;
    emptyTitle?: string;
    emptyBody?: string;
    notConfigured?: boolean;
    children: ReactNode;
};

export default function QueryState({
    loading,
    error,
    empty,
    emptyTitle = 'Nothing here yet',
    emptyBody = 'When records exist for this organization, they will appear here.',
    notConfigured,
    children,
}: Props) {
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={240}>
                <CircularProgress />
            </Box>
        );
    }
    if (notConfigured) {
        return <Alert severity="info">NOT CONFIGURED</Alert>;
    }
    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }
    if (empty) {
        return (
            <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography variant="h6">{emptyTitle}</Typography>
                <Typography color="text.secondary">{emptyBody}</Typography>
            </Box>
        );
    }
    return <>{children}</>;
}
