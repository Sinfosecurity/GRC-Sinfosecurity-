import { useEffect, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { integrationAPI } from '../services/api';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import Surface from '../components/design/Surface';
import StatusBadge from '../components/design/StatusBadge';
import { humanizeLabel } from '../utils/humanizeLabel';

const PROVIDERS = [
    { id: 'slack', label: 'Slack' },
    { id: 'jira', label: 'Jira' },
    { id: 'servicenow', label: 'ServiceNow' },
    { id: 'siem', label: 'SIEM' },
] as const;

function statusTone(value?: string): 'success' | 'medium' | 'high' | 'neutral' {
    if (value === 'CONNECTED') return 'success';
    if (value === 'ERROR' || value === 'FAILED') return 'high';
    if (value === 'NOT_CONFIGURED' || !value) return 'medium';
    return 'neutral';
}

export default function Integrations() {
    const [status, setStatus] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        integrationAPI.status()
            .then((res) => setStatus(res.data.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <WorkspaceFrame purpose="admin">
            <PageHeader
                crumbs={[{ label: 'Administration' }, { label: 'Integrations' }]}
                title="Integrations"
                description="Status is reported by the server. Not configured means the integration can be connected later — not that it is working."
            />
            <QueryState loading={loading} error={error}>
                <Stack spacing={1.25}>
                    {PROVIDERS.map((provider) => {
                        const raw = status[provider.id] || 'NOT_CONFIGURED';
                        return (
                            <Surface key={provider.id}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                                    <Box>
                                        <Typography variant="subtitle1">{provider.label}</Typography>
                                        <Typography variant="body2">
                                            {raw === 'NOT_CONFIGURED'
                                                ? 'Not configured for this environment.'
                                                : raw === 'CONNECTED'
                                                    ? 'The server reports a working connection.'
                                                    : 'The last test did not succeed.'}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <StatusBadge kind="plain" tone={statusTone(raw)} label={humanizeLabel(raw)} />
                                        <Button
                                            size="small"
                                            disabled={busy === provider.id}
                                            aria-label={`Test ${provider.label} connection`}
                                            onClick={async () => {
                                                setBusy(provider.id);
                                                try {
                                                    const result = await integrationAPI.test(provider.id);
                                                    setStatus((prev) => ({ ...prev, [provider.id]: result.data.data.status }));
                                                } finally {
                                                    setBusy(null);
                                                }
                                            }}
                                        >
                                            {busy === provider.id ? 'Testing…' : 'Test connection'}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Surface>
                        );
                    })}
                </Stack>
            </QueryState>
        </WorkspaceFrame>
    );
}
