import { FormEvent, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import { aiGovernanceAPI, vendorAPI } from '../services/api';
import { formatShortDate, humanizeLabel } from '../utils/humanizeLabel';

export default function AiSystemDetail() {
    const { publicId = '' } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [affected, setAffected] = useState<any>(null);
    const [vendors, setVendors] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [useCaseName, setUseCaseName] = useState('');
    const [providerName, setProviderName] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [nonVendorProvider, setNonVendorProvider] = useState(false);
    const [newVersion, setNewVersion] = useState('');
    const [changeReason, setChangeReason] = useState('');

    const load = () => {
        Promise.all([
            aiGovernanceAPI.system(publicId),
            aiGovernanceAPI.affected(publicId),
            vendorAPI.getAll().catch(() => ({ data: { data: [] } })),
        ])
            .then(([system, impact, vendorList]) => {
                setData(system.data.data);
                setAffected(impact.data.data);
                const rows = vendorList.data?.vendors || vendorList.data?.data || [];
                setVendors(Array.isArray(rows) ? rows : []);
            })
            .catch((err) => setError(err.message || 'Unable to load AI system'));
    };

    useEffect(load, [publicId]);

    const addUseCase = (event: FormEvent) => {
        event.preventDefault();
        aiGovernanceAPI.addUseCase(publicId, { name: useCaseName }).then(load).catch((err) => setError(err.message));
    };

    const addProvider = (event: FormEvent) => {
        event.preventDefault();
        if (!vendorId && !nonVendorProvider) {
            setError('Link an existing third-party vendor, or confirm this provider is not a vendor.');
            return;
        }
        aiGovernanceAPI.createProvider({ providerName, vendorId: vendorId || undefined, modelVersion: newVersion || undefined })
            .then((res) => aiGovernanceAPI.attachProvider(publicId, res.data.data.publicId, { modelVersion: newVersion || undefined, changeReason: changeReason || 'Provider recorded' }))
            .then(load)
            .catch((err) => setError(err.message));
    };

    const changeVersion = (event: FormEvent) => {
        event.preventDefault();
        aiGovernanceAPI.changeVersion(publicId, { modelVersion: newVersion, changeReason }).then(load).catch((err) => setError(err.message));
    };

    const currentProvider = data?.currentModel;

    return (
        <QueryState loading={!data && !error} error={error} empty={!data} emptyTitle="AI system" emptyBody="This system was not found.">
            {data && (
                <>
                    <PageHeader
                        crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: 'Register', to: '/ai-governance/systems' }, { label: data.publicId }]}
                        title={`${data.publicId}  ${data.name}`}
                        description="Should we continue using this AI? Human approval is required. Monitoring is manual unless a real source is configured."
                    />
                    <Stack spacing={2.5}>
                        <Alert severity="info">{data.honesty}</Alert>
                        <Surface>
                            <Typography variant="h6">Overview</Typography>
                            <Typography>Lifecycle: {humanizeLabel(data.lifecycle)}</Typography>
                            <Typography>Organization class: {humanizeLabel(data.organizationClass)}</Typography>
                            <Typography>Residual rating: {humanizeLabel(data.residualRating) || 'Not scored'}</Typography>
                            <Typography>Personal data: {data.personalData ? 'Recorded' : 'Not recorded'}</Typography>
                            <Typography>Autonomy: {humanizeLabel(data.autonomy)}</Typography>
                            <Typography>Monitoring: {data.monitoring.status}</Typography>
                        </Surface>
                        {data.changeReview && (
                            <Surface>
                                <Alert severity="warning" sx={{ mb: 1.5 }}>Review required before this AI continues. No automatic approval.</Alert>
                                <Typography variant="h6">What changed</Typography>
                                <Typography>{data.changeReview.whatChanged}</Typography>
                                <Typography>Prior version: {data.changeReview.priorVersion}</Typography>
                                <Typography>New version: {data.changeReview.newVersion}</Typography>
                                <Typography>Change reason: {data.changeReview.changeReason}</Typography>
                            </Surface>
                        )}
                        <Surface>
                            <Typography variant="h6">Use cases</Typography>
                            <Stack component="form" onSubmit={addUseCase} direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ my: 1.5 }}>
                                <TextField label="New use case" value={useCaseName} onChange={(event) => setUseCaseName(event.target.value)} required />
                                <Button type="submit" variant="contained">Add use case</Button>
                            </Stack>
                            <AppTable
                                rows={data.useCases}
                                rowKey={(row: any) => row.publicId}
                                onRowClick={(row: any) => navigate(`/ai-governance/use-cases/${row.publicId}`)}
                                emptyTitle="No use cases"
                                emptyBody="Governance is per use, not only per model."
                                columns={[
                                    { id: 'id', label: 'Use case', render: (row: any) => row.publicId },
                                    { id: 'name', label: 'Name', render: (row: any) => row.name },
                                    { id: 'purpose', label: 'Purpose', render: (row: any) => row.purpose || 'Not recorded' },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Provider / model version</Typography>
                            <Typography sx={{ my: 1 }}>Current: {currentProvider ? `${currentProvider.providerPublicId} ${currentProvider.providerName} · ${currentProvider.modelVersion}` : 'Unknown / Not recorded'}</Typography>
                            <Typography>Effective: {currentProvider ? formatShortDate(currentProvider.effectiveFrom) : 'Not recorded'}</Typography>
                            <Typography>Prior version: {data.priorModel?.modelVersion || 'Not recorded'}</Typography>
                            <Stack component="form" onSubmit={addProvider} direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ my: 1.5 }} flexWrap="wrap" useFlexGap>
                                <TextField label="Provider name" value={providerName} onChange={(event) => setProviderName(event.target.value)} required />
                                <TextField select label="Existing vendor" value={vendorId} onChange={(event) => setVendorId(event.target.value)} SelectProps={{ native: true }} sx={{ minWidth: 220 }}>
                                    <option value="">Select vendor</option>
                                    {vendors.map((vendor: any) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                                </TextField>
                                <Button type="button" onClick={() => setNonVendorProvider((value) => !value)}>
                                    {nonVendorProvider ? 'Non-vendor provider confirmed' : 'This is not an existing vendor'}
                                </Button>
                                <Button type="submit">Record provider</Button>
                            </Stack>
                            <Stack component="form" onSubmit={changeVersion} direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
                                <TextField label="New model / provider version" value={newVersion} onChange={(event) => setNewVersion(event.target.value)} required />
                                <TextField label="Change reason" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} required />
                                <Button type="submit" variant="contained">Record version change</Button>
                            </Stack>
                            <AppTable
                                rows={data.models.map((row: any) => row.provider)}
                                rowKey={(row: any) => row.publicId}
                                onRowClick={(row: any) => navigate(`/ai-governance/providers/${row.publicId}`)}
                                emptyTitle="No provider recorded"
                                emptyBody="Unknown / Not recorded until a person enters facts. Nothing is scraped."
                                columns={[
                                    { id: 'id', label: 'Provider', render: (row: any) => row.publicId },
                                    { id: 'name', label: 'Name', render: (row: any) => row.providerName },
                                    { id: 'version', label: 'Version', render: (row: any) => row.modelVersion || 'Not recorded' },
                                    { id: 'status', label: 'Availability', render: (row: any) => row.availabilityStatus },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Model history</Typography>
                            <AppTable
                                rows={data.modelVersions || []}
                                rowKey={(row: any) => row.id}
                                emptyTitle="No version history"
                                emptyBody="Historical assessments stay tied to the version in use at the time."
                                columns={[
                                    { id: 'provider', label: 'Provider', render: (row: any) => row.providerPublicId },
                                    { id: 'version', label: 'Version', render: (row: any) => row.modelVersion },
                                    { id: 'prior', label: 'Prior', render: (row: any) => row.priorVersion },
                                    { id: 'status', label: 'State', render: (row: any) => humanizeLabel(row.status) },
                                    { id: 'from', label: 'Effective', render: (row: any) => formatShortDate(row.effectiveFrom) },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Third party vendor</Typography>
                            {(data.vendors || []).length ? (data.vendors || []).map((vendor: any) => (
                                <Stack key={vendor.id} spacing={1} sx={{ mt: 1.5 }}>
                                    <Typography>{vendor.name} · Residual risk {vendor.residualRiskScore}</Typography>
                                    <Typography>Privacy role: {humanizeLabel(vendor.privacyRole)}</Typography>
                                    <Typography>Data handling: {vendor.dataHandling}</Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        <Button component={RouterLink} to="/vendor-management">Open vendor</Button>
                                        {currentProvider && <Button component={RouterLink} to={`/ai-governance/providers/${currentProvider.providerPublicId}`}>Open provider</Button>}
                                    </Stack>
                                    <AppTable
                                        rows={vendor.assessments || []}
                                        rowKey={(row: any) => row.id}
                                        emptyTitle="No vendor assessments"
                                        emptyBody="No invented vendor assessment."
                                        columns={[
                                            { id: 'type', label: 'Assessment', render: (row: any) => humanizeLabel(row.type) },
                                            { id: 'status', label: 'Status', render: (row: any) => humanizeLabel(row.status) },
                                        ]}
                                    />
                                    <AppTable
                                        rows={vendor.findings || []}
                                        rowKey={(row: any) => row.id}
                                        emptyTitle="No vendor findings"
                                        emptyBody="No invented findings."
                                        columns={[
                                            { id: 'title', label: 'Finding', render: (row: any) => row.title },
                                            { id: 'status', label: 'Status', render: (row: any) => humanizeLabel(row.status) },
                                        ]}
                                    />
                                    <AppTable
                                        rows={vendor.evidence || []}
                                        rowKey={(row: any) => `${row.filename}-${row.scanStatus}`}
                                        emptyTitle="No vendor evidence"
                                        emptyBody="Unknown / Not recorded."
                                        columns={[
                                            { id: 'file', label: 'Evidence', render: (row: any) => row.filename },
                                            { id: 'scan', label: 'Scan', render: (row: any) => row.scanStatus },
                                        ]}
                                    />
                                </Stack>
                            )) : <Typography sx={{ mt: 1 }}>Unknown / Not recorded. Link an existing vendor. Do not create a second vendor record.</Typography>}
                        </Surface>
                        <Surface>
                            <Typography variant="h6">AI controls and CLEAN evidence</Typography>
                            <Typography sx={{ my: 1 }}>Only CLEAN evidence counts as supporting evidence. Presence does not imply effectiveness.</Typography>
                            <Button sx={{ mb: 1.5 }} onClick={() => navigate('/ai-governance/controls')}>Open AI controls</Button>
                            <AppTable
                                rows={data.controlWorkspace || []}
                                rowKey={(row: any) => row.id}
                                emptyTitle="No linked controls"
                                emptyBody="Link an existing common control. Do not duplicate one that already exists."
                                columns={[
                                    { id: 'key', label: 'Control', render: (row: any) => row.controlKey },
                                    { id: 'impl', label: 'Implementation', render: (row: any) => humanizeLabel(row.implementationStatus) },
                                    { id: 'eff', label: 'Effectiveness', render: (row: any) => humanizeLabel(row.effectivenessStatus) },
                                    { id: 'test', label: 'Latest test', render: (row: any) => humanizeLabel(row.latestTest?.result) },
                                    { id: 'ev', label: 'CLEAN evidence', render: (row: any) => (row.cleanEvidence || []).map((item: any) => item.filename).join(', ') || 'None' },
                                    { id: 'fresh', label: 'Freshness', render: (row: any) => humanizeLabel(String(row.evidenceFreshness)) },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Compliance integration</Typography>
                            <Alert severity="info" sx={{ my: 1.5 }}>Readiness and mapping only. Not certified and not a legal determination.</Alert>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                                <Button onClick={() => navigate('/ai-governance/readiness/nist-ai-rmf')}>NIST AI RMF readiness</Button>
                                <Button onClick={() => navigate('/ai-governance/readiness/iso-42001')}>ISO/IEC 42001 readiness</Button>
                                <Button onClick={() => navigate('/compliance')}>Supreme Compliance</Button>
                            </Stack>
                            <Typography>NIST AI RMF mapped: {data.compliance?.nistAiRmf?.coverage?.mapped ?? 0} / {data.compliance?.nistAiRmf?.coverage?.requirementCount ?? 0}</Typography>
                            <Typography>ISO/IEC 42001 mapped: {data.compliance?.iso42001?.coverage?.mapped ?? 0} / {data.compliance?.iso42001?.coverage?.requirementCount ?? 0}</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Human oversight</Typography>
                            <Typography>Human review required: {data.oversight?.humanReviewRequired ? 'Yes' : 'Not recorded as required'}</Typography>
                            <Typography>Human can override: {data.oversight?.humanCanOverride ? 'Yes' : 'Not recorded'}</Typography>
                            <Typography>Human can stop: {data.oversight?.humanCanStop ? 'Yes' : 'Not recorded'}</Typography>
                            <Typography>Oversight owner: {data.oversight?.oversightOwner || 'Not recorded'}</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Risk and scoring</Typography>
                            <Typography>Latest score: {data.latestScore ? `${data.latestScore.score} ${humanizeLabel(data.latestScore.rating)} (${data.latestScore.methodologyVersion})` : 'Not scored'}</Typography>
                            <Typography sx={{ mb: 1 }}>{data.latestScore?.calculation || 'No calculation is invented.'}</Typography>
                            <AppTable
                                rows={data.risks}
                                rowKey={(row: any) => row.publicId}
                                emptyTitle="No selected AI risks"
                                emptyBody="Risks apply only when recorded. Nothing is assumed."
                                columns={[
                                    { id: 'id', label: 'Risk', render: (row: any) => row.publicId },
                                    { id: 'category', label: 'Category', render: (row: any) => row.category },
                                    { id: 'applies', label: 'Applies', render: (row: any) => row.applies ? 'Recorded as applying' : 'Recorded as not applying' },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Testing</Typography>
                            <AppTable
                                rows={data.tests}
                                rowKey={(row: any) => row.publicId}
                                emptyTitle="Not tested"
                                emptyBody="Supreme does not invent accuracy, bias, or drift results."
                                columns={[
                                    { id: 'id', label: 'Test', render: (row: any) => row.publicId },
                                    { id: 'kind', label: 'Type', render: (row: any) => humanizeLabel(row.kind) },
                                    { id: 'result', label: 'Result', render: (row: any) => humanizeLabel(row.result) },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Approvals and incidents</Typography>
                            <AppTable
                                rows={data.approvals}
                                rowKey={(row: any) => row.publicId}
                                emptyTitle="No human approval"
                                emptyBody="A recorded system is not approved."
                                columns={[
                                    { id: 'id', label: 'Approval', render: (row: any) => row.publicId },
                                    { id: 'decision', label: 'Decision', render: (row: any) => humanizeLabel(row.decision) },
                                    { id: 'maker', label: 'Decision maker', render: (row: any) => row.decisionMaker },
                                ]}
                            />
                            <AppTable
                                rows={data.incidents}
                                rowKey={(row: any) => row.publicId}
                                emptyTitle="No incidents"
                                emptyBody="No invented incident feed."
                                columns={[
                                    { id: 'id', label: 'Incident', render: (row: any) => row.publicId },
                                    { id: 'title', label: 'Title', render: (row: any) => row.title },
                                    { id: 'status', label: 'Status', render: (row: any) => humanizeLabel(row.status) },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">What is affected?</Typography>
                            <Typography sx={{ mb: 1 }}>{affected?.reviewQuestion}</Typography>
                            <Typography>{affected?.humanDecision}</Typography>
                            <Typography>Use cases: {(affected?.useCases || []).map((row: any) => `${row.publicId} ${row.name}`).join(', ') || 'None recorded'}</Typography>
                            <Typography>Privacy activities: {(affected?.privacyActivities || []).map((row: any) => row.publicId).join(', ') || 'None recorded'}</Typography>
                            <Typography>Enterprise risks: {(affected?.enterpriseRisks || []).map((row: any) => row.publicId).join(', ') || 'None recorded'}</Typography>
                            <Typography>Controls: {(affected?.controls || []).map((row: any) => row.controlKey || row.title).join(', ') || 'None recorded'}</Typography>
                            <Typography>Vendors: {(affected?.vendors || []).map((row: any) => row.name).join(', ') || 'None recorded'}</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">History</Typography>
                            <AppTable
                                rows={data.changes}
                                rowKey={(row: any) => row.publicId}
                                emptyTitle="No recorded changes"
                                emptyBody="No synthetic change feed."
                                columns={[
                                    { id: 'id', label: 'Change', render: (row: any) => row.publicId },
                                    { id: 'type', label: 'Type', render: (row: any) => humanizeLabel(row.changeType) },
                                    { id: 'summary', label: 'Summary', render: (row: any) => row.summary },
                                ]}
                            />
                        </Surface>
                    </Stack>
                </>
            )}
        </QueryState>
    );
}
