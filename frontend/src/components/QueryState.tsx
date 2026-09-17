import type { ReactNode } from 'react';
import { Alert, Box } from '@mui/material';
import EmptyState from './design/EmptyState';
import SkeletonBlock from './design/SkeletonBlock';

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
    emptyAction?: ReactNode;
    notConfigured?: boolean;
    children: ReactNode;
};

const KIND_TITLE: Record<QueryErrorKind, string> = {
    PERMISSION_DENIED: 'You cannot do this',
    VALIDATION: 'Check the information entered',
    RATE_LIMITED: 'Too many requests',
    NOT_CONFIGURED: 'Not available yet',
    PROVIDER_ERROR: 'Service unavailable',
    API_FAILURE: 'Request failed',
};

const KIND_HINT: Record<QueryErrorKind, string> = {
    PERMISSION_DENIED: 'Ask an organization administrator if you expected access.',
    VALIDATION: 'Correct the highlighted fields and try again.',
    RATE_LIMITED: '',
    NOT_CONFIGURED: 'This capability is unavailable until it is configured for this environment.',
    PROVIDER_ERROR: 'Try again shortly. If it continues, submit a support request.',
    API_FAILURE: 'Some services are temporarily unavailable. Retry in a moment. If it continues, submit a support request from Help.',
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

function sanitizeError(message: string): string {
    return message
        .replace(/stripe|openai|anthropic|virustotal|clamav|s3|r2|sendgrid/gi, 'the connected service')
        .replace(/\bECONNREFUSED\b|\bENOTFOUND\b|\bPrisma\b|\bTypeError\b/gi, 'a service error')
        .replace(/permission denied|insufficient (role|permission)s?/gi, 'you do not have access');
}

export default function QueryState({
    loading,
    error,
    errorKind,
    empty,
    emptyTitle = 'Nothing here yet',
    emptyBody = 'When records exist for this organization, they will appear here.',
    emptyAction,
    notConfigured,
    children,
}: Props) {
    if (loading) {
        return <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}><SkeletonBlock /></Box>;
    }
    if (notConfigured) {
        return (
            <Alert severity="info">
                This capability is unavailable until it is configured for this environment.
            </Alert>
        );
    }
    if (error) {
        const kind = errorKind || classifyApiError({ message: error });
        if (kind === 'RATE_LIMITED') {
            return (
                <Alert severity="warning">
                    Too many requests were made in a short period. Please wait a moment and try again.
                </Alert>
            );
        }
        return (
            <Alert severity={kind === 'PERMISSION_DENIED' ? 'warning' : 'error'}>
                <strong>{KIND_TITLE[kind]}.</strong> {sanitizeError(error)} {KIND_HINT[kind]}
            </Alert>
        );
    }
    if (empty) {
        return (
            <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
                <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />
            </Box>
        );
    }
    return <>{children}</>;
}
