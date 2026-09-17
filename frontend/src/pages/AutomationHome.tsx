import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import StatusBadge from '../components/design/StatusBadge';
import { automationAPI } from '../services/api';
import { humanizeLabel } from '../utils/humanizeLabel';

export default function AutomationHome({ initialTab = 0 }: { initialTab?: number }) {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(initialTab);

    useEffect(() => {
        automationAPI.workspace()
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load Supreme Automation'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <WorkspaceFrame purpose="register">
            <PageHeader
                crumbs={[{ label: 'Automation' }, { label: 'Overview' }]}
                title="Supreme Automation"
                description="Supreme does the administration. Humans make the decisions."
                actions={(
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button onClick={() => navigate('/automation/templates')}>Templates</Button>
                        <Button variant="contained" onClick={() => navigate('/automation/new')}>New automation</Button>
                    </Stack>
                )}
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Automation" emptyBody="No automations yet. Start from a template. Nothing is enabled until a person publishes it.">
                {data && (
                    <Stack spacing={2.5}>
                        <Alert severity="info">{data.honesty}</Alert>
                        <Alert severity="warning">{data.noAiAgents} Scheduled checks: {data.queue?.status}. {data.queue?.message} Timezone used: {data.timezone}.</Alert>
                        {(data.recommendations || []).map((row: any) => (
                            <Alert key={row.templateKey} severity="info">{row.message}</Alert>
                        ))}
                        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
                            <Tab label="Active automations" />
                            <Tab label="Needs attention" />
                            <Tab label="Recent runs" />
                            <Tab label="Failed runs" />
                            <Tab label="Templates" />
                        </Tabs>
                        {tab === 0 && (
                            <Surface>
                                <AppTable
                                    rows={data.active || []}
                                    rowKey={(row: any) => row.publicId}
                                    emptyTitle="No active automations"
                                    emptyBody="Publish a draft or template. Supreme will not enable automations on its own."
                                    onRowClick={(row: any) => navigate(row.href)}
                                    columns={[
                                        { id: 'name', label: 'Automation', render: (row: any) => row.name },
                                        { id: 'status', label: 'Status', render: (row: any) => <StatusBadge value={row.status} kind="plain" /> },
                                        { id: 'when', label: 'When', render: (row: any) => humanizeLabel(row.when), hideOnMobile: true },
                                        { id: 'human', label: 'Human decision', render: (row: any) => row.humanBoundary?.label, hideOnMobile: true },
                                        { id: 'id', label: 'ID', render: (row: any) => row.publicId, hideOnMobile: true },
                                    ]}
                                />
                            </Surface>
                        )}
                        {tab === 1 && (
                            <Surface>
                                <AppTable
                                    rows={data.needsAttention || []}
                                    rowKey={(row: any) => row.publicId}
                                    emptyTitle="Nothing needs attention"
                                    emptyBody="Failed runs and unassigned follow-up work appear here. Nothing is discarded."
                                    onRowClick={(row: any) => row.href && navigate(row.href)}
                                    columns={[
                                        { id: 'status', label: 'Status', render: (row: any) => <StatusBadge value={row.status} kind="plain" /> },
                                        { id: 'name', label: 'What', render: (row: any) => row.automationName || row.title || row.publicId },
                                        { id: 'next', label: 'Who acts next', render: (row: any) => row.whoNeedsToAct || 'Assign an owner', hideOnMobile: true },
                                    ]}
                                />
                            </Surface>
                        )}
                        {tab === 2 && (
                            <Surface>
                                <AppTable
                                    rows={data.recentRuns || []}
                                    rowKey={(row: any) => row.publicId}
                                    emptyTitle="No runs yet"
                                    emptyBody="Runs appear when a real Supreme event matches an active automation."
                                    onRowClick={(row: any) => navigate(row.href)}
                                    columns={[
                                        { id: 'status', label: 'Result', render: (row: any) => <StatusBadge value={row.status} kind="plain" /> },
                                        { id: 'trigger', label: 'Triggered by', render: (row: any) => humanizeLabel(row.triggerEvent) },
                                        { id: 'name', label: 'Automation', render: (row: any) => row.automationName, hideOnMobile: true },
                                        { id: 'id', label: 'Run', render: (row: any) => row.publicId, hideOnMobile: true },
                                    ]}
                                />
                            </Surface>
                        )}
                        {tab === 3 && (
                            <Surface>
                                <AppTable
                                    rows={data.failedRuns || []}
                                    rowKey={(row: any) => row.publicId}
                                    emptyTitle="No failed runs"
                                    emptyBody="Permanent and retryable failures stay visible."
                                    onRowClick={(row: any) => navigate(row.href)}
                                    columns={[
                                        { id: 'status', label: 'Result', render: (row: any) => <StatusBadge value={row.status} kind="plain" /> },
                                        { id: 'failed', label: 'What failed', render: (row: any) => (row.whatFailed || []).map((item: any) => item.type).join(', ') || 'See run' },
                                        { id: 'retry', label: 'Will retry', render: (row: any) => row.willRetry ? 'Yes — notifications only' : 'No — records are not duplicated' },
                                    ]}
                                />
                            </Surface>
                        )}
                        {tab === 4 && (
                            <Stack spacing={1.5}>
                                {(data.templates || []).map((row: any) => (
                                    <Surface key={row.key}>
                                        <Typography variant="h6">{row.name}</Typography>
                                        <Typography variant="body2" sx={{ mt: 1 }}>{row.description}</Typography>
                                        <Typography variant="body2" sx={{ mt: 1 }}><strong>When:</strong> {row.when}</Typography>
                                        <Typography variant="body2"><strong>Then:</strong> {(row.actions || []).join('; ')}</Typography>
                                        <Typography variant="body2"><strong>Human decision:</strong> {row.humanDecision}</Typography>
                                        <Button sx={{ mt: 1.5 }} onClick={() => navigate(`/automation/new?template=${row.key}`)}>Use template</Button>
                                    </Surface>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                )}
            </QueryState>
        </WorkspaceFrame>
    );
}
