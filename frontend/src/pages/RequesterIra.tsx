import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { iraAPI } from '../services/api';
import { color } from '../design/tokens';

type Question = {
    key: string;
    part: 'A' | 'B';
    question: string;
    multiple?: boolean;
    options: Array<{ value: string; label: string }>;
};

export default function RequesterIra() {
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [attested, setAttested] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!token) return;
        iraAPI.get(token)
            .then((response) => {
                setData(response.data.data);
                setAnswers(response.data.data.answers || {});
            })
            .catch((err: any) => setError(err.message || 'This link is not valid.'));
    }, [token]);

    const questions: Question[] = data?.questions || [];
    const readOnly = Boolean(data?.readOnly || data?.submitted);

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

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            const response = await iraAPI.save(token, answers);
            setData(response.data.data);
        } catch (err: any) {
            setError(err.message || 'Could not save.');
        } finally {
            setSaving(false);
        }
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const response = await iraAPI.submit(token, answers, attested);
            setData(response.data.data);
        } catch (err: any) {
            setError(err.message || 'Could not submit.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: color.workspace, px: 2, py: 6 }}>
            <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
                <Typography variant="overline" sx={{ color: color.goldInk, fontWeight: 700 }}>Supreme Third Party</Typography>
                <Typography variant="h4">Inherent risk questions</Typography>
                <Typography>
                    {data?.vendorName || 'This engagement'} — answer only what you know. Don&apos;t know is allowed. The vendor will not see this.
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                {data?.submitted && <Alert severity="success">Submitted. GRC will review and confirm the tier. You can close this page.</Alert>}
                <Stack component="form" spacing={3} onSubmit={submit}>
                    {['A', 'B'].map((part) => (
                        <Box key={part}>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>
                                {part === 'A' ? 'What will this vendor do?' : 'How bad if it fails?'}
                            </Typography>
                            <Stack spacing={1.5}>
                                {questions.filter((question) => question.part === part).map((question) => (
                                    question.multiple ? (
                                        <Box key={question.key}>
                                            <Typography variant="subtitle2">{question.question}</Typography>
                                            {question.options.map((option) => (
                                                <FormControlLabel
                                                    key={option.value}
                                                    control={<Checkbox
                                                        checked={String(answers[question.key] || '').split('|').includes(option.value)}
                                                        disabled={readOnly}
                                                        onChange={() => setValue(question.key, option.value, true)}
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
                                            disabled={readOnly}
                                            onChange={(event) => setValue(question.key, event.target.value)}
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
                    {!readOnly && (
                        <>
                            <FormControlLabel
                                control={<Checkbox checked={attested} onChange={(event) => setAttested(event.target.checked)} />}
                                label="I confirm these answers are accurate for this engagement."
                            />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <Button disabled={saving} onClick={save}>Save and continue later</Button>
                                <Button type="submit" variant="contained" disabled={saving || !attested}>Submit</Button>
                            </Stack>
                        </>
                    )}
                </Stack>
            </Stack>
        </Box>
    );
}
