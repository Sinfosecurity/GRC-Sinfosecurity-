import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import { PageShell } from '../components/experience/ExperienceKit';
import { intakeAPI } from '../services/api';

type Row = {
    id: string;
    publicId: string;
    proposedThirdPartyName: string;
    proposedServiceName: string;
    statusLabel: string;
    priority: string;
    overdue: boolean;
    nextAction: string;
};

function WorkTable({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) {
    const navigate = useNavigate();
    return (
        <Surface>
            <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
            <AppTable
                embedded
                rows={rows}
                rowKey={(row) => row.id}
                onRowClick={(row) => navigate(`/third-parties/intake/${row.id}`)}
                emptyTitle={empty}
                emptyBody="Nothing in this list right now."
                columns={[
                    { id: 'id', label: 'Intake', render: (row) => row.publicId },
                    { id: 'vendor', label: 'Third party', render: (row) => row.proposedThirdPartyName },
                    { id: 'service', label: 'Service', render: (row) => row.proposedServiceName },
                    { id: 'status', label: 'Status', render: (row) => <StatusBadge kind="plain" label={row.statusLabel} /> },
                    { id: 'next', label: 'Needed next', render: (row) => row.nextAction },
                ]}
            />
        </Surface>
    );
}

export default function ThirdPartyMyWork() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        intakeAPI.myWork()
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || err.message || 'Unable to load work.'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <PageShell>
            <PageHeader
                crumbs={[{ label: 'Third Parties', to: '/vendor-management' }, { label: 'My Work' }]}
                title="My TPRM work"
                description="Assignments, reviews, requester waits, and matches that belong to you."
                actions={<Button href="/third-parties/intake">Open intake queue</Button>}
            />
            <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="No TPRM work" emptyBody="Assigned intake appears here.">
                <Stack spacing={2}>
                    <WorkTable title="New assignments" rows={data?.newAssignments || []} empty="No new assignments" />
                    <WorkTable title="In review" rows={data?.inReview || []} empty="Nothing in review" />
                    <WorkTable title="Waiting for requester" rows={data?.waitingForRequester || []} empty="No requester waits" />
                    <WorkTable title="Ready for vendor match" rows={data?.readyForVendorMatch || []} empty="Nothing ready to match" />
                    <WorkTable title="Overdue" rows={data?.overdue || []} empty="Nothing overdue" />
                    {(data?.workload || []).length > 0 && (
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1 }}>Team workload</Typography>
                            {(data.workload as Array<{ id: string; name: string; openCount: number; overdueCount: number }>).map((row) => (
                                <Typography key={row.id} variant="body2">{row.name}: {row.openCount} open · {row.overdueCount} overdue</Typography>
                            ))}
                        </Surface>
                    )}
                </Stack>
            </QueryState>
        </PageShell>
    );
}
