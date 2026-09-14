import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { aiGovernanceAPI } from '../services/api';

export default function AiApprovals() {
    const [rows, setRows] = useState<any[]>([]);
    const [systemPublicId, setSystemPublicId] = useState('');
    const [decision, setDecision] = useState('APPROVED');
    const [decisionMaker, setDecisionMaker] = useState('');
    const [rationale, setRationale] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const load = () => {
        aiGovernanceAPI.approvals().then((res) => setRows(res.data.data)).catch((err) => setError(err.message)).finally(() => setLoading(false));
    };
    useEffect(load, []);
    const create = (event: FormEvent) => {
        event.preventDefault();
        aiGovernanceAPI.approve({ systemPublicId, decision, decisionMaker, rationale }).then(load).catch((err) => setError(err.message));
    };
    return (
        <>
            <PageHeader crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: 'Approvals' }]} title="AI approvals" description="Approved, restricted, rejected, suspended, or retired requires a named human. AI cannot approve itself." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="warning" sx={{ mb: 2 }}>Creating an AI system does not approve it.</Alert>
                        <Stack component="form" onSubmit={create} spacing={1.5}>
                            <TextField label="AI system ID" value={systemPublicId} onChange={(event) => setSystemPublicId(event.target.value)} required />
                            <TextField select label="Decision" value={decision} onChange={(event) => setDecision(event.target.value)}>
                                {['APPROVED', 'APPROVED_WITH_CONDITIONS', 'RESTRICTED', 'REJECTED', 'SUSPENDED', 'RETIRED'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                            </TextField>
                            <TextField label="Decision maker" value={decisionMaker} onChange={(event) => setDecisionMaker(event.target.value)} required />
                            <TextField label="Rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} required />
                            <Button type="submit" variant="contained">Record human decision</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable rows={rows} rowKey={(row) => row.publicId} emptyTitle="No approvals" emptyBody="No system is approved merely because it exists." columns={[
                            { id: 'id', label: 'Approval', render: (row) => row.publicId },
                            { id: 'system', label: 'System', render: (row) => row.system?.publicId },
                            { id: 'decision', label: 'Decision', render: (row) => row.decision },
                            { id: 'maker', label: 'Decision maker', render: (row) => row.decisionMaker },
                        ]} />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
