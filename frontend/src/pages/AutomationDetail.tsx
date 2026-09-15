import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import StatusBadge from '../components/design/StatusBadge';
import { automationAPI } from '../services/api';
import { humanizeLabel } from '../utils/humanizeLabel';

export default function AutomationDetail() {
    const { publicId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [preview, setPreview] = useState<any>(null);
    const [sourceModel, setSourceModel] = useState('VendorIssue');
    const [sourceId, setSourceId] = useState('');

    const load = () => {
        if (!publicId) return;
        setLoading(true);
        automationAPI.get(publicId)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load automation'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [publicId]);

    const act = async (fn: () => Promise<unknown>) => {
        setBusy(true);
        try {
            await fn();
            load();
        } catch (err: any) {
            setError(err.message || 'Action failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box>
            <PageHeader
                crumbs={[{ label: 'Automation', to: '/automation' }, { label: data?.publicId || 'Detail' }]}
                title={data?.name || 'Automation'}
                description={data?.description || 'Governed administrative workflow.'}
                actions={(
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button onClick={() => navigate(`/automation/${publicId}/edit`)}>Edit draft</Button>
                        {data?.status !== 'ACTIVE' && <Button variant="contained" disabled={busy} onClick={() => act(() => automationAPI.publish(publicId!))}>Publish</Button>}
                        {data?.status === 'ACTIVE' && <Button disabled={busy} onClick={() => act(() => automationAPI.pause(publicId!))}>Pause</Button>}
                        {data?.status === 'PAUSED' && <Button disabled={busy} onClick={() => act(() => automationAPI.resume(publicId!))}>Resume</Button>}
                    </Stack>
                )}
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Automation" emptyBody="This automation was not found in this organization.">
                {data && (
                    <Stack spacing={2.5}>
                        <Alert severity="info">Editing an active automation creates a new draft version. Historical runs keep the version that actually ran.</Alert>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <Box sx={{ flex: 1 }}>
                                <Surface>
                                    <Typography variant="overline">Purpose</Typography>
                                    <Typography>{data.purpose}</Typography>
                                    <Typography variant="overline" sx={{ display: 'block', mt: 2 }}>Status</Typography>
                                    <StatusBadge value={data.status} kind="plain" />
                                    <Typography variant="body2" sx={{ mt: 1 }}>Version {data.version} · {data.timezone} · {data.publicId}</Typography>
                                </Surface>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Surface>
                                    <Typography variant="overline">When</Typography>
                                    <Typography>{humanizeLabel(data.when)}</Typography>
                                    <Typography variant="overline" sx={{ display: 'block', mt: 2 }}>If</Typography>
                                    {(data.conditions || []).map((row: any, index: number) => (
                                        <Typography key={`${row.field}-${index}`}>{humanizeLabel(row.field)} {row.op} {Array.isArray(row.value) ? row.value.join(', ') : String(row.value ?? '')}</Typography>
                                    ))}
                                </Surface>
                            </Box>
                        </Stack>
                        <Surface>
                            <Typography variant="overline">Then</Typography>
                            {(data.actions || []).map((row: any) => (
                                <Typography key={row.type}>{humanizeLabel(row.type)}</Typography>
                            ))}
                            <Typography variant="overline" sx={{ display: 'block', mt: 2 }}>Requires human decision</Typography>
                            <Typography>{data.humanBoundary?.label}</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Preview</Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>Given a real source record. No actions execute.</Typography>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
                                <TextField label="Source model" value={sourceModel} onChange={(event) => setSourceModel(event.target.value)} />
                                <TextField label="Source ID" value={sourceId} onChange={(event) => setSourceId(event.target.value)} />
                                <Button disabled={busy || !sourceId} onClick={async () => {
                                    setBusy(true);
                                    try {
                                        const res = await automationAPI.preview(publicId!, { sourceModel, sourceId });
                                        setPreview(res.data.data);
                                    } catch (err: any) {
                                        setError(err.message);
                                    } finally {
                                        setBusy(false);
                                    }
                                }}>Preview</Button>
                            </Stack>
                            {preview && (
                                <Alert severity="warning" sx={{ mt: 1.5 }}>
                                    {preview.label}. Would trigger: {preview.wouldTrigger ? 'Yes' : 'No'}. Conditions match: {preview.conditionsMatched ? 'Yes' : 'No'}. Actions that would run: {(preview.actionsThatWouldRun || []).join(', ') || 'none'}. Human decision required: {preview.humanApprovalRequired ? 'Yes' : 'No'}.
                                </Alert>
                            )}
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>Recent executions</Typography>
                            <AppTable
                                rows={data.recentExecutions || []}
                                rowKey={(row: any) => row.publicId}
                                emptyTitle="No executions"
                                emptyBody="Runs appear after a real matching event."
                                onRowClick={(row: any) => navigate(row.href)}
                                columns={[
                                    { id: 'status', label: 'Result', render: (row: any) => <StatusBadge value={row.status} kind="plain" /> },
                                    { id: 'trigger', label: 'Triggered by', render: (row: any) => humanizeLabel(row.triggerEvent) },
                                    { id: 'version', label: 'Version', render: (row: any) => `v${row.version}`, hideOnMobile: true },
                                ]}
                            />
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </Box>
    );
}
