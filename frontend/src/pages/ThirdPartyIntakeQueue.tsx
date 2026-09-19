import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import { PageShell } from '../components/experience/ExperienceKit';
import { intakeAPI } from '../services/api';
import { formatShortDate } from '../utils/humanizeLabel';

type Row = {
    id: string;
    publicId: string;
    proposedThirdPartyName: string;
    proposedServiceName: string;
    requesterName: string;
    requesterBusinessUnit?: string | null;
    submittedAt: string;
    targetStartDate?: string | null;
    priority: string;
    assignedAnalystName?: string | null;
    statusLabel: string;
    ageHours: number;
    overdue: boolean;
};

const FILTERS = [
    { id: '', label: 'All open and closed' },
    { id: 'unassigned', label: 'Unassigned' },
    { id: 'assigned-to-me', label: 'Assigned to me' },
    { id: 'needs-information', label: 'Needs information' },
    { id: 'in-review', label: 'In review' },
    { id: 'ready-for-match', label: 'Ready for match' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'priority', label: 'Priority' },
];

export default function ThirdPartyIntakeQueue() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<Row[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('unassigned');
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    const load = (nextPage = page) => {
        setPending(true);
        intakeAPI.list({ filter, q, page: nextPage, pageSize: 25, sort: '-submittedAt' })
            .then((res) => {
                setRows(res.data.data.items || []);
                setTotal(res.data.data.total || 0);
                setPage(res.data.data.page || nextPage);
                setError(null);
            })
            .catch((err) => setError(err.response?.data?.error?.message || err.message || 'Unable to load intake.'))
            .finally(() => {
                setLoading(false);
                setPending(false);
            });
    };

    useEffect(() => { load(1); }, [filter]);

    return (
        <PageShell>
            <PageHeader
                crumbs={[{ label: 'Third Parties', to: '/vendor-management' }, { label: 'Intake' }]}
                title="TPRM Intake"
                description="Business requests waiting for assignment, review, or third-party match. This is not vendor onboarding."
            />
            <Surface>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2, minWidth: 0 }}>
                    <TextField select label="Filter" value={filter} onChange={(event) => setFilter(event.target.value)} sx={{ minWidth: 220 }}>
                        {FILTERS.map((item) => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}
                    </TextField>
                    <TextField
                        label="Search company, service, requester, or ID"
                        value={q}
                        onChange={(event) => setQ(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') load(1); }}
                        sx={{ flex: 1, minWidth: 0 }}
                    />
                    <Button onClick={() => load(1)} disabled={pending}>{pending ? 'Searching…' : 'Search'}</Button>
                </Stack>
            </Surface>
            <Box sx={{ mt: 2 }}>
                <QueryState loading={loading} error={error} empty={!loading && rows.length === 0} emptyTitle="No intake requests" emptyBody="New requests appear here after a person submits the Supreme form.">
                    <AppTable
                        rows={rows}
                        rowKey={(row) => row.id}
                        onRowClick={(row) => navigate(`/third-parties/intake/${row.id}`)}
                        emptyTitle="No intake requests match"
                        emptyBody="Change the filter or search."
                        columns={[
                            { id: 'publicId', label: 'Intake ID', render: (row) => row.publicId },
                            { id: 'vendor', label: 'Proposed third party', render: (row) => row.proposedThirdPartyName },
                            { id: 'service', label: 'Service', render: (row) => row.proposedServiceName },
                            { id: 'requester', label: 'Requester', render: (row) => row.requesterName },
                            { id: 'bu', label: 'Business unit', render: (row) => row.requesterBusinessUnit || '—' },
                            { id: 'submitted', label: 'Submitted', render: (row) => formatShortDate(row.submittedAt) },
                            { id: 'target', label: 'Target date', render: (row) => row.targetStartDate ? formatShortDate(row.targetStartDate) : '—' },
                            { id: 'priority', label: 'Priority', render: (row) => <StatusBadge kind="plain" label={row.priority} /> },
                            { id: 'analyst', label: 'Assigned analyst', render: (row) => row.assignedAnalystName || 'Unassigned' },
                            { id: 'status', label: 'Status', render: (row) => <StatusBadge kind="plain" label={row.statusLabel} /> },
                            { id: 'age', label: 'Age / SLA', render: (row) => (
                                <Typography variant="body2">{Math.round(row.ageHours / 24)}d{row.overdue ? ' · overdue' : ''}</Typography>
                            ) },
                        ]}
                    />
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <Button disabled={page <= 1 || pending} onClick={() => load(page - 1)}>Previous</Button>
                        <Typography variant="body2" sx={{ alignSelf: 'center' }}>{page} · {total} requests</Typography>
                        <Button disabled={page * 25 >= total || pending} onClick={() => load(page + 1)}>Next</Button>
                    </Stack>
                </QueryState>
            </Box>
        </PageShell>
    );
}
