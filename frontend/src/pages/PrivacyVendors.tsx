import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Stack } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { privacyAPI } from '../services/api';

export default function PrivacyVendors() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        privacyAPI.vendors()
            .then((res) => setRows(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load vendor privacy'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <>
            <PageHeader crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'Vendor privacy' }]} title="Vendor privacy" description="Third Party vendor identity is reused. Privacy adds role and processing links only." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="info">This is not a second vendor database. Open a vendor to see processing, transfers, controls, and CLEAN evidence.</Alert>
                    </Surface>
                    <Surface>
                        <AppTable
                            rows={rows}
                            rowKey={(row) => row.vendorId}
                            onRowClick={(row) => navigate(`/privacy-ops/vendors/${row.vendorId}`)}
                            emptyTitle="No Third Party vendors"
                            emptyBody="Add a vendor in Third Party, then link it from a processing activity."
                            columns={[
                                { id: 'name', label: 'Vendor', render: (row) => row.name },
                                { id: 'roles', label: 'Privacy roles', render: (row) => (row.roles || []).join(', ') || 'Not linked' },
                                { id: 'activities', label: 'Activities', render: (row) => (row.activities || []).join(', ') || 'None' },
                                { id: 'risk', label: 'Third Party residual', render: (row) => String(row.residualRisk ?? 'Not scored') },
                                { id: 'open', label: '', render: (row) => <Button onClick={(event) => { event.stopPropagation(); navigate(`/privacy-ops/vendors/${row.vendorId}`); }}>Open privacy</Button> },
                            ]}
                        />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
