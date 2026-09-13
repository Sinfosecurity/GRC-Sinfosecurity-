import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { complianceAPI } from '../services/api';

export default function ComplianceExceptions() {
    const [rows, setRows] = useState<any[]>([]);
    const [owners, setOwners] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [scope, setScope] = useState('');
    const [rationale, setRationale] = useState('');
    const [ownerUserId, setOwnerUserId] = useState('');

    const load = () => {
        setLoading(true);
        Promise.all([complianceAPI.exceptions(), complianceAPI.owners().catch(() => ({ data: { data: [] } }))])
            .then(([res, ownerRes]) => {
                setRows(res.data.data);
                setOwners(ownerRes.data.data);
                if (!ownerUserId && ownerRes.data.data[0]) setOwnerUserId(ownerRes.data.data[0].id);
            })
            .catch((err) => setError(err.message || 'Unable to load exceptions'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const create = (event: FormEvent) => {
        event.preventDefault();
        complianceAPI.createException({
            type: 'POLICY',
            scope,
            rationale,
            ownerUserId,
            startAt: new Date().toISOString(),
        }).then(load).catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'Compliance' }, { label: 'Exceptions' }]} title="Exceptions" description="An exception is time-bounded governance. It does not make the underlying control effective." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Surface>
                    <Alert severity="info" sx={{ mb: 2 }}>Expired exceptions appear as attention items. Approval is a decision, not a test result.</Alert>
                    <Stack component="form" onSubmit={create} spacing={1.5} sx={{ mb: 3, maxWidth: 520 }}>
                        <TextField label="Scope" value={scope} onChange={(event) => setScope(event.target.value)} required />
                        <TextField label="Rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} required />
                        <TextField select label="Owner" value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)}>
                            {owners.map((owner) => <MenuItem key={owner.id} value={owner.id}>{owner.firstName} {owner.lastName}</MenuItem>)}
                        </TextField>
                        <Button type="submit" variant="contained">Request exception</Button>
                    </Stack>
                    <AppTable
                        rows={rows}
                        rowKey={(row) => row.publicId}
                        emptyTitle="No exceptions"
                        emptyBody="Request a governed exception when policy, control, evidence, or interpretation needs a time-bounded departure."
                        columns={[
                            { id: 'publicId', label: 'Exception', render: (row) => row.publicId },
                            { id: 'scope', label: 'Scope', render: (row) => row.scope },
                            { id: 'type', label: 'Type', render: (row) => row.type },
                            { id: 'status', label: 'Status', render: (row) => row.status },
                        ]}
                    />
                </Surface>
            </QueryState>
        </>
    );
}
