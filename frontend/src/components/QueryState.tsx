import type { ReactNode } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';

export type QueryErrorKind =
    | 'PERMISSION_DENIED'
    | 'VALIDATION'
    | 'RATE_LIMITED'
    | 'NOT_CONFIGURED'
    | 'PROVIDER_ERROR'
    | 'API_FAILURE';

type Props = {
    loading?: boolean;
    error?: string | null;
    errorKind?: QueryErrorKind | null;
    empty?: boolean;
    emptyTitle?: string;
    emptyBody?: string;
    notConfigured?: boolean;
    children: ReactNode;
};

const KIND_TITLE: Record<QueryErrorKind, string> = {
    PERMISSION_DENIED: 'Permission denied',
    VALIDATION: 'Validation error',
    RATE_LIMITED: 'Rate limited',
    NOT_CONFIGURED: 'Not configured',
    PROVIDER_ERROR: 'Provider error',
    API_FAILURE: 'Request failed',
};

export function classifyApiError(err: { status?: number; message?: string } | null | undefined): QueryErrorKind {
    if (!err) return 'API_FAILURE';
    if (err.status === 403) return 'PERMISSION_DENIED';
    if (err.status === 400 || err.status === 422) return 'VALIDATION';
    if (err.status === 429 || /too many requests/i.test(err.message || '')) return 'RATE_LIMITED';
    if (err.status === 503 || /provider/i.test(err.message || '')) return 'PROVIDER_ERROR';
    if (/not[_ -]?configured/i.test(err.message || '')) return 'NOT_CONFIGURED';
    return 'API_FAILURE';
}

export default function QueryState({
    loading,
    error,
    errorKind,
    empty,
    emptyTitle = 'Nothing here yet',
    emptyBody = 'When records exist for this organization, they will appear here.',
    notConfigured,
    children,
}: Props) {
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={240} role="status">
                <CircularProgress />
            </Box>
        );
    }
    if (notConfigured) {
        return <Alert severity="info">NOT_CONFIGURED — this capability is unavailable until a production provider is configured.</Alert>;
    }
    if (error) {
        const kind = errorKind || classifyApiError({ message: error });
        return (
            <Alert severity={kind === 'PERMISSION_DENIED' || kind === 'RATE_LIMITED' ? 'warning' : 'error'}>
                <strong>{KIND_TITLE[kind]}.</strong> {error}
            </Alert>
        );
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
