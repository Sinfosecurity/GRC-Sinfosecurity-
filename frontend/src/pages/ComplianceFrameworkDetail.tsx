import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { complianceAPI } from '../services/api';

const SECTIONS = ['Overview', 'Requirements', 'Controls', 'Evidence', 'Gaps', 'Attestations', 'Exceptions', 'Audit periods', 'Relationships', 'History'] as const;

export default function ComplianceFrameworkDetail() {
    const { publicId } = useParams();
    const navigate = useNavigate();
    const [section, setSection] = useState<(typeof SECTIONS)[number]>('Overview');
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [campaignName, setCampaignName] = useState('Quarterly control attestation');
    const [periodName, setPeriodName] = useState('FY2026 readiness');

    const load = () => {
        if (!publicId) return;
        setLoading(true);
        complianceAPI.activation(publicId)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load framework program'))
            .finally(() => setLoading(false));
    };

    useEffect(load, [publicId]);

    const createCampaign = (event: FormEvent) => {
        event.preventDefault();
        complianceAPI.createCampaign({ name: campaignName, activationId: publicId }).then((res) => navigate(`/compliance/campaigns/${res.data.data.publicId}`)).catch((err) => setError(err.message));
    };
    const createPeriod = (event: FormEvent) => {
        event.preventDefault();
        complianceAPI.createPeriod({ name: periodName, activationId: publicId, startAt: new Date().toISOString() }).then((res) => navigate(`/compliance/audits/${res.data.data.publicId}`)).catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader
                crumbs={data?.crumbs?.map((crumb: { label: string; href?: string }) => ({ label: crumb.label, to: crumb.href })) || [{ label: 'Compliance' }, { label: 'Frameworks', to: '/compliance/frameworks' }]}
                title={data ? `${data.name} ${data.version}` : 'Framework program'}
                description={data?.remainingWork?.message || 'Live readiness from this tenant. Not certified or compliant.'}
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Program not found" emptyBody="Return to the catalog and activate a framework version.">
                {data && (
                    <Stack spacing={2}>
                        <Alert severity="info">{data.honesty}</Alert>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {SECTIONS.map((item) => (
                                <Button key={item} variant={section === item ? 'contained' : 'outlined'} onClick={() => setSection(item)}>{item}</Button>
                            ))}
                        </Stack>
                        {section === 'Overview' && (
                            <Surface>
                                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                    <StatusBadge tone="neutral" label={data.status} />
                                    <StatusBadge tone="neutral" label={data.versionStatus === 'SUPERSEDED' ? 'Superseded version' : 'Current pack'} />
                                </Stack>
                                <Typography>Publisher: {data.publisher}</Typography>
                                <Typography>Owner: {data.owner}</Typography>
                                <Typography>Scope: {data.scope || 'Organization'}</Typography>
                                {data.readiness.calculable ? (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography>Requirement coverage {data.readiness.metrics.requirementCoverage.display} ({data.readiness.metrics.requirementCoverage.numerator}/{data.readiness.metrics.requirementCoverage.denominator})</Typography>
                                        <Typography>Implemented {data.readiness.metrics.implementationCoverage.display}</Typography>
                                        <Typography>Tested {data.readiness.metrics.testingCoverage.display}</Typography>
                                        <Typography>Evidence available {data.readiness.metrics.evidenceCoverage.display}</Typography>
                                        {data.readiness.metrics.testingCoverage.emptyReason && (
                                            <Typography color="text.secondary">{data.readiness.metrics.testingCoverage.emptyReason}</Typography>
                                        )}
                                        <Typography color="text.secondary" sx={{ mt: 1 }}>{data.readiness.metrics.requirementCoverage.formula}</Typography>
                                    </Box>
                                ) : (
                                    <Typography sx={{ mt: 2 }}>{data.readiness.emptyReason}</Typography>
                                )}
                                {data.existingReuse && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography fontWeight={700}>Already reusable from common controls</Typography>
                                        <Typography color="text.secondary">{data.existingReuse.message}</Typography>
                                    </Box>
                                )}
                                <Typography color="text.secondary" sx={{ mt: 1 }}>Program {data.publicId}</Typography>
                                <Button sx={{ mt: 2 }} onClick={() => complianceAPI.refreshGaps(publicId!).then(load)}>Refresh gaps from live records</Button>
                            </Surface>
                        )}
                        {section === 'Requirements' && (
                            <Surface>
                                <AppTable
                                    rows={data.requirements}
                                    rowKey={(row: any) => row.publicId}
                                    onRowClick={(row: any) => navigate(`/compliance/requirements/${row.publicId}`)}
                                    columns={[
                                        { id: 'requirementKey', label: 'Requirement', render: (row: any) => row.requirementKey },
                                        { id: 'applicability', label: 'Applicability', render: (row: any) => row.applicability },
                                        { id: 'implementation', label: 'Controls', render: (row: any) => row.implementation },
                                        { id: 'latestTest', label: 'Latest test', hideOnMobile: true, render: (row: any) => row.latestTest },
                                        { id: 'owner', label: 'Owner', render: (row: any) => row.owner },
                                    ]}
                                />
                            </Surface>
                        )}
                        {['Controls', 'Evidence', 'Relationships'].includes(section) && (
                            <Surface>
                                <Typography color="text.secondary">Open a requirement to see mapped controls, CLEAN evidence, and related risks. Cross-framework mappings use stored strengths only.</Typography>
                                <Button sx={{ mt: 1 }} onClick={() => navigate('/control-center')}>Open Control Center</Button>
                            </Surface>
                        )}
                        {section === 'Gaps' && (
                            <Surface>
                                <AppTable
                                    rows={data.gaps}
                                    rowKey={(row: any) => row.publicId}
                                    onRowClick={() => navigate('/compliance/gaps')}
                                    columns={[
                                        { id: 'publicId', label: 'Gap', render: (row: any) => row.publicId },
                                        { id: 'title', label: 'What is missing', render: (row: any) => row.title },
                                        { id: 'source', label: 'Source', render: (row: any) => row.source },
                                        { id: 'status', label: 'Status', render: (row: any) => row.status },
                                    ]}
                                />
                            </Surface>
                        )}
                        {section === 'Attestations' && (
                            <Surface>
                                <Stack component="form" onSubmit={createCampaign} direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
                                    <TextField label="Campaign name" value={campaignName} onChange={(event) => setCampaignName(event.target.value)} />
                                    <Button type="submit" variant="contained">Create campaign</Button>
                                </Stack>
                                {data.campaigns.map((row: any) => (
                                    <Typography key={row.publicId} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/compliance/campaigns/${row.publicId}`)}>{row.publicId} · {row.name} · {row.status}</Typography>
                                ))}
                            </Surface>
                        )}
                        {section === 'Exceptions' && (
                            <Surface>
                                {data.exceptions.map((row: any) => <Typography key={row.publicId}>{row.publicId} · {row.scope} · {row.status}</Typography>)}
                                <Button sx={{ mt: 1 }} onClick={() => navigate('/compliance/exceptions')}>Open exceptions</Button>
                            </Surface>
                        )}
                        {section === 'Audit periods' && (
                            <Surface>
                                <Stack component="form" onSubmit={createPeriod} direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
                                    <TextField label="Period name" value={periodName} onChange={(event) => setPeriodName(event.target.value)} />
                                    <Button type="submit" variant="contained">Create period</Button>
                                </Stack>
                                {data.periods.map((row: any) => (
                                    <Typography key={row.publicId} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/compliance/audits/${row.publicId}`)}>{row.publicId} · {row.name} · {row.status}</Typography>
                                ))}
                            </Surface>
                        )}
                        {section === 'History' && (
                            <Surface>
                                {data.history.map((row: any, index: number) => (
                                    <Box key={`${row.title}-${index}`} sx={{ mb: 1 }}>
                                        <Typography fontWeight={600}>{row.title}{row.change ? ` · ${row.change}` : ''}</Typography>
                                        <Typography color="text.secondary">{row.summary}</Typography>
                                    </Box>
                                ))}
                            </Surface>
                        )}
                    </Stack>
                )}
            </QueryState>
        </>
    );
}
