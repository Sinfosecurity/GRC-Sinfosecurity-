import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { aiGovernanceAPI } from '../services/api';
import { humanizeLabel } from '../utils/humanizeLabel';

export default function AiRegulatory() {
    const [rows, setRows] = useState<any[]>([]);
    const [systemPublicId, setSystemPublicId] = useState('');
    const [regime, setRegime] = useState('EU AI Act');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const load = () => {
        aiGovernanceAPI.regulatory().then((res) => setRows(res.data.data)).catch((err) => setError(err.message)).finally(() => setLoading(false));
    };
    useEffect(load, []);
    const create = (event: FormEvent) => {
        event.preventDefault();
        aiGovernanceAPI.recordRegulatory({ systemPublicId, regime, status: 'IN_REVIEW' }).then(load).catch((err) => setError(err.message));
    };
    return (
        <>
            <PageHeader crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: 'Regulatory' }]} title="Regulatory applicability" description="Potential applicability. Review required. Organization classification. Never an automatic legal finding." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="warning" sx={{ mb: 2 }}>Supreme does not automatically claim EU AI Act High-Risk or ISO 42001 certified.</Alert>
                        <Stack component="form" onSubmit={create} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField label="AI system ID" value={systemPublicId} onChange={(event) => setSystemPublicId(event.target.value)} required />
                            <TextField label="Regime" value={regime} onChange={(event) => setRegime(event.target.value)} required />
                            <Button type="submit" variant="contained">Record review</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable rows={rows} rowKey={(row) => row.publicId} emptyTitle="No reviews" emptyBody="Nothing is auto-declared applicable." columns={[
                            { id: 'id', label: 'Review', render: (row) => row.publicId },
                            { id: 'system', label: 'System', render: (row) => row.system?.publicId },
                            { id: 'regime', label: 'Regime', render: (row) => row.regime },
                            { id: 'status', label: 'Status', render: (row) => humanizeLabel(row.status) },
                        ]} />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
