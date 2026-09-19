import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { intakeAPI } from '../services/api';
import { engagementHref } from '../engagement/engagementPaths';

export default function EngagementEvidence() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [conclusion, setConclusion] = useState('Review complete');
    const [observation, setObservation] = useState('');
    const [questionKey, setQuestionKey] = useState('');
    const [busy, setBusy] = useState(false);

    const load = () => {
        setLoading(true);
        intakeAPI.getAssessmentReview(id)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load evidence.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [id]);

    const run = async (work: () => Promise<any>, success: string) => {
        setBusy(true);
        setError(null);
        try {
            const res = await work();
            setData(res.data.data);
            setMessage(success);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'The review action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Evidence not available" emptyBody="Wait for the vendor to submit.">
            {data && (
                <Stack spacing={2}>
                    {message && <Alert severity="success">{message}</Alert>}
                    {error && <Alert severity="error">{error}</Alert>}
                    <Surface>
                        <Typography><strong>Authoritative state:</strong> {data.stateLabel} ({data.state})</Typography>
                        <Typography><strong>Next action:</strong> {data.nextAction}</Typography>
                        {data.outstandingReviewDomains?.length > 0 && (
                            <Typography>Outstanding specialist domains: {data.outstandingReviewDomains.join(', ')}</Typography>
                        )}
                        <Typography><strong>Third Party:</strong> {data.thirdParty?.name}</Typography>
                        <Typography><strong>Confirmed inherent:</strong> {data.confirmedTier || 'Not yet assessed'}</Typography>
                    </Surface>
                    {(data.items || []).map((item: any) => (
                        <Surface key={`${item.assessmentId}-${item.questionKey}`}>
                            <Typography><strong>{item.assessmentName}</strong></Typography>
                            <Typography>{item.question}</Typography>
                            <Typography>Vendor answer: {item.vendorAnswer || 'Not answered'}</Typography>
                            <Typography>Evidence: {item.evidence ? `${item.evidence.filename} · ${item.evidence.scanLabel}` : 'None recorded'}</Typography>
                            <Button sx={{ mt: 1 }} onClick={() => setQuestionKey(item.questionKey)}>Select for clarification</Button>
                        </Surface>
                    ))}
                    <Surface>
                        <Stack component="form" onSubmit={(event: FormEvent) => {
                            event.preventDefault();
                            const item = (data.items || []).find((row: any) => row.questionKey === questionKey);
                            run(() => intakeAPI.requestVendorClarification(id, {
                                assessmentId: item?.assessmentId,
                                questionKeys: [questionKey],
                            }), 'Vendor clarification requested.');
                        }} spacing={1}>
                            <Typography variant="h6">Request vendor clarification</Typography>
                            <TextField label="Question key" value={questionKey} onChange={(event) => setQuestionKey(event.target.value)} fullWidth />
                            <Button type="submit" disabled={busy || !questionKey}>Request clarification</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <Stack component="form" onSubmit={(event: FormEvent) => {
                            event.preventDefault();
                            run(() => intakeAPI.completeSpecialistReview(id, { conclusion, observation }), 'Specialist review recorded. Finding Candidates are created only by assessor judgment.');
                        }} spacing={1}>
                            <Typography variant="h6">Complete specialist review</Typography>
                            <TextField select label="Conclusion" value={conclusion} onChange={(event) => setConclusion(event.target.value)} fullWidth>
                                {['Response sufficient', 'Evidence sufficient', 'Evidence missing', 'Review complete'].map((item) => (
                                    <MenuItem key={item} value={item}>{item}</MenuItem>
                                ))}
                            </TextField>
                            <TextField label="Observation" value={observation} onChange={(event) => setObservation(event.target.value)} fullWidth />
                            <Button type="submit" disabled={busy}>Mark review complete</Button>
                            <Button onClick={() => navigate(engagementHref(id, '/findings'))}>Continue to Findings</Button>
                        </Stack>
                    </Surface>
                </Stack>
            )}
        </QueryState>
    );
}
