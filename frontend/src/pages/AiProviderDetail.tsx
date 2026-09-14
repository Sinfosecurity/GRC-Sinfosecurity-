import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import { aiGovernanceAPI, vendorAPI } from '../services/api';
import { formatShortDate, humanizeLabel } from '../utils/humanizeLabel';

export default function AiProviderDetail() {
    const { publicId = '' } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [vendors, setVendors] = useState<any[]>([]);
    const [vendorId, setVendorId] = useState('');
    const [error, setError] = useState<string | null>(null);

    const load = () => {
        Promise.all([aiGovernanceAPI.provider(publicId), vendorAPI.getAll().catch(() => ({ data: { data: [] } }))])
            .then(([provider, vendorList]) => {
                setData(provider.data.data);
                const rows = vendorList.data?.vendors || vendorList.data?.data || [];
                setVendors(Array.isArray(rows) ? rows : []);
                setVendorId(provider.data.data.vendorId || '');
            })
            .catch((err) => setError(err.message || 'Unable to load provider'));
    };

    useEffect(load, [publicId]);

    const linkVendor = (event: FormEvent) => {
        event.preventDefault();
        aiGovernanceAPI.updateProvider(publicId, { vendorId: vendorId || null }).then(load).catch((err) => setError(err.message));
    };

    return (
        <QueryState loading={!data && !error} error={error} empty={!data} emptyTitle="Provider" emptyBody="This provider was not found.">
            {data && (
                <>
                    <PageHeader
                        crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: 'Providers', to: '/ai-governance/providers' }, { label: data.publicId }]}
                        title={`${data.publicId}  ${data.providerName}`}
                        description="Recorded provider facts only. Unknown / Not recorded if a person has not entered them."
                    />
                    <Stack spacing={2.5}>
                        <Alert severity="info">{data.honesty}</Alert>
                        <Surface>
                            <Typography variant="h6">Provider</Typography>
                            <Typography>Model family: {data.modelFamily || 'Not recorded'}</Typography>
                            <Typography>Current version: {data.modelVersion || 'Not recorded'}</Typography>
                            <Typography>Hosting: {data.hosting || 'Unknown / Not recorded'}</Typography>
                            <Typography>Deployment: {data.deployment || 'Unknown / Not recorded'}</Typography>
                            <Typography>Availability: {data.availabilityStatus}</Typography>
                            <Typography>Training data assertion: {data.trainingDataAssertion}</Typography>
                            <Typography>Retention assertion: {data.retentionAssertion}</Typography>
                            <Typography>Monitoring: {data.monitoring}</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Related vendor</Typography>
                            <Stack component="form" onSubmit={linkVendor} direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ my: 1.5 }}>
                                <TextField select label="Existing vendor" value={vendorId} onChange={(event) => setVendorId(event.target.value)} SelectProps={{ native: true }} sx={{ minWidth: 240 }}>
                                    <option value="">Unknown / Not recorded</option>
                                    {vendors.map((vendor: any) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                                </TextField>
                                <Button type="submit" variant="contained">Link existing vendor</Button>
                            </Stack>
                            {data.vendor ? (
                                <>
                                    <Typography>{data.vendor.name} · Residual risk {data.vendor.residualRiskScore}</Typography>
                                    <Typography>Privacy role: {humanizeLabel(data.vendor.privacyRole)}</Typography>
                                    <Typography>Data handling: {data.vendor.dataHandling}</Typography>
                                    <Button sx={{ mt: 1 }} onClick={() => navigate('/vendor-management')}>Open vendor</Button>
                                </>
                            ) : <Typography>Unknown / Not recorded</Typography>}
                        </Surface>
                        <Surface>
                            <Typography variant="h6">AI systems using it</Typography>
                            <AppTable
                                rows={data.systems || []}
                                rowKey={(row: any) => `${row.publicId}-${row.effectiveFrom}`}
                                onRowClick={(row: any) => navigate(`/ai-governance/systems/${row.publicId}`)}
                                emptyTitle="No linked AI systems"
                                emptyBody="Attach this provider from an AI system."
                                columns={[
                                    { id: 'id', label: 'System', render: (row: any) => row.publicId },
                                    { id: 'name', label: 'Name', render: (row: any) => row.name },
                                    { id: 'version', label: 'Version', render: (row: any) => row.modelVersion },
                                    { id: 'status', label: 'State', render: (row: any) => humanizeLabel(row.status) },
                                    { id: 'from', label: 'Effective', render: (row: any) => formatShortDate(row.effectiveFrom) },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Use cases</Typography>
                            <AppTable
                                rows={data.useCases || []}
                                rowKey={(row: any) => row.publicId}
                                onRowClick={(row: any) => navigate(`/ai-governance/use-cases/${row.publicId}`)}
                                emptyTitle="No use cases"
                                emptyBody="Unknown / Not recorded."
                                columns={[
                                    { id: 'id', label: 'Use case', render: (row: any) => row.publicId },
                                    { id: 'name', label: 'Name', render: (row: any) => row.name },
                                    { id: 'system', label: 'System', render: (row: any) => row.systemPublicId },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Privacy, transfers, assessments, evidence</Typography>
                            <Typography>Privacy activities: {(data.privacyActivities || []).map((row: any) => row.publicId).join(', ') || 'Unknown / Not recorded'}</Typography>
                            <AppTable
                                rows={data.transfers || []}
                                rowKey={(row: any) => row.publicId || `${row.destination}-${row.mechanism}`}
                                emptyTitle="No transfers"
                                emptyBody="Unknown / Not recorded."
                                columns={[
                                    { id: 'dest', label: 'Destination', render: (row: any) => row.destination },
                                    { id: 'mech', label: 'Mechanism', render: (row: any) => humanizeLabel(row.mechanism) },
                                ]}
                            />
                            <AppTable
                                rows={data.assessments || []}
                                rowKey={(row: any) => row.id}
                                emptyTitle="No vendor assessments"
                                emptyBody="Unknown / Not recorded."
                                columns={[
                                    { id: 'type', label: 'Assessment', render: (row: any) => humanizeLabel(row.type) },
                                    { id: 'status', label: 'Status', render: (row: any) => humanizeLabel(row.status) },
                                ]}
                            />
                            <AppTable
                                rows={data.evidence || []}
                                rowKey={(row: any) => row.id || row.filename}
                                emptyTitle="No CLEAN evidence"
                                emptyBody="Only CLEAN evidence is supporting evidence."
                                columns={[
                                    { id: 'file', label: 'Evidence', render: (row: any) => row.filename },
                                    { id: 'fresh', label: 'Freshness', render: (row: any) => humanizeLabel(row.freshness) },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">AI incidents and regulatory reviews</Typography>
                            <AppTable
                                rows={data.incidents || []}
                                rowKey={(row: any) => row.publicId}
                                emptyTitle="No incidents"
                                emptyBody="No invented incident feed."
                                columns={[
                                    { id: 'id', label: 'Incident', render: (row: any) => row.publicId },
                                    { id: 'title', label: 'Title', render: (row: any) => row.title },
                                    { id: 'status', label: 'Status', render: (row: any) => humanizeLabel(row.status) },
                                ]}
                            />
                            <AppTable
                                rows={data.regulatoryReviews || []}
                                rowKey={(row: any) => row.publicId}
                                emptyTitle="No regulatory reviews"
                                emptyBody="Potential applicability. Review required."
                                columns={[
                                    { id: 'id', label: 'Review', render: (row: any) => row.publicId },
                                    { id: 'regime', label: 'Regime', render: (row: any) => row.regime },
                                    { id: 'status', label: 'Status', render: (row: any) => humanizeLabel(row.status) },
                                ]}
                            />
                        </Surface>
                    </Stack>
                </>
            )}
        </QueryState>
    );
}
