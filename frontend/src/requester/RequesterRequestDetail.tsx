import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { requesterAPI } from '../services/api';
import { color } from '../design/tokens';
import ClarificationAttachments, { type ClarificationAttachment } from '../components/ClarificationAttachments';

export default function RequesterRequestDetail() {
    const { publicId = '' } = useParams();
    const [row, setRow] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [response, setResponse] = useState('');
    const [attachments, setAttachments] = useState<ClarificationAttachment[]>([]);
    const [saving, setSaving] = useState(false);

    const load = () => {
        requesterAPI.get(publicId)
            .then((res) => setRow(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load this request.'));
    };

    useEffect(() => { load(); }, [publicId]);

    const open = row?.informationRequests?.find((item: any) => !item.respondedAt);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        try {
            const updated = await requesterAPI.respond(publicId, { informationRequestId: open.id, response });
            setRow(updated.data.data);
            setResponse('');
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Unable to send the response.');
        } finally {
            setSaving(false);
        }
    };

    if (error && !row) return <Alert severity="error">{error}</Alert>;
    if (!row) return <Typography>Loading request…</Typography>;

    return (
        <Stack spacing={2} sx={{ bgcolor: color.surface, border: `1px solid ${color.line}`, borderRadius: 2, p: { xs: 2, md: 4 } }}>
            <Typography variant="h1" sx={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 32 }}>{row.publicId}</Typography>
            <Typography>{row.proposedThirdPartyName} · {row.proposedServiceName}</Typography>
            <Typography><strong>Status:</strong> {row.requesterStatus}</Typography>
            <Typography><strong>Need:</strong> {row.businessPurpose}</Typography>
            {row.matchedThirdPartyName && <Typography><strong>Third party identified:</strong> {row.matchedThirdPartyName}</Typography>}
            {row.engagementPublicId && <Typography><strong>Engagement:</strong> {row.engagementPublicId}</Typography>}
            <Typography sx={{ color: color.inkMuted }}>{row.nextStep}</Typography>
            {row.informationRequests?.map((item: any) => (
                <Stack key={item.id} spacing={0.75} sx={{ borderTop: `1px solid ${color.line}`, pt: 1.5 }}>
                    <Typography fontWeight={700}>GRC question · {new Date(item.requestedAt).toLocaleString()}</Typography>
                    <Typography>{item.requestNote}</Typography>
                    {item.response && <Typography><strong>Your response:</strong> {item.response}</Typography>}
                    <ClarificationAttachments attachments={item.attachments || []} />
                </Stack>
            ))}
            {open && (
                <Stack component="form" onSubmit={submit} spacing={1.5}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField id="request-detail-response" required label="Your response" value={response} onChange={(event) => setResponse(event.target.value)} multiline minRows={3} inputProps={{ 'aria-label': 'Your response' }} />
                    <ClarificationAttachments
                        attachments={[...(open.attachments || []), ...attachments]}
                        onUpload={async (file) => {
                            const form = new FormData();
                            form.append('file', file);
                            form.append('informationRequestId', open.id);
                            const uploaded = await requesterAPI.uploadAttachment(publicId, form);
                            setAttachments((current) => [...current, uploaded.data.data]);
                        }}
                    />
                    <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Sending…' : 'Send response'}</Button>
                </Stack>
            )}
        </Stack>
    );
}
