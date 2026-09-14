import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { aiGovernanceAPI } from '../services/api';

export default function AiExceptions() {
    const [rows, setRows] = useState<any[]>([]);
    const [systemPublicId, setSystemPublicId] = useState('');
    const [scope, setScope] = useState('');
    const [rationale, setRationale] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const load = () => {
        aiGovernanceAPI.exceptions().then((res) => setRows(res.data.data)).catch((err) => setError(err.message)).finally(() => setLoading(false));
    };
    useEffect(load, []);
    const create = (event: FormEvent) => {
        event.preventDefault();
        aiGovernanceAPI.recordException({ systemPublicId, scope, rationale }).then(load).catch((err) => setError(err.message));
    };
    return (
        <>
            <PageHeader crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: 'Exceptions' }]} title="AI exceptions" description="Temporary exceptions stay time-bounded. Expired exceptions require attention. They are not approvals." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="warning" sx={{ mb: 2 }}>An exception is not an approval and does not make a control effective.</Alert>
                        <Stack component="form" onSubmit={create} spacing={1.5}>
                            <TextField label="AI system ID" value={systemPublicId} onChange={(event) => setSystemPublicId(event.target.value)} required placeholder="AI-00001" />
                            <TextField label="Scope" value={scope} onChange={(event) => setScope(event.target.value)} required />
                            <TextField label="Rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} required />
                            <Button type="submit" variant="contained">Record exception</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable rows={rows} rowKey={(row) => row.publicId} emptyTitle="No exceptions" emptyBody="No invented exception feed." columns={[
                            { id: 'id', label: 'Exception', render: (row) => row.publicId },
                            { id: 'system', label: 'System', render: (row) => row.system?.publicId },
                            { id: 'scope', label: 'Scope', render: (row) => row.scope },
                            { id: 'status', label: 'Status', render: (row) => row.status },
                        ]} />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
