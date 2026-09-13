import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { privacyAPI } from '../services/api';

export default function PrivacyConsent() {
    const [pack, setPack] = useState<{ providerStatus: string; honesty: string; rows: any[] } | null>(null);
    const [purpose, setPurpose] = useState('Service delivery');
    const [subjectRef, setSubjectRef] = useState('Manual-ref-1');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        privacyAPI.consents()
            .then((res) => setPack(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load consent records'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const create = (event: FormEvent) => {
        event.preventDefault();
        privacyAPI.createConsent({ purpose, subjectRef, choice: 'GIVEN', evidenceNote: 'Manual proof recorded' }).then(load).catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'Consent' }]} title="Consent / preference" description="Operating records only. Supreme is not a cookie-consent platform." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="warning" sx={{ mb: 2 }}>Provider status: {pack?.providerStatus || 'Not configured / manual'}. {pack?.honesty}</Alert>
                        <Stack component="form" onSubmit={create} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField label="Subject / reference" value={subjectRef} onChange={(event) => setSubjectRef(event.target.value)} />
                            <TextField label="Purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} />
                            <Button type="submit" variant="contained">Record manual choice</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable
                            rows={pack?.rows || []}
                            rowKey={(row) => row.publicId}
                            emptyTitle="No consent records"
                            emptyBody="Manual records can be added. Nothing is synchronized from a collector."
                            columns={[
                                { id: 'publicId', label: 'Record', render: (row) => row.publicId },
                                { id: 'subjectRef', label: 'Subject / reference', render: (row) => row.subjectRef },
                                { id: 'purpose', label: 'Purpose', render: (row) => row.purpose },
                                { id: 'choice', label: 'Choice', render: (row) => row.choice },
                                { id: 'source', label: 'Source', render: (row) => row.source },
                                { id: 'version', label: 'Version', render: (row) => row.version },
                                { id: 'timestamp', label: 'Timestamp', render: (row) => row.timestamp ? new Date(row.timestamp).toLocaleString() : 'Not recorded' },
                                { id: 'withdrawnAt', label: 'Withdrawal', render: (row) => row.withdrawnAt ? new Date(row.withdrawnAt).toLocaleString() : 'Not withdrawn' },
                                { id: 'evidence', label: 'Evidence / proof', render: (row) => row.evidence },
                                { id: 'providerStatus', label: 'Provider', render: (row) => row.providerStatus },
                                { id: 'status', label: 'Status', render: (row) => row.status },
                                { id: 'withdraw', label: '', render: (row) => <Button disabled={Boolean(row.withdrawnAt)} onClick={() => privacyAPI.withdrawConsent(row.publicId).then(load)}>Record withdrawal</Button> },
                            ]}
                        />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
