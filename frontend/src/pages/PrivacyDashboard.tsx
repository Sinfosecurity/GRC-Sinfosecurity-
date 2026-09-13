import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import MetricCard from '../components/design/MetricCard';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { privacyAPI } from '../services/api';
import { downloadBinaryResponse } from '../services/download';

type Dashboard = {
    honesty: string;
    consentCollector: { status: string };
    totals: {
        activeActivities: number;
        highRiskProcessing: number;
        dpiasDue: number;
        transfersRequiringReview: number;
        openRightsRequests: number;
        overdueRightsRequests: number;
        retentionActionsDue: number;
        openGaps: number;
        processorsWithIssues: number;
        evidenceRefresh: number;
    };
    attention: Array<{
        type: string;
        why: string;
        related: string | null;
        owner: string | null;
        dueAt: string | null;
        severity: string | null;
        href: string;
        publicId: string;
    }>;
    changed: Array<{ title: string; change: string | null; summary: string; actor: string; createdAt: string }>;
};

export default function PrivacyDashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState<Dashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        privacyAPI.dashboard()
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load Supreme Privacy'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Box>
            <PageHeader
                crumbs={[{ label: 'Privacy' }, { label: 'Overview' }]}
                title="Supreme Privacy"
                description="Know the data. Know why it exists. Know where it flows. Know what risk it creates. Know what action is required."
                actions={(
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button variant="contained" onClick={() => navigate('/privacy-ops/activities')}>Processing activities</Button>
                        <Button onClick={() => navigate('/privacy-ops/vendors')}>Vendor privacy</Button>
                        <Button onClick={() => navigate('/privacy-ops/rights')}>Rights requests</Button>
                        <Button onClick={() => navigate('/privacy-ops/deletions')}>Deletion</Button>
                        <Button onClick={() => navigate('/privacy-ops/consent')}>Consent</Button>
                        <Button onClick={() => navigate('/privacy-ops/incidents')}>Incidents</Button>
                        <Button onClick={() => navigate('/privacy-ops/import')}>Import</Button>
                        <Button onClick={() => privacyAPI.downloadReport('executive').then((res) => downloadBinaryResponse(res, 'Supreme-Privacy-executive.pdf'))}>Executive PDF</Button>
                        <Button onClick={() => privacyAPI.downloadBoardPptx().then((res) => downloadBinaryResponse(res, 'Supreme-Privacy-Board.pptx'))}>Board PPTX</Button>
                    </Stack>
                )}
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Privacy operations" emptyBody="Record a processing activity to start a real privacy program. Nothing is invented.">
                {data && (
                    <Stack spacing={2.5}>
                        <Alert severity="info">{data.honesty}</Alert>
                        <Alert severity="warning">Consent collector: {data.consentCollector.status}</Alert>
                        <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={1.5}>
                            <MetricCard label="Active processing" value={data.totals.activeActivities} onClick={() => navigate('/privacy-ops/activities')} />
                            <MetricCard label="Open rights requests" value={data.totals.openRightsRequests} onClick={() => navigate('/privacy-ops/rights')} />
                            <MetricCard label="Transfers in review" value={data.totals.transfersRequiringReview} onClick={() => navigate('/privacy-ops/transfers')} />
                            <MetricCard label="Retention due" value={data.totals.retentionActionsDue} onClick={() => navigate('/privacy-ops/retention')} />
                        </Box>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>Needs attention</Typography>
                            {!data.attention.length && <Typography color="text.secondary">No attention items from live records.</Typography>}
                            <Stack spacing={1.5}>
                                {data.attention.map((row) => (
                                    <Box key={`${row.type}-${row.publicId}`} sx={{ cursor: 'pointer' }} onClick={() => navigate(row.href)}>
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                            <Typography fontWeight={700}>{row.type}</Typography>
                                            {row.severity && <StatusBadge tone={row.severity === 'High' || row.severity === 'Critical' ? 'critical' : 'medium'} label={row.severity} />}
                                        </Stack>
                                        <Typography>{row.why}</Typography>
                                        <Typography color="text.secondary">
                                            {[row.related, row.owner, row.dueAt ? new Date(row.dueAt).toLocaleDateString() : null].filter(Boolean).join(' · ')}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>What changed</Typography>
                            {!data.changed.length && <Typography color="text.secondary">No privacy history yet.</Typography>}
                            {data.changed.map((row) => (
                                <Box key={`${row.title}-${row.createdAt}`} sx={{ mb: 1.5 }}>
                                    <Typography fontWeight={700}>{row.title}</Typography>
                                    <Typography>{row.summary}</Typography>
                                    <Typography color="text.secondary">{[row.change, row.actor, new Date(row.createdAt).toLocaleString()].filter(Boolean).join(' · ')}</Typography>
                                </Box>
                            ))}
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </Box>
    );
}
