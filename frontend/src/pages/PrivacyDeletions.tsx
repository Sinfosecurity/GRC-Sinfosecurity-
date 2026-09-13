import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { privacyAPI } from '../services/api';

const STATUSES = [
    { key: 'REQUESTED', label: 'Requested' },
    { key: 'IN_PROGRESS', label: 'In progress' },
    { key: 'AWAITING_VERIFICATION', label: 'Awaiting verification' },
    { key: 'VERIFIED', label: 'Verified' },
    { key: 'EXCEPTION', label: 'Exception / legal hold' },
    { key: 'LEGAL_HOLD', label: 'Exception / legal hold' },
    { key: 'CLOSED', label: 'Closed' },
];

export default function PrivacyDeletions() {
    const [rows, setRows] = useState<any[]>([]);
    const [activityPublicId, setActivityPublicId] = useState('');
    const [systemName, setSystemName] = useState('Claims platform');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        privacyAPI.deletions()
            .then((res) => setRows(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load deletion tasks'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const create = (event: FormEvent) => {
        event.preventDefault();
        privacyAPI.createDeletion({
            activityPublicId: activityPublicId || undefined,
            systemName,
            dataKind: 'FINANCIAL',
            action: 'Manual deletion request',
            status: 'REQUESTED',
        }).then(load).catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'Deletion' }]} title="Deletion / disposal" description="Track deletion tasks and attestations. A closed task is not proof that external-system data is deleted." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="warning" sx={{ mb: 2 }}>Deletion task completed or verified by attestation is not automated deletion across systems.</Alert>
                        <Stack component="form" onSubmit={create} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField label="Activity ID" value={activityPublicId} onChange={(event) => setActivityPublicId(event.target.value)} placeholder="PA-00002" />
                            <TextField label="System or vendor" value={systemName} onChange={(event) => setSystemName(event.target.value)} />
                            <Button type="submit" variant="contained">Record task</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable
                            rows={rows}
                            rowKey={(row) => row.publicId}
                            emptyTitle="No deletion tasks"
                            emptyBody="Record a task when deletion is requested. Do not claim systems were wiped."
                            columns={[
                                { id: 'publicId', label: 'Deletion ID', priority: 'primary', render: (row) => row.publicId },
                                { id: 'activity', label: 'Activity', priority: 'primary', render: (row) => row.activity || 'Not linked' },
                                { id: 'status', label: 'Status', priority: 'primary', render: (row) => row.status },
                                { id: 'owner', label: 'Owner', priority: 'primary', render: (row) => row.owner },
                                { id: 'dueAt', label: 'Due date', priority: 'primary', render: (row) => row.dueAt ? new Date(row.dueAt).toLocaleDateString() : 'Not set' },
                                { id: 'system', label: 'System / vendor', priority: 'primary', render: (row) => row.system },
                                { id: 'verification', label: 'Verification', priority: 'primary', render: (row) => row.verification },
                                { id: 'dataCategory', label: 'Data', priority: 'secondary', render: (row) => row.dataCategory },
                                { id: 'action', label: 'Action', priority: 'secondary', render: (row) => row.action },
                                { id: 'evidence', label: 'Evidence', priority: 'secondary', render: (row) => row.evidence },
                                { id: 'exception', label: 'Exception', priority: 'secondary', render: (row) => row.exception || 'None' },
                                { id: 'completedAt', label: 'Completed', priority: 'secondary', render: (row) => row.completedAt ? new Date(row.completedAt).toLocaleDateString() : 'Open' },
                                { id: 'honesty', label: 'Honesty', priority: 'secondary', render: (row) => row.honesty },
                                { id: 'update', label: 'Update status', priority: 'secondary', render: (row) => (
                                    <TextField select size="small" value={row.statusKey} onChange={(event) => privacyAPI.updateDeletion(row.publicId, { status: event.target.value, verification: 'Attestation recorded' }).then(load).catch((err) => setError(err.message))} sx={{ minWidth: 200 }}>
                                        {STATUSES.map((item) => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
                                    </TextField>
                                ) },
                            ]}
                        />
                        <Typography color="text.secondary" sx={{ mt: 1.5 }}>Legal hold or exception prevents a misleading complete status.</Typography>
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
