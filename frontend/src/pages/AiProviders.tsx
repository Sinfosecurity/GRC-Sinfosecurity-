import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { useNavigate } from 'react-router-dom';
import { aiGovernanceAPI } from '../services/api';

export default function AiProviders() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const load = () => {
        aiGovernanceAPI.providers().then((res) => setRows(res.data.data)).catch((err) => setError(err.message)).finally(() => setLoading(false));
    };
    useEffect(load, []);
    const create = (event: FormEvent) => {
        event.preventDefault();
        aiGovernanceAPI.createProvider({ providerName: name }).then(load).catch((err) => setError(err.message));
    };
    return (
        <>
            <PageHeader crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: 'Providers' }]} title="Models / providers" description="Recorded facts only. Unknown / Not recorded if a person has not entered them. Nothing is scraped." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Stack component="form" onSubmit={create} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField label="Provider name" value={name} onChange={(event) => setName(event.target.value)} required />
                            <Button type="submit" variant="contained">Record provider</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>Availability stays Unknown / Not recorded unless recorded. This is not live model telemetry.</Alert>
                        <AppTable rows={rows} rowKey={(row) => row.publicId} onRowClick={(row) => navigate(`/ai-governance/providers/${row.publicId}`)} emptyTitle="No providers" emptyBody="Record a provider reference. Do not invent OpenAI, Anthropic, or other facts." columns={[
                            { id: 'id', label: 'Provider', render: (row) => row.publicId },
                            { id: 'name', label: 'Name', render: (row) => row.providerName },
                            { id: 'model', label: 'Model', render: (row) => row.modelFamily || 'Not recorded' },
                            { id: 'vendor', label: 'Vendor', render: (row) => row.vendor?.name || 'Not recorded' },
                            { id: 'status', label: 'Availability', render: (row) => row.availabilityStatus },
                        ]} />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
