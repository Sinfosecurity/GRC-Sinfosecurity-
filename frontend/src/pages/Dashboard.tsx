import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import { ActionQueue, AttentionHero, ExecutiveMetric, PageShell, RiskDistribution, SectionHeader } from '../components/experience/ExperienceKit';
import { CoverageRing } from '../components/design/RiskVisuals';
import { color } from '../design/tokens';
import { useAuth } from '../contexts/AuthContext';
import { humanizeLabel } from '../utils/humanizeLabel';
import { intelligenceAPI, tprmAPI, vendorAPI } from '../services/api';

type LoadPhase = 'loading' | 'ready' | 'error';

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
    const [attentionPhase, setAttentionPhase] = useState<LoadPhase>('loading');
    const [statsPhase, setStatsPhase] = useState<LoadPhase>('loading');
    const [workPhase, setWorkPhase] = useState<LoadPhase>('loading');
    const [intelligencePhase, setIntelligencePhase] = useState<LoadPhase>('loading');
    const [attentionError, setAttentionError] = useState<string | null>(null);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [items, setItems] = useState<AttentionItem[]>([]);
    const [stats, setStats] = useState<{
        totalVendors?: number;
        highRiskVendors?: number;
        overdueReviews?: number;
        activeIssues?: number;
        criticalVendors?: number;
        tierCounts?: { CRITICAL?: number; HIGH?: number; MEDIUM?: number; LOW?: number };
    } | null>(null);
    const [work, setWork] = useState<{ dueAssessments: number; overdueFindings: number; pendingDecisions: number } | null>(null);
    const [intelligence, setIntelligence] = useState<Array<{ publicId: string; title: string; whyItMatters: string; href: string }>>([]);

    useEffect(() => {
        let cancelled = false;
        setAttentionPhase('loading');
        setStatsPhase('loading');
        setWorkPhase('loading');
        setIntelligencePhase('loading');
        setAttentionError(null);
        setStatsError(null);
        setItems([]);
        setStats(null);
        setWork(null);
        setIntelligence([]);
        const attention = tprmAPI.attention()
            .then((response) => {
                if (cancelled) return;
                const payload = response.data.data || {};
                setItems(payload.items || []);
                setWork({
                    dueAssessments: Number(payload.work?.dueAssessments || 0),
                    overdueFindings: Number(payload.work?.overdueFindings || 0),
                    pendingDecisions: Number(payload.work?.pendingDecisions || 0),
                });
                setAttentionPhase('ready');
                setWorkPhase('ready');
            })
            .catch((err: any) => {
                if (cancelled) return;
                setAttentionError(err?.message || 'Unable to load work that needs attention.');
                setAttentionPhase('error');
                setWorkPhase('error');
            });
        const statistics = vendorAPI.getStatistics()
            .then((response) => {
                if (cancelled) return;
                const body = response.data;
                setStats({
                    ...(body.summary || body),
                    tierCounts: body.tierCounts || body.summary?.tierCounts,
                });
                setStatsPhase('ready');
            })
            .catch((err: any) => {
                if (cancelled) return;
                setStatsError(err?.message || 'Portfolio statistics are unavailable.');
                setStatsPhase('error');
            });
        const teaser = intelligenceAPI.teaser()
            .then((response) => {
                if (cancelled) return;
                setIntelligence(response.data.data?.items || []);
                setIntelligencePhase('ready');
            })
            .catch(() => {
                if (!cancelled) setIntelligencePhase('error');
            });
        void Promise.allSettled([attention, statistics, teaser]);
        return () => { cancelled = true; };
    }, [user?.role]);

    const queue = useMemo(() => items.map((item) => ({
        ...item,
        action: humanizeLabel(item.action),
        title: item.title.replace(/_/g, ' '),
    })), [items]);
    const first = queue[0];
    const firstRun = attentionPhase === 'ready' && statsPhase === 'ready' && stats?.totalVendors === 0 && queue.length === 0;
    const recordedTiers = statsPhase === 'ready'
        ? (stats?.tierCounts?.CRITICAL ?? stats?.criticalVendors ?? 0)
            + (stats?.tierCounts?.HIGH ?? 0)
            + (stats?.tierCounts?.MEDIUM ?? 0)
            + (stats?.tierCounts?.LOW ?? 0)
        : 0;
    const concentrated = statsPhase === 'ready'
        ? (stats?.tierCounts?.CRITICAL ?? stats?.criticalVendors ?? 0) + (stats?.tierCounts?.HIGH ?? 0)
        : 0;
    const unclassified = statsPhase === 'ready' ? Math.max(0, (stats?.totalVendors ?? 0) - recordedTiers) : 0;

    return (
        <PageShell>
            <PageHeader eyebrow="Governance command center" title={greeting(user?.firstName)} description={home.job} />
            {attentionError && <Typography role="alert" sx={{ color: color.danger, mb: 2 }}>{attentionError}</Typography>}
            <AttentionHero
                phase={attentionPhase === 'loading' ? 'loading' : attentionPhase === 'error' ? 'error' : 'ready'}
                count={queue.length}
                title={first ? first.title : firstRun ? 'Start with one third party' : 'Nothing needs your attention'}
                body={attentionPhase === 'error' ? 'Supreme could not retrieve the attention queue. This is not an all-clear.' : first ? first.detail : home.job}
                actionLabel={first ? first.action : home.cta}
                onAction={() => navigate(first?.href || home.href)}
            />
            <Surface padded={false}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr' },
                    '& > *': {
                        px: { xs: 2.25, md: 3 },
                        py: 2.5,
                        borderBottom: { xs: `1px solid ${color.line}`, md: 'none' },
                        borderRight: { md: `1px solid ${color.line}` },
                    },
                    '& > *:last-child': { borderBottom: 0, borderRight: 0 },
                }}
            >
                <ExecutiveMetric
                    emphasis
                    phase={statsPhase}
                    label="Critical vendors"
                    value={statsPhase === 'ready' ? stats?.criticalVendors ?? 0 : '—'}
                    hint="Authoritative tier, not a control-gap label"
                    onClick={() => navigate('/vendor-management')}
                />
                <ExecutiveMetric phase={workPhase} label="Decisions waiting" value={work?.pendingDecisions ?? '—'} onClick={() => navigate('/decision-briefs')} />
                <ExecutiveMetric phase={workPhase} label="Overdue findings" value={work?.overdueFindings ?? '—'} onClick={() => navigate('/findings')} />
                <ExecutiveMetric phase={workPhase} label="Assessments due" value={work?.dueAssessments ?? '—'} onClick={() => navigate('/assessments')} />
            </Box>
            </Surface>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: '1.7fr 1fr' },
                    gap: 2.5,
                    mt: 2.5,
                }}
            >
                <Surface>
                    <Typography variant="h5">Portfolio</Typography>
                    {statsPhase === 'loading' && (
                        <Typography role="status" aria-live="polite" sx={{ color: color.inkMuted, mt: 0.5, mb: 2 }}>Checking the recorded portfolio…</Typography>
                    )}
                    {statsPhase === 'error' && (
                        <Typography sx={{ color: color.ink, mt: 0.5, mb: 2 }}>{statsError || 'Portfolio statistics are unavailable.'}</Typography>
                    )}
                    {statsPhase === 'ready' && (
                        <>
                            <Typography sx={{ color: color.inkMuted, mt: 0.5, mb: 2 }}>
                                {stats?.totalVendors ?? 0} third parties · {stats?.highRiskVendors ?? 0} high residual · {stats?.overdueReviews ?? 0} overdue reviews
                            </Typography>
                            <RiskDistribution
                                counts={{
                                    critical: stats?.tierCounts?.CRITICAL ?? stats?.criticalVendors,
                                    high: stats?.tierCounts?.HIGH,
                                    medium: stats?.tierCounts?.MEDIUM,
                                    low: stats?.tierCounts?.LOW,
                                }}
                            />
                        </>
                    )}
                    <Button sx={{ mt: 1.5 }} onClick={() => navigate('/vendor-management')}>Open register</Button>
                </Surface>
                <Surface>
                    <Typography variant="h5">Concentration</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, mb: 1.5 }}>
                        Critical and high of recorded tiers. This is not control coverage. Third parties without a recorded tier are not in the ring.
                    </Typography>
                    <CoverageRing
                        phase={statsPhase}
                        label="Critical and high"
                        tone="critical"
                        numerator={concentrated}
                        denominator={recordedTiers}
                        caption="Authoritative tier, not a control-gap label."
                        emptyReason={statsPhase === 'error' ? undefined : 'No recorded tiers yet, so there is no concentration to show.'}
                    />
                    {statsPhase === 'ready' && unclassified > 0 && (
                        <Typography variant="body2" sx={{ mt: 1.5 }}>
                            {unclassified} third {unclassified === 1 ? 'party has' : 'parties have'} no recorded tier and {unclassified === 1 ? 'is' : 'are'} not included in this concentration.
                        </Typography>
                    )}
                </Surface>
            </Box>
            <Box sx={{ mt: 2.5 }}>
            <Surface>
            <SectionHeader title="Priority actions" body="What happened, why it matters, and the next human action." />
            {attentionPhase === 'loading' && (
                <Typography role="status" aria-live="polite">Checking recorded work…</Typography>
            )}
            {attentionPhase === 'error' && (
                <Typography>The attention queue is unavailable. This is not an all-clear.</Typography>
            )}
            {attentionPhase === 'ready' && (
                <ActionQueue
                    items={queue}
                    emptyTitle="The recorded work is current"
                    emptyBody="Supreme will surface reviews, findings, evidence, and decisions here when a person is needed. Empty is not a simulated all-clear."
                    onOpen={(href) => navigate(href)}
                />
            )}
            </Surface>
            </Box>
            {intelligencePhase === 'ready' && intelligence.length > 0 && (
                <Box sx={{ mt: 2.5 }}>
                    <Surface>
                        <Typography variant="h5">What changed</Typography>
                        {intelligence.slice(0, 3).map((row) => (
                            <Box key={row.publicId} sx={{ mt: 1.5 }}>
                                <Typography>{row.title}</Typography>
                                <Typography sx={{ color: color.inkMuted }}>{row.whyItMatters}</Typography>
                            </Box>
                        ))}
                    </Surface>
                </Box>
            )}
        </PageShell>
    );
}
