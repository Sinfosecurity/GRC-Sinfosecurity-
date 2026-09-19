import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { requesterAPI } from '../services/api';
import { color } from '../design/tokens';

export default function RequesterIraClarification() {
    const { id = '' } = useParams();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        requesterAPI.getIra(id)
            .then((res) => {
                setData(res.data.data);
                const next: Record<string, string> = {};
                for (const item of res.data.data.clarification?.items || []) next[item.questionKey] = item.previousAnswerValue || '';
                setAnswers(next);
            })
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to open this clarification.'));
    }, [id]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await requesterAPI.submitIraClarification(id, {
                responses: (data?.clarification?.items || []).map((item: { questionKey: string }) => ({
                    questionKey: item.questionKey,
                    updatedAnswer: answers[item.questionKey],
                    comment: comments[item.questionKey],
                })),
            });
            setData(res.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Unable to submit the clarification.');
        } finally {
            setSaving(false);
        }
    };

    const items = data?.clarification?.items || [];

    return (
        <Stack spacing={2} component="form" onSubmit={submit}>
            <Typography variant="h1" sx={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 32 }}>Risk assessment clarification</Typography>
            {data && (
                <Typography sx={{ color: color.inkMuted }}>
                    {data.thirdPartyName} · {data.serviceName}. TPRM asked a follow-up. Internal analyst notes are not shown beyond the question they asked you.
                </Typography>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {data && !items.length && <Alert severity="success">{data.requesterStatus}</Alert>}
            {items.map((item: any) => (
                <Stack key={item.id} spacing={1} sx={{ bgcolor: color.surface, border: `1px solid ${color.line}`, borderRadius: 2, p: 2 }}>
                    <Typography fontWeight={700}>{item.question}</Typography>
                    <Typography><strong>Your previous answer:</strong> {item.previousAnswer || 'Not recorded'}</Typography>
                    <Typography><strong>TPRM clarification request:</strong> {item.analystNote}</Typography>
                    <TextField
                        required
                        label="Updated answer"
                        value={answers[item.questionKey] || ''}
                        onChange={(event) => setAnswers((current) => ({ ...current, [item.questionKey]: event.target.value }))}
                        inputProps={{ 'aria-label': `Updated answer for ${item.question}` }}
                    />
                    <TextField
                        label="Optional comment"
                        value={comments[item.questionKey] || ''}
                        onChange={(event) => setComments((current) => ({ ...current, [item.questionKey]: event.target.value }))}
                    />
                </Stack>
            ))}
            {Boolean(items.length) && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Submitting…' : 'Submit clarification'}</Button>
                    <Button component={Link} to="/request/actions">Back to actions</Button>
                </Stack>
            )}
        </Stack>
    );
}
