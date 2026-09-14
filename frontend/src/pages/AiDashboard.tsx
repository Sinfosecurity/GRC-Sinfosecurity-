import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import MetricCard from '../components/design/MetricCard';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import { aiGovernanceAPI } from '../services/api';
import { downloadBinaryResponse } from '../services/download';

export default function AiDashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        aiGovernanceAPI.dashboard()
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load Supreme AI Governance'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Box>
            <PageHeader
                crumbs={[{ label: 'AI Governance' }, { label: 'Overview' }]}
                title="Supreme AI Governance"
                description="Inventory the AI. Understand the use. Govern the risk. Preserve human authority."
                actions={(
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button variant="contained" onClick={() => navigate('/ai-governance/systems')}>AI register</Button>
                        <Button onClick={() => navigate('/ai-governance/assessments')}>Assessments</Button>
                        <Button onClick={() => navigate('/ai-governance/testing')}>Testing</Button>
                        <Button onClick={() => navigate('/ai-governance/approvals')}>Approvals</Button>
                        <Button onClick={() => navigate('/ai-governance/incidents')}>Incidents</Button>
                        <Button onClick={() => navigate('/ai-governance/controls')}>AI controls</Button>
                        <Button onClick={() => navigate('/ai-governance/readiness/nist-ai-rmf')}>NIST AI RMF</Button>
                        <Button onClick={() => navigate('/ai-governance/readiness/iso-42001')}>ISO 42001</Button>
                        <Button onClick={() => navigate('/ai-governance/import')}>Import</Button>
                        <Button onClick={() => aiGovernanceAPI.downloadReport('executive').then((res) => downloadBinaryResponse(res, 'Supreme-AI-executive.pdf'))}>Executive PDF</Button>
                        <Button onClick={() => aiGovernanceAPI.downloadBoardPptx().then((res) => downloadBinaryResponse(res, 'Supreme-AI-Board.pptx'))}>Board PPTX</Button>
                    </Stack>
                )}
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="AI governance" emptyBody="Record an AI system to start. Nothing is invented.">
                {data && (
                    <Stack spacing={2.5}>
                        <Alert severity="info">{data.honesty}</Alert>
                        <Alert severity="warning">Monitoring: {data.monitoring}</Alert>
                        <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={1.5}>
                            <MetricCard label="Active AI systems" value={data.totals.activeSystems} onClick={() => navigate('/ai-governance/systems')} />
                            <MetricCard label="Production" value={data.totals.productionSystems} />
                            <MetricCard label="High-risk uses" value={data.totals.highRiskUses} />
                            <MetricCard label="Awaiting approval" value={data.totals.awaitingApproval} />
                            <MetricCard label="Open incidents" value={data.totals.incidentsOpen} onClick={() => navigate('/ai-governance/incidents')} />
                            <MetricCard label="Using personal data" value={data.totals.personalData} />
                            <MetricCard label="Without owners" value={data.totals.withoutOwners} />
                            <MetricCard label="External vendors" value={data.totals.externalVendors} />
                        </Box>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>Needs attention</Typography>
                            <AppTable
                                rows={data.attention}
                                rowKey={(row: any) => `${row.publicId}-${row.type}`}
                                emptyTitle="Nothing needs attention"
                                emptyBody="No fake alerts. Attention comes from live records only."
                                onRowClick={(row: any) => navigate(row.href)}
                                columns={[
                                    { id: 'type', label: 'Needs attention', render: (row: any) => row.type },
                                    { id: 'why', label: 'Why', render: (row: any) => row.why },
                                    { id: 'id', label: 'Record', render: (row: any) => row.publicId },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>What changed</Typography>
                            <AppTable
                                rows={data.changed || []}
                                rowKey={(row: any) => `${row.title}-${row.createdAt}`}
                                emptyTitle="No recorded changes"
                                emptyBody="No synthetic change feed."
                                columns={[
                                    { id: 'title', label: 'Change', render: (row: any) => row.title },
                                    { id: 'change', label: 'Detail', render: (row: any) => row.change || 'Recorded' },
                                ]}
                            />
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </Box>
    );
}
