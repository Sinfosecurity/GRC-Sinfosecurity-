import { useEffect, useState } from 'react';
import { Alert } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { complianceAPI } from '../services/api';

export default function ComplianceGaps() {
    const [rows, setRows] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        complianceAPI.gaps()
            .then((res) => setRows(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load gaps'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <>
            <PageHeader crumbs={[{ label: 'Compliance' }, { label: 'Gaps' }]} title="Gaps" description="Gaps come from live mappings, tests, evidence, and exceptions. A gap is not a second finding when one already exists." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Surface>
                    <Alert severity="info" sx={{ mb: 2 }}>A gap explains what is missing. Linking an enterprise risk records potential impact only.</Alert>
                    <AppTable
                        rows={rows}
                        rowKey={(row) => row.publicId}
                        emptyTitle="No gaps"
                        emptyBody="Activate a framework and mark requirements applicable to calculate remaining work."
                        columns={[
                            { id: 'publicId', label: 'Gap', render: (row) => row.publicId },
                            { id: 'title', label: 'What is missing', render: (row) => row.title },
                            { id: 'source', label: 'Source', render: (row) => row.source },
                            { id: 'status', label: 'Status', render: (row) => row.status },
                        ]}
                    />
                </Surface>
            </QueryState>
        </>
    );
}
