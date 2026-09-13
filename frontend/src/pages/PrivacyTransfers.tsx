import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { privacyAPI } from '../services/api';

export default function PrivacyTransfers() {
    const [rows, setRows] = useState<any[]>([]);
    const [activityPublicId, setActivityPublicId] = useState('');
    const [source, setSource] = useState('US-NY');
    const [destination, setDestination] = useState('IE');
    const [mechanism, setMechanism] = useState('SCC');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        privacyAPI.transfers()
            .then((res) => setRows(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load transfers'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const create = (event: FormEvent) => {
        event.preventDefault();
        privacyAPI.createTransfer({ activityPublicId: activityPublicId || undefined, sourceJurisdiction: source, destinationJurisdiction: destination, mechanism })
            .then(load)
            .catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'Transfers' }]} title="International transfers" description="Recorded mechanisms and assessments. This is not a finding that a transfer is lawful." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>A recorded SCC, BCR, or adequacy note is an organizational determination, not legal clearance.</Alert>
                        <Stack component="form" onSubmit={create} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField label="Activity ID" value={activityPublicId} onChange={(event) => setActivityPublicId(event.target.value)} placeholder="PA-00001" />
                            <TextField label="Source" value={source} onChange={(event) => setSource(event.target.value)} />
                            <TextField label="Destination" value={destination} onChange={(event) => setDestination(event.target.value)} />
                            <TextField select label="Mechanism record" value={mechanism} onChange={(event) => setMechanism(event.target.value)} sx={{ minWidth: 160 }}>
                                {['ADEQUACY', 'SCC', 'BCR', 'CONSENT_EXCEPTION', 'OTHER'].map((item) => <MenuItem key={item} value={item}>{item.replace(/_/g, ' ')}</MenuItem>)}
                            </TextField>
                            <Button type="submit" variant="contained">Record transfer</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable
                            rows={rows}
                            rowKey={(row) => row.publicId}
                            emptyTitle="No transfers"
                            emptyBody="Record an international transfer when one exists."
                            columns={[
                                { id: 'publicId', label: 'Transfer', render: (row) => row.publicId },
                                { id: 'path', label: 'Path', render: (row) => `${row.source} → ${row.destination}` },
                                { id: 'mechanism', label: 'Recorded mechanism', render: (row) => row.mechanism },
                                { id: 'status', label: 'Status', render: (row) => row.status },
                                { id: 'activity', label: 'Activity', render: (row) => row.activity || 'Not linked' },
                            ]}
                        />
                        {rows[0] && (
                            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                                <Button onClick={() => privacyAPI.createTransferAssessment(rows[0].publicId, { decision: 'Assessment recorded. This is not a lawfulness finding.' }).then(load)}>Add transfer assessment to first row</Button>
                                <Typography color="text.secondary">No automated foreign-law intelligence.</Typography>
                            </Stack>
                        )}
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
