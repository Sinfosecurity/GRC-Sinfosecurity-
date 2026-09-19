import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import { intakeInfoAPI } from '../services/api';
import ClarificationAttachments, { type ClarificationAttachment } from '../components/ClarificationAttachments';

export default function IntakeInfoRespond() {
    const token = new URLSearchParams(window.location.search).get('token') || '';
    const [data, setData] = useState<any>(null);
    const [response, setResponse] = useState('');
    const [attachments, setAttachments] = useState<ClarificationAttachment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('This link is missing a secure token.');
            return;
        }
        intakeInfoAPI.get(token)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || err.message || 'This link is not valid.'));
    }, [token]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            await intakeInfoAPI.respond(token, { response });
            setDone(true);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || err.message || 'Unable to send the response.');
        } finally {
            setPending(false);
        }
    };

    return (
        <Stack sx={{ maxWidth: 720, mx: 'auto', px: 2, py: 4, minWidth: 0 }}>
            <PageHeader title="Action required" description="GRC needs more information about your third-party request. This is not an inherent-risk assessment." />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {done && <Alert severity="success">Your response was recorded. GRC will continue review.</Alert>}
            {data && !done && (
                <Surface>
                    <Typography>Reference: {data.publicId}</Typography>
                    <Typography>Proposed third party: {data.proposedThirdPartyName}</Typography>
                    <Typography>Service: {data.proposedServiceName}</Typography>
                    <Typography sx={{ mt: 1 }}>Requested: {data.requestNote}</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>Original purpose: {data.original?.businessPurpose}</Typography>
                    <Stack component="form" spacing={2} sx={{ mt: 2 }} onSubmit={submit}>
                        <TextField required multiline minRows={4} label="Your response" value={response} onChange={(event) => setResponse(event.target.value)} />
                        <ClarificationAttachments
                            attachments={[...(data.attachments || []), ...attachments]}
                            onUpload={async (file) => {
                                const form = new FormData();
                                form.append('file', file);
                                form.append('token', token);
                                const uploaded = await intakeInfoAPI.upload(token, form);
                                setAttachments((current) => [...current, uploaded.data.data]);
                            }}
                        />
                        <Button type="submit" variant="contained" disabled={pending}>{pending ? 'Sending…' : 'Submit response'}</Button>
                    </Stack>
                </Surface>
            )}
        </Stack>
    );
}
