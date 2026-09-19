import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { requesterAPI } from '../services/api';
import { color } from '../design/tokens';

export default function RequesterActions() {
    const [items, setItems] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [response, setResponse] = useState<Record<string, string>>({});
    const [pending, setPending] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const load = () => {
        requesterAPI.actions()
            .then((res) => setItems(res.data.data.items || []))
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load actions.'));
    };

    useEffect(() => { load(); }, []);

    const submit = async (event: FormEvent, item: any) => {
        event.preventDefault();
        setPending(item.id);
        setError(null);
        try {
            await requesterAPI.respond(item.publicId, { informationRequestId: item.id, response: response[item.id] });
            setMessage('Your response was sent to the GRC team.');
            setResponse((current) => ({ ...current, [item.id]: '' }));
            load();
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Unable to send the response.');
        } finally {
            setPending(null);
        }
    };

    return (
        <Stack spacing={2}>
            <Typography variant="h1" sx={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 32 }}>Actions required</Typography>
            <Typography sx={{ color: color.inkMuted }}>Answer GRC questions here. You do not need the GRC application.</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            {message && <Alert severity="success">{message}</Alert>}
            {!items.length && !error && <Typography>Nothing needs your attention right now.</Typography>}
            {items.map((item) => (
                <Stack key={item.id} component="form" onSubmit={(event) => submit(event, item)} sx={{ bgcolor: color.surface, border: `1px solid ${color.line}`, borderRadius: 2, p: 2 }} spacing={1.5}>
                    <Typography fontWeight={700}>{item.publicId} · {item.proposedThirdPartyName}</Typography>
                    <Typography>{item.proposedServiceName}</Typography>
                    <Typography><strong>Requested by GRC</strong> {item.requestedAt ? `on ${new Date(item.requestedAt).toLocaleString()}` : ''}</Typography>
                    <Typography>{item.requestNote}</Typography>
                    <TextField id={`response-${item.id}`} required label="Your response" value={response[item.id] || ''} onChange={(event) => setResponse((current) => ({ ...current, [item.id]: event.target.value }))} multiline minRows={3} inputProps={{ 'aria-label': 'Your response' }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Button type="submit" variant="contained" disabled={pending === item.id}>{pending === item.id ? 'Sending…' : 'Send response'}</Button>
                        <Button component={Link} to={`/request/${item.publicId}`}>Open request</Button>
                    </Stack>
                </Stack>
            ))}
        </Stack>
    );
}
