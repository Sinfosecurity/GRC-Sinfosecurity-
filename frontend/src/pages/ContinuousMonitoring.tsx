import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import AppTable from '../components/design/AppTable';
import Surface from '../components/design/Surface';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import AttentionStrip from '../components/design/AttentionStrip';
import { tprmAPI } from '../services/api';

type Signal = {
    id: string;
    monitoringType: string;
    riskIndicator: string;
    riskLevel: string;
    requiresAction: boolean;
    detectedAt: string;
    vendor?: { name: string };
};

export default function ContinuousMonitoring() {
    const [signals, setSignals] = useState<Signal[]>([]);
    const [providerStatus, setProviderStatus] = useState('NOT_CONFIGURED');
    const [signalCount, setSignalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        tprmAPI.monitoringSignals()
            .then((response) => {
                setSignals(response.data.data.signals || []);
                setProviderStatus(response.data.data.providerStatus || 'NOT_CONFIGURED');
                setSignalCount(response.data.data.signalCount ?? response.data.data.signals?.length ?? 0);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const actionable = signals.filter((row) => row.requiresAction).length;

    return (
        <WorkspaceFrame purpose="register">
            <PageHeader
                crumbs={[{ label: 'Third-party risk' }, { label: 'Monitoring' }]}
                title="Continuous monitoring"
                description="Only recorded vendor signals are shown. External rating feeds are not simulated or backfilled."
                meta={<StatusBadge kind="plain" tone={providerStatus === 'CONNECTED' ? 'success' : providerStatus === 'NOT_CONFIGURED' ? 'medium' : 'high'} label={providerStatus === 'CONNECTED' ? 'Provider connected' : signals.length ? 'Signals detected' : providerStatus === 'NOT_CONFIGURED' ? 'Not configured' : 'No signals'} />}
            />
            <Box sx={{ mb: 2 }}>
                <AttentionStrip items={[
                    { label: 'Recorded signals', value: signalCount },
                    { label: 'Require action', value: actionable },
                ]} />
            </Box>
            <QueryState
                loading={loading}
                error={error}
                empty={signals.length === 0}
                emptyTitle="No monitoring signals"
                emptyBody="When a connected provider records a vendor signal, it appears here and can raise a finding. An empty list is truthful — it is not a healthy-score placeholder."
            >
                <Surface padded={false}>
                <AppTable
                    embedded
                    rows={signals}
                    rowKey={(row) => row.id}
                    searchPlaceholder="Search signals"
                    searchValue={(row) => `${row.vendor?.name || ''} ${row.monitoringType} ${row.riskIndicator} ${row.riskLevel}`}
                    columns={[
                        { id: 'vendor', label: 'Vendor', sortValue: (row) => row.vendor?.name || '', render: (row) => (
                            <Typography variant="subtitle2">{row.vendor?.name || 'Vendor'}</Typography>
                        ) },
                        { id: 'type', label: 'Type', hideOnMobile: true, sortValue: (row) => row.monitoringType, render: (row) => row.monitoringType },
                        { id: 'indicator', label: 'Indicator', render: (row) => row.riskIndicator },
                        { id: 'level', label: 'Level', sortValue: (row) => row.riskLevel, render: (row) => <StatusBadge value={row.riskLevel} kind="severity" /> },
                        { id: 'action', label: 'Action', hideOnMobile: true, render: (row) => row.requiresAction ? 'Required' : 'Informational' },
                        { id: 'when', label: 'Detected', hideOnMobile: true, sortValue: (row) => row.detectedAt, render: (row) => row.detectedAt?.slice(0, 16) || '—' },
                    ]}
                />
                </Surface>
            </QueryState>
        </WorkspaceFrame>
    );
}
