import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { privacyAPI } from '../services/api';

export default function PrivacyActivities() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<any[]>([]);
    const [q, setQ] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        privacyAPI.activities({ q: q || undefined })
            .then((res) => setRows(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load processing activities'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const create = (event: FormEvent) => {
        event.preventDefault();
        privacyAPI.createActivity({ name, status: 'DRAFT' })
            .then((res) => navigate(`/privacy-ops/activities/${res.data.data.publicId}`))
            .catch((err) => setError(err.message || 'Unable to create processing activity'));
    };

    return (
        <>
            <PageHeader
                crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'Processing activities' }]}
                title="Processing activities"
                description="ROPA workspace. Public IDs such as PA-00001. A recorded legal basis is not a finding that processing is lawful."
            />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Stack component="form" onSubmit={create} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField label="New activity name" value={name} onChange={(event) => setName(event.target.value)} required />
                            <Button type="submit" variant="contained">Record activity</Button>
                            <TextField label="Search" value={q} onChange={(event) => setQ(event.target.value)} />
                            <Button type="button" onClick={load}>Filter</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>Selecting a data category records inventory metadata. It does not conclude that processing is lawful. Insurance policyholder, claimant, telematics, and related categories stay in this Privacy module.</Alert>
                        <AppTable
                            rows={rows}
                            rowKey={(row) => row.publicId}
                            onRowClick={(row) => navigate(`/privacy-ops/activities/${row.publicId}`)}
                            emptyTitle="No processing activities"
                            emptyBody="Record a processing activity to start the ROPA. Nothing is auto-created."
                            columns={[
                                { id: 'publicId', label: 'Activity', render: (row) => row.publicId },
                                { id: 'name', label: 'Name', render: (row) => row.name },
                                { id: 'status', label: 'Status', render: (row) => row.status },
                                { id: 'owner', label: 'Owner', render: (row) => row.owner },
                                { id: 'jurisdictions', label: 'Jurisdictions', render: (row) => (row.jurisdictions || []).join(', ') || 'Not recorded' },
                            ]}
                        />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
