import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import { GuidedStageCard, PageShell } from '../components/experience/ExperienceKit';
import { ENGAGEMENT_TABS, engagementHref } from '../engagement/engagementPaths';
import { intakeAPI } from '../services/api';

export default function EngagementWorkspace() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        intakeAPI.getEngagement(id)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || err.message || 'Unable to load engagement.'))
            .finally(() => setLoading(false));
    }, [id, location.pathname]);

    const visibleTabs = ENGAGEMENT_TABS.filter((tab) => {
        if (tab.id !== 'offboarding') return true;
        if (location.pathname.includes('/offboarding')) return true;
        if (Array.isArray(data?.tabs) && data.tabs.includes('offboarding')) return true;
        return ['OFFBOARDING', 'OFFBOARDED'].includes(String(data?.status || ''));
    });
    const current = visibleTabs.find((tab) => {
        const href = engagementHref(id, tab.path);
        return tab.path ? location.pathname.startsWith(href) : location.pathname === href;
    }) || visibleTabs[0];

    return (
        <PageShell>
            <PageHeader
                crumbs={[
                    { label: 'Engagements', to: '/engagements' },
                    { label: data?.publicId || 'Engagement', to: engagementHref(id) },
                    { label: current.label },
                ]}
                title={data ? `${data.publicId} · ${data.serviceName}` : 'Engagement'}
                description={data?.nextAction}
                meta={data ? <StatusBadge kind="plain" label={data.statusLabel || data.state} /> : undefined}
            />
            <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Engagement not found" emptyBody="Return to Engagements.">
                {data && (
                    <Box sx={{ overflowX: 'hidden' }}>
                        <GuidedStageCard
                            stage={data.statusLabel || data.state || 'Engagement'}
                            status={data.statusLabel || data.state}
                            owner={data.primaryAction?.owner || data.owner || 'Not recorded'}
                            next={data.primaryAction?.label || data.nextAction}
                            primaryAction={data.primaryAction?.label || data.nextAction}
                            onPrimary={() => navigate(data.primaryAction?.href || engagementHref(id))}
                        />
                        <Typography sx={{ mt: 1.5, fontSize: 13, color: 'text.secondary' }}>
                            Current location: {data.publicId} · {current.label}
                        </Typography>
                        <Tabs
                            value={current.id}
                            onChange={(_, value) => {
                                const tab = visibleTabs.find((item) => item.id === value);
                                if (tab) navigate(engagementHref(id, tab.path));
                            }}
                            variant="scrollable"
                            scrollButtons="auto"
                            aria-label="Engagement workspace"
                            sx={{ mt: 1, mb: 2, borderBottom: 1, borderColor: 'divider', maxWidth: '100%' }}
                        >
                            {visibleTabs.map((tab) => (
                                <Tab
                                    key={tab.id}
                                    value={tab.id}
                                    label={tab.label}
                                    component={NavLink}
                                    to={engagementHref(id, tab.path)}
                                    aria-current={current.id === tab.id ? 'page' : undefined}
                                />
                            ))}
                        </Tabs>
                        <Outlet context={{ engagement: data, reload: () => intakeAPI.getEngagement(id).then((res) => setData(res.data.data)) }} />
                    </Box>
                )}
            </QueryState>
        </PageShell>
    );
}
