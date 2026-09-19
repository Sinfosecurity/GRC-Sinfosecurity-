import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { requesterAPI } from '../services/api';
import { color } from '../design/tokens';
import IraJurisdictionFields from '../components/IraJurisdictionFields';

type Question = {
    key: string;
    part: 'A' | 'B';
    question: string;
    multiple?: boolean;
    input?: 'choice' | 'jurisdictions';
    options: Array<{ value: string; label: string }>;
};

export default function RequesterEngagementIra() {
    const { id = '' } = useParams();
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [attested, setAttested] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        requesterAPI.getIra(id)
            .then((res) => {
                setData(res.data.data);
                setAnswers(res.data.data.answers || {});
            })
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to open this risk assessment.'));
    }, [id]);

    const questions: Question[] = (data?.form?.parts || []).flatMap((part: { questions: Question[] }) => part.questions || []);
    const readOnly = Boolean(data && data.status !== 'REQUIRED' && data.status !== 'IN_PROGRESS');

    const setValue = (key: string, value: string, multiple?: boolean) => {
        if (readOnly) return;
        if (!multiple) {
            setAnswers({ ...answers, [key]: value });
            return;
        }
        const current = String(answers[key] || '').split('|').filter(Boolean);
        const next = value === 'dont_know'
            ? ['dont_know']
            : current.includes(value)
                ? current.filter((item) => item !== value && item !== 'dont_know')
                : [...current.filter((item) => item !== 'dont_know'), value];
        setAnswers({ ...answers, [key]: next.join('|') });
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await requesterAPI.submitIra(id, { answers, attested: true });
            setData(res.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Unable to submit the risk assessment.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Stack spacing={2}>
            <Typography variant="h1" sx={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 32 }}>Complete risk assessment</Typography>
            {data && (
                <>
                    <Typography sx={{ color: color.inkMuted }}>{data.why}</Typography>
                    <Box sx={{ bgcolor: color.surface, border: `1px solid ${color.line}`, borderRadius: 2, p: 2 }}>
                        <Typography><strong>Third party:</strong> {data.thirdPartyName}</Typography>
                        <Typography><strong>Service / engagement:</strong> {data.serviceName} · {data.engagementPublicId}</Typography>
                        <Typography><strong>Business purpose:</strong> {data.businessPurpose}</Typography>
                        <Typography><strong>What you should know:</strong> {data.expectedKnowledge}</Typography>
                    </Box>
                </>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {data && readOnly && <Alert severity="success">{data.requesterStatus}. The GRC team will contact you if clarification is required.</Alert>}
            {data && !readOnly && (
                <Stack component="form" spacing={3} onSubmit={submit}>
                    {(data.form?.parts || []).map((part: { id: string; title: string; questions: Question[] }) => (
                        <Box key={part.id}>
                            <Typography variant="h2" sx={{ fontSize: 22, mb: 1.5 }}>{part.title}</Typography>
                            <Stack spacing={1.5}>
                                {part.questions.map((question) => (
                                    question.input === 'jurisdictions' || question.key === 'a6' ? (
                                        <IraJurisdictionFields
                                            key={question.key}
                                            storageValue={answers.a6_storage || ''}
                                            processingValue={answers.a6_processing || ''}
                                            countries={data.countries || data.form?.countries || []}
                                            disabled={readOnly}
                                            onChange={(key, value) => setAnswers((current) => ({ ...current, [key]: value, a6: value.includes('dont_know') ? 'dont_know' : current.a6 }))}
                                        />
                                    ) : question.multiple ? (
                                        <Box key={question.key}>
                                            <Typography variant="subtitle2">{question.question}</Typography>
                                            {question.options.map((option) => (
                                                <FormControlLabel
                                                    key={option.value}
                                                    control={<Checkbox
                                                        checked={String(answers[question.key] || '').split('|').includes(option.value)}
                                                        onChange={() => setValue(question.key, option.value, true)}
                                                        inputProps={{ 'aria-label': `${question.question} ${option.label}` }}
                                                    />}
                                                    label={option.label}
                                                />
                                            ))}
                                        </Box>
                                    ) : (
                                        <TextField
                                            key={question.key}
                                            select
                                            fullWidth
                                            label={question.question}
                                            value={answers[question.key] || ''}
                                            onChange={(event) => setValue(question.key, event.target.value)}
                                            inputProps={{ 'aria-label': question.question }}
                                        >
                                            <MenuItem value="">Not recorded</MenuItem>
                                            {question.options.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                            ))}
                                        </TextField>
                                    )
                                ))}
                            </Stack>
                        </Box>
                    ))}
                    <FormControlLabel
                        control={<Checkbox checked={attested} onChange={(event) => setAttested(event.target.checked)} />}
                        label="I confirm these answers are accurate for this service."
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Button type="submit" variant="contained" disabled={saving || !attested || questions.some((question) => question.input === 'jurisdictions' || question.key === 'a6' ? !answers.a6_storage && !answers.a6 : !answers[question.key])}>
                            {saving ? 'Submitting…' : 'Submit risk assessment'}
                        </Button>
                        <Button component={Link} to="/request/actions">Back to actions</Button>
                    </Stack>
                </Stack>
            )}
        </Stack>
    );
}
