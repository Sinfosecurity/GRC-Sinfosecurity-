import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { intakeAPI } from '../services/api';
import { engagementHref } from '../engagement/engagementPaths';

export default function EngagementFindings() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [severity, setSeverity] = useState('HIGH');
    const [determination, setDetermination] = useState('');
    const [rationale, setRationale] = useState('');

    const load = () => {
        setLoading(true);
        intakeAPI.getEngagementRisk(id)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load findings.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [id]);

    const run = async (work: () => Promise<any>, success: string) => {
        setBusy(true);
        setError(null);
        try {
            await work();
            setMessage(success);
            load();
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'The finding action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Findings not available" emptyBody="Complete specialist review first.">
            {data && (
                <Stack spacing={2}>
                    {message && <Alert severity="success">{message}</Alert>}
                    {error && <Alert severity="error">{error}</Alert>}
                    <Surface>
                        <Typography>Third Party: {data.thirdParty?.name}</Typography>
                        <Typography>Engagement: {data.what}</Typography>
                        <Typography>A negative answer is a review signal. It is not a Finding until a specialist records judgment and a reviewer confirms it.</Typography>
                    </Surface>
                    <Surface>
                        <Typography variant="h6">Review signals</Typography>
                        {!(data.reviewSignals || []).length && <Typography variant="body2">No review signals recorded.</Typography>}
                        {(data.reviewSignals || []).map((row: any) => (
                            <Stack key={`${row.assessmentId}-${row.questionId}`} spacing={0.5} sx={{ mt: 1.5 }}>
                                <Typography><strong>{row.title || row.question}</strong></Typography>
                                <Typography variant="body2">Vendor answered {row.vendorAnswer || row.description} · {row.rule || row.draftRuleCode} · not a Finding</Typography>
                                <TextField label="Why this warrants a candidate" value={rationale} onChange={(event) => setRationale(event.target.value)} fullWidth />
                                <Button disabled={busy || !rationale} onClick={() => run(() => intakeAPI.createFindingCandidate(id, {
                                    assessmentId: row.assessmentId,
                                    questionId: row.questionId,
                                    rationale,
                                }), 'Finding Candidate created from specialist judgment.')}>Create Finding Candidate</Button>
                            </Stack>
                        ))}
                    </Surface>
                    <Surface>
                        <Typography variant="h6">Finding Candidates</Typography>
                        <TextField select sx={{ mt: 1, mr: 1, minWidth: 140 }} label="Confirm severity" value={severity} onChange={(event) => setSeverity(event.target.value)}>
                            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                        </TextField>
                        <TextField sx={{ mt: 1 }} label="Determination / dismiss reason" value={determination} onChange={(event) => setDetermination(event.target.value)} fullWidth />
                        {(data.candidates || []).map((row: any) => (
                            <Stack key={row.id} spacing={0.5} sx={{ mt: 1.5 }}>
                                <Typography><strong>{row.title}</strong></Typography>
                                <Typography variant="body2">{row.engagement?.serviceName} · recommended {row.recommendedSeverity}</Typography>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.confirmFinding(id, row.id, { severity, determinationNote: determination }), 'Finding confirmed.')}>Confirm finding</Button>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.dismissCandidate(id, row.id, { reason: determination || 'Reviewed. No finding warranted.' }), 'Candidate dismissed.')}>Dismiss / no finding</Button>
                                </Stack>
                            </Stack>
                        ))}
                        {!(data.candidates || []).length && <Typography variant="body2">No Finding Candidates. Review signals do not become candidates automatically.</Typography>}
                    </Surface>
                    <Surface>
                        <Typography variant="h6">Confirmed Findings</Typography>
                        {(data.findings || []).map((row: any) => (
                            <Stack key={row.id} spacing={0.5} sx={{ mt: 1 }}>
                                <Typography>{row.title} · {row.severity} · {row.status}</Typography>
                                <Typography variant="body2">Control: {row.controlMapping} · Owner: {row.owner || 'Not recorded'} · Responsibility: {row.responsibility || 'Not recorded'}</Typography>
                                <Button onClick={() => navigate(`/findings?issueId=${row.id}&engagementId=${id}`)}>Open finding with Engagement context</Button>
                            </Stack>
                        ))}
                        {!(data.findings || []).length && <Typography variant="body2">No confirmed open Findings.</Typography>}
                        <Button sx={{ mt: 1 }} onClick={() => navigate(engagementHref(id, '/controls'))}>Continue to Controls</Button>
                    </Surface>
                </Stack>
            )}
        </QueryState>
    );
}
