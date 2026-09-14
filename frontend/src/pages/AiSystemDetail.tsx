import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import { aiGovernanceAPI } from '../services/api';

export default function AiSystemDetail() {
    const { publicId = '' } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [affected, setAffected] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [useCaseName, setUseCaseName] = useState('');
    const [providerName, setProviderName] = useState('');

    const load = () => {
        Promise.all([aiGovernanceAPI.system(publicId), aiGovernanceAPI.affected(publicId)])
            .then(([system, impact]) => {
                setData(system.data.data);
                setAffected(impact.data.data);
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
        aiGovernanceAPI.createProvider({ providerName })
            .then((res) => aiGovernanceAPI.attachProvider(publicId, res.data.data.publicId))
            .then(load)
            .catch((err) => setError(err.message));
    };

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
                            <Typography>Lifecycle: {data.lifecycle}</Typography>
                            <Typography>Organization class: {data.organizationClass}</Typography>
                            <Typography>Residual rating: {data.residualRating || 'Not scored'}</Typography>
                            <Typography>Personal data: {data.personalData ? 'Recorded' : 'Not recorded'}</Typography>
                            <Typography>Autonomy: {data.autonomy}</Typography>
                            <Typography>Monitoring: {data.monitoring.status}</Typography>
                        </Surface>
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
                            <Typography variant="h6">Models / providers</Typography>
                            <Stack component="form" onSubmit={addProvider} direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ my: 1.5 }}>
                                <TextField label="Provider name" value={providerName} onChange={(event) => setProviderName(event.target.value)} required />
                                <Button type="submit">Record provider</Button>
                            </Stack>
                            <AppTable
                                rows={data.models.map((row: any) => row.provider)}
                                rowKey={(row: any) => row.publicId}
                                emptyTitle="No provider recorded"
                                emptyBody="Unknown / Not recorded until a person enters facts. Nothing is scraped."
                                columns={[
                                    { id: 'id', label: 'Provider', render: (row: any) => row.publicId },
                                    { id: 'name', label: 'Name', render: (row: any) => row.providerName },
                                    { id: 'status', label: 'Availability', render: (row: any) => row.availabilityStatus },
                                ]}
                            />
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
                            <Typography>Latest score: {data.latestScore ? `${data.latestScore.score} ${data.latestScore.rating} (${data.latestScore.methodologyVersion})` : 'Not scored'}</Typography>
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
                                    { id: 'kind', label: 'Type', render: (row: any) => row.kind },
                                    { id: 'result', label: 'Result', render: (row: any) => row.result },
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
                                    { id: 'decision', label: 'Decision', render: (row: any) => row.decision },
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
                                    { id: 'status', label: 'Status', render: (row: any) => row.status },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">What is affected?</Typography>
                            <Typography sx={{ mb: 1 }}>{affected?.reviewQuestion}</Typography>
                            <Typography>Use cases: {(affected?.useCases || []).map((row: any) => row.publicId).join(', ') || 'None recorded'}</Typography>
                            <Typography>Privacy activities: {(affected?.privacyActivities || []).map((row: any) => row.publicId).join(', ') || 'None recorded'}</Typography>
                            <Typography>Enterprise risks: {(affected?.enterpriseRisks || []).map((row: any) => row.publicId).join(', ') || 'None recorded'}</Typography>
                            <Typography>Controls: {(affected?.controls || []).map((row: any) => row.title).join(', ') || 'None recorded'}</Typography>
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
                                    { id: 'type', label: 'Type', render: (row: any) => row.changeType },
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
