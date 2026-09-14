import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { aiGovernanceAPI } from '../services/api';
import { humanizeLabel } from '../utils/humanizeLabel';

const KINDS = ['ACCURACY', 'ROBUSTNESS', 'BIAS_FAIRNESS', 'SECURITY', 'PROMPT_INJECTION', 'DATA_LEAKAGE', 'HALLUCINATION', 'SAFETY', 'RED_TEAM', 'HUMAN_OVERSIGHT', 'PERFORMANCE', 'DRIFT'];

export default function AiTesting() {
    const [rows, setRows] = useState<any[]>([]);
    const [systemPublicId, setSystemPublicId] = useState('');
    const [kind, setKind] = useState('ACCURACY');
    const [result, setResult] = useState('NOT_TESTED');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const load = () => {
        aiGovernanceAPI.tests().then((res) => setRows(res.data.data)).catch((err) => setError(err.message)).finally(() => setLoading(false));
    };
    useEffect(load, []);
    const create = (event: FormEvent) => {
        event.preventDefault();
        aiGovernanceAPI.recordTest({ systemPublicId, kind, result, tester: 'Recorded tester' }).then(load).catch((err) => setError(err.message));
    };
    return (
        <>
            <PageHeader crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: 'Testing' }]} title="Model / system testing" description="Results exist only when a person records them. Supreme does not invent bias, drift, or accuracy scores." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>Not tested stays Not tested. Failed tests require attention.</Alert>
                        <Stack component="form" onSubmit={create} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField label="AI system ID" value={systemPublicId} onChange={(event) => setSystemPublicId(event.target.value)} required />
                            <TextField select label="Test type" value={kind} onChange={(event) => setKind(event.target.value)}>{KINDS.map((item) => <MenuItem key={item} value={item}>{humanizeLabel(item)}</MenuItem>)}</TextField>
                            <TextField select label="Result" value={result} onChange={(event) => setResult(event.target.value)}>
                                {['PASS', 'FAIL', 'PARTIAL', 'NOT_TESTED', 'NOT_APPLICABLE'].map((item) => <MenuItem key={item} value={item}>{humanizeLabel(item)}</MenuItem>)}
                            </TextField>
                            <Button type="submit" variant="contained">Record test</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable rows={rows} rowKey={(row) => row.publicId} emptyTitle="No tests" emptyBody="Record a human evaluation. Nothing is inferred." columns={[
                            { id: 'id', label: 'Test', render: (row) => row.publicId },
                            { id: 'system', label: 'System', render: (row) => row.system?.publicId },
                            { id: 'kind', label: 'Type', render: (row) => humanizeLabel(row.kind) },
                            { id: 'result', label: 'Result', render: (row) => humanizeLabel(row.result) },
                        ]} />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
