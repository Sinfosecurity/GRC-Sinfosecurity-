import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import AppTable from '../components/design/AppTable';
import Surface from '../components/design/Surface';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import AttentionStrip from '../components/design/AttentionStrip';
import { intakeAPI } from '../services/api';

export default function ContinuousMonitoring() {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        intakeAPI.monitoringPortfolio()
            .then((response) => setData(response.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || err.message))
            .finally(() => setLoading(false));
    }, []);

    const signals = data?.signals || [];

    return (
        <WorkspaceFrame purpose="register">
            <PageHeader
                crumbs={[{ label: 'Third-party risk' }, { label: 'Monitoring' }]}
                title="Monitoring inbox"
                description="Engagement monitoring work lives here. External rating feeds are shown only when connected."
                meta={<StatusBadge kind="plain" label={data?.coverage === 'Not calculated' ? 'Coverage not calculated' : 'Monitoring'} />}
            />
            <Box sx={{ mb: 2 }}>
                <AttentionStrip items={[
                    { label: 'Active monitored Engagements', value: data?.activeMonitoredEngagements ?? 0 },
                    { label: 'Need review', value: data?.signalsNeedingReview ?? 0 },
                    { label: 'High priority', value: data?.highPrioritySignals ?? 0 },
                    { label: 'Reassessment recommended', value: data?.reassessmentRecommendations ?? 0 },
                ]} />
            </Box>
            <QueryState loading={loading} error={error} empty={!loading && signals.length === 0} emptyTitle="No monitoring signals" emptyBody="When an authorized analyst records or ingests an observation, it appears here. An empty list is truthful.">
                <Surface padded={false}>
                    <AppTable
                        embedded
                        rows={signals}
                        rowKey={(row: any) => row.id}
                        searchPlaceholder="Search signals"
                        searchValue={(row: any) => `${row.vendor?.name || ''} ${row.title} ${row.domain} ${row.status}`}
                        columns={[
                            { id: 'priority', label: 'Priority', render: (row: any) => <StatusBadge kind="severity" value={row.attentionPriority} /> },
                            { id: 'title', label: 'Signal', render: (row: any) => (
                                <>
                                    <Typography variant="subtitle2">{row.title}</Typography>
                                    <Typography variant="caption">{row.publicId}</Typography>
                                </>
                            ) },
                            { id: 'party', label: 'Third Party', hideOnMobile: true, render: (row: any) => row.vendor?.name || 'Third Party' },
                            { id: 'engagement', label: 'Engagement', hideOnMobile: true, render: (row: any) => (row.impacts || []).map((item: any) => item.engagement?.serviceName).filter(Boolean).join(', ') || 'Third Party level' },
                            { id: 'domain', label: 'Domain', hideOnMobile: true, render: (row: any) => String(row.domain || '').replace(/_/g, ' ') },
                            { id: 'source', label: 'Source', hideOnMobile: true, render: (row: any) => row.sourceProvider },
                            { id: 'age', label: 'Age', hideOnMobile: true, render: (row: any) => `${row.ageHours}h` },
                            { id: 'owner', label: 'Owner', hideOnMobile: true, render: (row: any) => row.reviewOwnerUserId ? 'Assigned' : 'Unassigned' },
                            { id: 'status', label: 'Status', render: (row: any) => String(row.status).replace(/_/g, ' ') },
                            { id: 'next', label: 'Next action', render: (row: any) => row.nextAction },
                        ]}
                        onRowClick={(row: any) => navigate(`/monitoring/signals/${row.id}`)}
                    />
                </Surface>
            </QueryState>
            {data?.sourceHealth && (
                <Surface>
                    <Typography variant="h6" component="h2">Source health</Typography>
                    {data.sourceHealth.map((row: any) => (
                        <Typography key={`${row.label}-${row.status}`} variant="body2">{row.label} · {row.status.replace(/_/g, ' ')} — {row.honesty}</Typography>
                    ))}
                    <Typography variant="body2" sx={{ mt: 1 }}>{data.honesty}</Typography>
                </Surface>
            )}
        </WorkspaceFrame>
    );
}
