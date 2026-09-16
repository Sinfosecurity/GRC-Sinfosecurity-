import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/design/PageHeader';
import { ActionQueue, AttentionHero, ExecutiveMetric, RiskDistribution } from '../components/experience/ExperienceKit';
import { color } from '../design/tokens';
import { useAuth } from '../contexts/AuthContext';
import { humanizeLabel } from '../utils/humanizeLabel';
import { intelligenceAPI, tprmAPI, vendorAPI } from '../services/api';

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

function homeForRole(role?: string) {
    switch (role) {
        case 'BUSINESS_OWNER':
            return { job: 'Complete intake and confirm the work that belongs to you.', cta: 'Onboard a third party', href: '/vendor-onboarding' };
        case 'ASSESSOR':
            return { job: 'Review exceptions, not every satisfactory answer.', cta: 'Open assessments', href: '/assessments' };
        case 'APPROVER':
            return { job: 'Decisions that require your authority. Supreme prepared the record.', cta: 'Open decisions', href: '/decision-briefs' };
        default:
            return { job: 'Supreme does the administration. You make the next human decision.', cta: 'Review third parties', href: '/vendor-management' };
    }
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const home = homeForRole(user?.role);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<AttentionItem[]>([]);
    const [stats, setStats] = useState<{
        totalVendors?: number;
        highRiskVendors?: number;
        overdueReviews?: number;
        activeIssues?: number;
        criticalVendors?: number;
        tierCounts?: { CRITICAL?: number; HIGH?: number; MEDIUM?: number; LOW?: number };
    } | null>(null);
    const [work, setWork] = useState({ dueAssessments: 0, overdueFindings: 0, pendingDecisions: 0 });
    const [intelligence, setIntelligence] = useState<Array<{ publicId: string; title: string; whyItMatters: string; href: string }>>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [attention, statistics, teaser] = await Promise.allSettled([
                    tprmAPI.attention(),
                    vendorAPI.getStatistics(),
                    intelligenceAPI.teaser(),
                ]);
                if (cancelled) return;
                if (attention.status === 'fulfilled') {
                    const payload = attention.value.data.data || {};
                    setItems(payload.items || []);
                    if (payload.work) {
                        setWork({
                            dueAssessments: payload.work.dueAssessments || 0,
                            overdueFindings: payload.work.overdueFindings || 0,
                            pendingDecisions: payload.work.pendingDecisions || 0,
                        });
                    }
                } else {
                    setError(attention.reason?.message || 'Unable to load work that needs attention.');
                }
                if (statistics.status === 'fulfilled') {
                    const body = statistics.value.data;
                    setStats({
                        ...(body.summary || body),
                        tierCounts: body.tierCounts || body.summary?.tierCounts,
                    });
                }
                if (teaser.status === 'fulfilled') {
                    setIntelligence(teaser.value.data.data?.items || []);
                }
            } catch (err: any) {
                if (!cancelled) setError(err.message || 'Unable to load the overview.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.role]);

    const queue = useMemo(() => items.map((item) => ({
        ...item,
        action: humanizeLabel(item.action),
        title: item.title.replace(/_/g, ' '),
    })), [items]);
    const first = queue[0];
    const firstRun = !loading && stats?.totalVendors === 0 && queue.length === 0;

    return (
        <Box sx={{ maxWidth: 1360 }}>
            <PageHeader title={greeting(user?.firstName)} description={home.job} />
            {error && <Typography sx={{ color: color.danger, mb: 2 }}>{error}</Typography>}
            <AttentionHero
                count={queue.length}
                title={first ? first.title : firstRun ? 'Start with one third party' : 'Nothing needs your attention'}
                body={first ? first.detail : home.job}
                actionLabel={first ? first.action : home.cta}
                onAction={() => navigate(first?.href || home.href)}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr' }, gap: 0, mb: 4, bgcolor: color.surface }}>
                <ExecutiveMetric
                    emphasis
                    label="Critical vendors"
                    value={stats?.criticalVendors ?? '—'}
                    hint="Authoritative tier, not a control-gap label"
                    onClick={() => navigate('/vendor-management')}
                />
                <ExecutiveMetric label="Decisions waiting" value={work.pendingDecisions} onClick={() => navigate('/decision-briefs')} />
                <ExecutiveMetric label="Overdue findings" value={work.overdueFindings} onClick={() => navigate('/findings')} />
                <ExecutiveMetric label="Assessments due" value={work.dueAssessments} onClick={() => navigate('/assessments')} />
            </Box>
            <Typography variant="h4" sx={{ fontFamily: '"Newsreader", serif', mb: 1 }}>Needs your attention</Typography>
            <Typography sx={{ color: color.inkMuted, mb: 2 }}>Where you are, what happened, and the next human action. Secondary programs stay in navigation.</Typography>
            {loading ? (
                <Typography>Loading live work…</Typography>
            ) : (
                <ActionQueue
                    items={queue}
                    emptyTitle="The recorded work is current"
                    emptyBody="Supreme will surface reviews, findings, evidence, and decisions here when a person is needed. Empty is not a simulated all-clear."
                    onOpen={(href) => navigate(href)}
                />
            )}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ mt: 5 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" sx={{ fontFamily: '"Newsreader", serif' }}>Portfolio</Typography>
                    <Typography sx={{ color: color.inkMuted, mt: 0.5, mb: 2 }}>
                        {stats?.totalVendors ?? '—'} third parties · {stats?.highRiskVendors ?? '—'} high residual · {stats?.overdueReviews ?? '—'} overdue reviews
                    </Typography>
                    <RiskDistribution
                        counts={{
                            critical: stats?.tierCounts?.CRITICAL ?? stats?.criticalVendors,
                            high: stats?.tierCounts?.HIGH,
                            medium: stats?.tierCounts?.MEDIUM,
                            low: stats?.tierCounts?.LOW,
                        }}
                    />
                    <Button sx={{ mt: 1.5 }} onClick={() => navigate('/vendor-management')}>Open register</Button>
                </Box>
                {intelligence.length > 0 && (
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" sx={{ fontFamily: '"Newsreader", serif' }}>What changed</Typography>
                        {intelligence.slice(0, 3).map((row) => (
                            <Box key={row.publicId} sx={{ mt: 1.5 }}>
                                <Typography>{row.title}</Typography>
                                <Typography sx={{ color: color.inkMuted }}>{row.whyItMatters}</Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </Stack>
        </Box>
    );
}
