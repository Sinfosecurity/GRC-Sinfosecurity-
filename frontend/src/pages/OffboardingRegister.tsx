import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, MenuItem, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import AppTable from '../components/design/AppTable';
import Surface from '../components/design/Surface';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import AttentionStrip from '../components/design/AttentionStrip';
import { intakeAPI } from '../services/api';

export default function OffboardingRegister() {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('');
    const [overdueOnly, setOverdueOnly] = useState('all');
    const [readyOnly, setReadyOnly] = useState('all');

    useEffect(() => {
        intakeAPI.listOffboarding(status ? { status } : undefined)
            .then((response) => setData(response.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || err.message))
            .finally(() => setLoading(false));
    }, [status]);

    const items = useMemo(() => {
        return (data?.items || []).filter((row: any) => {
            if (overdueOnly === 'overdue' && !row.overdueObligations) return false;
            if (readyOnly === 'ready' && !row.closureReady) return false;
            return true;
        });
    }, [data, overdueOnly, readyOnly]);

    return (
        <WorkspaceFrame purpose="register">
            <PageHeader
                crumbs={[{ label: 'Third-party risk' }, { label: 'Offboarding' }]}
                title="Offboarding register"
                description="Engagement-scoped termination cases. Closing one Engagement does not close the Third Party or sibling Engagements."
                meta={<StatusBadge kind="plain" label="Offboarding" />}
            />
            <Box sx={{ mb: 2 }}>
                <AttentionStrip items={[
                    { label: 'Open cases', value: (data?.items || []).filter((row: any) => !['COMPLETED', 'CANCELLED'].includes(row.status)).length },
                    { label: 'Overdue obligations', value: (data?.items || []).reduce((sum: number, row: any) => sum + (row.overdueObligations || 0), 0) },
                    { label: 'Closure ready', value: (data?.items || []).filter((row: any) => row.closureReady).length },
                    { label: 'Completion rate', value: 'Not calculated' },
                ]} />
            </Box>
            <StackFilters status={status} setStatus={setStatus} overdueOnly={overdueOnly} setOverdueOnly={setOverdueOnly} readyOnly={readyOnly} setReadyOnly={setReadyOnly} />
            <QueryState loading={loading} error={error} empty={!loading && items.length === 0} emptyTitle="No offboarding cases" emptyBody="An empty register is truthful. Cases appear after an authorized termination decision.">
                <Surface padded={false}>
                    <AppTable
                        embedded
                        rows={items}
                        rowKey={(row: any) => row.id}
                        searchPlaceholder="Search offboarding"
                        searchValue={(row: any) => `${row.thirdParty} ${row.engagement} ${row.serviceName} ${row.reason} ${row.status}`}
                        columns={[
                            { id: 'party', label: 'Third Party', render: (row: any) => row.thirdParty },
                            { id: 'engagement', label: 'Engagement', hideOnMobile: true, render: (row: any) => (
                                <>
                                    <Typography variant="subtitle2">{row.serviceName}</Typography>
                                    <Typography variant="caption">{row.engagement}</Typography>
                                </>
                            ) },
                            { id: 'reason', label: 'Reason', hideOnMobile: true, render: (row: any) => row.reason },
                            { id: 'status', label: 'Status', render: (row: any) => String(row.status).replace(/_/g, ' ') },
                            { id: 'owner', label: 'Owner', hideOnMobile: true, render: (row: any) => row.owner || 'Not recorded' },
                            { id: 'effective', label: 'Effective date', hideOnMobile: true, render: (row: any) => row.effectiveDate ? String(row.effectiveDate).slice(0, 10) : 'Not set' },
                            { id: 'blockers', label: 'Closure blockers', hideOnMobile: true, render: (row: any) => (row.closureBlockers || []).join('; ') || 'None recorded' },
                            { id: 'overdue', label: 'Overdue', render: (row: any) => row.overdueObligations || 0 },
                        ]}
                        onRowClick={(row: any) => navigate(`/engagements/${row.engagementId}/offboarding`)}
                    />
                </Surface>
            </QueryState>
            <Surface>
                <Typography variant="body2">{data?.honesty}</Typography>
            </Surface>
        </WorkspaceFrame>
    );
}

function StackFilters({
    status,
    setStatus,
    overdueOnly,
    setOverdueOnly,
    readyOnly,
    setReadyOnly,
}: {
    status: string;
    setStatus: (value: string) => void;
    overdueOnly: string;
    setOverdueOnly: (value: string) => void;
    readyOnly: string;
    setReadyOnly: (value: string) => void;
}) {
    return (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <TextField select size="small" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 180 }}>
                <MenuItem value="">All</MenuItem>
                {['DRAFT', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'READY_FOR_CLOSURE', 'COMPLETED', 'CANCELLED'].map((item) => (
                    <MenuItem key={item} value={item}>{item.replace(/_/g, ' ')}</MenuItem>
                ))}
            </TextField>
            <TextField select size="small" label="Overdue" value={overdueOnly} onChange={(event) => setOverdueOnly(event.target.value)} sx={{ minWidth: 160 }}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="overdue">Overdue only</MenuItem>
            </TextField>
            <TextField select size="small" label="Closure ready" value={readyOnly} onChange={(event) => setReadyOnly(event.target.value)} sx={{ minWidth: 180 }}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="ready">Closure ready</MenuItem>
            </TextField>
        </Box>
    );
}
