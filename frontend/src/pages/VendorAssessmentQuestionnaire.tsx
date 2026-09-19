import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, FormControlLabel, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { vendorPortalAPI } from '../services/api';
import { formatShortDate, humanizeLabel } from '../utils/humanizeLabel';

function evidenceFileStatus(status?: string | null) {
    if (!status) return null;
    const key = String(status).trim();
    if (key === 'Ready' || key === 'CLEAN' || key === 'Clean') return 'Clean';
    if (key === 'Uploading' || key === 'UPLOADING' || key === 'Uploaded') return 'Uploaded';
    if (key === 'Scanning' || key === 'PENDING' || key === 'PENDING_SCAN') return 'Scanning';
    if (key === 'Blocked' || key === 'Rejected' || key === 'INFECTED' || key === 'QUARANTINED' || key === 'REJECTED') return 'Blocked';
    if (key === 'Unavailable' || key === 'UNKNOWN' || key === 'unknown' || key === 'Security status unavailable') {
        return 'Rejected/unusable';
    }
    const labeled = humanizeLabel(key);
    return labeled === 'Ready' || labeled === 'Clean' ? 'Rejected/unusable' : labeled;
}

function isFiniteChoiceSet(options?: string[]) {
    return Boolean(options?.length) && options!.length <= 8 && options!.every((option) => String(option).length <= 24);
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
    const [draft, setDraft] = useState('');

    const load = () => vendorPortalAPI.assessment(assessmentId)
        .then((response) => setData(response.data.data))
        .catch((err) => setError(err.message || 'Unable to load this questionnaire.'));

    useEffect(() => { load(); }, [assessmentId]);

    const questions = useMemo(() => (data?.questions || []).filter((row: any) => row.visible), [data]);
    const current = questions[index];
    const answeredCount = questions.filter((row: any) => row.response && !/^not answered$/i.test(String(row.response))).length;
    const unansweredCount = questions.filter((row: any) => row.required && (!row.response || /^not answered$/i.test(String(row.response)))).length;
    const requiredEvidenceOutstanding = questions.filter((row: any) => row.evidenceRequired && (!row.hasEvidence || !['Ready', 'Clean', 'CLEAN'].includes(String(row.evidenceStatus || '')))).length;
    const optionalEvidenceOutstanding = questions.filter((row: any) => row.evidenceOptional && !row.evidenceRequired && !row.hasEvidence).length;
    const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
    const progressLabel = `${answeredCount} of ${questions.length} answered`;
    const saveLabel = saving ? 'Saving…' : savedAt ? 'Saved' : data?.lastSaved ? 'Saved' : null;
    const ready = unansweredCount === 0 && requiredEvidenceOutstanding === 0;

    useEffect(() => {
        setDraft(current?.response || '');
    }, [current?.key]);

    const advanceToNextUnanswered = (from: number, rows: any[]) => {
        const next = rows.findIndex((row: any, idx: number) => idx > from && (!row.response || /^not answered$/i.test(String(row.response))));
        if (next >= 0) setIndex(next);
        else if (from < rows.length - 1) setIndex(from + 1);
    };

    const save = async (response?: string, thenAdvance = false) => {
        if (!current || current.locked) return false;
        const value = String(response ?? draft ?? current.response ?? '').trim();
        if (!value) return false;
        setSaving(true);
        setError(null);
        try {
            const next = await vendorPortalAPI.saveResponse(assessmentId, { questionKey: current.key, response: value });
            setData(next.data.data);
            setSavedAt(new Date().toISOString());
            if (thenAdvance) advanceToNextUnanswered(index, (next.data.data.questions || []).filter((row: any) => row.visible));
            return true;
        } catch (err: any) {
            setError(err.message || 'Unable to save. Your last answer is still on this page.');
            return false;
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
            setSavedAt(new Date().toISOString());
        } catch (err: any) {
            setError(err.message || 'Unable to upload that file.');
        } finally {
            setSaving(false);
        }
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!ready) {
            setError(requiredEvidenceOutstanding
                ? `Assessment not ready to submit. ${requiredEvidenceOutstanding} required evidence item${requiredEvidenceOutstanding === 1 ? '' : 's'} ${requiredEvidenceOutstanding === 1 ? 'is' : 'are'} outstanding.`
                : `Assessment not ready to submit. ${unansweredCount} required question${unansweredCount === 1 ? '' : 's'} remain.`);
            return;
        }
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

    const showEvidence = Boolean(current.evidenceRequired || current.evidenceOptional || current.expectedEvidence);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f6f3ee', px: { xs: 2, md: 6 }, py: 4 }}>
            <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }}>
                <Button onClick={() => navigate('/vendor-assessment')}>All assessments</Button>
                <Typography variant="h4">{data.name || 'Due-Diligence Assessment'}</Typography>
                <Typography>Due {formatShortDate(data.dueDate)} · {saveLabel || `Last saved ${formatShortDate(savedAt || data.lastSaved)}`}</Typography>
                <Typography variant="body2">{progressLabel}. Required questions must be answered before submit. Optional evidence is reviewed later and is not an automatic finding.</Typography>
                <LinearProgress variant="determinate" value={progress} aria-label={`Questionnaire progress ${progressLabel}`} sx={{ height: 8, borderRadius: 999 }} />
                {error && <Alert severity="error">{error}</Alert>}
                {data.submitted && <Alert severity="success">Your due-diligence assessment was submitted. Answers are locked except through an approved clarification.</Alert>}
                <Box sx={{ bgcolor: 'white', p: 2.5, borderRadius: 2 }}>
                    <Typography variant="overline">{current.section}</Typography>
                    <Typography variant="h6">{current.question}</Typography>
                    {current.guidance && <Typography variant="body2" sx={{ mb: 2 }}>{current.guidance}</Typography>}
                    {isFiniteChoiceSet(current.options) ? (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                            {current.options.map((option: string) => (
                                <Button
                                    key={option}
                                    variant={current.response === option ? 'contained' : 'outlined'}
                                    disabled={current.locked || saving}
                                    onClick={() => save(option, true)}
                                >
                                    {option}
                                </Button>
                            ))}
                        </Stack>
                    ) : current.options?.length ? (
                        <Stack spacing={1} sx={{ mt: 1 }}>
                            {current.options.map((option: string) => (
                                <Button
                                    key={option}
                                    variant={current.response === option ? 'contained' : 'outlined'}
                                    disabled={current.locked || saving}
                                    onClick={() => save(option, true)}
                                    sx={{ justifyContent: 'flex-start' }}
                                >
                                    {option}
                                </Button>
                            ))}
                        </Stack>
                    ) : (
                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            label="Your answer"
                            value={draft}
                            disabled={current.locked}
                            onChange={(event) => setDraft(event.target.value)}
                            onBlur={() => save()}
                        />
                    )}
                    {saveLabel && <Typography variant="body2" sx={{ mt: 1 }}>{saveLabel}</Typography>}
                    {current.response && showEvidence && (
                        <Stack spacing={1} sx={{ mt: 2 }}>
                            <Typography fontWeight={700}>
                                {current.evidenceRequired ? 'Supporting evidence required' : 'Supporting evidence optional'}
                            </Typography>
                            <Typography variant="body2">
                                {current.expectedEvidence || 'Upload the document that supports this answer. Missing optional evidence is preserved for specialist review and is not an automatic finding.'}
                            </Typography>
                            <Typography variant="body2">
                                {evidenceFileStatus(current.evidenceStatus)
                                    ? `File status: ${evidenceFileStatus(current.evidenceStatus)}`
                                    : 'No file uploaded yet.'}
                            </Typography>
                            {!current.locked && <Button component="label" disabled={saving}>Upload evidence<input hidden type="file" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} /></Button>}
                        </Stack>
                    )}
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</Button>
                    <Button disabled={index >= questions.length - 1} onClick={async () => {
                        const ok = current.locked || !draft || await save();
                        if (ok) setIndex(index + 1);
                    }}>Next</Button>
                    <Button onClick={() => {
                        const next = questions.findIndex((row: any, idx: number) => idx > index && (!row.response || /^not answered$/i.test(String(row.response))));
                        if (next >= 0) setIndex(next);
                    }}>Next unanswered</Button>
                </Stack>
                {!data.submitted && (
                    <Stack component="form" spacing={1.5} onSubmit={submit} sx={{ bgcolor: 'white', p: 2.5, borderRadius: 2 }}>
                        <Typography variant="h6">Review before you submit</Typography>
                        <Typography variant="body2">
                            {progressLabel} · {unansweredCount} required unanswered · {requiredEvidenceOutstanding} required evidence outstanding
                            {optionalEvidenceOutstanding ? ` · ${optionalEvidenceOutstanding} optional evidence still open for specialist review` : ''}.
                        </Typography>
                        {!ready && (
                            <Alert severity="warning">
                                Assessment not ready to submit.
                                {requiredEvidenceOutstanding > 0
                                    ? ` ${requiredEvidenceOutstanding} required evidence item${requiredEvidenceOutstanding === 1 ? '' : 's'} ${requiredEvidenceOutstanding === 1 ? 'is' : 'are'} outstanding.`
                                    : ` ${unansweredCount} required question${unansweredCount === 1 ? '' : 's'} remain.`}
                            </Alert>
                        )}
                        {ready && optionalEvidenceOutstanding > 0 && (
                            <Alert severity="info">Optional evidence may remain outstanding. Specialists review those gaps. Missing optional evidence is not an automatic finding.</Alert>
                        )}
                        <Typography variant="body2">{data.attestation}</Typography>
                        <FormControlLabel control={<Checkbox checked={attested} onChange={(event) => setAttested(event.target.checked)} />} label="I attest that I am authorized to submit this assessment." />
                        <Button type="submit" variant="contained" disabled={saving || !attested || !ready}>Submit assessment</Button>
                        {!ready && <Button onClick={() => {
                            const next = questions.findIndex((row: any) => (row.required && !row.response) || (row.evidenceRequired && !row.hasEvidence));
                            if (next >= 0) setIndex(next);
                        }}>Review missing evidence</Button>}
                    </Stack>
                )}
            </Stack>
        </Box>
    );
}
