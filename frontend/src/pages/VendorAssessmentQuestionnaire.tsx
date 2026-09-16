import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, FormControlLabel, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { vendorPortalAPI } from '../services/api';
import { formatShortDate, humanizeLabel } from '../utils/humanizeLabel';

function evidenceFileStatus(status?: string | null) {
    if (!status) return null;
    const key = String(status).trim();
    if (key === 'Ready' || key === 'CLEAN') return 'Ready';
    if (key === 'Uploading' || key === 'UPLOADING') return 'Uploading';
    if (key === 'Scanning' || key === 'PENDING' || key === 'PENDING_SCAN') return 'Scanning';
    if (key === 'Blocked' || key === 'Rejected' || key === 'INFECTED' || key === 'QUARANTINED' || key === 'REJECTED') return 'Rejected';
    if (key === 'Unavailable' || key === 'UNKNOWN' || key === 'unknown' || key === 'Security status unavailable') {
        return 'Security status unavailable';
    }
    const labeled = humanizeLabel(key);
    return labeled === 'Ready' ? 'Security status unavailable' : labeled;
}

export default function VendorAssessmentQuestionnaire() {
    const { assessmentId = '' } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [index, setIndex] = useState(0);
    const [attested, setAttested] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);

    const load = () => vendorPortalAPI.assessment(assessmentId)
        .then((response) => setData(response.data.data))
        .catch((err) => setError(err.message || 'Unable to load this questionnaire.'));

    useEffect(() => { load(); }, [assessmentId]);

    const questions = useMemo(() => (data?.questions || []).filter((row: any) => row.visible), [data]);
    const current = questions[index];
    const answeredCount = questions.filter((row: any) => row.response && !/^not answered$/i.test(String(row.response))).length;
    const unansweredCount = questions.length - answeredCount;
    const evidenceOutstanding = questions.filter((row: any) => row.evidenceRequired && !row.evidenceStatus).length;
    const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
    const progressLabel = `${answeredCount} of ${questions.length} answered`;
    const saveLabel = saving ? 'Saving…' : savedAt ? 'Saved' : data?.lastSaved ? 'Saved' : null;

    const save = async (response?: string) => {
        if (!current || current.locked) return;
        setSaving(true);
        setError(null);
        try {
            const next = await vendorPortalAPI.saveResponse(assessmentId, { questionKey: current.key, response: response ?? current.response });
            setData(next.data.data);
            setSavedAt(new Date().toISOString());
        } catch (err: any) {
            setError(err.message || 'Unable to save.');
        } finally {
            setSaving(false);
        }
    };

    const upload = async (file: File) => {
        const form = new FormData();
        form.append('file', file);
        form.append('questionKey', current.key);
        setSaving(true);
        try {
            await vendorPortalAPI.uploadEvidence(assessmentId, form);
            await load();
        } catch (err: any) {
            setError(err.message || 'Unable to upload that file.');
        } finally {
            setSaving(false);
        }
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        try {
            await vendorPortalAPI.submit(assessmentId, attested);
            await load();
        } catch (err: any) {
            setError(err.message || 'This assessment is not ready to submit.');
        } finally {
            setSaving(false);
        }
    };

    if (error && !data) return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;
    if (!data || !current) return null;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f6f3ee', px: { xs: 2, md: 6 }, py: 4 }}>
            <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }}>
                <Button onClick={() => navigate('/vendor-assessment')}>All assessments</Button>
                <Typography variant="h4">{data.name}</Typography>
                <Typography>Due {formatShortDate(data.dueDate)} · {saveLabel || `Last saved ${formatShortDate(savedAt || data.lastSaved)}`}</Typography>
                <Typography variant="body2">{progressLabel}. Not answered does not count as complete. Not applicable is excluded from control credit later.</Typography>
                <LinearProgress variant="determinate" value={progress} aria-label={`Questionnaire progress ${progressLabel}`} sx={{ height: 8, borderRadius: 999 }} />
                {error && <Alert severity="error">{error}. Your last successful save is still on this page if one exists.</Alert>}
                {data.submitted && <Alert severity="success">Your assessment was submitted successfully. The requesting organization will review your responses and may request clarification.</Alert>}
                <Box sx={{ bgcolor: 'white', p: 2.5, borderRadius: 2 }}>
                    <Typography variant="overline">{current.section}</Typography>
                    <Typography variant="h6">{current.question}</Typography>
                    {current.guidance && <Typography variant="body2" sx={{ mb: 2 }}>{current.guidance}</Typography>}
                    {current.options?.length ? (
                        <TextField
                            select
                            fullWidth
                            label="Your answer"
                            value={current.response}
                            disabled={current.locked}
                            onChange={(event) => {
                                current.response = event.target.value;
                                save(event.target.value);
                            }}
                        >
                            {current.options.map((option: string) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                        </TextField>
                    ) : (
                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            label="Your answer"
                            value={current.response}
                            disabled={current.locked}
                            onChange={(event) => { current.response = event.target.value; setData({ ...data }); }}
                            onBlur={() => save()}
                        />
                    )}
                    {current.evidenceRequired && (
                        <Stack spacing={1} sx={{ mt: 2 }}>
                            <Typography>Evidence required</Typography>
                            <Typography variant="body2">{evidenceFileStatus(current.evidenceStatus) ? `File status: ${evidenceFileStatus(current.evidenceStatus)}` : 'Upload the supporting file for this question.'}</Typography>
                            {!current.locked && <Button component="label" disabled={saving}>Upload file<input hidden type="file" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} /></Button>}
                        </Stack>
                    )}
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</Button>
                    <Button disabled={index >= questions.length - 1} onClick={() => { save(); setIndex(index + 1); }}>Save and continue</Button>
                    <Button onClick={() => {
                        const next = questions.findIndex((row: any, idx: number) => idx > index && (!row.response || /^not answered$/i.test(String(row.response))));
                        if (next >= 0) setIndex(next);
                    }}>Next unanswered</Button>
                </Stack>
                {!data.submitted && (
                    <Stack component="form" spacing={1.5} onSubmit={submit} sx={{ bgcolor: 'white', p: 2.5, borderRadius: 2 }}>
                        <Typography variant="h6">Review before you submit</Typography>
                        <Typography variant="body2">{progressLabel} · {unansweredCount} not answered · {evidenceOutstanding} evidence still outstanding.</Typography>
                        {unansweredCount > 0 && <Alert severity="warning">Submit is available after attestation, but unanswered questions will not receive control credit.</Alert>}
                        <Typography variant="body2">{data.attestation}</Typography>
                        <FormControlLabel control={<Checkbox checked={attested} onChange={(event) => setAttested(event.target.checked)} />} label="I attest that I am authorized to submit this assessment." />
                        <Button type="submit" variant="contained" disabled={saving || !attested}>Submit assessment</Button>
                    </Stack>
                )}
            </Stack>
        </Box>
    );
}
