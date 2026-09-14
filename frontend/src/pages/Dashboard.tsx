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
import { aiGovernanceAPI, complianceAPI, ermAPI, privacyAPI, tprmAPI, vendorAPI } from '../services/api';

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

function domainDashboardsForRole(role?: string): Array<'risk' | 'compliance' | 'privacy' | 'ai'> {
    switch (role) {
        case 'RISK_MANAGER':
        case 'MANAGER':
        case 'APPROVER':
            return ['risk'];
        case 'COMPLIANCE_OFFICER':
            return ['compliance'];
        case 'PRIVACY_OFFICER':
        case 'DPO':
            return ['privacy'];
        case 'AI_GOVERNANCE_LEAD':
        case 'AI_OWNER':
            return ['ai'];
        case 'ORGANIZATION_ADMIN':
        case 'ADMIN':
        case 'ORG_ADMIN':
            return ['risk', 'compliance', 'privacy', 'ai'];
        default:
            return [];
    }
}

function homeForRole(role?: string) {
    switch (role) {
        case 'BUSINESS_OWNER':
            return {
                job: 'Complete vendor intake, confirm changes, and approve remediation that belongs to you.',
                cta: 'Onboard a third party',
                href: '/vendor-onboarding',
                workspace: { label: 'Your vendors', href: '/vendor-management' },
            };
        case 'ASSESSOR':
            return {
                job: 'Assessments waiting for review, potential findings, and reassessments that are due.',
                cta: 'Open assessments',
                href: '/assessments',
                workspace: { label: 'Findings', href: '/findings' },
            };
        case 'RISK_MANAGER':
        case 'MANAGER':
            return {
                job: 'Decisions waiting, treatments that are overdue, and residual risk that needs a person.',
                cta: 'Open decisions',
                href: '/decision-briefs',
                workspace: { label: 'Risk overview', href: '/risks' },
            };
        case 'COMPLIANCE_OFFICER':
            return {
                job: 'Gaps, attestations, and evidence that still need action. Readiness is not certification.',
                cta: 'Open compliance',
                href: '/compliance',
                workspace: { label: 'Gaps', href: '/compliance/gaps' },
            };
        case 'PRIVACY_OFFICER':
        case 'DPO':
            return {
                job: 'Rights requests, DPIAs, and processing that still needs a person. Counts come from live Privacy records only.',
                cta: 'Open privacy',
                href: '/privacy-ops',
                workspace: { label: 'Rights', href: '/privacy-ops/rights' },
            };
        case 'AI_GOVERNANCE_LEAD':
        case 'AI_OWNER':
            return {
                job: 'AI systems and uses that need review or approval. Nothing is invented from missing inventory.',
                cta: 'Open AI Governance',
                href: '/ai-governance',
                workspace: { label: 'Approvals', href: '/ai-governance/approvals' },
            };
        case 'APPROVER':
            return {
                job: 'Decisions that require your authority. Supreme prepared the record; you decide.',
                cta: 'Open decisions',
                href: '/decision-briefs',
                workspace: { label: 'Reports', href: '/reports' },
            };
        case 'AUDITOR':
            return {
                job: 'Trace what changed, what evidence supports it, and what decision was recorded.',
                cta: 'Open evidence',
                href: '/documents',
                workspace: { label: 'Audit', href: '/activity-log' },
            };
        case 'ORGANIZATION_ADMIN':
        case 'ADMIN':
        case 'ORG_ADMIN':
            return {
                job: 'See what needs attention first. Administration stays available when you need it.',
                cta: 'Review attention',
                href: '/vendor-management',
                workspace: { label: 'Team', href: '/user-management' },
            };
        default:
            return {
                job: 'What needs attention in this organization today. Counts come from live records only.',
                cta: 'Review third parties',
                href: '/vendor-management',
                workspace: { label: 'Reports', href: '/reports' },
            };
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
    } | null>(null);
    const [work, setWork] = useState({ dueAssessments: 0, overdueFindings: 0, pendingDecisions: 0 });
    const [domain, setDomain] = useState<{
        risk?: { count?: number; items: AttentionItem[] };
        compliance?: { count?: number; items: AttentionItem[] };
        privacy?: { count?: number; items: AttentionItem[] };
        ai?: { count?: number; items: AttentionItem[] };
    }>({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const wanted = domainDashboardsForRole(user?.role);
                const domainCalls = wanted.map((key) => {
                    if (key === 'risk') return ermAPI.dashboard();
                    if (key === 'compliance') return complianceAPI.dashboard();
                    if (key === 'privacy') return privacyAPI.dashboard();
                    return aiGovernanceAPI.dashboard();
                });
                const [attention, statistics, ...domainSettled] = await Promise.allSettled([
                    tprmAPI.attention(),
                    vendorAPI.getStatistics(),
                    ...domainCalls,
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
                    setStats(body.summary || body);
                }
                const nextDomain: typeof domain = {};
                wanted.forEach((key, index) => {
                    const result = domainSettled[index];
                    if (!result || result.status !== 'fulfilled') return;
                    const data = result.value.data.data || {};
                    if (key === 'risk') {
                        const rows = (data.attention || []).slice(0, 4).map((row: any) => ({
                            id: `risk-${row.publicId}`,
                            severity: (row.residualRating === 'CRITICAL' || row.severity === 'CRITICAL' ? 'CRITICAL' : row.residualRating === 'HIGH' || row.severity === 'HIGH' ? 'HIGH' : 'MEDIUM') as AttentionItem['severity'],
                            action: 'Open risk',
                            title: row.title || 'Enterprise risk needs attention',
                            detail: (row.reasons || []).join(' · ') || row.appetiteStatus || 'Live enterprise risk record.',
                            href: `/risks/${row.publicId}`,
                        }));
                        nextDomain.risk = { count: data.totals?.outsideAppetite ?? data.totals?.overdueTreatments ?? rows.length, items: rows };
                    }
                    if (key === 'compliance') {
                        const rows = (data.attention || []).slice(0, 4).map((row: any) => ({
                            id: `cmp-${row.publicId || row.href}`,
                            severity: (row.severity === 'CRITICAL' ? 'CRITICAL' : row.severity === 'HIGH' ? 'HIGH' : 'MEDIUM') as AttentionItem['severity'],
                            action: 'Open compliance',
                            title: row.why || row.type || 'Compliance needs attention',
                            detail: [row.framework, row.owner].filter(Boolean).join(' · ') || 'Live compliance record.',
                            href: row.href || '/compliance',
                        }));
                        nextDomain.compliance = { count: data.totals?.openGaps ?? rows.length, items: rows };
                    }
                    if (key === 'privacy') {
                        const rows = (data.attention || []).slice(0, 4).map((row: any) => ({
                            id: `prv-${row.publicId || row.href}`,
                            severity: (row.severity === 'CRITICAL' ? 'CRITICAL' : row.severity === 'HIGH' ? 'HIGH' : 'MEDIUM') as AttentionItem['severity'],
                            action: 'Open privacy',
                            title: row.why || row.type || 'Privacy needs attention',
                            detail: [row.related, row.owner].filter(Boolean).join(' · ') || 'Live privacy record.',
                            href: row.href || '/privacy-ops',
                        }));
                        nextDomain.privacy = { count: data.totals?.openRightsRequests ?? data.totals?.dpiasDue ?? rows.length, items: rows };
                    }
                    if (key === 'ai') {
                        const rows = (data.attention || []).slice(0, 4).map((row: any) => ({
                            id: `ai-${row.publicId || row.href}`,
                            severity: (row.severity === 'CRITICAL' ? 'CRITICAL' : row.severity === 'HIGH' ? 'HIGH' : 'MEDIUM') as AttentionItem['severity'],
                            action: 'Open AI',
                            title: row.why || row.type || 'AI governance needs attention',
                            detail: row.publicId || 'Live AI governance record.',
                            href: row.href || '/ai-governance',
                        }));
                        nextDomain.ai = { count: data.totals?.awaitingApproval ?? data.totals?.incidentsOpen ?? rows.length, items: rows };
                    }
                });
                setDomain(nextDomain);
            } catch (err: any) {
                if (!cancelled) setError(err.message || 'Unable to load the overview.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.role]);

    const rolePrimary = useMemo(() => {
        if (['RISK_MANAGER', 'MANAGER'].includes(user?.role || '')) return domain.risk?.items || [];
        if (user?.role === 'COMPLIANCE_OFFICER') return domain.compliance?.items || [];
        if (['PRIVACY_OFFICER', 'DPO'].includes(user?.role || '')) return domain.privacy?.items || [];
        if (['AI_GOVERNANCE_LEAD', 'AI_OWNER'].includes(user?.role || '')) return domain.ai?.items || [];
        if (user?.role === 'APPROVER') return items.filter((row) => /decision|approv/i.test(`${row.title} ${row.action}`)).concat(domain.risk?.items || []).slice(0, 8);
        return [];
    }, [user?.role, domain, items]);

    const attention = rolePrimary.length ? [...rolePrimary, ...items.filter((row) => !rolePrimary.some((item) => item.id === row.id))] : items;
    const firstRun = !loading && stats?.totalVendors === 0 && attention.length === 0 && !domain.risk?.items?.length;

    return (
        <Box sx={{ maxWidth: 1280 }}>
            <PageHeader
                title={greeting(user?.firstName)}
                description={home.job}
                actions={<Button variant="contained" onClick={() => navigate(home.href)}>{home.cta}</Button>}
            />

            {firstRun && (
                <Box sx={{ mb: 3 }}>
                <Surface>
                    <Typography variant="h5">Start here</Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                        Supreme does the administration. You do not need to configure every product before value appears.
                    </Typography>
                    <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                        <Typography>1. Onboard a third party</Typography>
                        <Typography>2. Review the risk methodology when you are ready</Typography>
                        <Typography>3. Open Control Center and activate frameworks only if you need them</Typography>
                        <Typography>4. Configure Privacy or AI Governance when those programs apply</Typography>
                    </Stack>
                    <Button variant="contained" onClick={() => navigate('/vendor-onboarding')}>Onboard a third party</Button>
                </Surface>
                </Box>
            )}

            <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>What needs attention</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }} useFlexGap flexWrap="wrap">
                <MetricCard label="Critical vendors" value={stats?.criticalVendors ?? '—'} onClick={() => navigate('/vendor-management')} />
                <MetricCard label="High risk" value={stats?.highRiskVendors ?? '—'} onClick={() => navigate('/vendor-management')} />
                <MetricCard label="Assessments due" value={work.dueAssessments} onClick={() => navigate('/assessments')} />
                <MetricCard label="Overdue findings" value={work.overdueFindings} onClick={() => navigate('/findings')} />
                <MetricCard label="Pending decisions" value={work.pendingDecisions} onClick={() => navigate('/decision-briefs')} />
                {domain.risk && <MetricCard label="Risk attention" value={domain.risk.count ?? '—'} onClick={() => navigate('/risks')} />}
                {domain.compliance && <MetricCard label="Compliance gaps" value={domain.compliance.count ?? '—'} onClick={() => navigate('/compliance')} />}
                {domain.privacy && <MetricCard label="Privacy attention" value={domain.privacy.count ?? '—'} onClick={() => navigate('/privacy-ops')} />}
                {domain.ai && <MetricCard label="AI attention" value={domain.ai.count ?? '—'} onClick={() => navigate('/ai-governance')} />}
            </Stack>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems="stretch">
                <Surface>
                    <Typography variant="h5">Your next action</Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>{home.job}</Typography>
                    <Stack spacing={1}>
                        <Typography>{work.dueAssessments} assessments due or in progress</Typography>
                        <Typography>{work.pendingDecisions} decisions waiting</Typography>
                        <Typography>{work.overdueFindings} remediations overdue</Typography>
                        {domain.risk && <Typography>{domain.risk.count ?? 0} enterprise risks needing attention</Typography>}
                        {domain.compliance && <Typography>{domain.compliance.count ?? 0} compliance items from live records</Typography>}
                        {domain.privacy && <Typography>{domain.privacy.count ?? 0} privacy items from live records</Typography>}
                        {domain.ai && <Typography>{domain.ai.count ?? 0} AI items from live records</Typography>}
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                        <Button variant="contained" onClick={() => navigate(home.href)}>{home.cta}</Button>
                        <Button onClick={() => navigate(home.workspace.href)}>{home.workspace.label}</Button>
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
                empty={attention.length === 0}
                emptyTitle="Nothing needs attention"
                emptyBody="Supreme will surface reviews, findings, evidence, and monitoring here when they require action. An empty queue can mean the recorded work is current. Product counts appear only when that product returned live records."
                emptyAction={<Button variant="outlined" onClick={() => navigate(home.href)}>{home.cta}</Button>}
            >
                <Stack spacing={1}>
                    {attention.map((item) => (
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
