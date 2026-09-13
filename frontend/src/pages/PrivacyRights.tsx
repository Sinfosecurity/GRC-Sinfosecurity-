import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { privacyAPI } from '../services/api';

export default function PrivacyRights() {
    const [rows, setRows] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [requestType, setRequestType] = useState('ACCESS');
    const [regime, setRegime] = useState('GDPR');
    const [requesterRef, setRequesterRef] = useState('Requester-1');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        privacyAPI.rights()
            .then((res) => setRows(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load rights requests'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const create = (event: FormEvent) => {
        event.preventDefault();
        privacyAPI.createRights({ requestType, regime, requesterRef, receivedAt: new Date().toISOString() })
            .then(load)
            .catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'Rights requests' }]} title="Rights requests" description="Public IDs such as DSR-00001. List views hide requester identity. Deadlines are configured, not legal advice." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>Configured deadline is not legal advice. Verification documents are not stored on this page.</Alert>
                        <Stack component="form" onSubmit={create} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField select label="Request type" value={requestType} onChange={(event) => setRequestType(event.target.value)} sx={{ minWidth: 180 }}>
                                {[{ key: 'ACCESS', label: 'Access' }, { key: 'CORRECTION', label: 'Correction' }, { key: 'DELETION', label: 'Deletion' }, { key: 'RESTRICTION', label: 'Restriction' }, { key: 'OBJECTION', label: 'Objection' }, { key: 'PORTABILITY', label: 'Portability' }, { key: 'OPT_OUT', label: 'Opt-out' }, { key: 'CONSENT_WITHDRAWAL', label: 'Consent Withdrawal' }].map((item) => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
                            </TextField>
                            <TextField select label="Regime" value={regime} onChange={(event) => setRegime(event.target.value)} sx={{ minWidth: 160 }}>
                                {[{ key: 'GDPR', label: 'GDPR' }, { key: 'UK_GDPR', label: 'UK GDPR' }, { key: 'CCPA_CPRA', label: 'CCPA / CPRA' }, { key: 'US_STATE', label: 'US State Privacy' }].map((item) => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
                            </TextField>
                            <TextField label="Requester reference" value={requesterRef} onChange={(event) => setRequesterRef(event.target.value)} />
                            <Button type="submit" variant="contained">Record request</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable
                            rows={rows}
                            rowKey={(row) => row.publicId}
                            onRowClick={(row) => privacyAPI.rightsDetail(row.publicId).then((res) => setSelected(res.data.data))}
                            emptyTitle="No rights requests"
                            emptyBody="Record a request when one is received. Requester email is not shown in this list."
                            columns={[
                                { id: 'publicId', label: 'Request', render: (row) => row.publicId },
                                { id: 'requestType', label: 'Type', render: (row) => row.requestType },
                                { id: 'status', label: 'Status', render: (row) => row.status },
                                { id: 'requester', label: 'Requester', render: (row) => row.requester },
                                { id: 'dueAt', label: 'Configured due', render: (row) => row.dueAt ? new Date(row.dueAt).toLocaleDateString() : 'Not set' },
                            ]}
                        />
                    </Surface>
                    {selected && (
                        <Surface>
                            <Typography variant="h6">{selected.publicId}</Typography>
                            <Typography>Original deadline: {selected.originalDueAt ? new Date(selected.originalDueAt).toLocaleDateString() : 'Not set'}</Typography>
                            <Typography>Current due: {selected.dueAt ? new Date(selected.dueAt).toLocaleDateString() : 'Not set'}</Typography>
                            <Typography>Why: {selected.deadlineWhy}</Typography>
                            <Typography sx={{ mt: 1.5 }} fontWeight={700}>Identity verification</Typography>
                            <Typography>Status: {selected.verification?.status || selected.verificationStatus}</Typography>
                            <Typography>Method: {selected.verification?.method || 'Not recorded'}</Typography>
                            <Typography>Verified by: {selected.verification?.verifiedBy || 'Need-to-know'}</Typography>
                            <Typography>Verified date: {selected.verification?.verifiedAt ? new Date(selected.verification.verifiedAt).toLocaleDateString() : 'Not recorded'}</Typography>
                            {selected.verification?.notes && <Typography>Notes: {selected.verification.notes}</Typography>}
                            {selected.verification?.exception && <Typography>Alternative procedure: {selected.verification.exception}</Typography>}
                            <Typography>Evidence: {selected.verification?.evidence?.filename || 'Not stored on this page'}</Typography>
                            <Typography color="text.secondary">{selected.honesty}</Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                                <Button onClick={() => privacyAPI.updateRights(selected.publicId, { verificationStatus: 'PENDING', verificationMethod: 'Knowledge check' }).then((res) => setSelected(res.data.data))}>Mark verification pending</Button>
                                <Button onClick={() => privacyAPI.updateRights(selected.publicId, { verificationStatus: 'VERIFIED', verificationMethod: 'Knowledge check', verificationNotes: 'Verified without storing identity documents' }).then((res) => setSelected(res.data.data))}>Mark verified</Button>
                                <Button onClick={() => privacyAPI.updateRights(selected.publicId, { verificationStatus: 'EXCEPTION', verificationException: 'Alternative procedure recorded' }).then((res) => setSelected(res.data.data))}>Record exception</Button>
                                <Button onClick={() => privacyAPI.addRightsTask(selected.publicId, { taskType: 'SYSTEM_SEARCH', targetLabel: 'Claims platform' }).then((res) => setSelected(res.data.data))}>Add manual search task</Button>
                            </Stack>
                        </Surface>
                    )}
                </Stack>
            </QueryState>
        </>
    );
}
