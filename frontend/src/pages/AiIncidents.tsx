import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { aiGovernanceAPI } from '../services/api';

export default function AiIncidents() {
    const [rows, setRows] = useState<any[]>([]);
    const [systemPublicId, setSystemPublicId] = useState('');
    const [title, setTitle] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const load = () => {
        aiGovernanceAPI.incidents().then((res) => setRows(res.data.data)).catch((err) => setError(err.message)).finally(() => setLoading(false));
    };
    useEffect(load, []);
    const create = (event: FormEvent) => {
        event.preventDefault();
        aiGovernanceAPI.recordIncident({ systemPublicId, title }).then(load).catch((err) => setError(err.message));
    };
    return (
        <>
            <PageHeader crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: 'Incidents' }]} title="AI incidents" description="Harmful output, drift, leakage, or vendor outage — recorded by people. Closure is human-authoritative." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>Open incidents stay on the attention queue until a person records a closure decision.</Alert>
                        <Stack component="form" onSubmit={create} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField label="AI system ID" value={systemPublicId} onChange={(event) => setSystemPublicId(event.target.value)} required />
                            <TextField label="Incident title" value={title} onChange={(event) => setTitle(event.target.value)} required />
                            <Button type="submit" variant="contained">Open incident</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable rows={rows} rowKey={(row) => row.publicId} emptyTitle="No incidents" emptyBody="No invented incident feed." columns={[
                            { id: 'id', label: 'Incident', render: (row) => row.publicId },
                            { id: 'system', label: 'System', render: (row) => row.system?.publicId },
                            { id: 'title', label: 'Title', render: (row) => row.title },
                            { id: 'status', label: 'Status', render: (row) => row.status },
                        ]} />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
