import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import MetricCard from '../components/design/MetricCard';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import { color } from '../design/tokens';
import { useAuth } from '../contexts/AuthContext';
import { tprmAPI, vendorAPI } from '../services/api';

type AttentionItem = {
    id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    action: string;
    title: string;
    detail: string;
    vendorName?: string;
    href: string;
};

function greeting(name?: string) {
    const hour = new Date().getHours();
    const when = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return name ? `${when}, ${name}` : when;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<AttentionItem[]>([]);
    const [stats, setStats] = useState<{
        totalVendors?: number;
        highRiskVendors?: number;
        overdueReviews?: number;
        activeIssues?: number;
        criticalVendors?: number;
    } | null>(null);
    const [assessments, setAssessments] = useState<Array<{ id: string; status: string; dueDate?: string | null }>>([]);
    const [findings, setFindings] = useState<Array<{ id: string; status: string; targetRemediationDate?: string | null }>>([]);
    const [briefs, setBriefs] = useState<Array<{ id: string; status: string; humanDecision?: string | null }>>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [attention, statistics, assessmentRes, findingRes, briefRes] = await Promise.allSettled([
                    tprmAPI.attention(),
                    vendorAPI.getStatistics(),
                    tprmAPI.listAssessments(),
                    tprmAPI.listFindings(),
                    tprmAPI.listBriefs(),
                ]);
                if (cancelled) return;
                if (attention.status === 'fulfilled') {
                    setItems(attention.value.data.data.items || []);
                } else {
                    setError(attention.reason?.message || 'Unable to load work that needs attention.');
                }
                if (statistics.status === 'fulfilled') {
                    const body = statistics.value.data;
                    setStats(body.summary || body);
                }
                if (assessmentRes.status === 'fulfilled') {
                    setAssessments(assessmentRes.value.data.data || []);
                }
                if (findingRes.status === 'fulfilled') {
                    setFindings(findingRes.value.data.data || []);
                }
                if (briefRes.status === 'fulfilled') {
                    setBriefs(briefRes.value.data.data || []);
                }
            } catch (err: any) {
                if (!cancelled) setError(err.message || 'Unable to load the overview.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const now = Date.now();
    const work = useMemo(() => {
        const dueAssessments = assessments.filter((row) => {
            if (row.status === 'COMPLETED') return false;
            if (!row.dueDate) return row.status !== 'COMPLETED';
            return new Date(row.dueDate).getTime() <= now + 7 * 86400000;
        }).length;
        const pendingDecisions = briefs.filter((row) => !row.humanDecision && row.status !== 'DECIDED').length;
        const overdueFindings = findings.filter((row) => {
            if (['CLOSED', 'RISK_ACCEPTED', 'RESOLVED'].includes(row.status)) return false;
            return row.targetRemediationDate ? new Date(row.targetRemediationDate).getTime() < now : false;
        }).length;
        return { dueAssessments, pendingDecisions, overdueFindings };
    }, [assessments, briefs, findings, now]);

    return (
        <Box sx={{ maxWidth: 1280 }}>
            <PageHeader
                title={greeting(user?.firstName)}
                description="What needs attention in this organization today. Counts come from live records only."
                actions={<Button variant="contained" onClick={() => navigate('/assessments')}>New assessment</Button>}
            />

            <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>Third-party risk overview</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }} useFlexGap flexWrap="wrap">
                <MetricCard label="Critical vendors" value={stats?.criticalVendors ?? '—'} onClick={() => navigate('/vendor-management')} />
                <MetricCard label="High risk" value={stats?.highRiskVendors ?? '—'} onClick={() => navigate('/vendor-management')} />
                <MetricCard label="Assessments due" value={work.dueAssessments} onClick={() => navigate('/assessments')} />
                <MetricCard label="Overdue findings" value={work.overdueFindings} onClick={() => navigate('/findings')} />
                <MetricCard label="Pending decisions" value={work.pendingDecisions} onClick={() => navigate('/decision-briefs')} />
            </Stack>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems="stretch">
                <Surface>
                    <Typography variant="h5">Your work</Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>Open items assigned to this organization, not invented targets.</Typography>
                    <Stack spacing={1}>
                        <Typography>{work.dueAssessments} assessments due or in progress</Typography>
                        <Typography>{work.pendingDecisions} decisions waiting</Typography>
                        <Typography>{work.overdueFindings} remediations overdue</Typography>
                    </Stack>
                </Surface>
                <Surface>
                    <Typography variant="h5">Portfolio snapshot</Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                        {stats?.totalVendors ?? '—'} third parties · {stats?.overdueReviews ?? '—'} overdue reviews · {stats?.activeIssues ?? '—'} open issues
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button onClick={() => navigate('/vendor-management')}>Third parties</Button>
                        <Button onClick={() => navigate('/monitoring')}>Monitoring</Button>
                        <Button onClick={() => navigate('/reports')}>Reports</Button>
                    </Stack>
                </Surface>
            </Stack>

            <Typography variant="h5" sx={{ mb: 1.5 }}>Needs attention</Typography>
            <QueryState
                loading={loading}
                error={error}
                empty={items.length === 0}
                emptyTitle="Nothing needs attention"
                emptyBody="When reviews, findings, evidence, or monitoring signals require action, they appear here."
                emptyAction={<Button variant="outlined" onClick={() => navigate('/vendor-management')}>Review third parties</Button>}
            >
                <Stack spacing={1}>
                    {items.map((item) => (
                        <Box
                            key={item.id}
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', md: 'row' },
                                justifyContent: 'space-between',
                                gap: 1.5,
                                px: 2,
                                py: 1.5,
                                border: `1px solid ${color.line}`,
                                borderLeft: `3px solid ${item.severity === 'CRITICAL' ? color.critical : item.severity === 'HIGH' ? color.high : color.medium}`,
                                bgcolor: color.surface,
                                borderRadius: '8px',
                            }}
                        >
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                    <StatusBadge value={item.severity} kind="severity" />
                                    {item.vendorName && <Typography variant="caption">{item.vendorName}</Typography>}
                                </Stack>
                                <Typography variant="subtitle1">{item.title}</Typography>
                                <Typography variant="body2">{item.detail}</Typography>
                            </Box>
                            <Button variant="contained" onClick={() => navigate(item.href)} sx={{ alignSelf: { md: 'center' } }}>
                                {item.action}
                            </Button>
                        </Box>
                    ))}
                </Stack>
            </QueryState>
        </Box>
    );
}
