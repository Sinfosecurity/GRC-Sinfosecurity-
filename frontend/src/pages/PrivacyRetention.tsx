import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { privacyAPI } from '../services/api';

export default function PrivacyRetention() {
    const [rows, setRows] = useState<any[]>([]);
    const [period, setPeriod] = useState('7 years after claim close');
    const [activityPublicId, setActivityPublicId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        privacyAPI.retention()
            .then((res) => setRows(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load retention'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const create = (event: FormEvent) => {
        event.preventDefault();
        privacyAPI.createRetention({
            activityPublicId: activityPublicId || undefined,
            period,
            reviewAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        }).then(load).catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'Retention' }]} title="Retention" description="Surface due and overdue retention actions. Supreme does not auto-delete customer data." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>A closed deletion task is not proof the data is gone. Attestation is required where configured.</Alert>
                        <Stack component="form" onSubmit={create} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField label="Activity ID" value={activityPublicId} onChange={(event) => setActivityPublicId(event.target.value)} placeholder="PA-00001" />
                            <TextField label="Retention period" value={period} onChange={(event) => setPeriod(event.target.value)} />
                            <Button type="submit" variant="contained">Record rule</Button>
                            <Button type="button" onClick={() => privacyAPI.createDeletion({ activityPublicId: activityPublicId || undefined, status: 'REQUESTED', attestation: 'Pending evidence' }).catch((err) => setError(err.message))}>Record deletion task</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable
                            rows={rows}
                            rowKey={(row) => row.publicId}
                            emptyTitle="No retention rules"
                            emptyBody="Record a retention rule when one applies."
                            columns={[
                                { id: 'publicId', label: 'Rule', render: (row) => row.publicId },
                                { id: 'activity', label: 'Activity', render: (row) => row.activity || 'Not linked' },
                                { id: 'period', label: 'Period', render: (row) => row.period },
                                { id: 'due', label: 'Due', render: (row) => row.due ? 'Due' : 'Scheduled' },
                            ]}
                        />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
