import { FormEvent, useEffect, useState } from 'react';
import { Alert, Box, Button, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import FactList from '../components/design/FactList';
import QueryState from '../components/QueryState';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import { developerAPI } from '../services/api';

const SCOPES = ['vendors:read', 'vendors:write', 'assessments:read', 'findings:read', 'evidence:read', 'risks:read', 'webhooks:manage', 'insurance:read'];

export default function Integrations() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [overview, setOverview] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [hooks, setHooks] = useState<any[]>([]);
    const [events, setEvents] = useState<string[]>([]);
    const [integrations, setIntegrations] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [selectedHookId, setSelectedHookId] = useState<string | null>(null);
    const [onceSecret, setOnceSecret] = useState<string | null>(null);
    const [clientName, setClientName] = useState('Reporting client');
    const [scope, setScope] = useState('vendors:read');
    const [hookName, setHookName] = useState('Staging receiver');
    const [hookUrl, setHookUrl] = useState('');
    const [hookEvent, setHookEvent] = useState('third_party.created');
    const [slackUrl, setSlackUrl] = useState('');
    const [jiraBaseUrl, setJiraBaseUrl] = useState('');
    const [jiraEmail, setJiraEmail] = useState('');
    const [jiraToken, setJiraToken] = useState('');
    const [jiraProject, setJiraProject] = useState('SR');

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [over, list, webhooks, catalog, eventList, eventsLog] = await Promise.all([
                developerAPI.overview(),
                developerAPI.clients(),
                developerAPI.webhooks(),
                developerAPI.integrations(),
                developerAPI.webhookEvents(),
                developerAPI.activity(),
            ]);
            setOverview(over.data.data);
            setClients(list.data.data || []);
            setHooks(webhooks.data.data || []);
            setIntegrations(catalog.data.data || []);
            setEvents(eventList.data.data || []);
            setActivity(eventsLog.data.data || []);
            if (!hookUrl && over.data.data?.sinkUrl) setHookUrl(over.data.data.sinkUrl);
        } catch (err: any) {
            setError(err.message || 'Unable to load API and integrations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const run = async (work: () => Promise<void>, success: string) => {
        setError(null);
        setMessage(null);
        try {
            await work();
            setMessage(success);
            await load();
        } catch (err: any) {
            setError(err.message || 'Unable to save');
        }
    };

    return (
        <WorkspaceFrame purpose="admin">
            <PageHeader
                crumbs={[{ label: 'Administration' }, { label: 'API & Integrations' }]}
                title="API & Integrations"
                description="Create API credentials, signed webhooks, and tenant integrations. Connected appears only after a real successful test. Secrets are shown once."
            />
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {onceSecret && <Alert severity="warning" sx={{ mb: 2 }}>Copy this secret now. Supreme will not show it again.</Alert>}
            <QueryState loading={loading} error={error}>
                <Surface>
                    <Tabs value={tab} onChange={(_, next) => setTab(next)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }} aria-label="API and integration sections">
                        <Tab label="Overview" />
                        <Tab label="API Clients" />
                        <Tab label="Webhooks" />
                        <Tab label="Integrations" />
                        <Tab label="Activity" />
                    </Tabs>

                    {tab === 0 && overview && (
                        <FactList
                            columns={3}
                            items={[
                                { label: 'API clients', value: String(overview.clients) },
                                { label: 'Webhooks', value: String(overview.webhooks) },
                                { label: 'Connected integrations', value: String(overview.connectedIntegrations) },
                                { label: 'Public API', value: overview.publicApiBase },
                                { label: 'OpenAPI', value: '/public/v1/openapi.json' },
                                { label: 'Staging webhook sink', value: overview.sinkUrl || '—' },
                            ]}
                        />
                    )}

                    {tab === 1 && (
                        <Stack spacing={2} component="form" onSubmit={(event: FormEvent) => {
                            event.preventDefault();
                            run(async () => {
                                const created = await developerAPI.createClient({ name: clientName, scopes: [scope] });
                                setOnceSecret(created.data.data.token);
                            }, 'API client created. Copy the secret now.');
                        }}>
                            <TextField label="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                            <TextField select label="Scope" value={scope} onChange={(e) => setScope(e.target.value)}>
                                {SCOPES.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                            </TextField>
                            <Button type="submit" variant="contained">Create client</Button>
                            {onceSecret && <TextField fullWidth label="API secret (shown once)" value={onceSecret} InputProps={{ readOnly: true }} />}
                            {clients.map((row) => (
                                <Stack key={row.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                                    <Typography>{row.name} — {row.revoked ? 'Revoked' : row.scopes.join(', ')} — last used {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : 'Never'}</Typography>
                                    {!row.revoked && (
                                        <>
                                            <Button onClick={() => run(async () => {
                                                const rotated = await developerAPI.rotateClient(row.id);
                                                setOnceSecret(rotated.data.data.token);
                                            }, 'Secret rotated.')}>Rotate</Button>
                                            <Button onClick={() => run(async () => { await developerAPI.revokeClient(row.id); }, 'Client revoked.')}>Revoke</Button>
                                        </>
                                    )}
                                </Stack>
                            ))}
                        </Stack>
                    )}

                    {tab === 2 && (
                        <Stack spacing={2}>
                            <Box component="form" onSubmit={(event: FormEvent) => {
                                event.preventDefault();
                                run(async () => {
                                    const created = await developerAPI.createWebhook({ name: hookName, url: hookUrl, events: [hookEvent] });
                                    setOnceSecret(created.data.data.secret);
                                }, 'Webhook created. Copy the signing secret now.');
                            }}>
                                <Stack spacing={2}>
                                    <TextField label="Name" value={hookName} onChange={(e) => setHookName(e.target.value)} />
                                    <TextField label="Endpoint URL" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} helperText="HTTPS only. Use the staging sink to prove delivery without an external host." />
                                    <TextField select label="Event" value={hookEvent} onChange={(e) => setHookEvent(e.target.value)}>
                                        {events.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                                    </TextField>
                                    <Button type="submit" variant="contained">Create webhook</Button>
                                </Stack>
                            </Box>
                            {hooks.map((row) => (
                                <Surface key={row.id}>
                                    <Typography>{row.name} — {row.enabled ? 'Enabled' : 'Disabled'} — last {row.lastStatus || 'None'}</Typography>
                                    <Typography variant="body2">{row.url}</Typography>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                        <Button onClick={() => run(async () => { await developerAPI.testWebhook(row.id); }, 'Test webhook sent. This is labeled webhook.test, not a business event.')}>Test webhook</Button>
                                        <Button onClick={async () => {
                                            const list = await developerAPI.deliveries(row.id);
                                            setSelectedHookId(row.id);
                                            setDeliveries(list.data.data || []);
                                        }}>Delivery history</Button>
                                        <Button onClick={() => run(async () => {
                                            const rotated = await developerAPI.rotateWebhook(row.id);
                                            setOnceSecret(rotated.data.data.secret);
                                        }, 'Signing secret rotated. Copy it now.')}>Rotate secret</Button>
                                        <Button onClick={() => run(async () => { await developerAPI.updateWebhook(row.id, { enabled: false }); }, 'Webhook disabled.')}>Disable</Button>
                                    </Stack>
                                </Surface>
                            ))}
                            {deliveries.map((row) => (
                                <Stack key={row.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                                    <Typography>{new Date(row.createdAt).toLocaleString()} — {row.eventType} — {row.status} — attempt {row.attempt} — {row.eventId}</Typography>
                                    {row.status !== 'DELIVERED' && selectedHookId && (
                                        <Button onClick={() => run(async () => {
                                            await developerAPI.retryDelivery(selectedHookId, row.id);
                                        }, 'Retry queued. The event ID stays the same.')}>Retry</Button>
                                    )}
                                </Stack>
                            ))}
                        </Stack>
                    )}

                    {tab === 3 && (
                        <Stack spacing={2}>
                            {integrations.map((row) => (
                                <Surface key={row.id}>
                                    <Typography variant="subtitle1">{row.label}</Typography>
                                    <Typography variant="body2">{row.purpose}</Typography>
                                    <Typography sx={{ mt: 1 }}>Status: {row.status?.label}</Typography>
                                    {row.lastTestedAt && <Typography variant="body2">Last test {new Date(row.lastTestedAt).toLocaleString()}</Typography>}
                                    {row.lastError && <Typography color="error">Last error: {row.lastError}</Typography>}
                                    {row.id === 'slack' && row.configurable && (
                                        <Stack spacing={1} sx={{ mt: 1 }} component="form" onSubmit={(event: FormEvent) => {
                                            event.preventDefault();
                                            run(async () => { await developerAPI.configureIntegration('slack', { webhookUrl: slackUrl }); }, 'Slack configured. Test before it can show Connected.');
                                        }}>
                                            <TextField label="Incoming webhook URL" value={slackUrl} onChange={(e) => setSlackUrl(e.target.value)} type="url" />
                                            <Button type="submit">Save configuration</Button>
                                        </Stack>
                                    )}
                                    {row.id === 'jira' && row.configurable && (
                                        <Stack spacing={1} sx={{ mt: 1 }} component="form" onSubmit={(event: FormEvent) => {
                                            event.preventDefault();
                                            run(async () => {
                                                await developerAPI.configureIntegration('jira', {
                                                    baseUrl: jiraBaseUrl,
                                                    email: jiraEmail,
                                                    apiToken: jiraToken,
                                                    projectKey: jiraProject,
                                                });
                                            }, 'Jira configured. Test before it can show Connected.');
                                        }}>
                                            <TextField label="Jira base URL" value={jiraBaseUrl} onChange={(e) => setJiraBaseUrl(e.target.value)} type="url" />
                                            <TextField label="Jira email" value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} type="email" />
                                            <TextField label="API token" value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} type="password" />
                                            <TextField label="Project key" value={jiraProject} onChange={(e) => setJiraProject(e.target.value)} />
                                            <Button type="submit">Save configuration</Button>
                                        </Stack>
                                    )}
                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                        {row.configurable && row.status?.key !== 'not_configured' && !row.comingLater && (
                                            <Button onClick={() => run(async () => { await developerAPI.testIntegration(row.id); }, 'Test finished. Connected only appears after success.')}>Test connection</Button>
                                        )}
                                        {row.status?.key === 'connected' && (
                                            <Button onClick={() => run(async () => { await developerAPI.disableIntegration(row.id); }, 'Integration disabled.')}>Disable</Button>
                                        )}
                                        {row.comingLater && <Typography variant="body2">Coming later</Typography>}
                                    </Stack>
                                </Surface>
                            ))}
                        </Stack>
                    )}

                    {tab === 4 && (
                        <Box>
                            {activity.length === 0 && <Typography>No API or integration activity yet.</Typography>}
                            {activity.map((row) => (
                                <Typography key={row.id} sx={{ mb: 1 }}>{new Date(row.timestamp).toLocaleString()} — {row.action} — {row.result}</Typography>
                            ))}
                        </Box>
                    )}
                </Surface>
            </QueryState>
        </WorkspaceFrame>
    );
}
