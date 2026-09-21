import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import QueryState from '../components/QueryState';
import Surface from '../components/design/Surface';
import { PageShell } from '../components/experience/ExperienceKit';
import { intakeAPI } from '../services/api';

const TRIAGE = ['NOT_RELEVANT', 'MONITOR', 'ACTION_REQUIRED', 'ESCALATE', 'REASSESSMENT_RECOMMENDED'];
const IMPACTS = ['AFFECTED', 'NOT_AFFECTED', 'NEEDS_REVIEW'];

export default function MonitoringSignalDetail() {
    const { signalId = '' } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [ownerUserId, setOwner] = useState('');
    const [decision, setDecision] = useState('ACTION_REQUIRED');
    const [rationale, setRationale] = useState('');
    const [impactEngagement, setImpactEngagement] = useState('');
    const [impactDecision, setImpactDecision] = useState('AFFECTED');
    const [escalateTo, setEscalateTo] = useState('');

    const load = () => {
        setLoading(true);
        intakeAPI.getMonitoringSignal(signalId)
            .then((res) => {
                setData(res.data.data);
                setImpactEngagement(res.data.data.impacts?.[0]?.engagementId || '');
                setOwner(res.data.data.reviewOwnerUserId || '');
            })
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load this monitoring signal.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [signalId]);

    const run = async (work: () => Promise<any>, success: string) => {
        setBusy(true);
        setError(null);
        try {
            const res = await work();
            setData(res.data.data.signal || res.data.data);
            setMessage(success);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'The monitoring action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <PageShell>
            <PageHeader crumbs={[{ label: 'Monitoring', to: '/monitoring' }, { label: data?.publicId || 'Signal' }]} title={data?.title || 'Monitoring signal'} description={data?.nextAction} />
            <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Signal not found" emptyBody="Return to Monitoring.">
                {data && (
                    <Stack spacing={2} sx={{ overflowX: 'hidden' }}>
                        {message && <Alert severity="success">{message}</Alert>}
                        {error && <Alert severity="error" role="alert">{error}</Alert>}
                        <Surface>
                            <Typography variant="h6" component="h2">Enterprise record</Typography>
                            <Typography><strong>What:</strong> {data.what}</Typography>
                            <Typography><strong>Why:</strong> {data.why}</Typography>
                            <Typography><strong>Source:</strong> {data.source}</Typography>
                            <Typography><strong>State:</strong> {String(data.state || data.status).replace(/_/g, ' ')}</Typography>
                            <Typography><strong>Owner:</strong> {data.owner || 'Unassigned'}</Typography>
                            <Typography><strong>Impact:</strong> {data.impact}</Typography>
                            <Typography><strong>Evidence:</strong> {data.evidence}</Typography>
                            <Typography><strong>Relationships:</strong> {data.relationships?.thirdParty?.name} · {(data.relationships?.engagements || []).map((row: any) => row.serviceName).join(', ') || 'No Engagement marked'}</Typography>
                            <Typography><strong>Next action:</strong> {data.nextAction}</Typography>
                            <Typography><strong>History:</strong> {(data.reviews || []).length} review record(s)</Typography>
                            <Typography variant="body2">Source severity: {data.sourceSeverity || 'Not provided'}. Supreme attention: {data.attentionPriority}. This is not residual risk.</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h6" component="h2">Engagement relevance</Typography>
                            {(data.impacts || []).map((row: any) => (
                                <Typography key={row.id} variant="body2">{row.engagement?.serviceName || row.engagementId} · {String(row.decision).replace(/_/g, ' ')}</Typography>
                            ))}
                            <TextField select sx={{ mt: 1, minWidth: 240 }} label="Engagement" value={impactEngagement} onChange={(event) => setImpactEngagement(event.target.value)}>
                                {(data.impacts || []).map((row: any) => <MenuItem key={row.engagementId} value={row.engagementId}>{row.engagement?.serviceName || row.engagementId}</MenuItem>)}
                            </TextField>
                            <TextField select sx={{ mt: 1, minWidth: 220 }} label="Relevance" value={impactDecision} onChange={(event) => setImpactDecision(event.target.value)}>
                                {IMPACTS.map((item) => <MenuItem key={item} value={item}>{item.replace(/_/g, ' ')}</MenuItem>)}
                            </TextField>
                            <Button sx={{ mt: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.setMonitoringImpact(signalId, { engagementId: impactEngagement, decision: impactDecision, rationale }), 'Engagement relevance recorded.')}>Save relevance</Button>
                        </Surface>
                        <Surface>
                            <Typography variant="h6" component="h2">Review</Typography>
                            <TextField sx={{ mt: 1 }} label="Assign reviewer user id" value={ownerUserId} onChange={(event) => setOwner(event.target.value)} fullWidth />
                            <Button sx={{ mt: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.assignMonitoringSignal(signalId, { ownerUserId }), 'Reviewer assigned.')}>Assign reviewer</Button>
                            <TextField select sx={{ mt: 2, minWidth: 260 }} label="Triage outcome" value={decision} onChange={(event) => setDecision(event.target.value)}>
                                {TRIAGE.map((item) => <MenuItem key={item} value={item}>{item.replace(/_/g, ' ')}</MenuItem>)}
                            </TextField>
                            <TextField sx={{ mt: 1 }} label="Rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} fullWidth multiline minRows={2} />
                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                                <Button disabled={busy} onClick={() => run(() => intakeAPI.triageMonitoringSignal(signalId, { decision, rationale, materiality: decision === 'ACTION_REQUIRED' ? 'Material for attention' : 'Not residual math', engagementId: impactEngagement }), 'Triage recorded. Residual risk is unchanged.')}>Record triage</Button>
                                <Button disabled={busy} onClick={() => run(() => intakeAPI.escalateMonitoringSignal(signalId, { toUserId: escalateTo || ownerUserId, reason: rationale || 'Needs authorized review', engagementId: impactEngagement }), 'Escalated. Residual risk is unchanged.')}>Escalate</Button>
                                <Button disabled={busy} onClick={() => run(() => intakeAPI.closeMonitoringSignal(signalId, { rationale: rationale || 'No further action' }), 'Closed. No action required.')}>Close / no action</Button>
                            </Stack>
                            <TextField sx={{ mt: 1 }} label="Escalate to user id" value={escalateTo} onChange={(event) => setEscalateTo(event.target.value)} fullWidth />
                        </Surface>
                        <Surface>
                            <Typography variant="h6" component="h2">Finding handoff</Typography>
                            <Typography variant="body2">A signal is not a Finding. Create one only after review.</Typography>
                            <Button sx={{ mt: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.createFindingFromSignal(signalId, { engagementId: impactEngagement, rationale }), 'Finding created from reviewed signal.')}>Create Finding from reviewed signal</Button>
                        </Surface>
                        <Surface>
                            <Typography variant="h6" component="h2">Reassessment recommendation</Typography>
                            <Typography variant="body2">Wave 7 has not started. This records a handoff only.</Typography>
                            <Button sx={{ mt: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.recommendReassessment(signalId, {
                                engagementId: impactEngagement,
                                reason: rationale || 'Material monitoring observation requires later reassessment.',
                                recommendedScope: 'Engagement residual and due-diligence review in Wave 7',
                                triggerType: 'MATERIAL_SECURITY_INCIDENT',
                            }), 'Reassessment recommended / due. Reassessment has not started.')}>Recommend reassessment</Button>
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </PageShell>
    );
}
