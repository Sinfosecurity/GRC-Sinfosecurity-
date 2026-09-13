import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { privacyAPI } from '../services/api';

export default function PrivacyDataMap() {
    const [data, setData] = useState<any>(null);
    const [q, setQ] = useState('');
    const [dataKind, setDataKind] = useState('');
    const [transfer, setTransfer] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = (event?: FormEvent) => {
        event?.preventDefault();
        setLoading(true);
        privacyAPI.dataMap({ q: q || undefined, dataKind: dataKind || undefined, transfer: transfer || undefined })
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load data map'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    return (
        <>
            <PageHeader crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'Data map' }]} title="Data map" description="Answer where personal data is processed, who receives it, and which activities transfer it internationally." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Stack component="form" onSubmit={load} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField label="Search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="customer financial, employee, health" />
                            <TextField select label="Data category" value={dataKind} onChange={(event) => setDataKind(event.target.value)} sx={{ minWidth: 200 }}>
                                <MenuItem value="">Any</MenuItem>
                                {['FINANCIAL', 'HEALTH', 'EMPLOYMENT', 'IDENTITY', 'CONTACT'].map((item) => <MenuItem key={item} value={item}>{item.replace(/_/g, ' ')}</MenuItem>)}
                            </TextField>
                            <TextField select label="Transfers" value={transfer} onChange={(event) => setTransfer(event.target.value)} sx={{ minWidth: 200 }}>
                                <MenuItem value="">Any</MenuItem>
                                <MenuItem value="international">International only</MenuItem>
                            </TextField>
                            <Button type="submit" variant="contained">Filter</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>{data?.honesty || 'Structured paths only. This is not a decorative graph.'}</Alert>
                        <Typography variant="h6" sx={{ mb: 1 }}>Directional paths</Typography>
                        {(data?.paths || []).map((path: any, index: number) => (
                            <Typography key={index} sx={{ mb: 1 }}>
                                {[path.source, ...(path.systems || []), path.businessProcess, ...(path.vendors || []), ...(path.recipients || []), ...(path.storage || []), ...(path.jurisdictions || [])].filter(Boolean).join(' → ')}
                            </Typography>
                        ))}
                        {!data?.paths?.length && <Typography color="text.secondary">No recorded paths yet.</Typography>}
                    </Surface>
                    <Surface>
                        <AppTable
                            rows={data?.rows || []}
                            rowKey={(row: any) => `${row.activity}-${row.data}-${row.subject}`}
                            emptyTitle="No inventory rows"
                            emptyBody="Record processing activities, data categories, and vendors to populate the map."
                            columns={[
                                { id: 'activity', label: 'Activity', render: (row: any) => `${row.activity} ${row.name}` },
                                { id: 'data', label: 'Personal data', render: (row: any) => row.data },
                                { id: 'subject', label: 'Data subject', render: (row: any) => row.subject },
                                { id: 'vendors', label: 'Vendors', render: (row: any) => (row.vendors || []).join(', ') || 'None' },
                                { id: 'transfers', label: 'Transfers', render: (row: any) => (row.transfers || []).join(', ') || 'None' },
                            ]}
                        />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
