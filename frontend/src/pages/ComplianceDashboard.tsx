import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import MetricCard from '../components/design/MetricCard';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { complianceAPI } from '../services/api';
import { downloadBinaryResponse } from '../services/download';

type Dashboard = {
    honesty: string;
    totals: { activeFrameworks: number; openGaps: number; overdueAttestations: number; expiredExceptions: number; openPeriods: number };
    frameworks: Array<{
        publicId: string;
        name: string;
        version: string;
        status: string;
        calculable: boolean;
        emptyReason: string | null;
        metrics: Record<string, { percent: number | null; numerator: number; denominator: number; display?: string; emptyReason?: string | null }>;
        remainingWork?: { message: string | null };
    }>;
    gaps: Array<{ publicId: string; title: string; source: string; status: string }>;
    exceptions: Array<{ publicId: string; scope: string; type: string; status: string }>;
    campaigns: Array<{ publicId: string; name: string; status: string }>;
    attention: Array<{
        type: string;
        why: string;
        framework: string | null;
        related: string | null;
        owner: string | null;
        dueAt: string | null;
        ageDays?: number | null;
        severity: string | null;
        href: string;
        publicId: string;
    }>;
    changed: Array<{ title: string; change: string | null; summary: string; actor: string; createdAt: string }>;
};

function coverage(metric?: { display?: string; percent?: number | null; emptyReason?: string | null }) {
    if (!metric) return 'Not calculated';
    if (metric.display) return metric.display;
    if (metric.percent == null) return metric.emptyReason || 'Not calculated';
    return `${metric.percent}%`;
}

export default function ComplianceDashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState<Dashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        complianceAPI.dashboard()
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load Supreme Compliance'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Box>
            <PageHeader
                crumbs={[{ label: 'Compliance' }, { label: 'Overview' }]}
                title="Supreme Compliance"
                description="Evidence once. Control once. Map everywhere. Readiness is not certification."
                actions={(
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button variant="contained" onClick={() => navigate('/compliance/frameworks')}>Frameworks</Button>
                        <Button onClick={() => navigate('/compliance/gaps')}>Gaps</Button>
                        <Button onClick={() => navigate('/compliance/exceptions')}>Exceptions</Button>
                        <Button onClick={() => complianceAPI.downloadReport('executive').then((res) => downloadBinaryResponse(res, 'Supreme-Compliance-executive.pdf'))}>Executive PDF</Button>
                        <Button onClick={() => complianceAPI.downloadBoardPptx().then((res) => downloadBinaryResponse(res, 'Supreme-Compliance-Board.pptx'))}>Board PPTX</Button>
                    </Stack>
                )}
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Compliance program" emptyBody="Activate a framework to start a real program. Nothing is auto-activated.">
                {data && (
                    <Stack spacing={2.5}>
                        <Alert severity="info">{data.honesty}</Alert>
                        <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={1.5}>
                            <MetricCard label="Active frameworks" value={data.totals.activeFrameworks} onClick={() => navigate('/compliance/frameworks')} />
                            <MetricCard label="Open gaps" value={data.totals.openGaps} onClick={() => navigate('/compliance/gaps')} />
                            <MetricCard label="Overdue attestations" value={data.totals.overdueAttestations} />
                            <MetricCard label="Expired exceptions" value={data.totals.expiredExceptions} onClick={() => navigate('/compliance/exceptions')} />
                        </Box>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>Needs attention</Typography>
                            {!data.attention.length && <Typography color="text.secondary">No attention items from live records.</Typography>}
                            <Stack spacing={1.5}>
                                {data.attention.map((row) => (
                                    <Box key={`${row.type}-${row.publicId}`} sx={{ cursor: 'pointer' }} onClick={() => navigate(row.href)}>
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                            <Typography fontWeight={700}>{row.type}</Typography>
                                            {row.severity && <StatusBadge tone={row.severity === 'Critical' || row.severity === 'High' ? 'critical' : 'medium'} label={row.severity} />}
                                        </Stack>
                                        <Typography>{row.why}</Typography>
                                        <Typography color="text.secondary">
                                            {[row.framework, row.related, row.owner, row.dueAt ? new Date(row.dueAt).toLocaleDateString() : null, row.ageDays != null ? `${row.ageDays}d` : null].filter(Boolean).join(' · ')}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>Readiness / coverage</Typography>
                            {!data.frameworks.length && <Typography color="text.secondary">No framework is activated. Activation is opt-in.</Typography>}
                            {data.frameworks.map((row) => (
                                <Box key={row.publicId} sx={{ mb: 2, cursor: 'pointer' }} onClick={() => navigate(`/compliance/frameworks/${row.publicId}`)}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                        <Typography fontWeight={700}>{row.name} {row.version}</Typography>
                                        <StatusBadge tone="neutral" label={row.status} />
                                    </Stack>
                                    {row.calculable ? (
                                        <Typography color="text.secondary">
                                            Requirement coverage {coverage(row.metrics.requirementCoverage)} · Implemented {coverage(row.metrics.implementationCoverage)} · Tested {coverage(row.metrics.testingCoverage)} · Evidence {coverage(row.metrics.evidenceCoverage)}
                                        </Typography>
                                    ) : (
                                        <Typography color="text.secondary">{row.emptyReason}</Typography>
                                    )}
                                </Box>
                            ))}
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>What changed</Typography>
                            {!data.changed.length && <Typography color="text.secondary">No compliance events yet.</Typography>}
                            {data.changed.map((row, index) => (
                                <Box key={`${row.title}-${index}`} sx={{ mb: 1 }}>
                                    <Typography fontWeight={600}>{row.title}{row.change ? ` · ${row.change}` : ''}</Typography>
                                    <Typography color="text.secondary">{row.actor} · {new Date(row.createdAt).toLocaleString()}</Typography>
                                </Box>
                            ))}
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </Box>
    );
}
