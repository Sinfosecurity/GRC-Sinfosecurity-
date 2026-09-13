import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { complianceAPI } from '../services/api';

type CatalogRow = {
    frameworkKey: string;
    name: string;
    publisher: string;
    version: string;
    versionStatus: string;
    requirementCount: number;
    versionId: string;
    activated: boolean;
    activations: Array<{ publicId: string; status: string }>;
    endorsement: string;
};

export default function ComplianceFrameworks() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<CatalogRow[]>([]);
    const [versionId, setVersionId] = useState('');
    const [scope, setScope] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        complianceAPI.catalog()
            .then((res) => {
                const data = res.data.data as CatalogRow[];
                setRows(data);
                if (!versionId && data[0]) setVersionId(data.find((row) => !row.activated && row.versionStatus === 'ACTIVE')?.versionId || data[0].versionId);
            })
            .catch((err) => setError(err.message || 'Unable to load framework catalog'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const activate = (event: FormEvent) => {
        event.preventDefault();
        setMessage(null);
        complianceAPI.activate({ frameworkVersionId: versionId, scope: scope || undefined })
            .then((res) => navigate(`/compliance/frameworks/${res.data.data.publicId}`))
            .catch((err) => setError(err.message || 'Unable to activate framework'));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'Compliance' }, { label: 'Frameworks' }]} title="Framework catalog" description="Public identifiers and original Supreme summaries only. Packs are not official endorsements and are not certification." />
            <QueryState loading={loading} error={error} empty={rows.length === 0} emptyTitle="No framework packs" emptyBody="Open Control Center once so the organization can adopt the Supreme library.">
                <Stack spacing={2.5}>
                    {message && <Alert severity="success">{message}</Alert>}
                    <Surface>
                        <Typography variant="h6" sx={{ mb: 1.5 }}>Activate a framework</Typography>
                        <Typography color="text.secondary" sx={{ mb: 2 }}>Nothing is activated automatically. Choose a version, then Supreme will show existing common controls, CLEAN evidence, tests, and remaining gaps.</Typography>
                        <Stack component="form" onSubmit={activate} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField select label="Framework version" value={versionId} onChange={(event) => setVersionId(event.target.value)} sx={{ minWidth: 280 }}>
                                {rows.map((row) => (
                                    <MenuItem key={row.versionId} value={row.versionId}>{row.name} {row.version} · {row.requirementCount} requirements</MenuItem>
                                ))}
                            </TextField>
                            <TextField label="Scope (optional)" value={scope} onChange={(event) => setScope(event.target.value)} />
                            <Button type="submit" variant="contained">Activate</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable
                            rows={rows}
                            rowKey={(row) => row.versionId}
                            onRowClick={(row) => {
                                if (row.activations[0]) navigate(`/compliance/frameworks/${row.activations[0].publicId}`);
                            }}
                            columns={[
                                { id: 'name', label: 'Framework', render: (row) => row.name },
                                { id: 'version', label: 'Version', render: (row) => row.version },
                                { id: 'publisher', label: 'Publisher', hideOnMobile: true, render: (row) => row.publisher },
                                { id: 'requirementCount', label: 'Requirements', render: (row) => row.requirementCount },
                                { id: 'status', label: 'Program', render: (row) => (row.activated ? row.activations[0]?.status || 'Active' : 'Not activated') },
                            ]}
                        />
                        <StatusBadge tone="neutral" label="Not certified" />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
