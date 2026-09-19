import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import { PageShell } from '../components/experience/ExperienceKit';
import { intakeAPI } from '../services/api';

export default function AssessmentReview() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [questionKey, setQuestionKey] = useState('');
    const [conclusion, setConclusion] = useState('Review complete');
    const [observation, setObservation] = useState('');
    const [busy, setBusy] = useState(false);

    const load = () => {
        setLoading(true);
        intakeAPI.getAssessmentReview(id)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load specialist review.'))
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

    const clarify = (event: FormEvent) => {
        event.preventDefault();
        const item = (data.items || []).find((row: any) => row.questionKey === questionKey);
        run(() => intakeAPI.requestVendorClarification(id, {
            assessmentId: item?.assessmentId,
            questionKeys: [questionKey],
        }), 'Vendor clarification requested.');
    };

    const complete = (event: FormEvent) => {
        event.preventDefault();
        run(() => intakeAPI.completeSpecialistReview(id, { conclusion, observation }), 'Specialist review recorded. Candidates are not findings until confirmed.');
    };

    return (
        <PageShell>
            <PageHeader
                crumbs={[
                    { label: 'Third Parties', to: '/vendor-management' },
                    { label: data?.engagement?.publicId || 'Engagement', to: `/third-parties/engagements/${id}` },
                    { label: 'Specialist review' },
                ]}
                title={data ? `Specialist review · ${data.what}` : 'Specialist review'}
                description={data?.nextAction}
                meta={data ? <StatusBadge kind="plain" label={data.stateLabel} /> : undefined}
            />
            <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Review not found" emptyBody="Wait for the vendor to submit.">
                {data && (
                    <Stack spacing={2}>
                        {message && <Alert severity="success">{message}</Alert>}
                        {error && <Alert severity="error">{error}</Alert>}
                        <Surface>
                            <Typography><strong>What:</strong> {data.what}</Typography>
                            <Typography><strong>Why:</strong> {data.why}</Typography>
                            <Typography><strong>Confirmed tier:</strong> {data.confirmedTier}</Typography>
                            <Typography><strong>Authoritative findings:</strong> {data.authoritativeFindings || 0}</Typography>
                            <Typography><strong>Residual risk calculated:</strong> No until Engagement risk is calculated</Typography>
                            <Button sx={{ mt: 1 }} onClick={() => navigate(`/third-parties/engagements/${id}/risk`)}>Open Engagement risk</Button>
                        </Surface>
                        {(data.items || []).map((item: any) => (
                            <Surface key={`${item.assessmentId}-${item.questionKey}`}>
                                <Typography><strong>{item.assessmentName}</strong></Typography>
                                <Typography>{item.question}</Typography>
                                <Typography>Vendor answer: {item.vendorAnswer || 'Not answered'}</Typography>
                                <Typography>Evidence: {item.evidence ? `${item.evidence.filename} · ${item.evidence.scanLabel}` : 'None'}</Typography>
                                <Button sx={{ mt: 1 }} onClick={() => setQuestionKey(item.questionKey)}>Select for clarification</Button>
                            </Surface>
                        ))}
                        <Surface>
                        <Stack component="form" onSubmit={clarify} spacing={1}>
                            <Typography variant="h6">Request vendor clarification</Typography>
                            <TextField sx={{ mt: 1 }} label="Question key" value={questionKey} onChange={(event) => setQuestionKey(event.target.value)} fullWidth />
                            <Button sx={{ mt: 1 }} type="submit" disabled={busy || !questionKey}>Request clarification</Button>
                        </Stack>
                        </Surface>
                        <Surface>
                        <Stack component="form" onSubmit={complete} spacing={1}>
                            <Typography variant="h6">Complete review</Typography>
                            <TextField select sx={{ mt: 1 }} label="Conclusion" value={conclusion} onChange={(event) => setConclusion(event.target.value)} fullWidth>
                                {['Response sufficient', 'Evidence sufficient', 'Evidence missing', 'Review complete'].map((item) => (
                                    <MenuItem key={item} value={item}>{item}</MenuItem>
                                ))}
                            </TextField>
                            <TextField sx={{ mt: 1 }} label="Observation for Wave 4" value={observation} onChange={(event) => setObservation(event.target.value)} fullWidth />
                            <Button sx={{ mt: 1 }} type="submit" disabled={busy}>Mark review complete</Button>
                        </Stack>
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </PageShell>
    );
}
