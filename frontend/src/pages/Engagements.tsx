import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import { PageShell } from '../components/experience/ExperienceKit';
import { engagementHref } from '../engagement/engagementPaths';
import { intakeAPI } from '../services/api';

export default function Engagements() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        intakeAPI.listEngagements({ pageSize: 100 })
            .then((res) => setRows(res.data.data.items || []))
            .catch((err) => setError(err.response?.data?.error?.message || err.message || 'Unable to load engagements.'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <PageShell>
            <PageHeader
                title="Engagements"
                description="The Engagement is the Golden Journey operating context. A Third Party may have more than one Engagement, and residual risk is not collapsed into one vendor score."
            />
            <Surface padded={false}>
                <QueryState loading={loading} error={error} empty={!loading && rows.length === 0} emptyTitle="No engagements" emptyBody="Create an Engagement from Intake after a Third Party match.">
                    <AppTable
                        embedded
                        rows={rows}
                        rowKey={(row) => String(row.id)}
                        onRowClick={(row) => navigate(engagementHref(row.id))}
                        searchPlaceholder="Search engagements"
                        searchValue={(row) => `${row.publicId} ${row.serviceName} ${row.thirdParty?.name || ''} ${row.statusLabel}`}
                        columns={[
                            { id: 'publicId', label: 'Engagement', sortValue: (row) => row.publicId, render: (row) => (
                                <>
                                    <Typography variant="subtitle2">{row.publicId}</Typography>
                                    <Typography variant="caption">{row.serviceName}</Typography>
                                </>
                            ) },
                            { id: 'thirdParty', label: 'Third Party', hideOnMobile: true, sortValue: (row) => row.thirdParty?.name, render: (row) => row.thirdParty?.name || 'Not recorded' },
                            { id: 'status', label: 'Stage', render: (row) => <StatusBadge kind="plain" label={row.statusLabel} /> },
                            { id: 'residual', label: 'Residual', render: (row) => row.residual?.band || 'Not calculated' },
                            { id: 'next', label: 'Next action', hideOnMobile: true, render: (row) => row.nextAction },
                        ]}
                    />
                </QueryState>
            </Surface>
        </PageShell>
    );
}
