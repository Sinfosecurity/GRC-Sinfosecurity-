import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { aiGovernanceAPI } from '../services/api';

export default function AiRegister() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<any[]>([]);
    const [q, setQ] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        aiGovernanceAPI.systems({ q: q || undefined })
            .then((res) => setRows(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load AI register'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const create = (event: FormEvent) => {
        event.preventDefault();
        aiGovernanceAPI.createSystem({ name })
            .then((res) => navigate(`/ai-governance/systems/${res.data.data.publicId}`))
            .catch((err) => setError(err.message || 'Unable to record AI system'));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: 'Register' }]} title="AI system register" description="Public IDs such as AI-00001. A recorded system is not an approval." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Stack component="form" onSubmit={create} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField label="New AI system name" value={name} onChange={(event) => setName(event.target.value)} required />
                            <Button type="submit" variant="contained">Record system</Button>
                            <TextField label="Search" value={q} onChange={(event) => setQ(event.target.value)} />
                            <Button type="button" onClick={load}>Filter</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>Lifecycle stays Proposed until a human approval is recorded. Supreme does not invent model scores.</Alert>
                        <AppTable
                            rows={rows}
                            rowKey={(row) => row.publicId}
                            onRowClick={(row) => navigate(`/ai-governance/systems/${row.publicId}`)}
                            emptyTitle="No AI systems"
                            emptyBody="Record an AI system to start the register. Nothing is auto-created."
                            columns={[
                                { id: 'publicId', label: 'System', render: (row) => row.publicId },
                                { id: 'name', label: 'Name', render: (row) => row.name },
                                { id: 'lifecycle', label: 'Lifecycle', render: (row) => row.lifecycle },
                                { id: 'class', label: 'Organization class', render: (row) => row.organizationClass },
                                { id: 'owner', label: 'Owner', render: (row) => row.owner },
                                { id: 'approval', label: 'Latest approval', render: (row) => row.latestApproval },
                            ]}
                        />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
