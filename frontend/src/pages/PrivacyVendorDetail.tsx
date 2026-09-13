import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { privacyAPI } from '../services/api';

export default function PrivacyVendorDetail() {
    const { vendorId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!vendorId) return;
        privacyAPI.vendor(vendorId)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load vendor privacy'))
            .finally(() => setLoading(false));
    }, [vendorId]);

    return (
        <>
            <PageHeader
                crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'Vendor privacy', to: '/privacy-ops/vendors' }, { label: data?.vendor?.name || 'Vendor' }]}
                title={data ? `${data.vendor.name}` : 'Vendor privacy'}
                description="Processor view on the existing Third Party record."
                actions={<Button onClick={() => navigate('/vendors')}>Open Third Party</Button>}
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Vendor not found" emptyBody="Return to vendor privacy and choose a Third Party record.">
                {data && (
                    <Stack spacing={2}>
                        <Alert severity="info">{data.honesty}</Alert>
                        <Surface>
                            <Typography>Privacy roles: {(data.roles || []).join(', ') || 'Not recorded'}</Typography>
                            <Typography>Third Party residual risk: {data.thirdPartyResidual ?? data.vendor.residualRisk}</Typography>
                            <Typography>Jurisdictions: {(data.jurisdictions || []).join(', ') || 'Not recorded'}</Typography>
                            <Typography>Data: {(data.dataCategories || []).join(', ') || 'Not recorded'}</Typography>
                            <Typography>Subjects: {(data.dataSubjects || []).join(', ') || 'Not recorded'}</Typography>
                            <Typography>Privacy risks: {(data.privacyRisks || []).join(', ') || 'None recorded'}</Typography>
                            <Typography>Controls: {(data.controls || []).join(', ') || 'None recorded'}</Typography>
                            <Typography>CLEAN evidence: {(data.evidence || []).join(', ') || 'None recorded'}</Typography>
                            <Typography>Requirements: {(data.requirements || []).join(', ') || 'None recorded'}</Typography>
                            <Typography>Gaps: {(data.gaps || []).join(', ') || 'None recorded'}</Typography>
                            <Typography>Retention: {(data.retention || []).join(', ') || 'None recorded'}</Typography>
                        </Surface>
                        <Surface>
                            <Typography fontWeight={700} sx={{ mb: 1 }}>DPA / contract evidence</Typography>
                            <AppTable rows={data.contracts || []} rowKey={(row: any) => row.id} emptyTitle="No DPA or contract recorded" emptyBody="Link a Third Party contract when a DPA exists. Presence is not a lawfulness finding." columns={[
                                { id: 'title', label: 'Contract', render: (row: any) => row.title },
                                { id: 'status', label: 'Status', render: (row: any) => row.status },
                            ]} />
                        </Surface>
                        <Surface>
                            <Typography fontWeight={700} sx={{ mb: 1 }}>Privacy assessments and DPIAs</Typography>
                            <AppTable rows={[...(data.dpias || []).map((row: any) => ({ ...row, kind: 'DPIA' })), ...(data.assessments || []).map((row: any) => ({ publicId: row.id, title: 'Third Party assessment', status: row.status, kind: 'Assessment' }))]} rowKey={(row: any) => `${row.kind}-${row.publicId}`} emptyTitle="No assessments" emptyBody="DPIAs and Third Party assessments appear when they are linked to this vendor's processing." columns={[
                                { id: 'kind', label: 'Kind', render: (row: any) => row.kind },
                                { id: 'publicId', label: 'Record', render: (row: any) => row.publicId },
                                { id: 'title', label: 'Title', render: (row: any) => row.title || '—' },
                                { id: 'status', label: 'Status', render: (row: any) => row.status },
                            ]} />
                        </Surface>
                        <Surface>
                            <Typography fontWeight={700} sx={{ mb: 1 }}>Findings / gaps</Typography>
                            <AppTable rows={data.findings || []} rowKey={(row: any) => row.id} emptyTitle="No vendor findings" emptyBody="Third Party findings stay on the shared vendor record." columns={[
                                { id: 'title', label: 'Finding', render: (row: any) => row.title },
                                { id: 'status', label: 'Status', render: (row: any) => row.status },
                            ]} />
                        </Surface>
                        <Surface>
                            <AppTable rows={data.activities || []} rowKey={(row: any) => row.publicId} onRowClick={(row) => navigate(`/privacy-ops/activities/${row.publicId}`)} emptyTitle="No processing activities" emptyBody="Link this vendor from a processing activity." columns={[
                                { id: 'publicId', label: 'Activity', render: (row: any) => row.publicId },
                                { id: 'name', label: 'Name', render: (row: any) => row.name },
                                { id: 'data', label: 'Data', render: (row: any) => (row.data || []).join(', ') || 'Not recorded' },
                            ]} />
                        </Surface>
                        <Surface>
                            <AppTable rows={data.transfers || []} rowKey={(row: any) => row.publicId} emptyTitle="No transfers" emptyBody="No international transfer is linked to this vendor." columns={[
                                { id: 'publicId', label: 'Transfer', render: (row: any) => row.publicId },
                                { id: 'path', label: 'Path', render: (row: any) => row.path },
                                { id: 'status', label: 'Status', render: (row: any) => row.status },
                            ]} />
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </>
    );
}
